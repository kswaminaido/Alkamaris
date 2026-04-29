<?php

namespace Tests\Feature\Transactions;

use App\Enums\UserRole;
use App\Models\Transaction;
use App\Models\TransactionItem;
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
            ->assertJsonPath('data.items.0.selling_total', '3000.00000')
            ->assertJsonPath('data.items.0.total_packer_commission', '800.00000')
            ->assertJsonPath('data.items.0.total_customer_commission', '1600.00000');

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
            ->assertJsonPath('data.items.0.selling_total', '4800.00000')
            ->assertJsonPath('data.items.0.total_packer_commission', '800.00000')
            ->assertJsonPath('data.items.0.total_customer_commission', '1600.00000');

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
}
