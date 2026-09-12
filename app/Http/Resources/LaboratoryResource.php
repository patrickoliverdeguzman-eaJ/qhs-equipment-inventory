<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LaboratoryResource extends JsonResource
{
    public static $wrap = false;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'location' => $this->location,
            'custodianID' => $this->custodians->first()?->id,
            'custodians' => $this->whenLoaded('custodians', fn () => $this->custodians->map(fn ($custodian) => [
                'id' => $custodian->id,
                'name' => $custodian->name,
                'email' => $custodian->email,
            ])->values()),
            'isActive' => (bool) $this->isActive,
            'gallery' => $this->gallery,
            'description' => $this->description,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
