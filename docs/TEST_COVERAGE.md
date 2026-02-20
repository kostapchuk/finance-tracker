# Finance Tracker - Test Coverage Report

> **Last Updated:** 2026-02-16  
> **Total Automated Tests:** 265 (106 E2E + 159 Unit)

## Summary

| Category                | Count | Coverage                            |
| ----------------------- | ----- | ----------------------------------- |
| **E2E Tests**           | 106   | 16 spec files                       |
| **Unit Tests**          | 159   | 9 test files                        |
| **Manual Test Cases**   | ~40+  | Documented in UNCOVERED_USECASES.md |
| **Uncovered Scenarios** | ~15   | Identified gaps                     |

### Test Types Distribution

```
┌─────────────────────────────────────────────────────────────┐
│ ██████████████████████████████████████████████████░ Automated 85% │
│ ██████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Manual  10% │
│ ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Not Covered 5% │
└─────────────────────────────────────────────────────────────┘
```

### E2E Test File Breakdown

| File                        | Tests | Area                     |
| --------------------------- | ----- | ------------------------ |
| account.spec.ts             | 8     | Accounts                 |
| category.spec.ts            | 8     | Categories               |
| budget.spec.ts              | 10    | Budgets                  |
| income-source.spec.ts       | 8     | Income Sources           |
| loan.spec.ts                | 6     | Loans                    |
| loan-payment.spec.ts        | 10    | Loan Payments            |
| transaction-edit.spec.ts    | 7     | Transactions             |
| history-filters.spec.ts     | 9     | History Filters          |
| infinite-scroll.spec.ts     | 4     | Infinite Scroll          |
| report.spec.ts              | 10    | Reports                  |
| update-notification.spec.ts | 4     | PWA Updates              |
| test-idb.spec.ts            | 3     | IndexedDB (3 sync modes) |
| dashboard.spec.ts           | 5     | Dashboard                |
| transfer.spec.ts            | 5     | Transfers                |
| settings.spec.ts            | 7     | Settings                 |
| import-bulk.spec.ts         | 4     | Bulk Import Operations   |

---

## 1. Dashboard

The main drag-and-drop interface for quick transactions.

### ✅ Automated Tests

| Test                                              | File                  | Status |
| ------------------------------------------------- | --------------------- | ------ |
| Account appears on dashboard after creation       | account.spec.ts       | ✅     |
| Category appears on dashboard after creation      | category.spec.ts      | ✅     |
| Income source appears on dashboard after creation | income-source.spec.ts | ✅     |
| Track expenses against budget on dashboard        | budget.spec.ts        | ✅     |
| Show all items when data exists                   | dashboard.spec.ts     | ✅     |
| Hide accounts with hiddenFromDashboard flag       | dashboard.spec.ts     | ✅     |
| Hide categories with hiddenFromDashboard flag     | dashboard.spec.ts     | ✅     |
| Hide income sources with hiddenFromDashboard flag | dashboard.spec.ts     | ✅     |
| Calculate section totals correctly                | dashboard.spec.ts     | ✅     |

### ⚠️ Manual Required

| Test Case                                                     | Priority | Notes                     |
| ------------------------------------------------------------- | -------- | ------------------------- |
| Drag income source → drop on account → income modal opens     | High     | Core drag-drop flow       |
| Drag account → drop on category → expense modal opens         | High     | Core drag-drop flow       |
| Drag account → drop on another account → transfer modal opens | High     | Transfer flow             |
| Verify drag activation delay on touch (200ms)                 | Medium   | Mobile touch interaction  |
| Verify drag distance threshold (8px)                          | Medium   | Prevents accidental drags |
| Drag overlay visual feedback                                  | Low      | UI/UX verification        |

### 🔄 Migration Candidates

| Manual Test                                        | Automation Effort | Priority                         |
| -------------------------------------------------- | ----------------- | -------------------------------- |
| Month navigation updates totals                    | Low               | Already tested in report.spec.ts |
| Collapse/expand income section persists            | Medium            | Needs localStorage verification  |
| Collapse/expand expenses section                   | Medium            | Similar to income section        |
| Click category tile → navigate to filtered history | Medium            | Navigation flow                  |
| Click account card → navigate to filtered history  | Medium            | Navigation flow                  |

### ❌ Not Covered

- Dashboard empty state (no accounts/categories/sources)
- Hidden items don't appear on dashboard (`hiddenFromDashboard` flag)
- Quick add buttons (+) open correct forms
- Section totals recalculate after transactions

---

## 2. Accounts

Account management with support for multiple currencies and types.

