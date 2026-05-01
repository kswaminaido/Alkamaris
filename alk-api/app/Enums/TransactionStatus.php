<?php

namespace App\Enums;

enum TransactionStatus: string
{
    case Invoice = 'I';
    case Pending = 'P';
    case Shipped = 'S';
    case Received = 'R'; // payment and documents received
    case Unshipped = 'U';
    case Tally = 'T'; 

    public function label(): string
    {
        return match ($this) {
            self::Invoice => 'Invoice',
            self::Pending => 'Pending',
            self::Shipped => 'Shipped',
            self::Received => 'Received',
            self::Unshipped => 'Unshipped',
            self::Tally => 'Tally',
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