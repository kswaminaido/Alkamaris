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
     * @param  array{name: string, phone_number: string, email: string, address: string, user_type: string, registration_number: string, password: string}  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            name: $data['name'],
            phoneNumber: $data['phone_number'],
            email: $data['email'],
            address: $data['address'],
            userType: $data['user_type'],
            registrationNumber: $data['registration_number'],
            password: $data['password'],
        );
    }
}
