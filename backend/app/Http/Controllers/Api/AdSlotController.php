<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdSlot;
use Illuminate\Http\Request;

class AdSlotController extends Controller
{
    /**
     * What every logged-in user's dashboard actually renders: just the
     * enabled slots that have a code set, and nothing beyond placement +
     * code — no need to leak network names or timestamps to the browser.
     */
    public function index(Request $request)
    {
        $slots = AdSlot::query()
            ->where('is_enabled', true)
            ->whereNotNull('code')
            ->where('code', '!=', '')
            ->get(['placement', 'code']);

        return response()->json($slots);
    }
}
