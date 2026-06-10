<?php

namespace Tests\Feature\Transactions;

use App\Enums\UserRole;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class TransactionItemApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_update_duplicate_move_and_delete_transaction_item(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        $transaction = Transaction::query()->create([
            'booking_no' => 'TRX-ITEM-1',
            'booking_mode' => 'trade_commission',
            'created_by_user_id' => $admin->id,
        ]);

        $createResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/transactions/{$transaction->id}/items", [
                'item' => [
                    'product' => 'Frozen Vannamei',
                    'packing' => '2',
                    'qty_booking' => 100,
                    'total_weight_value' => 8000,
                    'selling_unit_price' => 15,
                    'commission_from_packer' => 0.1,
                    'commission_from_customer' => 0.2,
                    'selling_total' => 1500,
                ],
            ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.items.0.product', 'Frozen Vannamei')
            ->assertJsonPath('data.items.0.total_weight_value', '200.00000')
            ->assertJsonPath('data.items.0.selling_total', '3000.00000')
            ->assertJsonPath('data.items.0.total_packer_commission', '20.00000')
            ->assertJsonPath('data.items.0.total_customer_commission', '40.00000');

        $itemId = $createResponse->json('data.items.0.id');

        $updateResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/transactions/{$transaction->id}/items/{$itemId}", [
                'item' => [
                    'product' => 'Frozen Vannamei Updated',
                    'qty_booking' => 120,
                    'selling_unit_price' => 20,
                ],
            ]);

        $updateResponse
            ->assertOk()
            ->assertJsonPath('data.items.0.product', 'Frozen Vannamei Updated')
            ->assertJsonPath('data.items.0.total_weight_value', '240.00000')
            ->assertJsonPath('data.items.0.selling_total', '4800.00000')
            ->assertJsonPath('data.items.0.total_packer_commission', '24.00000')
            ->assertJsonPath('data.items.0.total_customer_commission', '48.00000');

        $duplicateResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/transactions/{$transaction->id}/items/{$itemId}/duplicate");

        $duplicateResponse
            ->assertCreated()
            ->assertJsonCount(2, 'data.items');

        $secondItemId = $duplicateResponse->json('data.items.1.id');

        $moveResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/transactions/{$transaction->id}/items/{$secondItemId}/move", [
                'direction' => 'up',
            ]);

        $moveResponse
            ->assertOk()
            ->assertJsonPath('data.items.0.id', $secondItemId);

        $deleteResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/transactions/{$transaction->id}/items/{$itemId}");

        $deleteResponse
            ->assertOk()
            ->assertJsonCount(1, 'data.items');

        $this->assertDatabaseCount('transaction_items', 1);
    }

    public function test_logistics_can_create_update_duplicate_move_and_delete_transaction_item(): void
    {
        $logisticsUser = User::factory()->create(['role' => UserRole::Logistics->value]);
        $token = $logisticsUser->createToken('logistics-token')->plainTextToken;

        $transaction = Transaction::query()->create([
            'booking_no' => 'TRX-ITEM-LOGISTICS-1',
            'booking_mode' => 'trade_commission',
            'created_by_user_id' => $logisticsUser->id,
        ]);

        $createResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/transactions/{$transaction->id}/items", [
                'item' => [
                    'product' => 'Logistics Item',
                    'qty_booking' => 50,
                    'selling_unit_price' => 12,
                ],
            ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.items.0.product', 'Logistics Item');

        $itemId = $createResponse->json('data.items.0.id');

        $updateResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/transactions/{$transaction->id}/items/{$itemId}", [
                'item' => [
                    'product' => 'Logistics Item Updated',
                    'qty_booking' => 60,
                ],
            ]);

        $updateResponse
            ->assertOk()
            ->assertJsonPath('data.items.0.product', 'Logistics Item Updated');

        $duplicateResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/transactions/{$transaction->id}/items/{$itemId}/duplicate");

        $duplicateResponse
            ->assertCreated()
            ->assertJsonCount(2, 'data.items');

        $secondItemId = $duplicateResponse->json('data.items.1.id');

        $moveResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/transactions/{$transaction->id}/items/{$secondItemId}/move", [
                'direction' => 'up',
            ]);

        $moveResponse
            ->assertOk()
            ->assertJsonPath('data.items.0.id', $secondItemId);

        $deleteResponse = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/transactions/{$transaction->id}/items/{$itemId}");

        $deleteResponse
            ->assertOk()
            ->assertJsonCount(1, 'data.items');
    }

    public function test_item_can_calculate_cartons_from_weight_and_packing_when_quantity_is_missing(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        $transaction = Transaction::query()->create([
            'booking_no' => 'TRX-ITEM-WEIGHT-1',
            'booking_mode' => 'trade_commission',
            'created_by_user_id' => $admin->id,
        ]);

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/transactions/{$transaction->id}/items", [
                'item' => [
                    'product' => 'Frozen Vannamei',
                    'packing' => '6 * 1.8',
                    'total_weight_value' => 4321,
                    'selling_unit_price' => 9,
                    'buying_unit_price' => 4,
                    'commission_from_packer' => 0.1,
                ],
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.items.0.qty_value', '401.00000')
            ->assertJsonPath('data.items.0.total_weight_value', '4321.00000')
            ->assertJsonPath('data.items.0.selling_total', '38889.00000')
            ->assertJsonPath('data.items.0.buying_total', '17284.00000')
            ->assertJsonPath('data.items.0.total_packer_commission', '432.10000');
    }

    public function test_item_can_calculate_weight_from_oz_packing_description(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $token = $admin->createToken('admin-token')->plainTextToken;

        $transaction = Transaction::query()->create([
            'booking_no' => 'TRX-ITEM-OZ-1',
            'booking_mode' => 'trade_commission',
            'created_by_user_id' => $admin->id,
        ]);

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/transactions/{$transaction->id}/items", [
                'item' => [
                    'product' => 'Frozen Vannamei',
                    'packing' => '30 × 12 oz',
                    'qty_booking' => 1510,
                    'selling_unit_price' => 4.35,
                ],
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.items.0.total_weight_value', '33975.00000')
            ->assertJsonPath('data.items.0.selling_total', '147791.25000');
    }
}
