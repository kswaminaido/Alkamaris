<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Sales = 'sales';
    case Vendor = 'vendor';
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
            self::Vendor->value,
            self::Customer->value,
        ];
    }
}