### ✅ Automated Tests (8 tests)

| Test                                               | File            | Status |
| -------------------------------------------------- | --------------- | ------ |
| Create cash account with USD currency              | account.spec.ts | ✅     |
| Create bank account with EUR currency              | account.spec.ts | ✅     |
| Create crypto wallet account                       | account.spec.ts | ✅     |
| Create credit card account with negative balance   | account.spec.ts | ✅     |
| Edit existing account name and balance             | account.spec.ts | ✅     |
| Delete an account                                  | account.spec.ts | ✅     |
| Show account on dashboard after creation           | account.spec.ts | ✅     |
| Queue operations when offline and sync when online | account.spec.ts | ✅     |

### ⚠️ Manual Required

| Test Case                                            | Priority | Notes                         |
| ---------------------------------------------------- | -------- | ----------------------------- |
| Reorder accounts via drag-and-drop                   | Medium   | Settings page sortable list   |
| Hide account from dashboard                          | Medium   | `hiddenFromDashboard` flag    |
| Account with very large balance                      | Low      | Display/formatting edge case  |
| Account balance formatting with different currencies | Low      | Crypto precision (8 decimals) |

### 🔄 Migration Candidates

| Manual Test                          | Automation Effort | Priority               |
| ------------------------------------ | ----------------- | ---------------------- |
| Account type icons display correctly | Low               | Visual verification    |
| Account color picker                 | Low               | Form interaction       |
| Edit account type                    | Low               | Already have edit test |

### ❌ Not Covered

- Transfer between accounts with same currency (now in transfer.spec.ts ✅)
- Transfer between accounts with different currencies (now in transfer.spec.ts ✅)
- Account deletion with existing transactions (cascade behavior)
- Multiple accounts with same name (validation)

---

## 3. Categories

Expense categories with optional budget tracking.

### ✅ Automated Tests (8 tests in category.spec.ts + 10 tests in budget.spec.ts)

| Test                                              | File             | Status |
| ------------------------------------------------- | ---------------- | ------ |
| Create category without budget                    | category.spec.ts | ✅     |
| Create category with monthly budget               | category.spec.ts | ✅     |
| Create category with weekly budget                | category.spec.ts | ✅     |
| Create category with yearly budget                | category.spec.ts | ✅     |
| Edit category name and budget                     | category.spec.ts | ✅     |
| Delete a category                                 | category.spec.ts | ✅     |
| Show category on dashboard after creation         | category.spec.ts | ✅     |
| Persist category after offline and back online    | category.spec.ts | ✅     |
| Edit category budget amount                       | budget.spec.ts   | ✅     |
| Edit category budget period                       | budget.spec.ts   | ✅     |
| Track expenses against budget on dashboard        | budget.spec.ts   | ✅     |
| Show category spending in reports                 | budget.spec.ts   | ✅     |
| Create category without budget (budget.spec)      | budget.spec.ts   | ✅     |
| Remove budget from existing category              | budget.spec.ts   | ✅     |
| Handle multiple categories with different periods | budget.spec.ts   | ✅     |

### ⚠️ Manual Required

| Test Case                            | Priority | Notes                             |
| ------------------------------------ | -------- | --------------------------------- |
| Reorder categories via drag-and-drop | Medium   | Settings page sortable list       |
| Hide category from dashboard         | Medium   | `hiddenFromDashboard` flag        |
| Budget exceeded warning/styling      | High     | Visual indicator on dashboard     |
| Loan-type category behavior          | Medium   | Different from expense categories |

### 🔄 Migration Candidates

| Manual Test                            | Automation Effort | Priority           |
| -------------------------------------- | ----------------- | ------------------ |
| Category color picker                  | Low               | Form interaction   |
| Category icon selection                | Low               | Form interaction   |
| Budget progress indicator on dashboard | Medium            | Visual calculation |

### ❌ Not Covered

- Category used in transaction deletion behavior
- Category with no transactions shows correct total

---

## 4. Income Sources

Income source definitions for tracking income streams.

### ✅ Automated Tests (8 tests)

| Test                                                         | File                  | Status |
| ------------------------------------------------------------ | --------------------- | ------ |
| Create income source with USD currency                       | income-source.spec.ts | ✅     |
| Create income source with EUR currency (different from main) | income-source.spec.ts | ✅     |
| Create multiple income sources with different currencies     | income-source.spec.ts | ✅     |
| Edit income source name                                      | income-source.spec.ts | ✅     |
| Change income source currency                                | income-source.spec.ts | ✅     |
| Delete an income source                                      | income-source.spec.ts | ✅     |
| Show income source on dashboard after creation               | income-source.spec.ts | ✅     |
| Persist income source after offline and back online          | income-source.spec.ts | ✅     |

