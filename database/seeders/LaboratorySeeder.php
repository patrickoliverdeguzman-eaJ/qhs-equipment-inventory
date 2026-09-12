<?php

namespace Database\Seeders;

use App\Models\Laboratory;
use Illuminate\Database\Seeder;

class LaboratorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Laboratory::create([
            'name' => 'Chemistry Lab',
            'location' => 'Building B, Room 202',
            'description' => 'Laboratory for chemical experiments.',
        ]);
    }
}
