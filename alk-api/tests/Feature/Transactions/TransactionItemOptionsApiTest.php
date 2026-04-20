<?php

namespace Tests\Feature\Transactions;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionItemOptionsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_fetch_transaction_item_options(): void
    {
        $user = User::factory()->create([
            'role' => 'admin',
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/transaction-item-options');

        $response
            ->assertOk()
            ->assertJsonStructure([
                'data' => ['product', 'style', 'packing', 'brand', 'size'],
            ]);

        $this->assertContains('FROZEN VANNAMEI WHITE SHRIMP', $response->json('data.product', []));
        $this->assertContains('RAW PEELED UNDEVEINED TAIL OFF', $response->json('data.style', []));
        $this->assertContains('1 x 10 KG IQF', $response->json('data.packing', []));
        $this->assertContains("BUYER'S", $response->json('data.brand', []));
        $this->assertContains('8/12.', $response->json('data.size', []));
    }
}
