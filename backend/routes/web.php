<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Public legal pages — required by Meta/LinkedIn app review (Privacy Policy,
// Terms of Service, Data Deletion Instructions URLs on the app's Basic
// Settings). Kept as plain server-rendered views since they're read by
// people (and platform reviewers), not consumed by the frontend SPA.
Route::view('/privacy', 'privacy');
Route::view('/terms', 'terms');
Route::view('/data-deletion', 'data-deletion');