### ⚠️ Manual Required

| Test Case                                | Priority | Notes                       |
| ---------------------------------------- | -------- | --------------------------- |
| Reorder income sources via drag-and-drop | Medium   | Settings page sortable list |
| Hide income source from dashboard        | Medium   | `hiddenFromDashboard` flag  |

### 🔄 Migration Candidates

| Manual Test                  | Automation Effort | Priority         |
| ---------------------------- | ----------------- | ---------------- |
| Income source color picker   | Low               | Form interaction |
| Income source icon selection | Low               | Form interaction |

### ❌ Not Covered

- Income source used in transaction deletion behavior
- Income source with different currency than main currency

---

## 5. Transactions

Transaction history, filtering, editing, and deletion.

### ✅ Automated Tests (7 tests in transaction-edit.spec.ts + 9 tests in history-filters.spec.ts + 4 tests in infinite-scroll.spec.ts)

| Test                                                 | File                     | Status |
| ---------------------------------------------------- | ------------------------ | ------ |
| Edit income transaction amount from history          | transaction-edit.spec.ts | ✅     |
| Edit expense transaction comment                     | transaction-edit.spec.ts | ✅     |
| Edit transfer transaction amounts for multi-currency | transaction-edit.spec.ts | ✅     |
| Delete income transaction and reverse balance        | transaction-edit.spec.ts | ✅     |
| Delete expense transaction and reverse balance       | transaction-edit.spec.ts | ✅     |
| Delete transfer and reverse both account balances    | transaction-edit.spec.ts | ✅     |
| Persist edited transaction after offline and online  | transaction-edit.spec.ts | ✅     |
| Filter transactions by account                       | history-filters.spec.ts  | ✅     |
| Filter transactions by category                      | history-filters.spec.ts  | ✅     |
| Filter by date - today                               | history-filters.spec.ts  | ✅     |
| Filter by date - this month                          | history-filters.spec.ts  | ✅     |
| Filter by custom date range                          | history-filters.spec.ts  | ✅     |
| Search transactions by comment                       | history-filters.spec.ts  | ✅     |
| Search transactions by account name                  | history-filters.spec.ts  | ✅     |
| Combine multiple filters (type + account)            | history-filters.spec.ts  | ✅     |
| Show all transactions when clearing filters          | history-filters.spec.ts  | ✅     |
| Initially show only 50 transactions                  | infinite-scroll.spec.ts  | ✅     |
| Load more transactions on scroll                     | infinite-scroll.spec.ts  | ✅     |
| Reset to 50 when filter changes                      | infinite-scroll.spec.ts  | ✅     |
| Show "all transactions" message when fully loaded    | infinite-scroll.spec.ts  | ✅     |

### ⚠️ Manual Required

| Test Case                                   | Priority | Notes                   |
| ------------------------------------------- | -------- | ----------------------- |
| Create income via drag-drop (full flow)     | High     | Dashboard interaction   |
| Create expense via drag-drop (full flow)    | High     | Dashboard interaction   |
| Create transfer via drag-drop (full flow)   | High     | Dashboard interaction   |
| Edit transaction date                       | Medium   | Date picker interaction |
| Transaction with very large amount          | Low      | Display edge case       |
| Transaction with decimal precision (crypto) | Low      | 8 decimal places        |
| Cancel transaction creation (swipe down)    | Medium   | Mobile gesture          |
| Change account during transaction creation  | Medium   | Modal interaction       |
| Change category during expense creation     | Medium   | Modal interaction       |
| Change source during income creation        | Medium   | Modal interaction       |

### 🔄 Migration Candidates

| Manual Test                        | Automation Effort | Priority            |
| ---------------------------------- | ----------------- | ------------------- |
| Quick transaction modal - income   | Medium            | Dashboard drag-drop |
| Quick transaction modal - expense  | Medium            | Dashboard drag-drop |
| Quick transaction modal - transfer | Medium            | Dashboard drag-drop |
| Transaction form validation        | Medium            | Form edge cases     |

### ❌ Not Covered

- Multi-currency transaction creation
- Transaction balance calculation verification (now covered in transactionBalance.test.ts ✅)
- Transaction created date vs transaction date
- Transaction with loan type

---

## 5.1. Transfers

Transfer operations between accounts.

### ✅ Automated Tests (5 tests)

