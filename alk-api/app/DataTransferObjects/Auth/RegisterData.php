<?php

namespace App\DataTransferObjects\Auth;

final readonly class RegisterData
{
    public function __construct(
        public string $name,
        public string $phoneNumber,
        public string $email,
        public string $address,
        public string $userType,
        public string $registrationNumber,
        public string $password,
    ) {}

    /**
     * @param  array{name: string, phone_number: string, email: string, address: string, user_type: string, registration_number?: string, firm_number?: string, factory_approval_number?: string, password: string}  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            name: $data['name'],
            phoneNumber: $data['phone_number'],
            email: $data['email'],
            address: $data['address'],
            userType: $data['user_type'],
            registrationNumber: self::resolveRegistrationNumber($data),
            password: $data['password'],
        );
    }

    /**
     * @param  array{user_type?: string, registration_number?: string, firm_number?: string, factory_approval_number?: string}  $data
     */
    private static function resolveRegistrationNumber(array $data): string
    {
        $registrationNumber = trim((string) ($data['registration_number'] ?? ''));

        return match ($data['user_type'] ?? '') {
            'customer' => trim((string) ($data['firm_number'] ?? $registrationNumber)),
            'sales' => trim((string) ($data['factory_approval_number'] ?? $registrationNumber)),
            default => $registrationNumber,
        };
    }
}
