<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DigitalProduct;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /**
     * The public storefront listing — enabled products only, in the order
     * the admin set. No auth: this is a public shop page, not a
     * dashboard feature.
     */
    public function index(Request $request)
    {
        $products = DigitalProduct::query()
            ->where('is_enabled', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json($products);
    }

    /**
     * One product's own page — this is what gives each product a real,
     * shareable, bookmarkable URL (/shop/product/{id}) instead of only
     * being reachable through a client-side modal on the listing page.
     * A disabled product 404s the same as one that never existed, rather
     * than leaking that it exists but is hidden.
     */
    public function show(DigitalProduct $product)
    {
        if (! $product->is_enabled) {
            abort(404);
        }

        return response()->json($product);
    }
}
