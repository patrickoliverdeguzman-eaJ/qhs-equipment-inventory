<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('inventory:snapshot')
    ->everyMinute()
    ->withoutOverlapping();
