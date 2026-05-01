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
      font-family: Arial, sans-serif;
      background: #ffffff;
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
      line-height: 1.2;
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
      color: #000;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: .01em;
    }

    .tagline {
      color: #57715b;
      font-style: italic;
      font-size: 11px;
      margin-top: 4px;
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

    .info-left {
      width: 50%;
      height: 82px;
    }

    .info-date {
      width: 20%;
      font-weight: 700;
    }

    .info-order {
      width: 30%;
      font-weight: 700;
    }

    .section-head td {
      background: #061173;
      color: #fff;
      font-weight: 800;
      padding: 2px 5px;
    }

    .party {
      width: 50%;
      height: 82px;
      font-weight: 700;
    }

    .party div {
      margin-bottom: 4px;
    }

    .party .muted {
      font-weight: 700;
    }

    .items {
      table-layout: fixed;
    }

    .items th {
      background: #061173;
      color: #fff;
      font-weight: 800;
      text-align: center;
      padding: 3px 4px;
    }

    .items td {
      padding: 3px 5px;
    }

    .desc {
      width: 42%;
    }

    .size {
      width: 8%;
      text-align: center;
    }

    .cartons {
      width: 10%;
    }

    .weight {
      width: 12%;
    }

    .price {
      width: 12%;
    }

    .num {
      text-align: right;
      white-space: normal;
    }

    .amount {
      width: 16%;
    }

    .desc-text {
      min-height: 54px;
      white-space: pre-line;
      font-weight: 700;
    }

    .total-row td {
      font-weight: 800;
    }

    .comments-head td {
      background: #061173;
      color: #fff;
      font-weight: 800;
      padding: 3px 5px;
    }

    .comments td {
      border: 0;
      padding: 2px 0;
      font-size: 11px;
      font-family: Arial, sans-serif;
      font-style: normal;
      }

    .comments-box {
      border-top: 1px solid #000;
      padding: 24px 4px 4px;
      min-height: 212px;
    }

    .comment-label {
      width: 190px;
      font-weight: 700;
      font-family: Arial, sans-serif;
      font-style: normal;
    }

    .comment-value {
      font-weight: 700;
      font-family: Arial, sans-serif;
      font-style: normal;
      text-align: left;
    }

    .note-row .comment-value {
      font-weight: 700;
      text-align: left;
    }

    .signature {
      margin-top: 8px;
      font-size: 11px;
    }

    .signature td {
      width: 50%;
      border: 0;
      padding: 0 2px;
    }

    .sign-space {
      height: 66px;
      padding-top: 38px;
      vertical-align: bottom;
    }

    .sign-label {
      font-weight: 800;
    }

    .accepted {
      text-align: center;
      font-weight: 800;
    }

    .signature-line {
      border-top: 1px solid #000;
      height: 1px;
      width: 82%;
      margin: 0 auto 5px;
    }

    .signature-name {
      text-align: center;
      font-weight: 800;
    }

    .contact {
      text-align: center;
      font-size: 10.5px;
      line-height: 1.25;
      margin-top: 4px;
      font-weight: 700;
    }

    .disclaimer {
      text-align: center;
      font-size: 9.5px;
      margin-top: 8px;
      font-weight: 700;
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
    }
  </style>
</head>

<body>
  @php($bcv = $view['bcv'])
  <div class="doc-wrap">
    <section class="doc-page" data-company-alias="{{ $view['header_company'] }}">
      <table class="main">
        <colgroup>
          <col style="width:13%">
          <col style="width:18%">
          <col style="width:19%">
          <col style="width:20%">
          <col style="width:15%">
          <col style="width:15%">
        </colgroup>
        <tr class="company-row">
          <td class="logo-cell">
            @if (!empty($view['logo_path']))
            <img class="logo" src="{{ $view['logo_path'] }}" alt="Alkamaris logo">
            @endif
          </td>
          <td class="company-cell" colspan="5">
            <div class="company-name">{{ $bcv['company_legal_name'] }}</div>
            <div class="tagline">{{ $view['header_tagline'] }}</div>
          </td>
        </tr>
        <tr class="title-row">
          <td class="title-pad"></td>
          <td class="title-band" colspan="4">ORDER CONFIRMATION</td>
          <td class="title-pad"></td>
        </tr>
        <tr>
          <td class="info-left" colspan="3">
            @foreach ($bcv['company_address_lines'] as $line)
            <div>{{ $line }}</div>
            @endforeach
          </td>
          <td class="info-date">
            <div>Date :{{ $bcv['date'] }}</div>
          </td>
          <td class="info-order" colspan="2">
            <div>Order Confirmation No:</div>
            <div style="margin-top:8px">{{ $bcv['order_confirmation_no'] }}</div>
          </td>
        </tr>
        <tr class="section-head">
          <td colspan="3">PACKER</td>
          <td colspan="3">CUSTOMER</td>
        </tr>
        <tr>
          <td class="party" colspan="3">
            <div>{{ $bcv['packer_block']['name'] }}</div>
            @foreach ($bcv['packer_block']['lines'] as $line)
            <div class="muted">{{ $line }}</div>
            @endforeach
            @if ($bcv['packer_block']['registration'] !== '')
            <div>{{ $bcv['packer_block']['registration'] }}</div>
            @endif
          </td>
          <td class="party" colspan="3">
            <div>{{ $bcv['customer_block']['name'] }}</div>
            @foreach ($bcv['customer_block']['lines'] as $line)
            <div class="muted">{{ $line }}</div>
            @endforeach
            @if ($bcv['customer_block']['registration'] !== '')
            <div>{{ $bcv['customer_block']['registration'] }}</div>
            @endif
          </td>
        </tr>
      </table>

      <table class="main items">
        <colgroup>
          <col class="desc">
          <col class="size">
          <col class="cartons">
          <col class="weight">
          <col class="price">
          <col class="amount">
        </colgroup>
        <thead>
          <tr>
            <th class="desc">DESCRIPTION</th>
            <th class="size">Size</th>
            <th>Cartons</th>
            <th>Weight in Kg</th>
            <th>{{ $bcv['items'][0]['price_header'] ?? 'Price US$/kg' }}</th>
            <th class="amount">{{ $bcv['items'][0]['amount_header'] ?? 'Amount' }}</th>
          </tr>
        </thead>
        <tbody>
          @forelse ($bcv['groups'] as $group)
          @foreach ($group['rows'] as $index => $item)
          <tr>
            @if ($index === 0)
            <td class="desc" rowspan="{{ count($group['rows']) }}">
              <div class="desc-text">{!! nl2br(e($group['description'])) !!}</div>
            </td>
            @endif
            <td class="size">{{ $item['size'] }}</td>
            <td class="num">{{ $item['cartons'] }}</td>
            <td class="num">{{ $item['weight'] }}</td>
            <td class="num">{{ $item['price'] }}</td>
            <td class="num">{{ $item['amount'] }}</td>
          </tr>
          @endforeach
          @empty
          <tr>
            <td class="desc">&nbsp;</td>
            <td class="size">&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
          </tr>
          @endforelse
          <tr class="total-row">
            <td></td>
            <td style="text-align:center">Total</td>
            <td class="num">{{ $bcv['total_cartons'] }}</td>
            <td class="num">{{ $bcv['total_weight'] }}</td>
            <td></td>
            <td class="num">{{ $bcv['total_amount'] }}</td>
          </tr>
        </tbody>
      </table>

      <table class="main">
        <tr class="comments-head">
          <td>Comments or Special Instructions</td>
        </tr>
        <tr>
          <td>
            <div class="comments-box">
              <table class="comments">
                <colgroup>
                  <col style="width:190px">
                  <col>
                </colgroup>
                <tr>
                  <td class="comment-label">Total Amount</td>
                  <td class="comment-value">{{ $bcv['total_amount_label'] }}</td>
                </tr>
                <tr>
                  <td class="comment-label">Prices Are</td>
                  <td class="comment-value">{{ $bcv['price_basis'] }}</td>
                </tr>
                <tr>
                  <td class="comment-label">Payment</td>
                  <td class="comment-value">{{ $bcv['payment_terms'] }}</td>
                </tr>
                <tr>
                  <td class="comment-label">Latest Shipment Date</td>
                  <td class="comment-value">{{ $bcv['latest_shipment_date'] }}</td>
                </tr>
                <tr>
                  <td class="comment-label">Customer</td>
                  <td class="comment-value">{{ $bcv['customer'] }}</td>
                </tr>
                <tr>
                  <td class="comment-label">Factory Approval Number</td>
                  <td class="comment-value">{{ $bcv['factory_approval_number'] }}</td>
                </tr>
                <tr>
                  <td class="comment-label">Commission</td>
                  <td class="comment-value">{{ $bcv['commission'] }}</td>
                </tr>
                <tr class="note-row">
                  <td class="comment-label">Note</td>
                  <td class="comment-value">{{ $bcv['commission_note'] }}</td>
                </tr>
                <tr class="note-row">
                  <td></td>
                  <td class="comment-value">A Separate invoice will be sent after shipment from our office.</td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>

      <table class="signature">
        <tr>
          <td class="sign-label">For &amp; Behalf of</td>
          <td class="accepted">Confirmation &amp; Accepted by</td>
        </tr>
        <tr>
          <td class="sign-space">
            <div class="signature-line"></div>
            <div class="signature-name">ALKAMARIS EXPORTS(OPC)PVT LTD</div>
          </td>
          <td class="sign-space">
            <div class="signature-line"></div>
            <div class="signature-name">{{ $bcv['packer'] !== '' ? $bcv['packer'] : 'Default Packer Name Here' }}</div>
          </td>
        </tr>
      </table>

      <!-- <div class="contact">
        If you have any questions about this purchase order, please contact<br>
        {{ $bcv['contact_line'] }}
      </div> -->
      <div class="disclaimer">
        {{ $view['footer_note'] }}
      </div>
    </section>
  </div>
</body>

</html>
