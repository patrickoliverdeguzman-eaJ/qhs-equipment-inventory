<?php

namespace App\Enums;

enum EquipmentCondition: string
{
    case New = 'New';
    case Good = 'Good';
    case Fair = 'Fair';
    case Poor = 'Poor';
    case Damaged = 'Damaged';
    case Missing = 'Missing';
    case UnderRepair = 'Under Repair';

    public function isAvailable(): bool
    {
        return in_array($this, [self::New, self::Good, self::Fair, self::Poor], true);
    }

    /** @return list<string> */
    public static function unavailableValues(): array
    {
        return [self::Damaged->value, self::Missing->value, self::UnderRepair->value];
    }
}
