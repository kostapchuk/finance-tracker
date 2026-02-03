# Finance Tracker - Claude Code Context

## Project Overview

React/TypeScript PWA finance tracker for personal money management. Mobile-first design with drag-and-drop transaction entry. Supports EN/RU localization.

## Tech Stack

- **Framework**: React 19 + TypeScript 5.9
- **Build**: Vite 7
- **State**: Zustand 5
- **Database**: Dexie.js (IndexedDB wrapper)
- **Styling**: Tailwind CSS 4
- **UI Components**: Custom primitives (NOT Radix)
- **Icons**: lucide-react
- **Drag & Drop**: @dnd-kit

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Type-check + build
npm run lint     # ESLint
npm run preview  # Preview production build
```

## Architecture

```
src/
├── app/App.tsx              # Root component, view routing
├── main.tsx                 # Entry point
├── components/
│   ├── ui/                  # Custom UI primitives (Button, Input, Select, Dialog, etc.)
│   ├── layout/              # AppShell, BottomNav
│   ├── drag-drop/           # DraggableItem, DroppableZone
│   └── onboarding/          # OnboardingOverlay
├── database/
│   ├── db.ts                # Dexie database schema (v1, v2)
│   ├── types.ts             # All TypeScript interfaces
│   └── repositories.ts      # CRUD repos: accountRepo, transactionRepo, loanRepo, etc.
├── features/
│   ├── dashboard/           # Main drag-drop income/expense dashboard
│   ├── transactions/        # HistoryPage, TransactionList
│   ├── accounts/            # AccountForm, AccountList
│   ├── categories/          # CategoryForm, CategoryList
│   ├── income/              # IncomeSourceForm, IncomeSourceList
│   ├── loans/               # LoansPage, LoanForm, LoanList, PaymentDialog
│   ├── investments/         # InvestmentForm, InvestmentList
│   ├── reports/             # ReportPage (monthly stats, charts)
│   └── settings/            # SettingsPage, CurrencyForm
├── hooks/
│   └── useLanguage.ts       # i18n hook (subscriber pattern)
├── store/
│   └── useAppStore.ts       # Zustand store: all data + UI state
└── utils/
    ├── i18n.ts              # EN/RU translations (280+ keys)
    ├── currency.ts          # formatCurrency, getCurrencySymbol, getAllCurrencies
    ├── date.ts              # formatDate, getStartOfMonth, getEndOfMonth
    ├── transactionBalance.ts # applyTransactionBalance, reverseTransactionBalance
    ├── colors.ts            # Color utilities
    └── cn.ts                # clsx + tailwind-merge helper
```

## Data Types (src/database/types.ts)

### Core Types

```typescript
type AccountType = 'cash' | 'bank' | 'crypto' | 'investment' | 'credit_card'
type TransactionType = 'income' | 'expense' | 'transfer' | 'investment_buy' | 'investment_sell' | 'loan_given' | 'loan_received' | 'loan_payment'
type LoanType = 'given' | 'received'
type LoanStatus = 'active' | 'partially_paid' | 'fully_paid'
type CategoryType = 'expense' | 'investment' | 'loan'
```

### Main Entities

- **Account**: id, name, type, currency, balance, color, icon, sortOrder
- **Transaction**: id, type, amount, currency, date, comment, accountId, categoryId, incomeSourceId, toAccountId, toAmount, loanId, investmentId, mainCurrencyAmount
- **Loan**: id, type, personName, description, amount, currency, paidAmount, status, accountId, dueDate
- **Category**: id, name, color, icon, categoryType, budget, budgetPeriod, sortOrder
- **IncomeSource**: id, name, currency, color, icon, sortOrder
- **Investment**: id, accountId, symbol, name, quantity, averageCost, currentPrice, currency
- **CustomCurrency**: id, code, name, symbol

## Custom UI Components

### Select (src/components/ui/select.tsx)

Custom implementation (NOT Radix). Uses context + label registry pattern.

```tsx
// SelectValue renders: children ?? displayLabel ?? value ?? placeholder
// Since value is the raw string (e.g., numeric ID), you MUST pass display text as children:
<SelectValue placeholder={t('selectAccount')}>
  {selectedAccount ? `${selectedAccount.name} (${selectedAccount.currency})` : undefined}
