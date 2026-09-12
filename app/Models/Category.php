<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    protected $table = 'categories';

    protected $fillable = ['name'];

    public $timestamps = true;

    // app/Models/Category.php

    public function equipment()
    {
        return $this->belongsToMany(
            Equipment::class,
            'equipment_categories',  // ← Your actual table name (plural)
            'category_id',            // ← foreign key on pivot for Category
            'equipment_id'            // ← foreign key on pivot for Equipment
        );
    }
}
