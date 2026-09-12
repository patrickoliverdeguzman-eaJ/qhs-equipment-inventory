<?php

use Illuminate\Support\Facades\Route;

Route::get('/{any?}', function (string $any = '') {
    $index = public_path('app/index.html');

    if (is_file($index)) {
        return response()->file($index);
    }

    if (app()->isLocal() && config('app.frontend_url') !== config('app.url')) {
        return redirect(rtrim(config('app.frontend_url'), '/').'/'.ltrim($any, '/'));
    }

    return response()->view('app', status: 503);
})->where('any', '.*');
