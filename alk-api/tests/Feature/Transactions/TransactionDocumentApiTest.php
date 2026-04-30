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
        $this->assertStringContainsString('ORDER CONFIRMATION', $payload['preview_html']);
        $this->assertStringContainsString('Alkamaris Exports Pvt Ltd', $payload['preview_html']);
        $this->assertStringContainsString('LEADER FOOD SUPPLY INSTITUTION', $payload['preview_html']);
        $this->assertStringContainsString('Comments or Special Instructions', $payload['preview_html']);
        $this->assertStringContainsString('Shipment Date', $payload['preview_html']);
        $this->assertStringContainsString('Packer', $payload['preview_html']);
        $this->assertStringContainsString('<td class="comment-label">Destination</td>', $payload['preview_html']);
        $this->assertStringContainsString('AQABA, JORDAN', $payload['preview_html']);
        $this->assertStringContainsString('For and on behalf of', $payload['preview_html']);
        $this->assertStringNotContainsString('For &amp; Behalf of', $payload['preview_html']);
        $this->assertStringNotContainsString('Confirmation &amp; Accepted by', $payload['preview_html']);
        $this->assertStringNotContainsString('Latest Shipment Date', $payload['preview_html']);
        $this->assertStringNotContainsString('<td class="comment-label">Customer</td>', $payload['preview_html']);
        $this->assertStringNotContainsString('<td class="comment-label">Commission</td>', $payload['preview_html']);
        $this->assertStringNotContainsString('<td class="comment-label">Note</td>', $payload['preview_html']);
    }

    public function test_bcv_lqd_document_uses_transaction_items(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::Admin->value,
        ]);

        $transaction = Transaction::query()->create([
            'booking_no' => 'SIF2502056',
            'booking_mode' => 'trade_commission',
            'issue_date' => '2025-10-13',
            'sales_person_id' => $admin->id,
            'destination' => 'Montreal, Canada',
            'created_by_user_id' => $admin->id,
        ]);

        GeneralInfoCustomer::query()->create([
            'transaction_id' => $transaction->id,
            'customer' => 'Select Source Seafood - Division Of AZ Gems Inc.',
            'attention' => 'Ms. Lillian Chow',
            'prices_customer_type' => 'CIF',
            'payment_customer_type' => 'T/T',
            'payment_customer_advance_percent' => 10,
            'payment_customer_term' => 'After CFIA passage',
        ]);

        GeneralInfoPacker::query()->create([
            'transaction_id' => $transaction->id,
            'packer_name' => 'Mourya Aquex Private Limited',
        ]);

        RevenueCustomer::query()->create([
            'transaction_id' => $transaction->id,
            'commission_enabled' => false,
        ]);

        ShippingDetailsPacker::query()->create([
            'transaction_id' => $transaction->id,
            'lsd_max' => '2025-11-30',
        ]);

        $transaction->items()->create([
            'product' => 'Frozen Vannamei White Shrimp',
            'style' => 'Raw Peeled & Deveined Tail On',
            'packing' => '16 x 285 GM(S) IQF',
            'brand' => "Buyer's",
            'notes' => '100 % NET WEIGHT Standard treatment',
            'size' => '31/40',
            'qty_booking' => 1748,
            'lqd_price' => 3.62,
            'lqd_currency' => 'USD',
            'lqd_unit_slug' => 'LB(S)',
            'lqd_total' => 63629.07,
        ]);

        $transaction->items()->create([
            'product' => 'Frozen Vannamei White Shrimp',
            'style' => 'Raw Peeled & Deveined Tail On',
            'packing' => '16 x 340 GM(S) IQF',
            'brand' => "Buyer's",
            'notes' => '100 % NET WEIGHT Standard treatment',
            'size' => '31/40',
            'qty_booking' => 500,
            'lqd_price' => 3.57,
            'lqd_currency' => 'USD',
            'lqd_unit_slug' => 'LB(S)',
            'lqd_total' => 21388.55,
        ]);

        $token = $admin->createToken('test-token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/transactions/{$transaction->id}/documents/render", [
                'document_types' => ['bcv_lqd'],
                'options' => [],
            ]);

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.type', 'bcv_lqd')
            ->assertJsonPath('data.0.pdf.filename', 'sif2502056-bcv-lqd.pdf');

        $payload = $response->json('data.0');

        $this->assertIsArray($payload);
        $this->assertNotEmpty(base64_decode($payload['pdf']['content_base64'], true));
        $this->assertStringContainsString('ORDER CONFIRMATION', $payload['preview_html']);
        $this->assertStringContainsString('Alkamaris Exports Pvt Ltd', $payload['preview_html']);
        $this->assertStringContainsString('FROZEN VANNAMEI WHITE SHRIMP', $payload['preview_html']);
        $this->assertStringContainsString('16 x 285 GM(S) IQF', $payload['preview_html']);
        $this->assertStringContainsString('1,748', $payload['preview_html']);
        $this->assertStringContainsString('3.620', $payload['preview_html']);
        $this->assertStringContainsString('63,629.07', $payload['preview_html']);
        $this->assertStringContainsString('85,017.62', $payload['preview_html']);
        $this->assertStringContainsString('broker/agent', $payload['preview_html']);
        $this->assertStringContainsString('Rajahmundry', $payload['preview_html']);
        $this->assertStringContainsString('ALKAMARIS EXPORTS(OPC)PVT LTD', $payload['preview_html']);
        $this->assertStringContainsString('MOURYA AQUEX PRIVATE LIMITED', $payload['preview_html']);
        $this->assertStringNotContainsString('8/12', $payload['preview_html']);
        $this->assertStringNotContainsString('119,300.00', $payload['preview_html']);
    }

    public function test_bcv_lqd_document_falls_back_to_item_selling_price_and_keeps_missing_amounts_blank(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::Admin->value,
        ]);

        $transaction = Transaction::query()->create([
            'booking_no' => 'SIF2502057',
            'booking_mode' => 'trade_commission',
            'issue_date' => '2025-10-14',
            'sales_person_id' => $admin->id,
            'created_by_user_id' => $admin->id,
        ]);

        GeneralInfoCustomer::query()->create([
            'transaction_id' => $transaction->id,
            'customer' => 'Select Source Seafood',
        ]);

        $transaction->items()->create([
            'product' => 'Frozen Shrimp',
            'size' => 'U/12',
            'qty_booking' => 550,
            'lqd_price' => null,
            'lqd_total' => 0,
            'lqd_currency' => 'USD',
            'lqd_unit_slug' => '1',
            'selling_unit_price' => 4.25,
            'selling_total' => 2337.50,
            'selling_currency' => 'USD',
            'selling_unit_slug' => 'LB(S)',
        ]);

        $transaction->items()->create([
            'product' => 'Missing Price Product',
            'size' => 'M/20',
            'qty_booking' => 10,
            'lqd_price' => null,
            'lqd_total' => 0,
        ]);

        $token = $admin->createToken('test-token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/transactions/{$transaction->id}/documents/render", [
                'document_types' => ['bcv_lqd'],
                'options' => [],
            ]);

        $response->assertOk();

        $html = $response->json('data.0.preview_html');

        $this->assertStringContainsString('U/12', $html);
        $this->assertStringContainsString('550', $html);
        $this->assertStringContainsString('Price US$/LB(S)', $html);
        $this->assertStringContainsString('4.250', $html);
        $this->assertStringContainsString('2,337.50', $html);
        $this->assertStringContainsString('MISSING PRICE PRODUCT', $html);
        $this->assertStringNotContainsString('Price US$/1', $html);
        $this->assertStringNotContainsString('>0.00</td>', $html);
    }
}
