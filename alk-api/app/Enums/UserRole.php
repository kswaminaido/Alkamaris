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
    case Vendor = 'vendor';

    public function isPackerLike(): bool
    {
        return in_array($this, [self::Packer, self::Vendor], true);
    }

    /**
     * @return array<int, string>
     */
    public function queryValues(): array
    {
        return match ($this) {
            self::Packer => [self::Packer->value, self::Vendor->value],
            default => [$this->value],
        };
    }

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
    public static function assignableValues(): array
    {
        return self::valuesFor(
            self::Admin,
            self::Sales,
            self::Packer,
            self::Customer,
            self::Logistics,
            self::Accounts,
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

    /**
     * @return array<int, string>
     */
    public static function passwordRequiredValues(): array
    {
        return self::valuesFor(self::Admin, self::Logistics, self::Accounts);
    }

    /**
     * @return array<int, string>
     */
    public static function valuesFor(self ...$roles): array
    {
        return array_map(
            static fn(self $role): string => $role->value,
            $roles,
        );
    }

    /**
     * @return array<int, string>
     */
    public static function queryValuesFor(self ...$roles): array
    {
        $values = [];

        foreach ($roles as $role) {
            array_push($values, ...$role->queryValues());
        }

        return array_values(array_unique($values));
    }

    public static function middleware(self ...$roles): string
    {
        return 'role:' . self::csv(...$roles);
    }

    public static function csv(self ...$roles): string
    {
        return implode(',', self::valuesFor(...$roles));
    }

    public static function queryCsv(self ...$roles): string
    {
        return implode(',', self::queryValuesFor(...$roles));
    }

    public static function fromValue(mixed $value): ?self
    {
        if (! is_string($value)) {
            return null;
        }

        return self::tryFrom(strtolower(trim($value)));
    }

    /**
     * @return array<int, string>
     */
    public static function queryValuesFromCsv(mixed $value): array
    {
        if (! is_string($value) || trim($value) === '') {
            return [];
        }

        $values = [];

        foreach (explode(',', $value) as $part) {
            $role = self::fromValue($part);

            if ($role !== null) {
                array_push($values, ...$role->queryValues());
            }
        }

        return array_values(array_unique($values));
    }
}
