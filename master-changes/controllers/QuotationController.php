<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Quotation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuotationController extends Controller
{
    public function index(Request $request)
    {
        $query = Quotation::query()->with('items')->orderByDesc('id');

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('number', 'ilike', "%{$search}%")
                  ->orWhere('prospect', 'ilike', "%{$search}%");
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
        return Quotation::with('items')->findOrFail($id);
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);

        $quotation = DB::transaction(function () use ($data) {
            $quotation = Quotation::create($this->headerData($data, true));
            $this->syncItems($quotation, $data['items'] ?? []);
            return $quotation;
        });

        return response()->json($quotation->load('items'), 201);
    }

    public function update(Request $request, $id)
    {
        $quotation = Quotation::findOrFail($id);
        $data = $this->validateData($request);

        DB::transaction(function () use ($quotation, $data) {
            $quotation->update($this->headerData($data, false));
            if (array_key_exists('items', $data)) {
                $quotation->items()->delete();
                $this->syncItems($quotation, $data['items']);
            }
        });

        return response()->json($quotation->fresh('items'));
    }

    public function destroy($id)
    {
        Quotation::findOrFail($id)->delete();

        return response()->json(['status' => true, 'message' => 'Quotation deleted.']);
    }

    /** Turn a quotation (with its line items) into a real invoice. */
    public function convert($id)
    {
        $quotation = Quotation::with('items')->findOrFail($id);

        if ($quotation->items->isEmpty()) {
            return response()->json([
                'status'  => false,
                'message' => 'This quotation has no line items to convert.',
            ], 422);
        }

        $invoice = DB::transaction(function () use ($quotation) {
            $year = date('Y');
            $last = Invoice::where('number', 'like', "INV-{$year}-%")->orderByDesc('id')->value('number');
            $seq = $last ? ((int) substr($last, strrpos($last, '-') + 1)) + 1 : 1;

            $invoice = Invoice::create([
                'number'         => sprintf('INV-%s-%04d', $year, $seq),
                'company_id'     => $quotation->company_id,
                'customer_name'  => $quotation->prospect,
                'customer_email' => $quotation->customer_email,
                'deployment'     => $quotation->deployment,
                'date'           => date('Y-m-d'),
                'due_date'       => date('Y-m-d', strtotime('+14 days')),
                'terms'          => 'Due on Receipt',
                'status'         => 'Pending',
                'amount'         => $quotation->amount,
                'tax'            => $quotation->tax,
                'discount'       => 0,
                'total'          => $quotation->total,
            ]);

            foreach ($quotation->items as $item) {
                $invoice->items()->create($item->only(['code', 'title', 'description', 'qty', 'unit', 'rate']));
            }

            return $invoice;
        });

        return response()->json($invoice->load('items'), 201);
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'company_id'     => ['nullable', 'integer'],
            'prospect'       => ['required', 'string', 'max:255'],
            'customer_email' => ['nullable', 'string', 'max:255'],
            'deployment'     => ['nullable', 'string', 'max:50'],
            'plan'           => ['nullable', 'string', 'max:50'],
            'date'           => ['nullable', 'date'],
            'valid_until'    => ['nullable', 'date'],
            'status'         => ['nullable', 'string', 'max:50'],
            'modules'        => ['nullable', 'integer'],
            'users'          => ['nullable', 'integer'],
            'devices'        => ['nullable', 'integer'],
            'branches'       => ['nullable', 'integer'],
            'amount'         => ['nullable', 'numeric'],
            'tax'            => ['nullable', 'numeric'],
            'total'          => ['nullable', 'numeric'],
            'items'          => ['nullable', 'array'],
            'items.*.code'   => ['nullable', 'string', 'max:100'],
            'items.*.title'  => ['nullable', 'string', 'max:255'],
            'items.*.description' => ['nullable', 'string'],
            'items.*.qty'    => ['nullable', 'numeric'],
            'items.*.unit'   => ['nullable', 'string', 'max:50'],
            'items.*.rate'   => ['nullable', 'numeric'],
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

    private function syncItems(Quotation $quotation, array $items): void
    {
        foreach ($items as $item) {
            $quotation->items()->create([
                'code'        => $item['code'] ?? null,
                'title'       => $item['title'] ?? null,
                'description' => $item['description'] ?? null,
                'qty'         => $item['qty'] ?? 1,
                'unit'        => $item['unit'] ?? null,
                'rate'        => $item['rate'] ?? 0,
            ]);
        }
    }

    private function nextNumber(): string
    {
        $year = date('Y');
        $last = Quotation::where('number', 'like', "QT-{$year}-%")
            ->orderByDesc('id')->value('number');
        $seq = $last ? ((int) substr($last, strrpos($last, '-') + 1)) + 1 : 1;

        return sprintf('QT-%s-%03d', $year, $seq);
    }
}
