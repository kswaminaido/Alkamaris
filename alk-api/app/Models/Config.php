<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Config extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'type',
        'data',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'data' => 'array',
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function optionsByType(string $type): array
    {
        $config = self::query()
            ->where('type', $type)
            ->first();

        if (! $config || ! is_array($config->data)) {
            return [];
        }

        return array_values(
            array_filter(
                $config->data,
                static fn (mixed $value): bool => is_string($value) && $value !== '',
            ),
        );
    }
}
