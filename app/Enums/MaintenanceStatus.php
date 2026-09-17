<?php

namespace App\Enums;

enum MaintenanceStatus: string
{
    case Open = 'open';
    case Assigned = 'assigned';
    case InProgress = 'in_progress';
    case WaitingForParts = 'waiting_for_parts';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    /** @return list<string> */
    public static function activeValues(): array
    {
        return [
            self::Open->value,
            self::Assigned->value,
            self::InProgress->value,
            self::WaitingForParts->value,
        ];
    }
}
