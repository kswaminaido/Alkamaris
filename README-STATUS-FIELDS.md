# Transaction status and field rules

This guide describes the implemented rules in `alk-api/app/Services/Transactions/TransactionService.php`, the values in `alk-api/app/Enums/TransactionStatus.php`, and list indicators in `alk-app/src/pages/TransactionsPage.jsx`. The backend determines persisted status.

## Automatic status selection

When a one-to-one transaction detail is saved, the backend checks logistics and **packer** cash flow records in this order. A date counts when it is non-null.

| Priority | Field or condition | Resulting status |
| --- | --- | --- |
| 1 | `logistics.cancel_reject` is true | `C` — Cancelled |
| 2 | Current status is already `C` | Keep Cancelled |
| 3 | `cash_flow_packer.date_balance` has a date | `D` — Paid |
| 4 | `cash_flow_packer.invoice_date` has a date | `I` — Invoice |
| 5 | `logistics.packer_inv_date` has a date | `R` — Received |
| 6 | `logistics.bl_date` has a date | `S` — Shipped |
| 7 | None of the above | `U` — Unshipped |

The first match wins. For example, adding a packer invoice date after a BL date changes Shipped to Invoice; adding a packer balance date changes it to Paid. Clearing a date recalculates from the remaining fields on the next detail save. Cancelled is sticky while the current status is `C`, even if the cancel flag is later cleared. Sync runs after each one-to-one detail upsert, including other detail sections, so a manually selected status can be replaced by these rules.

`cash_flow_customer.invoice_date` and `cash_flow_customer.date_balance` are stored but **do not** determine automatic status. `transaction.status` may be submitted directly, subject to validation, but detail sync can override it. New transactions default to Unshipped in the schema; duplication explicitly sets Unshipped.

## Status codes

| Code | Label | Automatic field rule |
| --- | --- | --- |
| `U` | Unshipped | Fallback |
| `S` | Shipped | BL date |
| `R` | Received | Packer invoice received date |
| `I` | Invoice (frontend: Invoiced) | Packer invoice date |
| `D` | Paid | Packer balance date |
| `P` | Unpaid | None; manual status |
| `T` | Tally | None; manual status |
| `C` | Cancelled | Cancel/reject flag or existing Cancelled status |

The frontend also has an `SP` (Sales Proceed) filter option. `SP` is not a stored `TransactionStatus`; the transaction controller handles it as a special filter.

## Date and color indicators

| Indicator | Trigger | Clears when |
| --- | --- | --- |
| Red LSD date cell | Packer `lsd_max`, otherwise customer `lsd_max`, is due within 7 days or overdue | Status becomes `I`, `S`, `R` or `D`, or LSD no longer qualifies |
| Light red status box | Status is `I` | Status changes from `I`, including to `D` |

The LSD label shows days until due, due today or days crossed. The light red status box shows elapsed days in the Status cell. Its start date is `cash_flow_packer.invoice_date`, then `cash_flow_customer.invoice_date`, then the transaction's `updated_at` date when neither invoice date is available. The count is calculated for display and is not stored. `updated_at` may change for reasons other than invoicing, so that fallback is approximate.

The `/transactions/overdue-invoice` API filter separately finds records whose selected `lsd_max` is before today and whose status is not Paid. It does not use the red cell's status exclusions.

## LC terms job

`ProcessLcTermsJob` can change a Received transaction to Invoice when `lc_set_at + lc_days` equals today. Its entry in `app/Console/Kernel.php` is commented out, so the current schedule does not run this transition automatically. Changing `transaction.lc_days` in `TransactionService::update` sets `lc_set_at` to the current date.
