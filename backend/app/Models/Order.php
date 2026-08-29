<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'digital_product_id',
        'buyer_name',
        'buyer_email',
        'buyer_phone',
        'amount',
        'currency',
        'tran_id',
        'val_id',
        'status',
        'gateway_response',
        'download_token',
        'download_count',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'gateway_response' => 'array',
            'download_count' => 'integer',
        ];
    }

    public function digitalProduct()
    {
        return $this->belongsTo(DigitalProduct::class);
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }
}
