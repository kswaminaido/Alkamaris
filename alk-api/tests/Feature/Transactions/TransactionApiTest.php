<?php

namespace Tests\Feature\Transactions;

use App\Enums\TransactionStatus;
use App\Enums\UserRole;
use App\Models\Transaction;
use App\Models\User;
use App\Models\UsersEventLog;
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
            ->assertJsonPath('data.booking_no', 'AME26301')
            ->assertJsonPath('data.general_info_customer.customer', 'Leader Food')
            ->assertJsonPath('data.issue_date', '2026-05-11')
            ->assertJsonPath('data.sales_person_id', $salesPerson->id)
            ->assertJsonPath('data.product_origin', null)
            ->assertJsonPath('data.notes.by_sales', 'Priority shipment')
            ->assertJsonPath('data.logistics.mother_vessel', 'VARADA V.081W')
            ->assertJsonPath('data.logistics.temperature_recorder_location_row_no', 'ROW 7')
            ->assertJsonPath('data.logistics.sc_inv_to_customer', 'SC-1001')
            ->assertJsonPath('data.expense_lines.0.line_key', 'freight')
            ->assertJsonPath('data.note_entries.0.note_key', 'eta')
            ->assertJsonPath('data.items.0.product', 'Frozen Vannamei');

        $this->assertDatabaseHas('transactions', [
            'booking_no' => 'AME26301',
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
            'booking_no' => 'AME26301',
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
            ->assertJsonPath('data.booking_no', 'AME26302')
            ->assertJsonPath('data.sales_person_id', $salesPerson->id);

        $this->assertDatabaseHas('transactions', [
            'booking_no' => 'AME26302',
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

    public function test_transaction_resource_uses_latest_audit_user_for_last_modified_by(): void
    {
        $creator = User::factory()->create([
            'name' => 'Original Creator',
            'role' => UserRole::Admin->value,
        ]);
        $updater = User::factory()->create([
            'name' => 'Recent Updater',
            'role' => UserRole::Admin->value,
        ]);
        $salesPerson = User::factory()->create([
            'name' => 'Assigned Sales',
            'role' => UserRole::Sales->value,
        ]);

        $token = $creator->createToken('creator-token')->plainTextToken;
        $transaction = Transaction::query()->create([
            'booking_no' => 'TRX-AUDIT',
            'booking_mode' => 'trade_commission',
            'sales_person_id' => $salesPerson->id,
            'created_by_user_id' => $creator->id,
        ]);

        UsersEventLog::query()->create([
            'user_id' => $creator->id,
            'user_name' => $creator->name,
            'event_type' => 'Transaction',
            'data' => [
                'action' => 'Transaction created',
                'record_id' => $transaction->id,
            ],
            'created_at' => now()->subMinutes(2),
            'updated_at' => now()->subMinutes(2),
        ]);
        UsersEventLog::query()->create([
            'user_id' => $updater->id,
            'user_name' => $updater->name,
            'event_type' => 'Transaction',
            'data' => [
                'action' => 'Transaction updated',
                'record_id' => $transaction->id,
            ],
            'created_at' => now()->subMinute(),
            'updated_at' => now()->subMinute(),
        ]);

        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/transactions/{$transaction->id}")
            ->assertOk()
            ->assertJsonPath('data.updated_by.name', 'Recent Updater');
    }

    public function test_transaction_resource_falls_back_to_creator_when_no_audit_events_exist(): void
    {
        $creator = User::factory()->create([
            'name' => 'Creator Without Logs',
            'role' => UserRole::Admin->value,
        ]);
        $token = $creator->createToken('admin-token')->plainTextToken;

        $transaction = Transaction::query()->create([
            'booking_no' => 'TRX-NO-LOGS',
            'booking_mode' => 'trade_commission',
            'created_by_user_id' => $creator->id,
        ]);

        UsersEventLog::query()->delete();

        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/transactions/{$transaction->id}")
            ->assertOk()
            ->assertJsonPath('data.updated_by.name', 'Creator Without Logs');
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

    public function test_first_bl_date_entry_marks_unshipped_transaction_as_shipped(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        $transaction = Transaction::query()->create([
            'booking_no' => 'TRX-FIRST-BL',
            'booking_mode' => 'trade_commission',
            'status' => TransactionStatus::Unshipped->value,
            'created_by_user_id' => $admin->id,
        ]);
        $transaction->logistics()->create(['bl_no' => 'BL-100']);

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/transactions/{$transaction->id}", [
                'transaction' => [
                    'booking_no' => 'TRX-FIRST-BL',
                    'booking_mode' => 'trade_commission',
                    'status' => TransactionStatus::Unshipped->value,
                ],
                'logistics' => [
                    'bl_no' => 'BL-100',
                    'bl_date' => '2026-06-14',
                ],
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.status', TransactionStatus::Shipped->value)
            ->assertJsonPath('data.logistics.bl_date', '2026-06-14T00:00:00.000000Z');

        $this->assertDatabaseHas('transactions', [
            'id' => $transaction->id,
            'status' => TransactionStatus::Shipped->value,
        ]);
    }

    public function test_bl_date_entry_does_not_change_non_unshipped_transaction_status(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        $transaction = Transaction::query()->create([
            'booking_no' => 'TRX-BL-PENDING',
            'booking_mode' => 'trade_commission',
            'status' => TransactionStatus::Unpaid->value,
            'created_by_user_id' => $admin->id,
        ]);

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/transactions/{$transaction->id}", [
                'transaction' => [
                    'booking_no' => 'TRX-BL-PENDING',
                    'booking_mode' => 'trade_commission',
                    'status' => TransactionStatus::Unpaid->value,
                ],
                'logistics' => [
                    'bl_date' => '2026-06-14',
                ],
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.status', TransactionStatus::Unpaid->value)
            ->assertJsonPath('data.logistics.bl_date', '2026-06-14T00:00:00.000000Z');

        $this->assertDatabaseHas('transactions', [
            'id' => $transaction->id,
            'status' => TransactionStatus::Unpaid->value,
        ]);
    }

    public function test_existing_bl_date_edits_mark_unshipped_transaction_as_shipped(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        $transaction = Transaction::query()->create([
            'booking_no' => 'TRX-BL-EXISTS',
            'booking_mode' => 'trade_commission',
            'status' => TransactionStatus::Unshipped->value,
            'created_by_user_id' => $admin->id,
        ]);
        $transaction->logistics()->create(['bl_date' => '2026-06-10']);

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/transactions/{$transaction->id}", [
                'transaction' => [
                    'booking_no' => 'TRX-BL-EXISTS',
                    'booking_mode' => 'trade_commission',
                    'status' => TransactionStatus::Unshipped->value,
                ],
                'logistics' => [
                    'bl_date' => '2026-06-14',
                ],
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.status', TransactionStatus::Shipped->value)
            ->assertJsonPath('data.logistics.bl_date', '2026-06-14T00:00:00.000000Z');

        $this->assertDatabaseHas('transactions', [
            'id' => $transaction->id,
            'status' => TransactionStatus::Shipped->value,
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
        $transaction->items()->create(['product' => 'Item one', 'sort_order' => 0]);

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/transactions/{$transaction->id}/duplicate");

        $response
            ->assertCreated()
            ->assertJsonPath('message', 'Transaction duplicated successfully.')
            ->assertJsonPath('data.booking_no', 'TRX-3002')
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

    public function test_index_summary_commissions_include_all_matching_transactions_not_only_current_page(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        foreach (range(1, 6) as $index) {
            $transaction = Transaction::query()->create([
                'booking_no' => "TRX-COM-PAGE-{$index}",
                'booking_mode' => 'trade_commission',
                'status' => TransactionStatus::Invoice->value,
                'created_by_user_id' => $admin->id,
            ]);

            $transaction->items()->create([
                'product' => "Commission Item {$index}",
                'total_packer_commission' => $index,
                'total_customer_commission' => $index * 2,
                'sort_order' => 0,
            ]);
        }

        $excluded = Transaction::query()->create([
            'booking_no' => 'TRX-COM-EXCLUDED',
            'booking_mode' => 'trade_commission',
            'status' => TransactionStatus::Unpaid->value,
            'created_by_user_id' => $admin->id,
        ]);
        $excluded->items()->create([
            'product' => 'Excluded Item',
            'total_packer_commission' => 100,
            'total_customer_commission' => 200,
            'sort_order' => 0,
        ]);

        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/transactions?status=I&per_page=5')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('pagination.total', 6)
            ->assertJsonPath('summary.buyer_commission_total', 42)
            ->assertJsonPath('summary.packer_commission_total', 21)
            ->assertJsonPath('summary.total_commission', 63);
    }

    public function test_index_can_filter_transactions_by_sales_person(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $firstSalesPerson = User::factory()->create(['role' => UserRole::Sales->value]);
        $secondSalesPerson = User::factory()->create(['role' => UserRole::Sales->value]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        Transaction::query()->create([
            'booking_no' => 'TRX-SALES-ONE',
            'booking_mode' => 'trade_commission',
            'sales_person_id' => $firstSalesPerson->id,
            'created_by_user_id' => $admin->id,
        ]);
        Transaction::query()->create([
            'booking_no' => 'TRX-SALES-TWO',
            'booking_mode' => 'trade_commission',
            'sales_person_id' => $secondSalesPerson->id,
            'created_by_user_id' => $admin->id,
        ]);
        Transaction::query()->create([
            'booking_no' => 'TRX-SALES-THREE',
            'booking_mode' => 'trade_commission',
            'sales_person_id' => $firstSalesPerson->id,
            'created_by_user_id' => $admin->id,
        ]);

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/transactions?sales_person_id={$firstSalesPerson->id}&per_page=10");

        $response
            ->assertOk()
            ->assertJsonPath('pagination.total', 2);

        $bookingNumbers = collect($response->json('data'))->pluck('booking_no')->all();

        $this->assertEqualsCanonicalizing([
            'TRX-SALES-ONE',
            'TRX-SALES-THREE',
        ], $bookingNumbers);
    }

    public function test_index_sorts_recently_created_transactions_first_after_item_updates(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        CarbonImmutable::setTestNow('2026-06-14 08:00:00');
        $olderTransaction = Transaction::query()->create([
            'booking_no' => 'TRX-ITEM-UPDATED',
            'booking_mode' => 'trade_commission',
            'created_by_user_id' => $admin->id,
        ]);
        $item = $olderTransaction->items()->create([
            'product' => 'Original Item',
            'sort_order' => 0,
        ]);

        CarbonImmutable::setTestNow('2026-06-14 09:00:00');
        Transaction::query()->create([
            'booking_no' => 'TRX-NEWER-ID',
            'booking_mode' => 'trade_commission',
            'created_by_user_id' => $admin->id,
        ]);

        CarbonImmutable::setTestNow('2026-06-14 10:00:00');
        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/transactions/{$olderTransaction->id}/items/{$item->id}", [
                'item' => [
                    'product' => 'Updated Item',
                ],
            ])
            ->assertOk();

        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/transactions?per_page=5')
            ->assertOk()
            ->assertJsonPath('data.0.booking_no', 'TRX-NEWER-ID');

        CarbonImmutable::setTestNow();
    }

    public function test_index_sorts_recently_created_transactions_first_after_detail_updates(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        CarbonImmutable::setTestNow('2026-06-14 08:00:00');
        $olderTransaction = Transaction::query()->create([
            'booking_no' => 'TRX-DETAIL-UPDATED',
            'booking_mode' => 'trade_commission',
            'created_by_user_id' => $admin->id,
        ]);
        $olderTransaction->logistics()->create(['container_no' => 'OLD-CONTAINER']);

        CarbonImmutable::setTestNow('2026-06-14 09:00:00');
        Transaction::query()->create([
            'booking_no' => 'TRX-DETAIL-NEWER-ID',
            'booking_mode' => 'trade_commission',
            'created_by_user_id' => $admin->id,
        ]);

        CarbonImmutable::setTestNow('2026-06-14 10:00:00');
        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/transactions/{$olderTransaction->id}", [
                'transaction' => [
                    'booking_no' => 'TRX-DETAIL-UPDATED',
                    'booking_mode' => 'trade_commission',
                ],
                'logistics' => [
                    'container_no' => 'NEW-CONTAINER',
                ],
            ])
            ->assertOk();

        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/transactions?per_page=5')
            ->assertOk()
            ->assertJsonPath('data.0.booking_no', 'TRX-DETAIL-NEWER-ID');

        CarbonImmutable::setTestNow();
    }

    public function test_index_can_sort_unshipped_transactions_ascending_when_requested(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        CarbonImmutable::setTestNow('2026-06-14 08:00:00');
        Transaction::query()->create([
            'booking_no' => 'TRX-UNSHIPPED-OLDER',
            'booking_mode' => 'trade_commission',
            'status' => TransactionStatus::Unshipped->value,
            'created_by_user_id' => $admin->id,
        ]);

        CarbonImmutable::setTestNow('2026-06-14 09:00:00');
        Transaction::query()->create([
            'booking_no' => 'TRX-UNSHIPPED-NEWER',
            'booking_mode' => 'trade_commission',
            'status' => TransactionStatus::Unshipped->value,
            'created_by_user_id' => $admin->id,
        ]);

        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/transactions?status=U&sort_direction=asc&per_page=5')
            ->assertOk()
            ->assertJsonPath('data.0.booking_no', 'TRX-UNSHIPPED-OLDER')
            ->assertJsonPath('data.1.booking_no', 'TRX-UNSHIPPED-NEWER');

        CarbonImmutable::setTestNow();
    }

    public function test_index_can_filter_overdue_invoice_transactions(): void
    {
        CarbonImmutable::setTestNow('2026-06-13 08:00:00');

        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        $customerOverdue = Transaction::query()->create([
            'booking_no' => 'TRX-CUSTOMER-OVERDUE',
            'booking_mode' => 'trade_commission',
            'status' => TransactionStatus::Unshipped->value,
            'created_by_user_id' => $admin->id,
        ]);
        $customerOverdue->shippingDetailsCustomer()->create(['lsd_min' => '2026-06-12']);

        $packerOverdue = Transaction::query()->create([
            'booking_no' => 'TRX-PACKER-OVERDUE',
            'booking_mode' => 'trade_commission',
            'status' => TransactionStatus::Unshipped->value,
            'created_by_user_id' => $admin->id,
        ]);
        $packerOverdue->shippingDetailsPacker()->create(['lsd_min' => '2026-06-11']);

        $futureUnshipped = Transaction::query()->create([
            'booking_no' => 'TRX-FUTURE',
            'booking_mode' => 'trade_commission',
            'status' => TransactionStatus::Unshipped->value,
            'created_by_user_id' => $admin->id,
        ]);
        $futureUnshipped->shippingDetailsCustomer()->create(['lsd_min' => '2026-06-14']);

        $invoiceOverdue = Transaction::query()->create([
            'booking_no' => 'TRX-INVOICE',
            'booking_mode' => 'trade_commission',
            'status' => TransactionStatus::Invoice->value,
            'created_by_user_id' => $admin->id,
        ]);
        $invoiceOverdue->shippingDetailsCustomer()->create(['lsd_min' => '2026-06-10']);

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/transactions?overdue_invoice=1&per_page=10');

        $response
            ->assertOk()
            ->assertJsonPath('pagination.total', 2);

        $bookingNumbers = collect($response->json('data'))->pluck('booking_no')->all();

        $this->assertEqualsCanonicalizing([
            'TRX-CUSTOMER-OVERDUE',
            'TRX-PACKER-OVERDUE',
        ], $bookingNumbers);

        CarbonImmutable::setTestNow();
    }

    public function test_admin_can_read_dashboard_commission_summary(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        $received = Transaction::query()->create([
            'booking_no' => 'TRX-COM-COLLECTED',
            'booking_mode' => 'trade_commission',
            'status' => TransactionStatus::Received->value,
            'created_by_user_id' => $admin->id,
        ]);
        $received->items()->create([
            'product' => 'Collected Item',
            'selling_total' => 110.25,
            'total_packer_commission' => 10.25,
            'total_customer_commission' => 5.75,
        ]);

        $pending = Transaction::query()->create([
            'booking_no' => 'TRX-COM-PENDING',
            'booking_mode' => 'trade_commission',
            'status' => TransactionStatus::Invoice->value,
            'created_by_user_id' => $admin->id,
        ]);
        $pending->items()->create([
            'product' => 'Pending Item',
            'selling_total' => 60.25,
            'total_packer_commission' => 7.50,
            'total_customer_commission' => 2.25,
        ]);
        $pending->revenueCustomer()->create([
            'amount' => 125.75,
            'amount_currency' => 'USD',
        ]);
        $unshipped = Transaction::query()->create([
            'booking_no' => 'TRX-COM-UNSHIPPED',
            'booking_mode' => 'trade_commission',
            'status' => TransactionStatus::Unshipped->value,
            'created_by_user_id' => $admin->id,
        ]);
        $unshipped->items()->create([
            'product' => 'Unshipped Item',
            'selling_total' => 40.00,
            'total_packer_commission' => 3.00,
            'total_customer_commission' => 2.00,
        ]);

        $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/dashboard/commission-summary')
            ->assertOk()
            ->assertJsonPath('data.total_collected_commission', 16)
            ->assertJsonPath('data.total_pending_commission', 14.75)
            ->assertJsonPath('data.status_summary.0.status', TransactionStatus::Invoice->value)
            ->assertJsonPath('data.status_summary.0.transaction_count', 1)
            ->assertJsonPath('data.status_summary.0.total_commission_value', 9.75)
            ->assertJsonPath('data.status_summary.4.status', TransactionStatus::Received->value)
            ->assertJsonPath('data.status_summary.4.transaction_count', 1)
            ->assertJsonPath('data.status_summary.4.total_commission_value', 16)
            ->assertJsonPath('data.status_summary.5.status', TransactionStatus::Unshipped->value)
            ->assertJsonPath('data.status_summary.5.transaction_count', 1)
            ->assertJsonPath('data.status_summary.5.total_commission_value', 5);
    }
}
