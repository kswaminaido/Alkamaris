<?php

namespace Tests\Feature\Transactions;

use App\Enums\UserRole;
use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class TransactionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_transaction_with_nested_details(): void
    {
        CarbonImmutable::setTestNow('2026-03-29 08:00:00');

        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $salesPerson = User::factory()->create(['role' => UserRole::Vendor->value]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/transactions', [
                'transaction' => [
                    'booking_no' => 'TRX-1001',
                    'booking_mode' => 'trade_commission',
                    'issue_date' => '2026-03-10',
                    'sales_person_id' => $salesPerson->id,
                    'product_origin' => '',
                    'destination' => 'Amman',
                    'certified' => true,
                    'net_margin' => 1234.56,
                ],
                'general_info_customer' => [
                    'customer' => 'Leader Food',
                    'attention' => 'Operations',
                ],
                'notes' => [
                    'by_sales' => 'Priority shipment',
                ],
                'expense_lines' => [
                    [
                        'section' => 'charges',
                        'line_key' => 'freight',
                        'line_label' => 'Freight',
                        'amount' => 250.75,
                    ],
                ],
                'note_entries' => [
                    [
                        'section' => 'shipping',
                        'note_key' => 'eta',
                        'note_value' => 'Week 12',
                    ],
                ],
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.general_info_customer.customer', 'Leader Food')
            ->assertJsonPath('data.issue_date', '2026-03-29')
            ->assertJsonPath('data.sales_person_id', $admin->id)
            ->assertJsonPath('data.product_origin', 'India (Singapore)')
            ->assertJsonPath('data.notes.by_sales', 'Priority shipment')
            ->assertJsonPath('data.expense_lines.0.line_key', 'freight')
            ->assertJsonPath('data.note_entries.0.note_key', 'eta');

        $bookingNo = $response->json('data.booking_no');

        $this->assertMatchesRegularExpression('/^ALK0326\d{6}$/', $bookingNo);
        $this->assertDatabaseHas('transactions', [
            'booking_no' => $bookingNo,
            'issue_date' => '2026-03-29 00:00:00',
            'sales_person_id' => $admin->id,
            'created_by_user_id' => $admin->id,
        ]);

        CarbonImmutable::setTestNow();
    }

    public function test_admin_can_update_transaction_and_replace_nested_rows(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        $transaction = Transaction::query()->create([
            'booking_no' => 'TRX-2001',
            'booking_mode' => 'trade_commission',
            'created_by_user_id' => $admin->id,
        ]);

        $transaction->expenseLines()->create([
            'section' => 'charges',
            'line_key' => 'old-line',
            'sort_order' => 0,
        ]);

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/transactions/{$transaction->id}", [
                'transaction' => [
                    'booking_no' => 'TRX-2001',
                    'booking_mode' => 'qc_services',
                    'destination' => 'Aqaba',
                ],
                'expense_lines' => [
                    [
                        'section' => 'charges',
                        'line_key' => 'new-line',
                        'amount' => 99.99,
                    ],
                ],
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.booking_mode', 'qc_services')
            ->assertJsonPath('data.destination', 'Aqaba')
            ->assertJsonPath('data.expense_lines.0.line_key', 'new-line');

        $this->assertDatabaseMissing('transaction_expense_lines', [
            'transaction_id' => $transaction->id,
            'line_key' => 'old-line',
        ]);
    }

    public function test_admin_can_duplicate_transaction(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        $transaction = Transaction::query()->create([
            'booking_no' => 'TRX-3001',
            'booking_mode' => 'trade_commission',
            'created_by_user_id' => $admin->id,
        ]);

        $transaction->note()->create(['by_sales' => 'Duplicate this']);

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/transactions/{$transaction->id}/duplicate");

        $response
            ->assertCreated()
            ->assertJsonPath('message', 'Transaction duplicated successfully.')
            ->assertJsonPath('data.booking_no', 'TRX-3001-D1')
            ->assertJsonPath('data.notes.by_sales', 'Duplicate this');
    }

    public function test_index_returns_paginated_transaction_resource_payload(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        foreach (range(1, 6) as $index) {
            Transaction::query()->create([
                'booking_no' => "TRX-PAG-{$index}",
                'booking_mode' => 'trade_commission',
                'created_by_user_id' => $admin->id,
            ]);
        }

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/transactions?per_page=5');

        $response
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('pagination.per_page', 5)
            ->assertJsonPath('pagination.total', 6);
    }
}
