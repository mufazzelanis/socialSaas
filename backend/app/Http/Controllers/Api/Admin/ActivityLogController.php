<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $query = ActivityLog::with('user:id,name,email')
            ->orderByDesc('created_at');

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        if ($request->filled('event')) {
            // Comma-separated list supported so the frontend can request a
            // grouped view (e.g. "login,login_failed,logout" for a login
            // history) with one request.
            $events = explode(',', $request->string('event'));
            $query->whereIn('event', $events);
        }

        return response()->json($query->paginate(30));
    }
}
