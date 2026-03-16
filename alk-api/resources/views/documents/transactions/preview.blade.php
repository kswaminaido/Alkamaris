<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{{ $view['label'] }}</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #eef3fb; color: #111827; }
    .pv-wrap { padding: 12px; }
    .pv-page { width: 100%; max-width: 1040px; margin: 0 auto; background: #fff; border: 1px solid #b8c6de; box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08); }
    .pv-page-inner { padding: 22px 26px 18px; }
    .pv-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .pv-company { font-size: 15px; font-weight: 700; font-style: italic; margin-bottom: 14px; }
    .pv-title { display: inline-block; background: #050505; color: #fff; padding: 7px 14px; font-size: 15px; font-weight: 800; letter-spacing: 0.04em; }
    .pv-page-no { font-size: 12px; }
    .pv-meta { display: grid; grid-template-columns: 1.05fr 2fr; gap: 8px 18px; margin-top: 18px; font-size: 12px; }
    .pv-meta div { padding-bottom: 6px; border-bottom: 1px solid #101828; }
    .pv-meta strong { display: inline-block; min-width: 66px; }
    .pv-product { margin-top: 14px; border: 1px solid #101828; }
    .pv-product-head { display: grid; grid-template-columns: 96px 1fr; background: #050505; color: #fff; font-weight: 700; }
    .pv-product-head div, .pv-product-row div { padding: 6px 8px; font-size: 11px; }
    .pv-product-row { display: grid; grid-template-columns: 96px 1fr; border-top: 1px solid #c8d0e0; }
    .pv-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
    .pv-table th, .pv-table td { border: 1px solid #667085; padding: 5px 6px; text-align: left; }
    .pv-table th { background: #f4f4f5; }
    .pv-lower { display: grid; grid-template-columns: 1fr 280px; gap: 18px; align-items: start; margin-top: 16px; }
    .pv-keylines { display: grid; gap: 8px; }
    .pv-keyline { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 12px; font-size: 11px; }
    .pv-keyline strong { font-size: 11px; letter-spacing: 0.01em; }
    .pv-red { color: #c81e1e; font-style: italic; margin-top: 2px; font-size: 10px; line-height: 1.25; }
    .pv-sign-wrap { display: flex; align-items: flex-end; }
    .pv-sign { text-align: center; align-self: end; margin-top: 140px; width: 100%; }
    .pv-sign hr { border: 0; border-top: 2px solid #111827; max-width: 250px; margin: 0 auto 8px; }
    .pv-sign div { font-size: 11px; }
    .pv-footer-note { text-align: center; font-size: 10px; margin-top: 16px; line-height: 1.25; }
    .pv-office { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 14px; font-size: 10px; line-height: 1.2; }
    @media print { body { background: #fff; } .pv-wrap { padding: 0; } .pv-page { border: 0; box-shadow: none; margin: 0; } }
  </style>
</head>
<body>
  <div class="pv-wrap">
    <section class="pv-page">
      <div class="pv-page-inner">
        <div class="pv-head">
          <div>
            <div class="pv-company">{{ $view['company'] }}</div>
            <div class="pv-title">{{ $view['title'] }}</div>
          </div>
          <div class="pv-page-no">Page : 1/1</div>
        </div>

        <div class="pv-meta">
          <div><strong>Date</strong> {{ $view['render_date'] }}</div>
          <div><strong>Booking Reference #</strong> {{ $view['booking_reference'] }}</div>
          <div><strong>Fax</strong></div>
          <div></div>
          <div><strong>To</strong> {{ $view['buyer'] }}</div>
          <div></div>
          <div><strong>Attn.</strong> {{ $view['attention'] }}</div>
          <div></div>
        </div>

        <div class="pv-product">
          <div class="pv-product-head"><div>Product</div><div>{{ $view['product_title'] }}</div></div>
          <div class="pv-product-row"><div><strong>Style</strong></div><div>{{ $view['product_style'] }}</div></div>
          <div class="pv-product-row"><div><strong>Packing</strong></div><div>{{ $view['packing'] }}</div></div>
          <div class="pv-product-row"><div><strong>Brand</strong></div><div>{{ $view['brand'] }}</div></div>
          <div class="pv-product-row"><div><strong>Notes</strong></div><div>{{ $view['notes'] }}</div></div>
        </div>

        <table class="pv-table">
          <thead>
            <tr>
              <th>Size</th>
              <th>cartons</th>
              <th>Price US($)/KG(S)</th>
              <th>Amount US($)</th>
            </tr>
          </thead>
          <tbody>
            @foreach ($view['rows'] as $row)
              <tr>
                <td>{{ $row['size'] }}</td>
                <td>{{ $row['cartons'] }}</td>
                <td>{{ $row['price'] }}</td>
                <td>{{ $row['amount'] }}</td>
              </tr>
            @endforeach
          </tbody>
          <tfoot>
            <tr><td colspan="3" style="text-align:right"><strong>Total</strong></td><td><strong>{{ $view['amount_total'] }}</strong></td></tr>
          </tfoot>
        </table>

        <div class="pv-lower">
          <div class="pv-keylines">
            <div class="pv-keyline"><strong>PRICES ARE</strong><div>{{ $view['price_basis'] }}</div></div>
            <div class="pv-keyline"><strong>PAYMENT</strong><div>{{ $view['payment_terms'] }}<div class="pv-red">*Terms of this sale are CFR thus marine insurance is not covered by the shipper. Kindly obtain your own marine insurance cover for this shipment.</div></div></div>
            <div class="pv-keyline"><strong>LATEST SHIPMENT DATE</strong><div>{{ $view['latest_shipment_date'] }}</div></div>
            <div class="pv-keyline"><strong>PACKER</strong><div>{{ $view['packer'] }}</div></div>
            <div class="pv-keyline"><strong>DESTINATION</strong><div>{{ $view['destination'] }}</div></div>
          </div>
          <div class="pv-sign-wrap">
            <div class="pv-sign">
              <div><strong>FOR AND ON BEHALF OF</strong></div>
              <div style="height:42px"></div>
              <hr>
              <div><strong>{{ $view['buyer'] }}</strong></div>
              <div>(CUSTOMER)</div>
            </div>
          </div>
        </div>

        <div class="pv-footer-note">
          Siam Canadian issues this booking confirmation in its capacity as broker/agent and does not assume liability in the event of non-performance or default by the packer.
        </div>

        <div class="pv-office">
          <div><strong>Siam Canadian (Asia) Limited</strong><br>UNIT 1, 20/F, LOW BLOCK, GRAND MILLENNIUM PLAZA,<br>181 QUEEN'S ROAD CENTRAL, HONG KONG</div>
          <div><strong>Mailing Address</strong><br>9th FL, Suite 283/44 Home Place Office Bldg,<br>283 Thonglor 13, Sukhumvit 55, Klongton Nua, Wattana,<br>Bangkok, Thailand 10110</div>
        </div>
      </div>
    </section>
  </div>
</body>
</html>
