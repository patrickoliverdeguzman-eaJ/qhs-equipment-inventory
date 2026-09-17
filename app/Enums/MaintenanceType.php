<?php

namespace App\Enums;

enum MaintenanceType: string
{
    case Incident = 'incident';
    case Repair = 'repair';
    case PreventiveMaintenance = 'preventive_maintenance';
    case Calibration = 'calibration';
    case Cleaning = 'cleaning';
    case SafetyInspection = 'safety_inspection';
    case Validation = 'validation';
}