| Test                                                       | File             | Status |
| ---------------------------------------------------------- | ---------------- | ------ |
| Create transfer between accounts with same currency        | transfer.spec.ts | ✅     |
| Create transfer between accounts with different currencies | transfer.spec.ts | ✅     |
| Edit transfer and update both account balances             | transfer.spec.ts | ✅     |
| Delete transfer and reverse both account balances          | transfer.spec.ts | ✅     |
| Show transfer with correct amounts in history              | transfer.spec.ts | ✅     |

---

## 6. Loans

Loan management with payment tracking.

### ✅ Automated Tests (6 tests in loan.spec.ts + 10 tests in loan-payment.spec.ts)

| Test                                                        | File                 | Status |
| ----------------------------------------------------------- | -------------------- | ------ |
| Create loan given - account balance decreases               | loan.spec.ts         | ✅     |
| Create loan received - account balance increases            | loan.spec.ts         | ✅     |
| Create multi-currency loan (EUR loan, USD account)          | loan.spec.ts         | ✅     |
| Set due date for loan                                       | loan.spec.ts         | ✅     |
| Show loan summary amounts correctly                         | loan.spec.ts         | ✅     |
| Persist loan after offline and back online                  | loan.spec.ts         | ✅     |
| Record partial payment on loan given - balance increases    | loan-payment.spec.ts | ✅     |
| Record partial payment on loan received - balance decreases | loan-payment.spec.ts | ✅     |
| Record full payment - loan status becomes fully_paid        | loan-payment.spec.ts | ✅     |
| Use pay remaining button for full payment                   | loan-payment.spec.ts | ✅     |
| Record multi-currency payment (EUR loan, USD account)       | loan-payment.spec.ts | ✅     |
| Record multiple payments on same loan                       | loan-payment.spec.ts | ✅     |
| Show payment in transaction history                         | loan-payment.spec.ts | ✅     |
| Record payment to different account than loan account       | loan-payment.spec.ts | ✅     |
| Record payment to different account with same currency      | loan-payment.spec.ts | ✅     |
| Persist payment after offline and back online               | loan-payment.spec.ts | ✅     |

### ⚠️ Manual Required

| Test Case                                  | Priority | Notes            |
| ------------------------------------------ | -------- | ---------------- |
| Loan with due date approaching indicator   | Medium   | Visual warning   |
| Overdue loan indicator                     | Medium   | Visual warning   |
| Edit loan after partial payment            | Medium   | Form interaction |
| Delete loan with existing payments         | Low      | Cascade behavior |
| View loan transactions in filtered history | Low      | Navigation       |

### 🔄 Migration Candidates

| Manual Test                                                    | Automation Effort | Priority                  |
| -------------------------------------------------------------- | ----------------- | ------------------------- |
| Loan status transitions (active → partially_paid → fully_paid) | Low               | Already partially covered |
| Completed loans section                                        | Low               | UI visibility             |

### ❌ Not Covered

- Loan with no due date
- Loan currency different from account currency (display)
- Loan in completed section reverts to active

---

## 7. Reports

Monthly financial summaries and charts.

### ✅ Automated Tests (10 tests)

| Test                                        | File           | Status |
| ------------------------------------------- | -------------- | ------ |
| Show empty state when no transactions exist | report.spec.ts | ✅     |
| Display monthly income correctly            | report.spec.ts | ✅     |
| Display monthly expenses correctly          | report.spec.ts | ✅     |
| Calculate net flow correctly (income - exp) | report.spec.ts | ✅     |
| Show spending by category chart with data   | report.spec.ts | ✅     |
| Show 6-month trend chart with data          | report.spec.ts | ✅     |
| Navigate to previous month                  | report.spec.ts | ✅     |
| Navigate to next month                      | report.spec.ts | ✅     |
| Show different data when navigating months  | report.spec.ts | ✅     |
| Display total balance from all accounts     | report.spec.ts | ✅     |

### ⚠️ Manual Required

| Test Case                               | Priority | Notes               |
| --------------------------------------- | -------- | ------------------- |
| Chart interaction (tap category in pie) | Low      | Touch interaction   |
| Budget vs actual comparison             | Medium   | If implemented      |
| Export report as image                  | Low      | Share functionality |

### 🔄 Migration Candidates

| Manual Test       | Automation Effort | Priority            |
| ----------------- | ----------------- | ------------------- |
| Empty chart state | Low               | Visual verification |

### ❌ Not Covered

- Report with multi-currency transactions
- Report data accuracy across month boundaries
- Trend chart with missing months

---

## 8. Bulk Import Operations

Bulk data import functionality for efficient batch operations.

