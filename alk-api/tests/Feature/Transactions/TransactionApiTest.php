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
        CarbonImmutable::setTestNow('2026-05-11 08:00:00');

        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $salesPerson = User::factory()->create(['role' => UserRole::Sales->value]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/transactions', [
                'transaction' => [
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
                'logistics' => [
                    'packaging_date_approved' => '2026-01-02',
                    'mother_vessel' => 'VARADA V.081W',
                    'container_no' => 'MNBU9177027',
                    'temperature_recorder_location_row_no' => 'ROW 7',
                    'discharge' => 'Montreal discharge',
                    'at' => 'Terminal 1',
                    'sc_inv_to_customer' => 'SC-1001',
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
                'items' => [
                    [
                        'product' => 'Frozen Vannamei',
                        'style' => 'PDTO',
                        'qty_booking' => 3600,
                        'selling_total' => 174600,
                    ],
                ],
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.booking_no', 'AME26001')
            ->assertJsonPath('data.general_info_customer.customer', 'Leader Food')
            ->assertJsonPath('data.issue_date', '2026-05-11')
            ->assertJsonPath('data.sales_person_id', $salesPerson->id)
            ->assertJsonPath('data.product_origin', 'India (Singapore)')
            ->assertJsonPath('data.notes.by_sales', 'Priority shipment')
            ->assertJsonPath('data.logistics.mother_vessel', 'VARADA V.081W')
            ->assertJsonPath('data.logistics.temperature_recorder_location_row_no', 'ROW 7')
            ->assertJsonPath('data.logistics.sc_inv_to_customer', 'SC-1001')
            ->assertJsonPath('data.expense_lines.0.line_key', 'freight')
            ->assertJsonPath('data.note_entries.0.note_key', 'eta')
            ->assertJsonPath('data.items.0.product', 'Frozen Vannamei');

        $this->assertDatabaseHas('transactions', [
            'booking_no' => 'AME26001',
            'issue_date' => '2026-05-11 00:00:00',
            'sales_person_id' => $salesPerson->id,
            'created_by_user_id' => $admin->id,
        ]);
        $this->assertDatabaseHas('transaction_logistics', [
            'transaction_id' => $response->json('data.id'),
            'mother_vessel' => 'VARADA V.081W',
            'container_no' => 'MNBU9177027',
            'temperature_recorder_location_row_no' => 'ROW 7',
            'discharge' => 'Montreal discharge',
            'at' => 'Terminal 1',
            'sc_inv_to_customer' => 'SC-1001',
        ]);

        CarbonImmutable::setTestNow();
    }

    public function test_logistics_can_create_transaction(): void
    {
        CarbonImmutable::setTestNow('2026-05-11 08:00:00');

        $logisticsUser = User::factory()->create(['role' => UserRole::Logistics->value]);
        $salesPerson = User::factory()->create(['role' => UserRole::Sales->value]);
        Transaction::query()->create([
            'booking_no' => 'AME26001',
            'booking_mode' => 'trade_commission',
            'created_by_user_id' => $logisticsUser->id,
        ]);
        $token = $logisticsUser->createToken('logistics-token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/transactions', [
                'transaction' => [
                    'booking_mode' => 'trade_commission',
                    'sales_person_id' => $salesPerson->id,
                    'destination' => 'Amman',
                    'certified' => true,
                ],
                'general_info_customer' => [
                    'customer' => 'Leader Food',
                ],
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.booking_no', 'AME26002')
            ->assertJsonPath('data.sales_person_id', $salesPerson->id);

        $this->assertDatabaseHas('transactions', [
            'booking_no' => 'AME26002',
            'sales_person_id' => $salesPerson->id,
            'created_by_user_id' => $logisticsUser->id,
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
                'items' => [
                    [
                        'product' => 'Updated Item',
                        'selling_total' => 88.88,
                    ],
                ],
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.booking_mode', 'qc_services')
            ->assertJsonPath('data.destination', 'Aqaba')
            ->assertJsonPath('data.expense_lines.0.line_key', 'new-line')
            ->assertJsonPath('data.items.0.product', 'Updated Item');

        $this->assertDatabaseMissing('transaction_expense_lines', [
            'transaction_id' => $transaction->id,
            'line_key' => 'old-line',
        ]);
    }

    public function test_admin_can_update_transaction_status_without_replacing_nested_rows(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        $transaction = Transaction::query()->create([
            'booking_no' => 'TRX-STATUS',
            'booking_mode' => 'trade_commission',
            'status' => 'U',
            'created_by_user_id' => $admin->id,
        ]);
        $transaction->items()->create(['product' => 'Keep Item', 'sort_order' => 0]);
        $transaction->expenseLines()->create([
            'section' => 'charges',
            'line_key' => 'keep-line',
            'sort_order' => 0,
        ]);

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/transactions/{$transaction->id}", [
                'transaction' => [
                    'booking_no' => 'TRX-STATUS',
                    'booking_mode' => 'trade_commission',
                    'status' => 'T',
                ],
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.status', 'T')
            ->assertJsonPath('data.items.0.product', 'Keep Item')
            ->assertJsonPath('data.expense_lines.0.line_key', 'keep-line');
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
        $transaction->items()->create(['product' => 'Item one', 'sort_order' => 0]);

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/transactions/{$transaction->id}/duplicate");

        $response
            ->assertCreated()
            ->assertJsonPath('message', 'Transaction duplicated successfully.')
            ->assertJsonPath('data.booking_no', 'TRX-3001-D1')
            ->assertJsonPath('data.notes.by_sales', 'Duplicate this')
            ->assertJsonPath('data.items.0.product', 'Item one');
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
