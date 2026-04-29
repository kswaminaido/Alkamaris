<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <title>{{ $view['label'] }}</title>
  <style>
    @page {
      margin: 0;
    }

    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #ffffff;
      color: #000;
    }

    .bcv-wrap {
      padding: 0;
    }

    .bcv-page {
      width: 100%;
      margin: 0;
      background: #fff;
    }

    .bcv-inner {
      padding: 10mm 12mm 8mm;
      font-size: 10px;
      line-height: 1.16;
    }

    .bcv-head {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
    }

    .bcv-head td {
      vertical-align: top;
    }

    .bcv-head-logo {
      width: 180px;
    }

    .bcv-logo {
      max-width: 160px;
      max-height: 54px;
    }

    .bcv-head-center {
      text-align: center;
    }

    .bcv-head-right {
      text-align: right;
    }

    .bcv-company {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .bcv-subtitle {
      font-size: 11px;
      color: #4b5563;
    }

    .bcv-title-row td {
      padding-top: 10px;
      text-align: center;
    }

    .bcv-title {
      display: inline-block;
      background: #061173;
      color: #fff;
      padding: 7px 14px;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.04em;
    }

    .bcv-page-no {
      font-size: 12px;
    }

    .bcv-meta {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 11px;
    }

    .bcv-meta td {
      padding: 0 0 4px;
      vertical-align: bottom;
    }

    .bcv-meta-label {
      width: 56px;
      font-weight: 700;
    }

    .bcv-meta-value {
      border-bottom: 1px solid #000;
      height: 14px;
    }

    .bcv-meta-date {
      width: 146px;
    }

    .bcv-meta-booking-label {
      width: 122px;
      padding-left: 10px;
      font-weight: 700;
      white-space: nowrap;
    }

    .bcv-product {
      width: 100%;
      border-collapse: collapse;
      margin-top: 9px;
      page-break-inside: avoid;
    }

    .bcv-product td {
      padding: 1px 4px;
      vertical-align: top;
    }

    .bcv-product-head td {
      background: #061173;
      color: #fff;
      font-weight: 700;
      font-size: 10px;
      padding-top: 2px;
      padding-bottom: 2px;
    }

    .bcv-product-label {
      width: 58px;
      font-weight: 700;
    }

    .bcv-product-body {
      border-left: 1px solid #000;
      border-right: 1px solid #000;
    }

    .bcv-product-last td {
      border-bottom: 1px solid #000;
    }

    .bcv-lines {
      width: 80%;
      margin-left: auto;
      border-collapse: collapse;
      font-size: 9px;
    }

    .bcv-lines th,
    .bcv-lines td {
      border: 1px solid #000;
      padding: 1px 4px;
      text-align: right;
    }

    .bcv-lines th {
      font-weight: 700;
    }

    .bcv-lines th:first-child,
    .bcv-lines td:first-child {
      text-align: left;
    }

    .bcv-lines-total td {
      border-top: 0;
    }

    .bcv-lines-total td:first-child {
      border-left: 0;
      border-bottom: 0;
    }

    .bcv-lines-total td:nth-child(2) {
      border-left: 0;
      border-bottom: 0;
    }

    .bcv-lines-total td:nth-child(3) {
      border-left: 0;
      border-bottom: 0;
    }

    .bcv-summary {
      margin-top: 28px;
      margin-left: 4px;
      width: 92%;
      border-collapse: collapse;
      font-size: 11px;
    }

    .bcv-summary td {
      padding: 0 0 8px;
      vertical-align: top;
    }

    .bcv-summary-label {
      width: 155px;
      font-weight: 700;
    }

    .bcv-total-currency {
      display: inline-block;
      min-width: 28px;
    }

    .bcv-footer-note {
      text-align: center;
      font-size: 10px;
      margin-top: 16px;
      line-height: 1.25;
    }

    .bcv-office {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      font-size: 10px;
      line-height: 1.2;
    }

    .bcv-office td {
      width: 100%;
      vertical-align: top;
    }

    @media screen {
      body {
        background: #eef3fb;
      }

      .bcv-wrap {
        padding: 12px;
      }

      .bcv-page {
        max-width: 980px;
        margin: 0 auto;
      }
    }

    @media print {
      body {
        background: #fff;
      }

      .bcv-wrap {
        padding: 0;
      }

      .bcv-page {
        margin: 0;
        max-width: none;
      }
    }
  </style>
</head>

<body>
  @php($bcv = $view['bcv'])
  <div class="bcv-wrap">
    <section class="bcv-page">
      <div class="bcv-inner">
        <table class="bcv-head">
          <tr>
            <td class="bcv-head-logo">
              @if (!empty($view['logo_path']))
              <img class="bcv-logo" src="{{ $view['logo_path'] }}" alt="Alkamaris logo">
              @endif
            </td>
            <td class="bcv-head-center">
              <div class="bcv-company">{{ $view['header_company'] }}</div>
              <div class="bcv-subtitle">{{ $view['header_tagline'] }}</div>
            </td>
            <td class="bcv-head-right">
              <div class="bcv-page-no">Page : 1/1</div>
            </td>
          </tr>
          <tr class="bcv-title-row">
            <td colspan="3">
              <div class="bcv-title">{{ $view['title'] }}</div>
            </td>
          </tr>
        </table>

        <table class="bcv-meta">
          <tr>
            <td class="bcv-meta-label">Date</td>
            <td class="bcv-meta-value bcv-meta-date">{{ $bcv['date'] }}</td>
            <td class="bcv-meta-booking-label">Booking Reference #</td>
            <td class="bcv-meta-value">{{ $bcv['booking_reference'] }}</td>
          </tr>
          <tr>
            <td class="bcv-meta-label">Fax</td>
            <td colspan="3" class="bcv-meta-value">{{ $bcv['fax'] }}</td>
          </tr>
          <tr>
            <td class="bcv-meta-label">To</td>
            <td colspan="3" class="bcv-meta-value">{{ $bcv['to'] }}</td>
          </tr>
          <tr>
            <td class="bcv-meta-label">Attn.</td>
            <td colspan="3" class="bcv-meta-value">{{ $bcv['attention'] }}</td>
          </tr>
        </table>

        @forelse ($bcv['items'] as $item)
        <table class="bcv-product">
          <tr class="bcv-product-head">
            <td class="bcv-product-label">Product</td>
            <td>{{ $item['product'] }}</td>
          </tr>
          <tr class="bcv-product-body">
            <td class="bcv-product-label">Style</td>
            <td>{{ $item['style'] }}</td>
          </tr>
          <tr class="bcv-product-body">
            <td class="bcv-product-label">Packing</td>
            <td>{{ $item['packing'] }}</td>
          </tr>
          <tr class="bcv-product-body">
            <td class="bcv-product-label">Brand</td>
            <td>{{ $item['brand'] }}</td>
          </tr>
          <tr class="bcv-product-body bcv-product-last">
            <td class="bcv-product-label">Notes</td>
            <td>{!! nl2br(e($item['notes'])) !!}</td>
          </tr>
        </table>

        <table class="bcv-lines">
          <thead>
            <tr>
              <th>Size</th>
              <th>cartons</th>
              <th>{{ $item['price_header'] }}</th>
              <th>{{ $item['amount_header'] }}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{{ $item['size'] }}</td>
              <td>{{ $item['cartons'] }}</td>
              <td>{{ $item['price'] }}</td>
              <td>{{ $item['amount'] }}</td>
            </tr>
            <tr class="bcv-lines-total">
              <td></td>
              <td></td>
              <td></td>
              <td>{{ $item['amount'] }}</td>
            </tr>
          </tbody>
        </table>
        @empty
        <table class="bcv-product">
          <tr class="bcv-product-head">
            <td class="bcv-product-label">Product</td>
            <td></td>
          </tr>
        </table>
        @endforelse

        <table class="bcv-summary">
          <tr>
            <td class="bcv-summary-label">TOTAL AMOUNT</td>
            <td><span class="bcv-total-currency">{{ $bcv['total_amount_currency'] }}</span>{{ $bcv['total_amount'] }}</td>
          </tr>
          <tr>
            <td class="bcv-summary-label">PRICES ARE</td>
            <td>{{ $bcv['price_basis'] }}</td>
          </tr>
          <tr>
            <td class="bcv-summary-label">PAYMENT</td>
            <td>{{ $bcv['payment_terms'] }}</td>
          </tr>
          <tr>
            <td class="bcv-summary-label">TOLERANCE</td>
            <td>{{ $bcv['tolerance'] }}</td>
          </tr>
          <tr>
            <td class="bcv-summary-label">LASTEST SHIPMENT DATE</td>
            <td>{{ $bcv['latest_shipment_date'] }}</td>
          </tr>
          <tr>
            <td class="bcv-summary-label">PACKER</td>
            <td>{{ $bcv['packer'] }}</td>
          </tr>
          <tr>
            <td class="bcv-summary-label">COMMISSION</td>
            <td>{{ $bcv['commission'] }}</td>
          </tr>
          <tr>
            <td class="bcv-summary-label">DESTINATION</td>
            <td>{{ $bcv['destination'] }}</td>
          </tr>
        </table>

        <div class="bcv-footer-note">
          {{ $view['footer_note'] }}
        </div>

        <table class="bcv-office">
          <tr>
            <td><strong>{{ $view['header_company'] }}</strong><br>{!! nl2br(e($view['footer_address'])) !!}</td>
          </tr>
        </table>
      </div>
    </section>
  </div>
</body>

</html>