### ✅ Automated Tests

#### E2E Tests (4 tests)

| Test                                                        | File                | Status |
| ----------------------------------------------------------- | ------------------- | ------ |
| Handle bulk account balance updates                         | import-bulk.spec.ts | ✅     |
| Seed multiple transactions and verify count                 | import-bulk.spec.ts | ✅     |
| Handle large batch seeding without timeout (200+)           | import-bulk.spec.ts | ✅     |
| Import CSV via wizard with pre-existing accounts/categories | import-bulk.spec.ts | ✅     |

#### Unit Tests (35 tests)

| Test File              | Tests | Coverage                             |
| ---------------------- | ----- | ------------------------------------ |
| csvParser.test.ts      | 23    | CSV parsing, edge cases, validation  |
| importExecutor.test.ts | 12    | Import execution, mapping validation |

### Coverage Details

**What's Tested:**

- `localCache.accounts.bulkUpdateBalance()` - Batch balance updates
- `localCache.transactions.seedTransactions()` - Batch transaction creation
- Performance verification (200 transactions seeded in ~10ms)
- Account balance calculation after batch operations
- Full CSV import wizard flow (file upload → mapping → import)
- CSV parsing edge cases (quoted fields, multi-line, escaped quotes)
- Multi-currency transactions with `amountDop`/`currencyDop`
- Import validation and error handling
- Mapping validation (unmapped accounts/categories/sources)

**Backend Functions Added (2026-02-16):**

- `transactionRepo.bulkCreate()` - Batch transaction insertion with single sync queue entry
- `accountRepo.bulkUpdateBalance()` - Batch account balance updates
- `syncService.queueBulkOperation()` - Single queue entry for bulk operations
- `supabaseApi.transactions.bulkCreate()` - Batch remote sync

### ⚠️ Manual Required

| Test Case                                 | Priority | Notes                   |
| ----------------------------------------- | -------- | ----------------------- |
| Import with transfers between accounts    | Medium   | Transfer mapping        |
| Import resume after pause                 | Medium   | Saved state restoration |
| Import progress indicator                 | Low      | UI feedback             |
| Very large imports (10,000+ transactions) | Low      | Performance testing     |

### ❌ Not Covered

- Import with transfers between accounts (wizard mapping)
- Import resume from saved state
- Import error recovery from partial failure

---

## 9. Settings

Application preferences, data management, and entity management.

### ✅ Automated Tests (7 tests)

| Test                                | File                        | Status |
| ----------------------------------- | --------------------------- | ------ |
| Export data as JSON                 | settings.spec.ts            | ✅     |
| Delete all data with confirmation   | settings.spec.ts            | ✅     |
| Show language selection in settings | settings.spec.ts            | ✅     |
| Show currency selection in settings | settings.spec.ts            | ✅     |
| Show privacy mode option            | settings.spec.ts            | ✅     |
| Show export/import options          | settings.spec.ts            | ✅     |
| Show danger zone                    | settings.spec.ts            | ✅     |
| PWA update notification badge       | update-notification.spec.ts | ✅     |
| PWA update card in settings         | update-notification.spec.ts | ✅     |

### ⚠️ Manual Required

| Test Case                                    | Priority | Notes                            |
| -------------------------------------------- | -------- | -------------------------------- |
| Change language (EN ↔ RU)                    | High     | Full UI translation verification |
| Change main currency                         | High     | Affects all displays             |
| Toggle blur mode for financial figures       | Medium   | Privacy feature                  |
| Verify UI updates after language change      | High     | All pages                        |
| Export data to JSON                          | High     | Data integrity                   |
| Import data from JSON backup                 | High     | Data restoration                 |
| Import from BudgetOK                         | Medium   | Migration wizard                 |
| Delete all data with confirmation            | High     | Danger zone                      |
| Verify data integrity after import           | High     | Import validation                |
| Create custom currency                       | Medium   | Currency management              |
| Edit custom currency                         | Medium   | Currency management              |
| Delete custom currency                       | Medium   | Currency management              |
| Use custom currency in accounts/transactions | Medium   | End-to-end flow                  |

### 🔄 Migration Candidates

| Manual Test                        | Automation Effort | Priority                  |
| ---------------------------------- | ----------------- | ------------------------- |
| Language change persists on reload | Low               | localStorage verification |
| Currency change affects format     | Low               | Format verification       |
| Blur mode toggle                   | Low               | Visual state              |
| Export JSON file download          | Medium            | File system interaction   |
| Import JSON validation             | Medium            | Error handling            |

### ❌ Not Covered

