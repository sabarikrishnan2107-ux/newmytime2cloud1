<?php

namespace App\Http\Controllers;

use App\Models\DocumentInfo;
use Carbon\Carbon;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Http\Request;

class DocumentInfoController extends Controller
{
    public function index()
    {
        return DocumentInfo::where("company_id", request("company_id"))

            ->when(request("branch_ids"), function ($query) {
                $query->whereHas("employee", fn($q) => $q->whereIn('branch_id', request("branch_ids")));
            })

            ->when(request("department_ids"), function ($query) {
                $query->whereHas("employee", fn($q) => $q->whereIn('department_id', request("department_ids")));
            })

            ->get();
    }

    public function upcomingExpiry()
    {
        $today = Carbon::today();
        
        $next30Days = Carbon::today()->addDays(30);

        return DocumentInfo::where("company_id", request("company_id"))

            ->whereBetween("expiry_date", [$today, $next30Days])

            ->when(request("branch_ids"), function ($query) {
                $query->whereHas(
                    "employee",
                    fn($q) =>
                    $q->whereIn('branch_id', request("branch_ids"))
                );
            })

            ->when(request("department_ids"), function ($query) {
                $query->whereHas(
                    "employee",
                    fn($q) =>
                    $q->whereIn('department_id', request("department_ids"))
                );
            })

            ->with("employee")

            ->orderBy("expiry_date", "asc")

            ->paginate(request("per_page", 10));
    }

    public function store(DocumentInfo $DocumentInfo, Request $request)
    {
        // $this->cleanRecord($request->employee_id);
        $arr = [];
        foreach ($request->items as $item) {
            $arr[] = [
                "title" => $item["title"],
                "attachment" => $this->saveFile($item["file"], $request->employee_id),
                "employee_id" => $request->employee_id,
                "company_id" => $request->company_id,
            ];
        }

        try {

            return response()->json([
                "status" => true,
                "message" => "Record has been successfully added",
                "record" => DocumentInfo::insert($arr),
            ]);
        } catch (\Throwable $th) {
            return response()->json([
                "status" => true,
                "message" => $th,
                "record" => null,
            ]);
        }
    }

    public function show(DocumentInfo $DocumentInfo, $id)
    {
        return $DocumentInfo->where('employee_id', $id)->get();
    }

    public function saveFile($file, $id)
    {
        $filename = $file->getClientOriginalName();
        $destDir = public_path('documents/' . $id . "/");
        $file->move($destDir, $filename);

        $filePath = $destDir . $filename;
        $maxSizeKB = 200;

        $mime = mime_content_type($filePath);

        // Compress images (JPG/PNG) to ~200KB
        if (in_array($mime, ['image/jpeg', 'image/png', 'image/jpg']) && filesize($filePath) > $maxSizeKB * 1024) {
            $this->compressImage($filePath, $maxSizeKB);
        }

        // Compress PDF to reduce size
        if ($mime === 'application/pdf' && filesize($filePath) > $maxSizeKB * 1024) {
            $this->compressPdf($filePath);
        }

        return $filename;
    }

    private function compressPdf($filePath)
    {
        // Try Ghostscript paths (Windows)
        $gsBinaries = ['gs', 'gswin64c', 'gswin32c'];
        $gsPath = null;

        foreach ($gsBinaries as $bin) {
            $check = shell_exec("where $bin 2>&1");
            if ($check && !str_contains($check, 'not find')) {
                $gsPath = trim($check);
                break;
            }
        }

        // Also check common install paths
        if (!$gsPath) {
            $commonPaths = glob('C:/Program Files/gs/gs*/bin/gswin64c.exe');
            if (!empty($commonPaths)) {
                $gsPath = end($commonPaths);
            }
        }

        if (!$gsPath) return; // Ghostscript not available

        $tempPath = $filePath . '.compressed.pdf';
        $cmd = '"' . $gsPath . '" -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -dNOPAUSE -dQUIET -dBATCH -sOutputFile="' . $tempPath . '" "' . $filePath . '" 2>&1';

        shell_exec($cmd);

        // Replace original only if compressed is smaller
        if (file_exists($tempPath) && filesize($tempPath) > 0 && filesize($tempPath) < filesize($filePath)) {
            unlink($filePath);
            rename($tempPath, $filePath);
        } elseif (file_exists($tempPath)) {
            unlink($tempPath);
        }
    }

    private function compressImage($filePath, $maxSizeKB = 200)
    {
        $mime = mime_content_type($filePath);
        $image = $mime === 'image/png' ? imagecreatefrompng($filePath) : imagecreatefromjpeg($filePath);

        if (!$image) return;

        $width = imagesx($image);
        $height = imagesy($image);

        // Step 1: Scale down dimensions progressively
        $maxDim = 1920;
        while ($maxDim >= 800) {
            if ($width > $maxDim || $height > $maxDim) {
                $ratio = min($maxDim / $width, $maxDim / $height);
                $newW = (int)($width * $ratio);
                $newH = (int)($height * $ratio);
                $resized = imagecreatetruecolor($newW, $newH);
                imagecopyresampled($resized, $image, 0, 0, 0, 0, $newW, $newH, $width, $height);
                imagedestroy($image);
                $image = $resized;
                $width = $newW;
                $height = $newH;
            }

            // Step 2: Try quality 75 first (good clarity)
            imagejpeg($image, $filePath, 75);
            if (filesize($filePath) <= $maxSizeKB * 1024) {
                imagedestroy($image);
                return;
            }

            $maxDim -= 200;
        }

        // Step 3: If still too large, reduce quality (minimum 50 for clarity)
        $quality = 70;
        do {
            imagejpeg($image, $filePath, $quality);
            $quality -= 5;
        } while (filesize($filePath) > $maxSizeKB * 1024 && $quality >= 50);

        imagedestroy($image);
    }

    public function cleanRecord($id)
    {
        $file = new Filesystem;
        DocumentInfo::where('employee_id', $id)->delete() ?? null;
        return $file->cleanDirectory('documents/' . $id . "/");
    }

    public function destroy($id)
    {
        $record = DocumentInfo::find($id);

        if ($record->delete()) {
            return response()->json([
                "status" => true,
                "message" => "Record has been successfully deleted",
                "record" => null,
            ]);
        } else {
            return response()->json([
                "status" => false,
                "message" => "Record cannot delete",
                "record" => null,
            ]);
        }
    }
}
