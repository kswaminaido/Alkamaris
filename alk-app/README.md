# Alkamaris frontend

React 19 and Vite 7 application for the Alkamaris transaction system. The Laravel API is in [`../alk-api`](../alk-api/README.md). Transaction status rules are in [`../README-STATUS-FIELDS.md`](../README-STATUS-FIELDS.md).

## Local setup

Install Node.js and npm compatible with Vite 7, then start the backend and run:

```sh
cd alk-app
npm install
npm run dev
```

Open the URL printed by Vite. To use a local backend, create `alk-app/.env.local` containing `BACKEND_URL=http://127.0.0.1:8000`. The app adds `/api` itself. Without this setting, `src/config/api.js` uses `https://api.erpalkamaris.com/`. `APP_ENV` is optional and defaults to `Development`. `vite.config.js` exposes variables beginning with `VITE_`, `APP_ENV`, or `BACKEND_`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production files in `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

## Code map

| Path | Responsibility |
| --- | --- |
| `src/App.jsx` | Routes and authentication gates |
| `src/pages/` | Dashboard, transactions, reports, user and admin screens |
| `src/pages/TransactionsPage.jsx` | Transaction list, filters, LSD and invoice indicators |
| `src/pages/TransactionCreatePage.jsx` | New transaction form |
| `src/components/transactions/` | Transaction edit and item modals |
| `src/context/AuthContext.jsx` | Login, current user and bearer token |
| `src/config/api.js` | API base URL |
| `src/App.css` | App and table styling |
| `src/utils/` | Date, dropdown, country and user helpers |

Main routes include `/transactions`, `/transactions/new`, `/transactions/overdue-invoice`, `/reports/summary`, `/reports/packer-sales`, `/reports/payment-status`, `/transactions/qc-inspection`, `/master`, `/admin/history`, and `/admin/mail`. Some transaction routes use a placeholder page. The Sanctum bearer token is stored in browser local storage under `alkamaris_access_token`.

The backend determines persisted transaction status. See the [status and fields guide](../README-STATUS-FIELDS.md) before changing status behavior or table indicators.