- Sync status display (cloud users)
- User ID copy functionality
- Version click unlock (5 clicks for cloud)

---

## 9. Onboarding

New user onboarding flow.

### ⚠️ Manual Required

| Test Case                              | Priority | Notes               |
| -------------------------------------- | -------- | ------------------- |
| Complete onboarding step by step       | High     | Full flow (5 steps) |
| Skip onboarding                        | Medium   | Skip button         |
| Verify onboarding state persistence    | Medium   | localStorage        |
| Re-trigger onboarding after data reset | Low      | Fresh start         |

### 🔄 Migration Candidates

None - onboarding has known issues per CLAUDE.md

### ❌ Not Covered

- Onboarding step navigation
- Onboarding completion triggers
- Onboarding step indicators

> **Note:** Onboarding is known to have issues per CLAUDE.md. Tests should be added after fixes.

---

## 10. PWA / Mobile Specific / Offline

Progressive Web App features, offline functionality, and mobile-specific behaviors.

### ✅ Automated Tests (4 tests in update-notification.spec.ts + 3 tests in test-idb.spec.ts)

| Test                                          | File                        | Status |
| --------------------------------------------- | --------------------------- | ------ |
| No update badge when no update available      | update-notification.spec.ts | ✅     |
| Update badge when update available            | update-notification.spec.ts | ✅     |
| Update card in settings when update available | update-notification.spec.ts | ✅     |
| No update card in settings when no update     | update-notification.spec.ts | ✅     |
| IndexedDB test - sync-disabled mode           | test-idb.spec.ts            | ✅     |
| IndexedDB test - sync-enabled-online mode     | test-idb.spec.ts            | ✅     |
| IndexedDB test - sync-enabled-offline mode    | test-idb.spec.ts            | ✅     |

### Offline Persistence Tests (covered in respective spec files)

| Test                                                | File                     | Status |
| --------------------------------------------------- | ------------------------ | ------ |
| Persist account after offline and back online       | account.spec.ts          | ✅     |
| Persist category after offline and back online      | category.spec.ts         | ✅     |
| Persist income source after offline and back online | income-source.spec.ts    | ✅     |
| Persist loan after offline and back online          | loan.spec.ts             | ✅     |
| Persist payment after offline and back online       | loan-payment.spec.ts     | ✅     |
| Persist edited transaction after offline and online | transaction-edit.spec.ts | ✅     |

### ⚠️ Manual Required

| Test Case                         | Priority | Notes                     |
| --------------------------------- | -------- | ------------------------- |
| Install PWA prompt                | Medium   | Home screen install       |
| Safe area handling on iOS         | High     | Notch/island support      |
| Keyboard handling on mobile forms | High     | Known issue per CLAUDE.md |
| Pull-to-refresh behavior          | Low      | Mobile gesture            |

### 🔄 Migration Candidates

| Manual Test                | Automation Effort | Priority                  |
| -------------------------- | ----------------- | ------------------------- |
| Service worker update flow | Medium            | Already partially covered |

### ❌ Not Covered

- PWA manifest verification
- Service worker caching strategy
- Background sync
- Push notifications (if implemented)

---

## 11. Unit Tests (Utilities)

Utility function coverage.

### ✅ Automated Tests

| Test File                  | Tests | Coverage Area                          |
| -------------------------- | ----- | -------------------------------------- |
| currency.test.ts           | 23    | Currency formatting, symbols, colors   |
| cn.test.ts                 | 6     | Class name merging                     |
| icons.test.ts              | 4     | Icon lookup                            |
| date.test.ts               | 30    | Date formatting, month/year boundaries |
| transactionBalance.test.ts | 22    | Balance calculations                   |
| i18n.test.ts               | 28    | Translation keys, language switching   |
| colors.test.ts             | 11    | Color utilities                        |
| csvParser.test.ts          | 23    | CSV parsing, validation, edge cases    |
| importExecutor.test.ts     | 12    | Import execution, mapping validation   |

### ✅ Detailed Test Coverage

