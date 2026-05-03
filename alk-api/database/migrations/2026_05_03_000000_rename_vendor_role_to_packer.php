<?php

use App\Enums\UserRole;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->where('role', UserRole::Vendor->value)
            ->update(['role' => UserRole::Packer->value]);

        $this->replaceConfigOption('roles', UserRole::Vendor->value, UserRole::Packer->value);
        $this->replaceConfigOption('packer_packed_by', 'Vendor', 'Packer');
    }

    public function down(): void
    {
        DB::table('users')
            ->where('role', UserRole::Packer->value)
            ->update(['role' => UserRole::Vendor->value]);

        $this->replaceConfigOption('roles', UserRole::Packer->value, UserRole::Vendor->value);
        $this->replaceConfigOption('packer_packed_by', 'Packer', 'Vendor');
    }

    private function replaceConfigOption(string $type, string $from, string $to): void
    {
        $config = DB::table('configs')->where('type', $type)->first(['id', 'data']);

        if (! $config) {
            return;
        }

        $data = json_decode((string) $config->data, true, 512, JSON_THROW_ON_ERROR);

        if (! is_array($data)) {
            return;
        }

        $updated = array_values(array_unique(array_map(
            static fn (mixed $value): mixed => $value === $from ? $to : $value,
            $data,
        )));

        DB::table('configs')
            ->where('id', $config->id)
            ->update([
                'data' => json_encode($updated, JSON_THROW_ON_ERROR),
                'updated_at' => now(),
            ]);
    }
};
