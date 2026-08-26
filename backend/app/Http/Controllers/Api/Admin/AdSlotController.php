<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdSlot;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdSlotController extends Controller
{
    public function index(Request $request)
    {
        $placements = config('ads.placements');
        $existing = AdSlot::all()->keyBy('placement');

        $rows = collect($placements)->map(function ($placement) use ($existing) {
            return $existing->get($placement) ?? new AdSlot([
                'placement' => $placement,
                'network' => 'custom',
                'is_enabled' => false,
            ]);
        });

        return response()->json($rows->values());
    }

    public function update(Request $request, string $placement)
    {
        if (! in_array($placement, config('ads.placements'), true)) {
            abort(404, 'Unknown ad placement.');
        }

        $data = $request->validate([
            'network' => ['sometimes', Rule::in(config('ads.networks'))],
            // Ad embed codes are script/iframe snippets — can legitimately
            // run a few thousand characters, but this still keeps someone
            // from pasting something absurd in by mistake.
            'code' => ['nullable', 'string', 'max:20000'],
            'no_visible_output' => ['sometimes', 'boolean'],
            'is_enabled' => ['sometimes', 'boolean'],
        ]);

        $slot = AdSlot::firstOrNew(['placement' => $placement]);

        if (array_key_exists('network', $data)) {
            $slot->network = $data['network'];
        }

        if (array_key_exists('code', $data)) {
            $slot->code = $data['code'];
        }

        if (array_key_exists('no_visible_output', $data)) {
            $slot->no_visible_output = $data['no_visible_output'];
        }

        if (array_key_exists('is_enabled', $data)) {
            $slot->is_enabled = $data['is_enabled'];
        }

        $slot->updated_by = $request->user()->id;
        $slot->save();

        return response()->json($slot);
    }
}
