<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ServiceController extends Controller
{
    public function index(Request $request)
    {
        $services = Service::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json($services);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $service = new Service($data);
        $service->is_enabled = $data['is_enabled'] ?? true;
        $service->sort_order = $data['sort_order'] ?? 0;

        if ($request->hasFile('image')) {
            $service->image_path = $request->file('image')->store('services', 'public');
        }

        $service->updated_by = $request->user()->id;
        $service->save();

        return response()->json($service->fresh(), 201);
    }

    public function update(Request $request, Service $service)
    {
        $data = $this->validated($request);

        $service->fill($data);

        if (array_key_exists('is_enabled', $data)) {
            $service->is_enabled = $data['is_enabled'];
        }
        if (array_key_exists('sort_order', $data)) {
            $service->sort_order = $data['sort_order'];
        }

        if ($request->boolean('remove_image') && $service->image_path) {
            Storage::disk('public')->delete($service->image_path);
            $service->image_path = null;
        }

        if ($request->hasFile('image')) {
            if ($service->image_path) {
                Storage::disk('public')->delete($service->image_path);
            }
            $service->image_path = $request->file('image')->store('services', 'public');
        }

        $service->updated_by = $request->user()->id;
        $service->save();

        return response()->json($service->fresh());
    }

    public function destroy(Request $request, Service $service)
    {
        if ($service->image_path) {
            Storage::disk('public')->delete($service->image_path);
        }
        $service->delete();

        return response()->json(['message' => 'Service deleted.']);
    }

    protected function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'short_description' => ['nullable', 'string', 'max:255'],
            'details' => ['nullable', 'string', 'max:5000'],
            'whatsapp_number' => ['nullable', 'string', 'max:30'],
            'whatsapp_message' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['sometimes', 'integer'],
            'is_enabled' => ['sometimes', 'boolean'],
            'image' => ['nullable', 'file', 'image', 'max:2048'],
        ]);
    }
}
