<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <title>{{ $view['label'] }}</title>
  <style>
    @page {
      margin: 7mm;
    }

    * {
      box-sizing: border-box;
      font-family: Arial, sans-serif;
    }

    body {
      margin: 0;
      background: #fff;
      color: #000;
    }

    .doc-wrap {
      padding: 0;
    }

    .doc-page {
      width: 100%;
      margin: 0;
      padding: 0;
      background: #fff;
      font-size: 10px;
      line-height: 1.18;
    }

    table {
      width: 100%;
      max-width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .main {
      width: 100%;
      max-width: 100%;
      border: 1.3px solid #000;
      table-layout: fixed;
    }

    .main td,
    .main th {
      border: 1px solid #000;
      padding: 3px 5px;
      vertical-align: top;
    }

    .company-row td {
      border-bottom: 0;
      height: 48px;
      vertical-align: middle;
    }

    .logo-cell {
      width: 92px;
      text-align: center;
      border-right: 0 !important;
    }

    .logo {
      max-width: 70px;
      max-height: 58px;
    }

    .company-cell {
      text-align: center;
      border-left: 0 !important;
    }

    .company-name {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: .01em;
    }

    .tagline {
      color: #57715b;
      font-size: 11px;
      margin-top: 4px;
    }

    .company-address {
      font-size: 9px;
      line-height: 1.25;
      margin-top: 3px;
    }

    .title-row td {
      padding: 0;
      border-top: 0;
    }

    .title-pad {
      width: 17%;
      background: #fff;
    }

    .title-band {
      width: 66%;
      background: #061173;
      color: #fff;
      text-align: center;
      font-weight: 800;
      font-size: 15px;
      padding: 4px 0;
    }

    .meta {
      font-size: 10px;
    }

    .meta td {
      height: 22px;
      vertical-align: bottom;
    }

    .meta-label {
      width: 72px;
      font-weight: 400;
      white-space: nowrap;
    }

    .meta-value {
      font-weight: 400;
    }

    .order-confirmation-box {
      font-weight: 400;
      white-space: nowrap;
    }

    .order-confirmation-label {
      font-weight: 700;
    }

    .product {
      font-size: 10px;
    }

    .product-section {
      width: 90%;
      margin-left: 10%;
      margin-top: 10px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }

    .product-section:first-of-type {
      margin-top: 0;
    }

    .product-head td {
      background: #061173;
      color: #fff;
      font-weight: 800;
      font-size: 11px;
    }

    .product td {
      border-top: 0;
      border-bottom: 0;
      border-left: 0;
      border-right: 0;
    }

    .product-head td {
      border: 0;
    }

    .product-label {
      width: 84px;
      font-weight: 400;
    }

    .size-wrap {
      width: 45%;
      margin-left: auto;
    }

    .size-wrap .items {
      font-size: 10px;
      border: 0;
    }

    .size-wrap .items th {
      text-align: center;
      font-weight: 800;
    }

    .size-wrap .items .num {
      text-align: right;
    }

    .size-wrap .items tfoot td {
      text-align: right;
    }

    .size-wrap .items tfoot .total-spacer {
      border-top: 1px solid #000 !important;
      border-right: 0 !important;
      border-bottom: 0 !important;
      border-left: 0 !important;
      padding: 0;
    }

    .details {
      width: 78%;
      margin: 12px auto 0;
      font-size: 11px;
      border: 0;
    }

    .details td {
      border: 0;
      padding: 3px 5px;
    }

    .details-label {
      width: 190px;
      font-weight: 400;
    }

    .details-value {
      font-weight: 400;
    }

    .disclaimer {
      text-align: center;
      font-size: 9.5px;
      margin-top: 20px;
    }

    @media screen {
      body {
        background: #eef3fb;
      }

      .doc-wrap {
        padding: 12px;
      }

      .doc-page {
        max-width: 920px;
        margin: 0 auto;
      }
    }

    @media print {
      body {
        background: #fff;
      }

      .doc-wrap {
        padding: 0;
      }

      .doc-page {
        max-width: none;
        width: 100%;
        padding: 0;
        margin: 0;
      }

      .main {
        width: 100%;
      }

      .total-cell {
        text-align: right;
      }
    }
  </style>
</head>

<body>
  @php($sa = $view['s_a'])
  @php($saDetails = [
  ['label' => 'TOTAL CARTONS', 'value' => $sa['total_cartons']],
  ['label' => 'FEEDER VESSEL', 'value' => $sa['feeder_vessel']],
  ['label' => 'MOTHER VESSEL', 'value' => $sa['mother_vessel']],
  ['label' => 'CONTAINER #', 'value' => $sa['container_no']],
  ['label' => 'SEAL #', 'value' => $sa['seal_no']],
  ['label' => 'PORT OF LOADING', 'value' => $sa['port_of_loading']],
  ['label' => 'ETD', 'value' => $sa['etd']],
  ['label' => 'B/L OF LADING #', 'value' => $sa['bl_of_lading']],
  ['label' => 'ETA', 'value' => $sa['eta']],
  ['label' => 'SHIPPING LINE / AGENT', 'value' => $sa['shipping_line_agent']],
  ])
  <div class="doc-wrap">
    <section class="doc-page" data-company-alias="{{ $view['header_company'] }}">
      <table class="main meta">
        <colgroup>
          <col style="width:10%">
          <col style="width:24%">
          <col style="width:22%">
          <col style="width:20%">
          <col style="width:24%">
        </colgroup>
        <tr class="company-row">
          <td class="logo-cell">
            @if (!empty($view['logo_path']))
            <img class="logo" src="{{ $view['logo_path'] }}" alt="Alkamaris logo">
            @endif
          </td>
          <td class="company-cell" colspan="4">
            <div class="company-name">{{ $sa['company_legal_name'] }}</div>
            <div class="tagline">{{ $view['header_tagline'] }}</div>
            <div class="company-address">{!! nl2br(e($view['footer_address'])) !!}</div>
          </td>
        </tr>
        <tr class="title-row">
          <td class="title-pad"></td>
          <td class="title-band" colspan="3">SHIPPING DETAILS</td>
          <td class="title-pad"></td>
        </tr>
        <tr>
          <td class="meta-label">Date</td>
          <td class="meta-value" colspan="2">{{ $sa['date'] }}</td>
          <td class="order-confirmation-box" colspan="2">
            <span class="order-confirmation-label">Order Confirmation#</span>
            {{ $sa['booking_reference'] }}
          </td>
        </tr>
        <tr>
          <td class="meta-label">To</td>
          <td class="meta-value" colspan="4">{{ $sa['to'] }}</td>
        </tr>
        <tr>
          <td class="meta-label">Attn.</td>
          <td class="meta-value" colspan="4">{{ $sa['attention'] }}</td>
        </tr>
        <!-- <tr>
          <td class="meta-label">Buyer's</td>
          <td class="meta-value" colspan="4">{{ $sa['buyer_name'] }}</td>
        </tr> -->
        <tr>
          <td class="meta-label">Packer</td>
          <td class="meta-value" colspan="4">{{ $sa['packer_name'] }}</td>
        </tr>
      </table>
      <br>
      @forelse ($sa['groups'] as $group)
      <div class="product-section">
        <table class="main product">
          <colgroup>
            <col style="width:18%">
            <col style="width:82%">
          </colgroup>
          <tr class="product-head">
            <td class="product-label">Product</td>
            <td>{{ $group['product'] }}</td>
          </tr>
          <tr>
            <td class="product-label">Style</td>
            <td>{{ $group['style'] }}</td>
          </tr>
          <tr>
            <td class="product-label">Packing</td>
            <td>{{ $group['packing'] }}</td>
          </tr>
          <tr>
            <td class="product-label">Brand</td>
            <td>{{ $group['brand'] }}</td>
          </tr>
          <tr>
            <td class="product-label">Notes</td>
            <td>{{ $group['notes'] }}</td>
          </tr>
        </table>

        <div class="size-wrap">
          <table class="main items">
            <thead>
              <tr>
                <th>Size</th>
                <th>Cartons</th>
              </tr>
            </thead>
            <tbody>
              @forelse ($group['rows'] as $row)
              <tr>
                <td>{{ $row['size'] }}</td>
                <td class="num">{{ $row['cartons'] }}</td>
              </tr>
              @empty
              <tr>
                <td>&nbsp;</td>
                <td class="num">&nbsp;</td>
              </tr>
              @endforelse
            </tbody>
            <tfoot>
              <tr>
                <td class="total-spacer">&nbsp;</td>
                <td class="num total-cell">{{ $group['total_cartons'] }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      @empty
      <div class="product-section">
        <table class="main product">
          <colgroup>
            <col style="width:18%">
            <col style="width:82%">
          </colgroup>
          <tr class="product-head">
            <td class="product-label">Product</td>
            <td>{{ $sa['product'] }}</td>
          </tr>
          <tr>
            <td class="product-label">Style</td>
            <td>{{ $sa['style'] }}</td>
          </tr>
          <tr>
            <td class="product-label">Packing</td>
            <td>{{ $sa['packing'] }}</td>
          </tr>
          <tr>
            <td class="product-label">Brand</td>
            <td>{{ $sa['brand'] }}</td>
          </tr>
          <tr>
            <td class="product-label">Notes</td>
            <td>{{ $sa['notes'] }}</td>
          </tr>
        </table>

        <div class="size-wrap">
          <table class="main items">
            <thead>
              <tr>
                <th>Size</th>
                <th>cartons</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>&nbsp;</td>
                <td class="num">&nbsp;</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td class="total-spacer">&nbsp;</td>
                <td class="num total-cell">{{ $sa['total_cartons'] }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      @endforelse

      @if (collect($saDetails)->contains(fn($row) => trim((string) $row['value']) !== ''))
      <table class="main details">
        <colgroup>
          <col style="width:42%">
          <col style="width:58%">
        </colgroup>
        @foreach ($saDetails as $row)
        @if (trim((string) $row['value']) !== '')
        <tr>
          <td class="details-label">{{ $row['label'] }}</td>
          <td class="details-value">
            @if (!empty($row['multiline']))
            {!! nl2br(e($row['value'])) !!}
            @else
            {{ $row['value'] }}
            @endif
          </td>
        </tr>
        @endif
        @endforeach
      </table>
      @endif

      <div class="disclaimer">
        {{ $view['footer_note'] }}
      </div>
    </section>
  </div>
</body>

</html>
