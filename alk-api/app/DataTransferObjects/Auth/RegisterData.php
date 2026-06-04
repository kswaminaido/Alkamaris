<?php

namespace App\DataTransferObjects\Auth;

final readonly class RegisterData
{
    public function __construct(
        public string $name,
        public string $contactName,
        public ?string $firmName,
        public string $phoneNumber,
        public string $email,
        public string $address,
        public string $userType,
        public ?string $registrationNumber,
        public ?string $password,
    ) {}

    /**
     * @param  array{name: string, contact_name: string, firm_name?: string|null, phone_number: string, email: string, address: string, user_type: string, registration_number?: string, firm_number?: string, factory_approval_number?: string, password?: string}  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            name: $data['name'],
            contactName: $data['contact_name'],
            firmName: self::nullableString($data['firm_name'] ?? null),
            phoneNumber: $data['phone_number'],
            email: $data['email'],
            address: $data['address'],
            userType: $data['user_type'],
            registrationNumber: self::resolveRegistrationNumber($data),
            password: isset($data['password']) ? trim((string) $data['password']) : null,
        );
    }

    /**
     * @param  array{user_type?: string, registration_number?: string, firm_number?: string, factory_approval_number?: string}  $data
     */
    private static function resolveRegistrationNumber(array $data): ?string
    {
        $registrationNumber = trim((string) ($data['registration_number'] ?? ''));
        $resolved = match ($data['user_type'] ?? '') {
            'customer' => trim((string) ($data['firm_number'] ?? $registrationNumber)),
            'sales' => trim((string) ($data['factory_approval_number'] ?? $registrationNumber)),
            default => $registrationNumber,
        };

        return $resolved !== '' ? $resolved : null;
    }

    private static function nullableString(mixed $value): ?string
    {
        $trimmed = trim((string) ($value ?? ''));

        return $trimmed !== '' ? $trimmed : null;
    }
}
