<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = Payment::query()->orderByDesc('id');

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('ref', 'ilike', "%{$search}%")
                  ->orWhere('subscriber', 'ilike', "%{$search}%")
                  ->orWhere('invoice_number', 'ilike', "%{$search}%");
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
        return Payment::findOrFail($id);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'invoice_id'     => ['nullable', 'integer'],
            'invoice_number' => ['nullable', 'string', 'max:100'],
            'subscriber'     => ['nullable', 'string', 'max:255'],
            'amount'         => ['required', 'numeric', 'min:0'],
            'method'         => ['nullable', 'string', 'max:50'],
            'reference'      => ['nullable', 'string', 'max:255'],
            'status'         => ['nullable', 'string', 'max:50'],
            'date'           => ['nullable', 'date'],
        ]);

        $data['date'] = $data['date'] ?? date('Y-m-d');
        $data['ref'] = $this->nextRef();

        $payment = Payment::create($data);

        return response()->json($payment, 201);
    }

    public function destroy($id)
    {
        Payment::findOrFail($id)->delete();

        return response()->json(['status' => true, 'message' => 'Payment deleted.']);
    }

    private function nextRef(): string
    {
        $last = Payment::where('ref', 'like', 'PAY-%')->orderByDesc('id')->value('ref');
        $seq = $last ? ((int) substr($last, strrpos($last, '-') + 1)) + 1 : 3001;

        return sprintf('PAY-%d', $seq);
    }
}
