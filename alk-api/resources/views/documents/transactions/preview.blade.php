<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{{ $view['label'] }}</title>
  <style>
    @page { margin: 0; }
    body { margin: 0; font-family: Arial, sans-serif; background: #ffffff; color: #111827; }
    .pv-wrap { padding: 0; }
    .pv-page { width: 100%; margin: 0; background: #fff; }
    .pv-page-inner { padding: 10mm 12mm 8mm; }
    .pv-head { width: 100%; border-collapse: collapse; }
    .pv-head td { vertical-align: top; }
    .pv-head-logo { width: 180px; }
    .pv-logo { max-width: 160px; max-height: 54px; }
    .pv-head-center { text-align: center; }
    .pv-head-right { text-align: right; }
    .pv-company { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .pv-subtitle { font-size: 11px; color: #4b5563; }
    .pv-title-row td { padding-top: 10px; text-align: center; }
    .pv-title { display: inline-block; background: #050505; color: #fff; padding: 7px 14px; font-size: 15px; font-weight: 800; letter-spacing: 0.04em; }
    .pv-page-no { font-size: 12px; }
    .pv-meta { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
    .pv-meta td { padding: 0 0 6px; border-bottom: 1px solid #101828; vertical-align: top; }
    .pv-meta .pv-meta-spacer { width: 18px; border-bottom: 0; padding: 0; }
    .pv-meta strong { display: inline-block; min-width: 66px; }
    .pv-product { margin-top: 14px; border: 1px solid #101828; }
    .pv-product table { width: 100%; border-collapse: collapse; }
    .pv-product td { padding: 6px 8px; font-size: 11px; vertical-align: top; }
    .pv-product-head td { background: #050505; color: #fff; font-weight: 700; }
    .pv-product-row td { border-top: 1px solid #c8d0e0; }
    .pv-product-label { width: 96px; }
    .pv-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
    .pv-table th, .pv-table td { border: 1px solid #667085; padding: 5px 6px; text-align: left; }
    .pv-table th { background: #f4f4f5; }
    .pv-lower { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .pv-lower td { vertical-align: top; }
    .pv-lower-left { padding-right: 18px; }
    .pv-lower-right { width: 210px; }
    .pv-keylines { width: 100%; border-collapse: collapse; }
    .pv-keylines td { padding: 0 0 8px; font-size: 11px; vertical-align: top; }
    .pv-keylines .pv-keyline-label { width: 170px; padding-right: 10px; }
    .pv-keyline strong { font-size: 11px; letter-spacing: 0.01em; }
    .pv-red { color: #c81e1e; font-style: italic; margin-top: 2px; font-size: 10px; line-height: 1.25; }
    .pv-sign { text-align: center; margin-top: 150px; width: 100%; }
    .pv-sign hr { border: 0; border-top: 2px solid #111827; max-width: 250px; margin: 0 auto 8px; }
    .pv-sign div { font-size: 11px; }
    .pv-footer-note { text-align: center; font-size: 10px; margin-top: 16px; line-height: 1.25; }
    .pv-office { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 10px; line-height: 1.2; }
    .pv-office td { width: 100%; vertical-align: top; }
    @media screen {
      body { background: #eef3fb; }
      .pv-wrap { padding: 12px; }
      .pv-page { max-width: 980px; margin: 0 auto; }
    }
    @media print { body { background: #fff; } .pv-wrap { padding: 0; } .pv-page { margin: 0; max-width: none; } .pv-page-inner { padding: 10mm 12mm 8mm; } }
  </style>
</head>
<body>
  <div class="pv-wrap">
    <section class="pv-page">
      <div class="pv-page-inner">
        <table class="pv-head">
          <tr>
            <td class="pv-head-logo">
              @if (!empty($view['logo_path']))
                <img class="pv-logo" src="{{ $view['logo_path'] }}" alt="Alkamaris logo">
              @endif
            </td>
            <td class="pv-head-center">
              <div class="pv-company">{{ $view['header_company'] }}</div>
              <div class="pv-subtitle">{{ $view['header_tagline'] }}</div>
            </td>
            <td class="pv-head-right"><div class="pv-page-no">Page : 1/1</div></td>
          </tr>
          <tr class="pv-title-row">
            <td colspan="3"><div class="pv-title">{{ $view['title'] }}</div></td>
          </tr>
        </table>

        <table class="pv-meta">
          <tr>
            <td><strong>Date</strong> {{ $view['render_date'] }}</td>
            <td class="pv-meta-spacer"></td>
            <td><strong>Order Reference #</strong> {{ $view['order_reference'] }}</td>
          </tr>
          <tr>
            <td><strong>Fax</strong></td>
            <td class="pv-meta-spacer"></td>
            <td></td>
          </tr>
          <tr>
            <td><strong>To</strong> {{ $view['buyer'] }}</td>
            <td class="pv-meta-spacer"></td>
            <td></td>
          </tr>
          <tr>
            <td><strong>Attn.</strong> {{ $view['attention'] }}</td>
            <td class="pv-meta-spacer"></td>
            <td></td>
          </tr>
        </table>

        <div class="pv-product">
          <table>
            <tr class="pv-product-head">
              <td class="pv-product-label">Product</td>
              <td>{{ $view['product_title'] }}</td>
            </tr>
            <tr class="pv-product-row">
              <td class="pv-product-label"><strong>Style</strong></td>
              <td>{{ $view['product_style'] }}</td>
            </tr>
            <tr class="pv-product-row">
              <td class="pv-product-label"><strong>Packing</strong></td>
              <td>{{ $view['packing'] }}</td>
            </tr>
            <tr class="pv-product-row">
              <td class="pv-product-label"><strong>Brand</strong></td>
              <td>{{ $view['brand'] }}</td>
            </tr>
            <tr class="pv-product-row">
              <td class="pv-product-label"><strong>Notes</strong></td>
              <td>{{ $view['notes'] }}</td>
            </tr>
          </table>
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

        <table class="pv-lower">
          <tr>
            <td class="pv-lower-left">
              <table class="pv-keylines">
                <tr class="pv-keyline">
                  <td class="pv-keyline-label"><strong>PRICES ARE</strong></td>
                  <td>{{ $view['price_basis'] }}</td>
                </tr>
                <tr class="pv-keyline">
                  <td class="pv-keyline-label"><strong>PAYMENT</strong></td>
                  <td>{{ $view['payment_terms'] }}<div class="pv-red">*Terms of this sale are CFR thus marine insurance is not covered by the shipper. Kindly obtain your own marine insurance cover for this shipment.</div></td>
                </tr>
                <tr class="pv-keyline">
                  <td class="pv-keyline-label"><strong>LATEST SHIPMENT DATE</strong></td>
                  <td>{{ $view['latest_shipment_date'] }}</td>
                </tr>
                <tr class="pv-keyline">
                  <td class="pv-keyline-label"><strong>PACKER</strong></td>
                  <td>{{ $view['packer'] }}</td>
                </tr>
                <tr class="pv-keyline">
                  <td class="pv-keyline-label"><strong>DESTINATION</strong></td>
                  <td>{{ $view['destination'] }}</td>
                </tr>
              </table>
            </td>
            <td class="pv-lower-right">
              <div class="pv-sign">
              <div><strong>FOR AND ON BEHALF OF</strong></div>
              <div style="height:42px"></div>
              <hr>
              <div><strong>{{ $view['buyer'] }}</strong></div>
              <div>(CUSTOMER)</div>
              </div>
            </td>
          </tr>
        </table>

        <div class="pv-footer-note">
          {{ $view['footer_note'] }}
        </div>

        <table class="pv-office">
          <tr>
            <td><strong>{{ $view['header_company'] }}</strong><br>{!! nl2br(e($view['footer_address'])) !!}</td>
          </tr>
        </table>
      </div>
    </section>
  </div>
</body>
</html>
