<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::query()->with('items')->orderByDesc('id');

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('number', 'ilike', "%{$search}%")
                  ->orWhere('customer_name', 'ilike', "%{$search}%");
            });
        }
        if (($status = $request->get('status')) && $status !== 'All') {
            $query->where('status', $status);
        }

        return $request->boolean('paginate')
            ? $query->paginate($request->get('per_page', 50))
            : $query->get();
    }

    public function show($id)
    {
        return Invoice::with('items')->findOrFail($id);
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);

        $invoice = DB::transaction(function () use ($data) {
            $invoice = Invoice::create($this->headerData($data, true));
            $this->syncItems($invoice, $data['items'] ?? []);
            return $invoice;
        });

        return response()->json($invoice->load('items'), 201);
    }

    public function update(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);
        $data = $this->validateData($request);

        DB::transaction(function () use ($invoice, $data) {
            $invoice->update($this->headerData($data, false));
            if (array_key_exists('items', $data)) {
                $invoice->items()->delete();
                $this->syncItems($invoice, $data['items']);
            }
        });

        return response()->json($invoice->fresh('items'));
    }

    public function destroy($id)
    {
        Invoice::findOrFail($id)->delete(); // items cascade

        return response()->json(['status' => true, 'message' => 'Invoice deleted.']);
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'company_id'       => ['nullable', 'integer'],
            'customer_name'    => ['required', 'string', 'max:255'],
            'customer_email'   => ['nullable', 'string', 'max:255'],
            'customer_address' => ['nullable', 'string', 'max:255'],
            'deployment'       => ['nullable', 'string', 'max:50'],
            'date'             => ['nullable', 'date'],
            'due_date'         => ['nullable', 'date'],
            'terms'            => ['nullable', 'string', 'max:255'],
            'status'           => ['nullable', 'string', 'max:50'],
            'amount'           => ['nullable', 'numeric'],
            'tax'              => ['nullable', 'numeric'],
            'discount'         => ['nullable', 'numeric'],
            'total'            => ['nullable', 'numeric'],
            'items'            => ['nullable', 'array'],
            'items.*.code'     => ['nullable', 'string', 'max:100'],
            'items.*.title'    => ['nullable', 'string', 'max:255'],
            'items.*.description' => ['nullable', 'string'],
            'items.*.qty'      => ['nullable', 'numeric'],
            'items.*.unit'     => ['nullable', 'string', 'max:50'],
            'items.*.rate'     => ['nullable', 'numeric'],
        ]);
    }

    private function headerData(array $data, bool $creating): array
    {
        $header = collect($data)->except('items')->toArray();
        if ($creating) {
            $header['number'] = $this->nextNumber();
        }
        return $header;
    }

    private function syncItems(Invoice $invoice, array $items): void
    {
        foreach ($items as $item) {
            $invoice->items()->create([
                'code'        => $item['code'] ?? null,
                'title'       => $item['title'] ?? null,
                'description' => $item['description'] ?? null,
                'qty'         => $item['qty'] ?? 1,
                'unit'        => $item['unit'] ?? null,
                'rate'        => $item['rate'] ?? 0,
            ]);
        }
    }

    /** Generate the next INV-{year}-{0001} number. */
    private function nextNumber(): string
    {
        $year = date('Y');
        $last = Invoice::where('number', 'like', "INV-{$year}-%")
            ->orderByDesc('id')->value('number');
        $seq = $last ? ((int) substr($last, strrpos($last, '-') + 1)) + 1 : 1;

        return sprintf('INV-%s-%04d', $year, $seq);
    }
}
