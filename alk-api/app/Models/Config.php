<?php

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Model;

class Config extends Model
{
    public const TYPE_ROLES = 'roles';

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
        if ($type === self::TYPE_ROLES) {
            return UserRole::registrableValues();
        }

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
