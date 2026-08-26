<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    /**
     * What every logged-in user's dashboard actually shows: enabled
     * services only, in the order the admin set.
     */
    public function index(Request $request)
    {
        $services = Service::query()
            ->where('is_enabled', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json($services);
    }
}
