# E2E Tests - Income & Expense Transactions

This document lists all E2E tests related to income and expense functionality, organized by test file and sync mode.

## Test Files

- `e2e/tests/income-transactions.spec.ts` - Income create/edit/delete scenario tests
- `e2e/tests/expense-transactions.spec.ts` - Expense create/edit/delete scenario tests
- `e2e/tests/transaction-edit.spec.ts` - Transfer tests + offline persistence tests
- `e2e/tests/income-source.spec.ts` - Income source management tests
- `e2e/tests/report.spec.ts` - Report page tests

---

## 1. Income Transaction Create Scenarios

### File: `e2e/tests/income-transactions.spec.ts`

Tests all create scenarios across all 4 sync modes.

| Scenario                     | Amount | Comment        | Date       | Verification                      |
| ---------------------------- | ------ | -------------- | ---------- | --------------------------------- |
| Amount only                  | 100    | -              | today      | Balance: 1,100; Income: 100       |
| Amount with comment          | 200    | "Test comment" | today      | Balance: 1,200; Comment visible   |
| Amount with date             | 300    | -              | yesterday  | Balance: 1,300; Date is yesterday |
| Amount with comment and date | 400    | "Full test"    | 2 days ago | Balance: 1,400; Comment + date    |

**For each scenario verify:**

1. Dashboard: account balance (initial + income)
2. Dashboard: income source shows monthly amount
3. History: transaction visible with correct amount
4. History: shows account name
5. Report: income shows correct amount
6. Sync verification (for sync-enabled modes)

---

## 2. Income Transaction Edit Scenarios

### File: `e2e/tests/income-transactions.spec.ts`

Tests all edit combinations across all 4 sync modes.

| Scenario                    | Initial   | Edit                               | Verification                           |
| --------------------------- | --------- | ---------------------------------- | -------------------------------------- |
| Amount only                 | 1000      | → 1500                             | Balance: 2,500; Amount: 1,500          |
| Comment only                | "Initial" | → "Updated comment"                | Comment updated                        |
| Date only                   | today     | → 3 days ago                       | Date updated                           |
| Amount and comment          | 1000      | → 2000 + "New comment"             | Balance: 3,000; Comment: "New comment" |
| Amount and date             | 1000      | → 2500 + yesterday                 | Balance: 3,500; Date: yesterday        |
| Comment and date            | "Old"     | → "New" + 2 days ago               | Comment + date updated                 |
| All (amount, comment, date) | 1000      | → 3000 + "All updated" + yesterday | Balance: 4,000; All fields updated     |

**For each scenario verify:**

1. Dashboard: account balance updated
2. Dashboard: income source shows new amount
3. History: transaction visible with updated amount
4. History: shows account name
5. History: shows updated comment (if edited)
6. Report: income shows updated amount

---

## 3. Income Transaction Delete Scenarios

### File: `e2e/tests/income-transactions.spec.ts`

Tests income transaction deletion across all 4 sync modes.

| Sync Mode             | Action                                 | Verification                     |
| --------------------- | -------------------------------------- | -------------------------------- |
| sync-disabled         | Delete income, verify balance reversed | Balance: 1500 → 1000             |
| sync-disabled-offline | Same, verify persistence               | Balance reversed, tx not visible |
| sync-enabled-online   | Same, verify remote data after sync    | Remote transactions empty        |
| sync-enabled-offline  | Same, verify sync after coming online  | Remote transactions empty        |

**For each scenario verify:**

1. Dashboard: account balance reversed to original
2. Dashboard: income source shows no amount
3. History: transaction not visible
4. Report: income shows 0

---

## 4. Expense Transaction Create Scenarios

### File: `e2e/tests/expense-transactions.spec.ts`

Tests all create scenarios across all 4 sync modes.

| Scenario                     | Amount | Comment        | Date       | Verification                    |
| ---------------------------- | ------ | -------------- | ---------- | ------------------------------- |
| Amount only                  | 100    | -              | today      | Balance: 900; Expense: 100      |
| Amount with comment          | 200    | "Test comment" | today      | Balance: 800; Comment visible   |
| Amount with date             | 300    | -              | yesterday  | Balance: 700; Date is yesterday |
| Amount with comment and date | 400    | "Full test"    | 2 days ago | Balance: 600; Comment + date    |

**For each scenario verify:**

1. Dashboard: account balance (initial - expense)
2. History: transaction visible with correct amount
3. History: shows account name
4. History: shows comment (if present)
5. Report: expenses show correct amount
6. Sync verification (for sync-enabled modes)

---

