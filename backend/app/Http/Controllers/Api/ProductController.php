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
}
