<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Sales = 'sales';
    case Packer = 'packer';
    case Customer = 'customer';
    case Logistics = 'logistics';
    case Accounts = 'accounts';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(
            static fn(self $role): string => $role->value,
            self::cases(),
        );
    }

    /**
     * @return array<int, string>
     */
    public static function registrableValues(): array
    {
        return [
            self::Packer->value,
            self::Customer->value,
            self::Accounts->value,
            self::Logistics->value,
        ];
    }
}