## 5. Expense Transaction Edit Scenarios

### File: `e2e/tests/expense-transactions.spec.ts`

Tests all edit combinations across all 4 sync modes.

| Scenario                    | Initial   | Edit                               | Verification                       |
| --------------------------- | --------- | ---------------------------------- | ---------------------------------- |
| Amount only                 | 1000      | → 1500                             | Balance: 500; Amount: 1,500        |
| Comment only                | "Initial" | → "Updated comment"                | Comment updated                    |
| Date only                   | today     | → 3 days ago                       | Date updated                       |
| Amount and comment          | 1000      | → 2000 + "New comment"             | Balance: 0; Comment: "New comment" |
| Amount and date             | 1000      | → 2500 + yesterday                 | Balance: -500; Date: yesterday     |
| Comment and date            | "Old"     | → "New" + 2 days ago               | Comment + date updated             |
| All (amount, comment, date) | 1000      | → 3000 + "All updated" + yesterday | Balance: -1000; All fields updated |

**For each scenario verify:**

1. Dashboard: account balance updated
2. History: transaction visible with updated amount
3. History: shows account name
4. History: shows updated comment (if edited)
5. Report: expenses show updated amount

---

## 6. Expense Transaction Delete Scenarios

### File: `e2e/tests/expense-transactions.spec.ts`

Tests expense transaction deletion across all 4 sync modes.

| Sync Mode             | Action                                  | Verification                     |
| --------------------- | --------------------------------------- | -------------------------------- |
| sync-disabled         | Delete expense, verify balance reversed | Balance: 500 → 1000              |
| sync-disabled-offline | Same, verify persistence                | Balance reversed, tx not visible |
| sync-enabled-online   | Same, verify remote data after sync     | Remote transactions empty        |
| sync-enabled-offline  | Same, verify sync after coming online   | Remote transactions empty        |

**For each scenario verify:**

1. Dashboard: account balance reversed to original
2. History: transaction not visible
3. Report: expenses show 0
4. Sync verification (for sync-enabled modes)

---

## 7. Transfer Transaction Edit

### Test: `should edit transfer transaction amounts for multi-currency`

**File:** `e2e/tests/transaction-edit.spec.ts`

Tests multi-currency transfer editing across all 4 sync modes.

| Sync Mode             | Initial             | Edit                                | Verification                   |
| --------------------- | ------------------- | ----------------------------------- | ------------------------------ |
| sync-disabled         | USD: 900, EUR: 2090 | 100 USD → 150 USD, 90 EUR → 135 EUR | USD: 850, EUR: 2135            |
| sync-disabled-offline | Same                | Same                                | Same, verify persistence       |
| sync-enabled-online   | Same                | Same                                | Same, verify remote data       |
| sync-enabled-offline  | Same                | Same                                | Same, verify sync after online |

**For each scenario verify:**

1. Both account balances updated correctly (from account decreases, to account increases)
2. Transfer still visible in history with updated amounts
3. Sync verification (for sync-enabled modes): remote transaction has updated amount

---

## 8. Transfer Delete

### Test: `should delete transfer and reverse both account balances`

**File:** `e2e/tests/transaction-edit.spec.ts`

Tests transfer deletion with balance reversal on both accounts across all 4 sync modes.

| Sync Mode             | Initial             | After Delete                   |
| --------------------- | ------------------- | ------------------------------ |
| sync-disabled         | USD: 900, EUR: 2090 | USD: 1000, EUR: 2000           |
| sync-disabled-offline | Same                | Same, verify persistence       |
| sync-enabled-online   | Same                | Same, verify remote data       |
| sync-enabled-offline  | Same                | Same, verify sync after online |

**For each scenario verify:**

1. Both account balances reversed to original values
2. Transfer no longer visible in history
3. Transaction count is 0
4. Sync verification (for sync-enabled modes): remote transactions empty

---

## 9. Offline Persistence Tests

### File: `e2e/tests/transaction-edit.spec.ts`

Additional tests for offline scenarios:

| Test                                                              | Mode                                 | Description                       |
| ----------------------------------------------------------------- | ------------------------------------ | --------------------------------- |
| Persist edited transaction after offline and back online          | sync-enabled-offline                 | Edit offline, sync online         |
| Persist edited transaction in offline mode without sync           | sync-disabled-offline                | Edit offline, verify persistence  |
| Delete transaction with temp ID                                   | sync-disabled, sync-disabled-offline | Tests temp ID handling            |
| Show newly created offline transaction in history                 | sync-disabled, sync-disabled-offline | Tests offline creation visibility |
| Show transaction immediately after creating while on history page | sync-disabled, sync-disabled-offline | Tests real-time updates           |
| Sync temp ID transaction when coming online                       | sync-enabled-offline                 | Tests offline→online sync         |
| Persist temp ID transaction in offline mode without sync          | sync-disabled-offline                | Tests offline persistence         |