</SelectValue>
```

### Dialog (src/components/ui/dialog.tsx)

Custom modal with backdrop. Uses context for open state.

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* content */}
    <DialogFooter>
      <Button onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button onClick={handleSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Store (src/store/useAppStore.ts)

### State

- `accounts`, `incomeSources`, `categories`, `transactions`, `investments`, `loans`, `customCurrencies` - Data arrays
- `mainCurrency` - Default currency (from settings)
- `activeView` - Current page: 'dashboard' | 'history' | 'loans' | 'report' | 'settings'
- `selectedMonth` - For monthly filtering
- `historyCategoryFilter`, `historyAccountFilter` - Navigation filters
- `onboardingStep` - 0 = inactive, 1-5 = onboarding steps

### Actions

- `loadAllData()` - Load all data on app start
- `refreshAccounts()`, `refreshTransactions()`, `refreshLoans()`, etc. - Reload specific data
- `setActiveView(view)` - Navigate
- `setSelectedMonth(date)` - Change month filter
- `navigateToHistoryWithCategory(id)` / `navigateToHistoryWithAccount(id)` - Filter + navigate
- `setOnboardingStep(step)`, `completeOnboarding()`, `skipOnboarding()` - Onboarding control

## Repositories (src/database/repositories.ts)

All repos follow the pattern:
- `getAll()` - Returns sorted array
- `getById(id)` - Single item
- `create(data)` - Returns new ID
- `update(id, updates)` - Partial update
- `delete(id)` - Remove

Special methods:
- `accountRepo.updateBalance(id, amount)` - Add/subtract from balance
- `transactionRepo.getByDateRange(start, end)` - Filter by date
- `loanRepo.recordPayment(id, amount)` - Update paidAmount + status
- `loanRepo.reversePayment(id, amount)` - Undo payment

## Transaction Balance Logic (src/utils/transactionBalance.ts)

When creating/editing/deleting transactions, use:
- `applyTransactionBalance(transaction, loans)` - Apply effects to account balances
- `reverseTransactionBalance(transaction, loans)` - Undo effects before deletion/update

Balance rules by transaction type:
- `income`: account += amount
- `expense`: account -= amount
- `transfer`: from -= amount, to += toAmount
- `loan_given`: account -= amount (money goes out)
- `loan_received`: account += amount (money comes in)
- `loan_payment`: depends on loan type (given: money returns, received: money goes out)

## i18n (src/utils/i18n.ts + src/hooks/useLanguage.ts)

```tsx
// In components:
const { t, language, setLanguage } = useLanguage()
return <span>{t('addAccount')}</span>
```

- Keys defined in `translations` object (EN + RU)
- Language stored in localStorage
- Subscriber pattern for instant updates

## Currency Utilities (src/utils/currency.ts)

```typescript
formatCurrency(1234.56, 'USD')      // "1,234.56 $"
formatCurrency(0.00012345, 'BTC')   // "0.00012345 ₿"
getCurrencySymbol('EUR')            // "€"
getAllCurrencies()                  // Common + custom currencies
```

## Multi-Currency Support

When loan/transaction currency differs from account currency:
1. Show dual amount inputs (loan amount + account amount)
2. Use `accountAmount` for balance updates
3. Store loan currency amount in `mainCurrencyAmount` field when applicable

## Loan Workflows

### Creating a Loan (LoansPage.tsx)
1. User fills LoanForm
2. `loanRepo.create(loan)`
3. `accountRepo.updateBalance(accountId, ±amount)`
4. `transactionRepo.create({ type: 'loan_given' | 'loan_received', ... })`
5. Refresh all data

### Recording Payment
1. User enters payment amount
2. `loanRepo.recordPayment(loanId, loanCurrencyAmount)`
3. `accountRepo.updateBalance(accountId, ±accountAmount)`
4. `transactionRepo.create({ type: 'loan_payment', ... })`
5. Refresh all data

## Views/Pages

1. **Dashboard** - Drag income sources → accounts → categories for quick transactions
2. **History** - Transaction list with filters (date, type, account, category)
3. **Loans** - Active loans/debts, payment tracking
4. **Report** - Monthly summaries, spending by category, 6-month trend
5. **Settings** - Manage accounts, categories, income sources, currencies, data export/import

## Known Issues / TODOs (todos.md)

1. Onboarding doesn't fully work
2. Transaction modal save button hidden by keyboard on mobile
3. CFO-like charts needed on report page
4. Audio expense recording feature planned

## Code Conventions

- Use `useLanguage()` hook for all user-facing text
- Call `refresh*()` methods after any data mutation
- Always handle multi-currency scenarios in loans/transactions
- Mobile-first: test on small screens, use responsive classes (sm:, etc.)
- Path aliases: `@/` maps to `src/`
