<?php

namespace App\Enums;

enum MaintenancePriority: string
{
    case Low = 'low';
    case Normal = 'normal';
    case High = 'high';
    case Critical = 'critical';
}
