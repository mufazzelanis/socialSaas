<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DigitalProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DigitalProductController extends Controller
{
    public function index(Request $request)
    {
        $products = DigitalProduct::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json($products);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $product = new DigitalProduct($data);
        $product->price = (int) round(((float) $data['price']) * 100);
        $product->is_enabled = $data['is_enabled'] ?? true;
        $product->sort_order = $data['sort_order'] ?? 0;

        if ($request->hasFile('image')) {
            $product->image_path = $request->file('image')->store('products', 'public');
        }

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            // The private ('local') disk — never web-accessible directly,
            // only ever served through OrderController::download() after a
            // specific order is confirmed paid.
            $product->file_path = $file->store('digital-products', 'local');
            $product->file_name = $file->getClientOriginalName();
        }

        $product->updated_by = $request->user()->id;
        $product->save();

        return response()->json($product->fresh(), 201);
    }

    public function update(Request $request, DigitalProduct $product)
    {
        $data = $this->validated($request);

        $product->fill($data);

        if (array_key_exists('price', $data)) {
            $product->price = (int) round(((float) $data['price']) * 100);
        }
        if (array_key_exists('is_enabled', $data)) {
            $product->is_enabled = $data['is_enabled'];
        }
        if (array_key_exists('sort_order', $data)) {
            $product->sort_order = $data['sort_order'];
        }

        if ($request->boolean('remove_image') && $product->image_path) {
            Storage::disk('public')->delete($product->image_path);
            $product->image_path = null;
        }

        if ($request->hasFile('image')) {
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }
            $product->image_path = $request->file('image')->store('products', 'public');
        }

        if ($request->boolean('remove_file') && $product->file_path) {
            Storage::disk('local')->delete($product->file_path);
            $product->file_path = null;
            $product->file_name = null;
        }

        if ($request->hasFile('file')) {
            if ($product->file_path) {
                Storage::disk('local')->delete($product->file_path);
            }
            $file = $request->file('file');
            $product->file_path = $file->store('digital-products', 'local');
            $product->file_name = $file->getClientOriginalName();
        }

        $product->updated_by = $request->user()->id;
        $product->save();

        return response()->json($product->fresh());
    }

    public function destroy(Request $request, DigitalProduct $product)
    {
        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
        }
        if ($product->file_path) {
            Storage::disk('local')->delete($product->file_path);
        }
        $product->delete();

        return response()->json(['message' => 'Product deleted.']);
    }

    protected function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'price' => ['required', 'numeric', 'min:0', 'max:9999999'],
            'sort_order' => ['sometimes', 'integer'],
            'is_enabled' => ['sometimes', 'boolean'],
            'image' => ['nullable', 'file', 'image', 'max:2048'],
            'file' => ['nullable', 'file', 'max:512000'], // 500MB
        ]);
    }
}
