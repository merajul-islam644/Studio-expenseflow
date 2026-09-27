# ExpenseFlow

Expense & reimbursement management for finance teams. Hosted sign-in, fine-grained roles, amount-based approval routes, department budgets, and audit-ready expense records.

Every backend API call goes through a single `@seliseblocks/client` instance in `src/lib/blocks/client.ts`. No hand-written `fetch()` wrappers anywhere in this app.

## Setup

```bash
npm install
npm run build
```

See the project README for the local HTTPS dev loop and OIDC redirect URI configuration.