---

## 10. Income Source Management

### File: `e2e/tests/income-source.spec.ts`

| Test                                                | Modes                | Description                        |
| --------------------------------------------------- | -------------------- | ---------------------------------- |
| Create income source with USD currency              | All 4                | Basic creation                     |
| Create income source with EUR currency              | All 4                | Different from main currency       |
| Create multiple income sources                      | All 4                | Multiple with different currencies |
| Edit income source name                             | All 4                | Name update                        |
| Change income source currency                       | All 4                | Currency change                    |
| Delete income source                                | All 4                | Deletion                           |
| Show income source on dashboard after creation      | All 4                | Dashboard visibility               |
| Persist income source after offline and back online | sync-enabled-offline | Offline persistence                |

---

## 11. Report Page - Income Display

### File: `e2e/tests/report.spec.ts`

| Test                                             | Description                   |
| ------------------------------------------------ | ----------------------------- |
| Display monthly income correctly                 | Shows income amount on report |
| Calculate net flow correctly (income - expenses) | Shows net calculation         |

---

## 12. Dashboard - Income Source Visibility

### File: `e2e/tests/dashboard.spec.ts`

| Test                                              | Description             |
| ------------------------------------------------- | ----------------------- |
| Hide income sources with hiddenFromDashboard flag | Tests visibility toggle |

---

## Test Summary

| Category                 | Test Count        | Modes   |
| ------------------------ | ----------------- | ------- |
| Income Create Scenarios  | 4 tests × 4 modes | All     |
| Income Edit Scenarios    | 7 tests × 4 modes | All     |
| Income Delete Scenarios  | 1 test × 4 modes  | All     |
| Expense Create Scenarios | 4 tests × 4 modes | All     |
| Expense Edit Scenarios   | 7 tests × 4 modes | All     |
| Expense Delete Scenarios | 1 test × 4 modes  | All     |
| Transfer Edit            | 1 test × 4 modes  | All     |
| Transfer Delete          | 1 test × 4 modes  | All     |
| Offline Persistence      | 7 tests           | Various |
| Income Source Management | 8 tests × 4 modes | All     |
| Report Income Display    | 2 tests × 4 modes | All     |
| Dashboard Visibility     | 1 test × 4 modes  | All     |

---

## Technical Notes

### Creating Transactions

```typescript
// Fill amount
const amountInputs = page.locator('input[inputmode="decimal"], input[inputMode="decimal"]')
await amountInputs.first().fill('500')
if (inputCount > 1) {
  await amountInputs.nth(1).fill('500')
}

// Add comment (optional)
const commentTextarea = page.locator('textarea')
await commentTextarea.fill('Comment text')

// Set date (optional)
const dateInput = page.locator('input[type="date"]')
await dateInput.fill('2024-01-15') // YYYY-MM-DD format
```

### Verifying Transactions

```typescript
// Dashboard balance
const accountElement = dashboardPage.getAccountByName('USD Cash')
const accountText = await accountElement.textContent()
expect(accountText).toContain(formatAmount(expectedBalance))

// History amount
const amountText = await historyPage.getTransactionAmountByTitle('Salary').textContent()
expect(amountText).toContain(formatAmount(amount))

// Full transaction text (account + comment)
const txFullText = await transactionEl.textContent()
expect(txFullText).toContain('USD Cash')
expect(txFullText).toContain('Comment text')
```

### Helper Functions

```typescript
function getDateStr(offset: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date.toISOString().split('T')[0] // YYYY-MM-DD
}

function formatAmount(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
```

### dnd-kit Activation Constraints

The app uses `@dnd-kit/core` with specific activation constraints:

```typescript
useSensor(PointerSensor, {
  activationConstraint: {
    distance: 8, // Must move 8px to activate drag
  },
})
```

### Element Selectors

Income sources, accounts, and categories are rendered as `<button>` elements:

```typescript
getIncomeSourceByName(name: string): Locator {
  return this.getIncomeSection()
    .locator('button')
    .filter({ hasText: new RegExp(shortName, 'i') })
    .first()
}
```

### Multi-Currency Handling

Modal shows two amount inputs when income currency differs from main currency:

- Must fill both inputs (source currency + main currency) for Save button to enable
- Use `fill()` method instead of keyboard events
