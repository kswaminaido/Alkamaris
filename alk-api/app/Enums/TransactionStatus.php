<?php

namespace App\Enums;

enum TransactionStatus: string
{
    case Invoice = 'I';
    case Pending = 'P';
    case Shipped = 'S';
    case Received = 'R'; // payment received

    public function label(): string
    {
        return match ($this) {
            self::Invoice => 'Invoice',
            self::Pending => 'Pending',
            self::Shipped => 'Shipped',
            self::Received => 'Received',
        };
    }

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(
            static fn(self $status): string => $status->value,
            self::cases(),
        );
    }
}