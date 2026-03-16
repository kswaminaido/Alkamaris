<?php

namespace Tests\Feature\Transactions;

use App\Enums\UserRole;
use App\Models\GeneralInfoCustomer;
use App\Models\GeneralInfoPacker;
use App\Models\RevenueCustomer;
use App\Models\ShippingDetailsPacker;
use App\Models\Transaction;
use App\Models\TransactionNote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class TransactionDocumentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_render_transaction_documents(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::Admin->value,
        ]);

        $transaction = Transaction::query()->create([
            'booking_no' => 'SIN2605802',
            'booking_mode' => 'trade_commission',
            'issue_date' => '2026-01-24',
            'sales_person_id' => $admin->id,
            'destination' => 'AQABA, JORDAN',
            'type' => 'Trade',
            'container_primary' => '10 x 1 KG(S) IQF',
            'created_by_user_id' => $admin->id,
        ]);

        GeneralInfoCustomer::query()->create([
            'transaction_id' => $transaction->id,
            'customer' => 'Leader Food Supply Institution',
            'attention' => 'Mr. Yousef Aziz',
            'prices_customer_type' => 'CFR',
            'payment_customer_advance_percent' => 30,
        ]);

        GeneralInfoPacker::query()->create([
            'transaction_id' => $transaction->id,
            'vendor' => 'Plain+Header Card',
            'packer_name' => 'Contai Marine Fish Export Private Limited',
        ]);

        RevenueCustomer::query()->create([
            'transaction_id' => $transaction->id,
            'description' => 'Frozen Vannamei White Shrimp',
        ]);

        ShippingDetailsPacker::query()->create([
            'transaction_id' => $transaction->id,
            'lsd_max' => '2026-02-28',
        ]);

        TransactionNote::query()->create([
            'transaction_id' => $transaction->id,
            'by_sales' => '35% glaze frozen weight & frozen count. EU standard treatment',
        ]);

        $token = $admin->createToken('test-token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/transactions/{$transaction->id}/documents/render", [
                'document_types' => ['bcb_lqd'],
                'options' => [
                    'print_revised' => 'No',
                    'template' => 'India',
                    'approve_code' => 'APR-01',
                    'articles' => ['Article body 1', 'Article body 2'],
                    'attachments' => ['Commercial Invoice', 'Packing List'],
                ],
            ]);

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.type', 'bcb_lqd')
            ->assertJsonPath('data.0.word.filename', 'sin2605802-bcb-lqd.doc')
            ->assertJsonPath('data.0.pdf.filename', 'sin2605802-bcb-lqd.pdf');

        $payload = $response->json('data.0');

        $this->assertIsArray($payload);
        $this->assertNotEmpty(base64_decode($payload['pdf']['content_base64'], true));
        $this->assertNotEmpty(base64_decode($payload['word']['content_base64'], true));
        $this->assertStringContainsString('BOOKING CONFIRMATION', $payload['preview_html']);
        $this->assertStringContainsString('LEADER FOOD SUPPLY INSTITUTION', $payload['preview_html']);
    }
}
