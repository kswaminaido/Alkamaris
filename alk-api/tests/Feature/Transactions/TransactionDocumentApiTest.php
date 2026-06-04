<?php

namespace Tests\Feature\Transactions;

use App\Enums\UserRole;
use App\Models\GeneralInfoCustomer;
use App\Models\GeneralInfoPacker;
use App\Models\RevenueCustomer;
use App\Models\ShippingDetailsPacker;
use App\Models\Transaction;
use App\Models\TransactionNote;
use App\Models\TransactionNoteEntry;
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

        User::factory()->create([
            'role' => UserRole::Packer->value,
            'name' => 'Contai Contact',
            'firm_name' => 'Contai Marine Fish Export Private Limited',
            'registration_number' => 'PACK-CONT-4455',
        ]);

        GeneralInfoCustomer::query()->create([
            'transaction_id' => $transaction->id,
            'customer' => 'Leader Food Supply Institution',
            'attention' => 'Mr. Yousef Aziz',
            'prices_customer_type' => 'DDP',
            'prices_customer_rate' => 'Japan',
            'payment_customer_advance_percent' => 30,
            'payment_customer_term' => 'Advance',
            'description' => 'Customer delivery by appointment only.',
        ]);

        GeneralInfoPacker::query()->create([
            'transaction_id' => $transaction->id,
            'vendor' => 'Contai Contact',
            'packer_number' => 'MANUAL-BCB-999',
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

        TransactionNoteEntry::query()->create([
            'transaction_id' => $transaction->id,
            'section' => 'home',
            'note_key' => 'for_customer',
            'note_value' => 'Customer should inspect goods on arrival.',
            'sort_order' => 0,
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
            ->assertJsonPath('data.0.pdf.filename', 'SIN2605802-BCB-LQD.PDF');

        $payload = $response->json('data.0');

        $this->assertIsArray($payload);
        $this->assertNotEmpty(base64_decode($payload['pdf']['content_base64'], true));
        $this->assertNotEmpty(base64_decode($payload['word']['content_base64'], true));
        $wordContent = base64_decode($payload['word']['content_base64'], true);
        $this->assertIsString($wordContent);
        $this->assertStringContainsString('Content-Type: multipart/related', $wordContent);
        $this->assertStringContainsString('Content-ID: <image0@alkamaris>', $wordContent);
        $this->assertStringContainsString('font-size: 7.5pt', quoted_printable_decode($wordContent));
        $this->assertStringContainsString('border: 0.75pt solid #000', quoted_printable_decode($wordContent));
        $this->assertStringContainsString('class="customer-signature-line" style="border-top:0.75pt solid #000', quoted_printable_decode($wordContent));
        $this->assertStringContainsString('bgcolor="#061173"', quoted_printable_decode($wordContent));
        $this->assertStringContainsString('class="main items" border="1"', quoted_printable_decode($wordContent));
        $this->assertStringContainsString('ORDER CONFIRMATION', $payload['preview_html']);
        $this->assertStringContainsString('src="data:image/png;base64,', $payload['preview_html']);
        $this->assertStringContainsString('Alkamaris Exports Pvt Ltd', $payload['preview_html']);
        $this->assertStringContainsString('LEADER FOOD SUPPLY INSTITUTION', $payload['preview_html']);
        $this->assertStringContainsString('Comments or Special Instructions', $payload['preview_html']);
        $this->assertStringContainsString('Shipment Date', $payload['preview_html']);
        $this->assertStringContainsString('Packer', $payload['preview_html']);
        $this->assertMatchesRegularExpression(
            '/<td class="comment-label">Packer<\/td>\s*<td class="comment-value">CONTAI MARINE FISH EXPORT PRIVATE LIMITED<\/td>/',
            $payload['preview_html'],
        );
        $this->assertStringContainsString('DDP, JAPAN', $payload['preview_html']);
        $this->assertStringContainsString('30 % DEPOSIT', $payload['preview_html']);
        $this->assertStringNotContainsString('AND BALANCE ADVANCE', $payload['preview_html']);
        $this->assertMatchesRegularExpression(
            '/<td class="comment-label">Payment<\/td>\s*<td class="comment-value">30 % DEPOSIT<br\s*\/?>\s*CUSTOMER DELIVERY BY APPOINTMENT ONLY\.<\/td>/',
            $payload['preview_html'],
        );
        $this->assertStringContainsString('<td class="comment-label">Destination</td>', $payload['preview_html']);
        $this->assertStringContainsString('AQABA, JORDAN', $payload['preview_html']);
        $this->assertStringContainsString('<td class="comment-label">Factory Approval Number</td>', $payload['preview_html']);
        $this->assertStringContainsString('PACK-CONT-4455', $payload['preview_html']);
        $this->assertDoesNotMatchRegularExpression(
            '/<td class="comment-label">Factory Approval Number<\/td>\s*<td class="comment-value">MANUAL-BCB-999<\/td>/',
            $payload['preview_html'],
        );
        $this->assertStringContainsString('<td class="comment-label">Note</td>', $payload['preview_html']);
        $this->assertStringContainsString('CUSTOMER SHOULD INSPECT GOODS ON ARRIVAL.', $payload['preview_html']);
        $this->assertStringContainsString('For &amp; Behalf of', $payload['preview_html']);
        $this->assertStringNotContainsString('For and on behalf of', $payload['preview_html']);
        $this->assertStringNotContainsString('Confirmation &amp; Accepted by', $payload['preview_html']);
        $this->assertStringNotContainsString('Latest Shipment Date', $payload['preview_html']);
        $this->assertStringNotContainsString('<td class="comment-label">Customer</td>', $payload['preview_html']);
        $this->assertStringNotContainsString('<td class="comment-label">Commission</td>', $payload['preview_html']);
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

        User::factory()->create([
            'role' => UserRole::Packer->value,
            'name' => 'Mourya Contact',
            'firm_name' => 'Mourya Aquex Private Limited',
            'registration_number' => 'PACK-MOURYA-7788',
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
            'packer_number' => 'MANUAL-BCV-999',
            'prices_packer_type' => 'DAP',
            'prices_packer_rate' => 'Vietnam',
            'payment_packer_type' => 'T/T',
            'payment_packer_advance_percent' => 20,
            'payment_packer_term' => 'Advance',
            'description' => 'Use customer approved cartons.',
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

        TransactionNoteEntry::query()->create([
            'transaction_id' => $transaction->id,
            'section' => 'home',
            'note_key' => 'for_packer',
            'note_value' => 'Packer must confirm loading photos before dispatch.',
            'sort_order' => 0,
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
            ->assertJsonPath('data.0.pdf.filename', 'SIF2502056-BCV-LQD.PDF');

        $payload = $response->json('data.0');

        $this->assertIsArray($payload);
        $this->assertNotEmpty(base64_decode($payload['pdf']['content_base64'], true));
        $wordContent = base64_decode($payload['word']['content_base64'], true);
        $this->assertIsString($wordContent);
        $this->assertStringContainsString('class="signature-line" style="border-top:0.75pt solid #000', quoted_printable_decode($wordContent));
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
        $this->assertMatchesRegularExpression(
            '/<td class="comment-label">Packer<\/td>\s*<td class="comment-value">MOURYA AQUEX PRIVATE LIMITED<\/td>/',
            $payload['preview_html'],
        );
        $this->assertStringContainsString('DAP, VIETNAM', $payload['preview_html']);
        $this->assertStringContainsString('<td class="comment-label">Factory Approval Number</td>', $payload['preview_html']);
        $this->assertStringContainsString('PACK-MOURYA-7788', $payload['preview_html']);
        $this->assertDoesNotMatchRegularExpression(
            '/<td class="comment-label">Factory Approval Number<\/td>\s*<td class="comment-value">MANUAL-BCV-999<\/td>/',
            $payload['preview_html'],
        );
        $this->assertStringContainsString('T/T 20 % DEPOSIT', $payload['preview_html']);
        $this->assertStringNotContainsString('AND BALANCE ADVANCE', $payload['preview_html']);
        $this->assertMatchesRegularExpression(
            '/<td class="comment-label">Payment<\/td>\s*<td class="comment-value">T\/T 20 % DEPOSIT<br\s*\/?>\s*USE CUSTOMER APPROVED CARTONS\.<\/td>/',
            $payload['preview_html'],
        );
        $this->assertStringContainsString('authorization-signature', $payload['preview_html']);
        $this->assertStringContainsString('authorization-stamp', $payload['preview_html']);
        $this->assertMatchesRegularExpression(
            '/\.signature-block\s*\{[^}]*width:\s*82%/s',
            quoted_printable_decode($wordContent),
        );
        $this->assertStringContainsString('PACKER MUST CONFIRM LOADING PHOTOS BEFORE DISPATCH.', $payload['preview_html']);
        $this->assertStringNotContainsString('The above prices has included commission', $payload['preview_html']);
        $this->assertStringNotContainsString('A Separate invoice will be sent after shipment from our office.', $payload['preview_html']);
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
        $this->assertStringNotContainsString('A Separate invoice will be sent after shipment from our office.', $html);
        $this->assertStringNotContainsString('<td class="comment-label">Note</td>', $html);
    }

    public function test_bcv_and_bcb_factory_approval_number_do_not_fall_back_to_packer_number(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::Admin->value,
        ]);

        $transaction = Transaction::query()->create([
            'booking_no' => 'SIF2502058',
            'booking_mode' => 'trade_commission',
            'issue_date' => '2025-10-15',
            'sales_person_id' => $admin->id,
            'created_by_user_id' => $admin->id,
        ]);

        GeneralInfoCustomer::query()->create([
            'transaction_id' => $transaction->id,
            'customer' => 'Select Source Seafood',
            'buyer' => 'PO',
            'buyer_number' => '123',
        ]);

        GeneralInfoPacker::query()->create([
            'transaction_id' => $transaction->id,
            'packer_name' => 'PI',
            'packer_number' => '456',
        ]);

        $transaction->items()->create([
            'product' => 'Frozen Shrimp',
            'size' => '31/40',
            'qty_booking' => 100,
            'lqd_price' => 3.25,
            'lqd_currency' => 'USD',
            'lqd_unit_slug' => 'LB(S)',
            'lqd_total' => 325,
        ]);

        $token = $admin->createToken('test-token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/transactions/{$transaction->id}/documents/render", [
                'document_types' => ['bcv_lqd', 'bcb_lqd'],
                'options' => [],
            ]);

        $response->assertOk()->assertJsonCount(2, 'data');

        foreach ($response->json('data') as $document) {
            $this->assertStringContainsString('<td class="comment-label">Factory Approval Number</td>', $document['preview_html']);
            $this->assertStringContainsString('<td class="order-ref-label">Buyer\'s</td>', $document['preview_html']);
            $this->assertStringContainsString('<td>PO 123</td>', $document['preview_html']);
            $this->assertStringContainsString('<td class="order-ref-label">Packer\'s</td>', $document['preview_html']);
            $this->assertStringContainsString('<td>PI 456</td>', $document['preview_html']);
            $this->assertDoesNotMatchRegularExpression(
                '/<td class="comment-label">Factory Approval Number<\/td>\s*<td class="comment-value">PI 456<\/td>/',
                $document['preview_html'],
            );
        }
    }

    public function test_bcv_and_bcb_factory_approval_number_uses_packer_firm_when_registration_is_missing(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::Admin->value,
        ]);

        $transaction = Transaction::query()->create([
            'booking_no' => 'SIF2502059',
            'booking_mode' => 'trade_commission',
            'issue_date' => '2025-10-16',
            'sales_person_id' => $admin->id,
            'created_by_user_id' => $admin->id,
        ]);

        User::factory()->create([
            'role' => UserRole::Packer->value,
            'name' => 'Fallback Packer Contact',
            'firm_name' => 'FIRM-PACKER-4455',
            'registration_number' => null,
        ]);

        GeneralInfoCustomer::query()->create([
            'transaction_id' => $transaction->id,
            'customer' => 'Select Source Seafood',
        ]);

        GeneralInfoPacker::query()->create([
            'transaction_id' => $transaction->id,
            'packer_name' => 'FIRM-PACKER-4455',
            'packer_number' => 'PACKER-FORM-NO-456',
        ]);

        $transaction->items()->create([
            'product' => 'Frozen Shrimp',
            'size' => '31/40',
            'qty_booking' => 100,
            'lqd_price' => 3.25,
            'lqd_currency' => 'USD',
            'lqd_unit_slug' => 'LB(S)',
            'lqd_total' => 325,
        ]);

        $token = $admin->createToken('test-token')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/transactions/{$transaction->id}/documents/render", [
                'document_types' => ['bcv_lqd', 'bcb_lqd'],
                'options' => [],
            ]);

        $response->assertOk()->assertJsonCount(2, 'data');

        foreach ($response->json('data') as $document) {
            $this->assertStringContainsString('<td class="comment-label">Factory Approval Number</td>', $document['preview_html']);
            $this->assertStringContainsString('FIRM-PACKER-4455', $document['preview_html']);
            $this->assertDoesNotMatchRegularExpression(
                '/<td class="comment-label">Factory Approval Number<\/td>\s*<td class="comment-value">PACKER-FORM-NO-456<\/td>/',
                $document['preview_html'],
            );
        }
    }
}
