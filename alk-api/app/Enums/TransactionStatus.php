<?php

namespace App\Enums;

enum TransactionStatus: string
{
    case Invoice = 'I';
    case Unpaid = 'P';
    case Paid = 'D';
    case Shipped = 'S';
    case Received = 'R'; // payment and documents received
    case Unshipped = 'U';
    case Tally = 'T';
    case Cancelled = 'C';

    public function label(): string
    {
        return match ($this) {
            self::Invoice => 'Invoice',
            self::Unpaid => 'Unpaid',
            self::Paid => 'Paid',
            self::Shipped => 'Shipped',
            self::Received => 'Received',
            self::Unshipped => 'Unshipped',
            self::Tally => 'Tally',
            self::Cancelled => 'Cancelled',
        };
    }

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $status): string => $status->value,
            self::cases(),
        );
    }
}
