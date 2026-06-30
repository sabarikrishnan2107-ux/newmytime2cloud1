<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::query()->orderByDesc('id');

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('sku', 'ilike', "%{$search}%")
                  ->orWhere('category', 'ilike', "%{$search}%");
            });
        }
        if ($category = $request->get('category')) {
            if ($category !== 'All') {
                $query->where('category', $category);
            }
        }

        // Allow either a full list (default for a small catalog) or pagination.
        if ($request->boolean('paginate')) {
            return $query->paginate($request->get('per_page', 50));
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);
        $product = Product::create($data);

        return response()->json($product, 201);
    }

    public function show($id)
    {
        return Product::findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        $product->update($this->validateData($request));

        return response()->json($product);
    }

    public function destroy($id)
    {
        Product::findOrFail($id)->delete();

        return response()->json(['status' => true, 'message' => 'Product deleted.']);
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'sku'         => ['nullable', 'string', 'max:100'],
            'name'        => ['required', 'string', 'max:255'],
            'category'    => ['nullable', 'string', 'max:100'],
            'price'       => ['nullable', 'numeric', 'min:0'],
            'stock'       => ['nullable', 'integer'],
            'status'      => ['nullable', 'string', 'in:Active,Inactive'],
            'description' => ['nullable', 'string'],
        ]);
    }
}