| Test                                                 | File                       | Status |
| ---------------------------------------------------- | -------------------------- | ------ |
| formatCurrency - USD with $ symbol                   | currency.test.ts           | ✅     |
| formatCurrency - EUR with € symbol                   | currency.test.ts           | ✅     |
| formatCurrency - BTC with 8 decimal places           | currency.test.ts           | ✅     |
| formatCurrency - ETH with 8 decimal places           | currency.test.ts           | ✅     |
| formatCurrency - handles negative amounts            | currency.test.ts           | ✅     |
| formatCurrency - handles zero                        | currency.test.ts           | ✅     |
| formatCurrency - unknown currency fallback           | currency.test.ts           | ✅     |
| getCurrencySymbol - returns $ for USD                | currency.test.ts           | ✅     |
| getCurrencySymbol - returns € for EUR                | currency.test.ts           | ✅     |
| getCurrencySymbol - returns ₽ for RUB                | currency.test.ts           | ✅     |
| getCurrencySymbol - unknown returns currency code    | currency.test.ts           | ✅     |
| getAmountSign - returns + for positive               | currency.test.ts           | ✅     |
| getAmountSign - returns - for negative               | currency.test.ts           | ✅     |
| getAmountSign - returns empty string for zero        | currency.test.ts           | ✅     |
| getAmountColorClass - text-success for positive      | currency.test.ts           | ✅     |
| getAmountColorClass - text-destructive for neg       | currency.test.ts           | ✅     |
| getAmountColorClass - text-foreground for zero       | currency.test.ts           | ✅     |
| formatCurrencyWithSign - + for positive              | currency.test.ts           | ✅     |
| formatCurrencyWithSign - - for negative              | currency.test.ts           | ✅     |
| formatCurrencyWithSign - no sign for zero            | currency.test.ts           | ✅     |
| getAllCurrencies - includes custom currencies        | currency.test.ts           | ✅     |
| Custom currencies override common with same code     | currency.test.ts           | ✅     |
| getAllCurrencies - only common when no custom        | currency.test.ts           | ✅     |
| cn - merges class names using clsx                   | cn.test.ts                 | ✅     |
| cn - handles conditional classes                     | cn.test.ts                 | ✅     |
| cn - merges tailwind classes correctly               | cn.test.ts                 | ✅     |
| cn - handles undefined and null                      | cn.test.ts                 | ✅     |
| cn - handles objects                                 | cn.test.ts                 | ✅     |
| cn - handles arrays                                  | cn.test.ts                 | ✅     |
| getIcon - returns correct icon for known name        | icons.test.ts              | ✅     |
| getIcon - Circle fallback for unknown names          | icons.test.ts              | ✅     |
| getIcon - Circle fallback for undefined              | icons.test.ts              | ✅     |
| getIcon - custom fallback when provided              | icons.test.ts              | ✅     |
| formatDate - formats with year, month, day           | date.test.ts               | ✅     |
| formatDateTime - formats with time                   | date.test.ts               | ✅     |
| formatDateForInput - YYYY-MM-DD format               | date.test.ts               | ✅     |
| getStartOfMonth - first day at midnight              | date.test.ts               | ✅     |
| getEndOfMonth - last day at end of day               | date.test.ts               | ✅     |
| getEndOfMonth - handles February leap year           | date.test.ts               | ✅     |
| getEndOfMonth - handles month lengths                | date.test.ts               | ✅     |
| getStartOfYear - January 1st                         | date.test.ts               | ✅     |
| getEndOfYear - December 31st at end of day           | date.test.ts               | ✅     |
| getStartOfWeek - returns Monday for any day          | date.test.ts               | ✅     |
| applyTransactionBalance - income adds to account     | transactionBalance.test.ts | ✅     |
| applyTransactionBalance - expense subtracts          | transactionBalance.test.ts | ✅     |
| applyTransactionBalance - transfer both accounts     | transactionBalance.test.ts | ✅     |
| applyTransactionBalance - transfer with toAmount     | transactionBalance.test.ts | ✅     |
| applyTransactionBalance - loan_given decreases       | transactionBalance.test.ts | ✅     |
| applyTransactionBalance - loan_received increases    | transactionBalance.test.ts | ✅     |
| applyTransactionBalance - loan_payment given loan    | transactionBalance.test.ts | ✅     |
| applyTransactionBalance - loan_payment received loan | transactionBalance.test.ts | ✅     |
| reverseTransactionBalance - income reverses          | transactionBalance.test.ts | ✅     |
| reverseTransactionBalance - expense reverses         | transactionBalance.test.ts | ✅     |
| reverseTransactionBalance - transfer reverses        | transactionBalance.test.ts | ✅     |
| reverseTransactionBalance - loan_given reverses      | transactionBalance.test.ts | ✅     |
| reverseTransactionBalance - loan_received reverses   | transactionBalance.test.ts | ✅     |
| reverseTransactionBalance - loan_payment reverses    | transactionBalance.test.ts | ✅     |
| t - returns correct translations                     | i18n.test.ts               | ✅     |
| tc - returns critical translations                   | i18n.test.ts               | ✅     |
| setLanguage/getLanguage - manages current language   | i18n.test.ts               | ✅     |
| translations - has matching keys in EN and RU        | i18n.test.ts               | ✅     |
| criticalTranslations - subset of full translations   | i18n.test.ts               | ✅     |
| translation key coverage - navigation keys           | i18n.test.ts               | ✅     |
| translation key coverage - action keys               | i18n.test.ts               | ✅     |
| translation key coverage - form keys                 | i18n.test.ts               | ✅     |
| translation key coverage - date filter keys          | i18n.test.ts               | ✅     |
| translation quality - Cyrillic for Russian           | i18n.test.ts               | ✅     |
| PRESET_COLORS - valid hex colors                     | colors.test.ts             | ✅     |
| PRESET_COLORS - unique colors                        | colors.test.ts             | ✅     |
| getRandomColor - returns from preset                 | colors.test.ts             | ✅     |
| getRandomColor - probabilistic distribution          | colors.test.ts             | ✅     |

