# Finance Tracker — Context Bank

## Project Overview

React/TypeScript PWA finance tracker with Vite, Zustand state management, Dexie.js (IndexedDB) for storage, and custom UI components (not Radix — custom Select, Dialog, etc.). Supports EN/RU languages via `src/utils/i18n.ts`.

## Architecture

```
src/
├── app/                    # App entry, routing
├── components/ui/          # Custom UI primitives (Button, Input, Select, Dialog, etc.)
├── database/
│   ├── db.ts               # Dexie database schema
│   ├── types.ts            # All TypeScript interfaces
│   └── repositories.ts     # CRUD repos: accountRepo, transactionRepo, loanRepo, etc.
├── features/
│   ├── dashboard/          # Main dashboard with drag-drop income/expense
│   ├── categories/         # Category management
│   ├── loans/components/
│   │   ├── LoanForm.tsx    # Create/edit loan dialog
│   │   ├── LoansPage.tsx   # Main mobile loans UI (active view)
│   │   ├── LoanList.tsx    # Alternative desktop loan list (uses LoanForm + PaymentDialog)
│   │   └── PaymentDialog.tsx # Standalone payment dialog (used by LoanList)
│   └── reports/components/
│       └── ReportPage.tsx  # Monthly report + loan summary
├── hooks/
│   └── useLanguage.ts      # i18n hook (subscriber pattern, returns t() function)
├── store/
│   └── useAppStore.ts      # Zustand store: accounts, transactions, loans, etc.
└── utils/
    ├── i18n.ts             # EN/RU translations (268+ keys)
    ├── currency.ts         # formatCurrency, getCurrencySymbol, getAllCurrencies
    └── date.ts             # formatDate, formatDateForInput, getStartOfMonth, etc.
```

## Key Data Types (src/database/types.ts)

- **TransactionType**: `'income' | 'expense' | 'transfer' | 'investment_buy' | 'investment_sell' | 'loan_given' | 'loan_received' | 'loan_payment'`
- **LoanType**: `'given' | 'received'`
- **LoanStatus**: `'active' | 'partially_paid' | 'fully_paid'`
- **Loan**: `{ id?, type, personName, description?, amount, currency, paidAmount, status, accountId?, dueDate?, createdAt, updatedAt }`
- **Transaction**: `{ id?, type, amount, currency, date, comment?, incomeSourceId?, categoryId?, accountId?, toAccountId?, toAmount?, investmentId?, quantity?, pricePerUnit?, loanId?, mainCurrencyAmount?, createdAt, updatedAt }`
- **Account**: `{ id?, name, type, currency, balance, color, icon?, createdAt, updatedAt }`

## Custom Select Component (src/components/ui/select.tsx)

Custom implementation (NOT Radix). `SelectValue` renders `children ?? value ?? placeholder`. Since `value` is the raw string (e.g. numeric ID or enum like "given"), you MUST pass display text as children:

```tsx
<SelectValue placeholder={t('selectAccount')}>
  {selectedAccount ? `${selectedAccount.name} (${selectedAccount.currency})` : undefined}
</SelectValue>
```

Without children, it shows the raw value string.

## Recent Changes: Loan System Overhaul

### What changed

1. **LoanForm.tsx** — Account now required, multi-currency support
   - Removed "None" option from account selector
   - Default-selects first account on new loan
   - When loan currency != account currency, shows dual amount inputs (loan amount + account amount)
   - Exports `LoanFormData` interface and optional `onSave` callback
   - If `onSave` provided: delegates to parent. If not: saves directly (backward compat for LoanList)

2. **LoansPage.tsx** — Creates transactions on loan creation
   - Passes `handleSaveLoan` via `onSave` to LoanForm
   - On new loan: creates loan record + `loan_given`/`loan_received` transaction + updates account balance
   - On edit: only updates loan fields (no balance/transaction changes)
   - Payment modal: creates `loan_payment` transaction + updates balance (with multi-currency support)

3. **PaymentDialog.tsx** — Added multi-currency support
   - Dual inputs when loan currency != account currency
   - Uses account currency amount for balance updates
   - Added `useLanguage` hook for translated labels

4. **ReportPage.tsx** — No changes needed
   - Loan stats already month-agnostic (uses `loans` array directly)

5. **i18n.ts** — Translation updates
   - `relatedAccount`: removed "(optional)" from both EN/RU
   - Added `amountOnLoan` / `amountOnAccount` keys for multi-currency labels

### Loan creation flow

```
User fills LoanForm → onSave(data) →
  1. loanRepo.create(loan)
  2. accountRepo.updateBalance(accountId, ±amount)
     - loan_given: balance DECREASES (money goes out)
     - loan_received: balance INCREASES (money comes in)
  3. transactionRepo.create({ type: 'loan_given'|'loan_received', ... })
  4. refreshLoans() + refreshAccounts() + refreshTransactions()
```

### Payment flow (LoansPage inline modal)

```
User enters payment → handleSubmitPayment() →
  1. loanRepo.recordPayment(loanId, loanCurrencyAmount)
  2. accountRepo.updateBalance(accountId, ±accountCurrencyAmount)
     - loan_given: balance INCREASES (money comes back)
     - loan_received: balance DECREASES (money goes out)
  3. transactionRepo.create({ type: 'loan_payment', ... })
```

### Multi-currency handling

When loan currency != account currency:
- Two amount inputs shown (loan amount + account amount)
- `accountAmount` used for balance update and transaction.amount
- `mainCurrencyAmount` set on transaction when loan currency == mainCurrency

## Known Pre-existing Build Errors

These exist in files NOT related to loans and predate the overhaul:
- `CategoryTile.tsx`: unused imports
- `QuickTransactionModal.tsx`: missing translation key `tapToEdit`, unused import
- `CategoryList.tsx`: missing translation key `noBudget`
- `Dashboard.tsx`: property access on union type

## Store Actions (useAppStore)

- `refreshAccounts()`, `refreshLoans()`, `refreshTransactions()` — reload from DB
- `loadAllData()` — loads everything on app start
- `setActiveView(view)` — navigation
- `setSelectedMonth(date)` — for monthly filtering (loans are NOT filtered by month)
