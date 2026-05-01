<?php

namespace App\Support\Users;

use App\Enums\UserRole;

final class UserRegistrationNumberResolver
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public static function resolve(array $payload): ?string
    {
        $registrationNumber = self::filledValue($payload['registration_number'] ?? null);

        return match ($payload['user_type'] ?? null) {
            UserRole::Customer->value => self::filledValue($payload['firm_number'] ?? null) ?? $registrationNumber,
            UserRole::Sales->value => self::filledValue($payload['factory_approval_number'] ?? null) ?? $registrationNumber,
            default => $registrationNumber,
        };
    }

    public static function identifierField(string $userType): string
    {
        return match ($userType) {
            UserRole::Customer->value => 'firm_number',
            UserRole::Sales->value => 'factory_approval_number',
            default => 'registration_number',
        };
    }

    public static function identifierLabel(string $userType): string
    {
        return match ($userType) {
            UserRole::Customer->value => 'Firm Number',
            UserRole::Sales->value => 'Factory Approval Number',
            default => 'Registration Number',
        };
    }

    private static function filledValue(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