### ❌ Not Covered

- `src/database/repositories.ts` - Repository CRUD operations (partially covered via E2E)
- `src/database/repositories.ts` - `bulkCreate()` and `bulkUpdateBalance()` functions
- `src/database/localCache.ts` - `bulkUpdateBalance()` and `bulkAdd()` functions
- `src/database/syncService.ts` - `queueBulkOperation()` function
- `src/database/supabaseApi.ts` - `transactions.bulkCreate()` function
- `src/features/import/utils/importExecutor.ts` - Batch processing logic
- `src/store/useAppStore.ts` - Zustand store actions

### 🔄 Recommended Unit Test Additions

| File                             | Priority | Reason                     |
| -------------------------------- | -------- | -------------------------- |
| repositories.ts (bulk functions) | High     | New bulk operations        |
| importExecutor.ts                | High     | Batch processing logic     |
| localCache.ts (bulk functions)   | Medium   | Data layer bulk operations |
| repositories.ts (CRUD)           | Medium   | Data layer testing         |
| useAppStore.ts                   | Medium   | State management           |

---

## 12. Error Handling

Error scenarios and edge cases.

### ⚠️ Manual Required

| Test Case                            | Priority | Notes               |
| ------------------------------------ | -------- | ------------------- |
| Handle invalid form input gracefully | High     | Validation feedback |
| Handle database errors               | High     | IndexedDB failure   |
| Handle network errors during export  | Medium   | Cloud sync          |
| Recover from corrupted localStorage  | Low      | Edge case           |

### ❌ Not Covered

- Form validation error messages
- Network timeout handling
- Data validation on import
- Concurrent modification handling

---

## Recommendations

### High Priority - Add Tests

1. **Dashboard drag-drop flow** - Core functionality, currently only manually tested
2. **Settings import/export** - Data integrity critical
3. **Language switching** - Full UI verification needed
4. **Offline mode** - Core PWA feature
5. ~~**BudgetOk import wizard E2E**~~ - ✅ Now covered

### Medium Priority - Automate Manual Tests

1. Budget exceeded warning styling
2. Entity reordering (drag-drop in settings)
3. Hidden items on dashboard
4. Onboarding flow (after fixes)
5. Import with transfers between accounts

### Low Priority - Unit Test Gaps

1. Date utilities - ✅ Well covered
2. Transaction balance calculations - ✅ Well covered
3. Repository bulk functions - ✅ E2E covered
4. Store actions
5. CSV parsing edge cases - ✅ Now covered (23 tests)

### Test Infrastructure Improvements

1. Add visual regression testing for charts
2. Add performance testing for infinite scroll
3. Add accessibility testing (a11y)
4. Add API mocking for sync tests

---

## Test Commands

```bash
# Run all tests
npm run test:coverage    # Unit tests with coverage
npx playwright test      # E2E tests

# Run specific test files
npx playwright test e2e/tests/loan.spec.ts
npx playwright test e2e/tests/transaction-edit.spec.ts
npx playwright test e2e/tests/import-bulk.spec.ts  # Bulk import tests

# Run with UI
npx playwright test --ui

# Generate coverage report
npm run test:coverage -- --reporter=html
```

---

## Related Files

- [e2e/UNCOVERED_USECASES.md](../e2e/UNCOVERED_USECASES.md) - Detailed uncovered use cases
- [CLAUDE.md](../CLAUDE.md) - Known issues and development notes
- [playwright.config.ts](../playwright.config.ts) - E2E test configuration
- [vitest.config.ts](../vitest.config.ts) - Unit test configuration
