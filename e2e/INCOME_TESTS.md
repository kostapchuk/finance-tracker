1# E2E Tests - Income Transactions

This document lists all E2E tests related to income functionality, organized by test file and sync mode.

## Sync Modes

All income tests run across 4 sync modes:

- `sync-disabled` - Local-only mode, online
- `sync-disabled-offline` - Local-only mode, offline
- `sync-enabled-online` - Cloud sync enabled, online
- `sync-enabled-offline` - Cloud sync enabled, offline (syncs when back online)

---

## 1. Income Transaction Creation

### Test: `should create income transaction via UI drag-and-drop`

**File:** `e2e/tests/dashboard.spec.ts`

Creates account and income source via UI, uses drag-and-drop to create a transaction, verifies via UI (history page, report page), and for offline modes verifies persistence after going online.

| Sync Mode             | Action                                     | Prepare Steps                                                                                                                                                     | Verification Steps                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sync-disabled         | Create via UI, drag-drop                   | 1. Navigate to dashboard<br>2. Create account "USD Cash" (1000 USD) via UI<br>3. Create income source "Salary" via UI<br>4. Drag income → account, fill 500, save | 1. History page: transaction "Salary" visible in full list<br>2. History page: filter by income, "Salary" visible<br>3. History page: inflows shows 500<br>4. Report page: income shows 500                                                                                                                                                                                                                                       |
| sync-disabled-offline | Create via UI offline → verify persistence | 1. Go offline<br>2. Create account + income source via UI<br>3. Drag income → account, fill 500, save                                                             | 1. History page: transaction "Salary" visible in full list<br>2. History page: filter by income, "Salary" visible<br>3. History page: inflows shows 500<br>4. Report page: income shows 500<br>5. Go online, reload<br>6. History page: "Salary" visible in full list<br>7. History page: filter by income, "Salary" visible<br>8. History page: inflows still shows 500<br>9. Report page: income still shows 500                |
| sync-enabled-online   | Create via UI, verify sync                 | 1. Create account + income source via UI<br>2. Drag income → account, fill 500, save                                                                              | 1. History page: transaction "Salary" visible in full list<br>2. History page: filter by income, "Salary" visible<br>3. History page: inflows shows 500<br>4. Report page: income shows 500<br>5. Wait for sync, remote transactions >= 1                                                                                                                                                                                         |
| sync-enabled-offline  | Create via UI offline → sync when online   | 1. Go offline<br>2. Create account + income source via UI<br>3. Drag income → account, fill 500, save                                                             | 1. History page: transaction "Salary" visible in full list<br>2. History page: filter by income, "Salary" visible<br>3. History page: inflows shows 500<br>4. Report page: income shows 500<br>5. Go online, wait for sync, reload<br>6. History page: "Salary" visible in full list<br>7. History page: filter by income, "Salary" visible<br>8. History page: inflows still shows 500<br>9. Report page: income still shows 500 |

**Technical Notes:**

- Account and income source are created via UI using the `AccountForm` and `IncomeSourceForm` page objects
- "Add Account" / "Add Income Source" buttons are located via `getByRole('button', { name: /add.*account/i })`
- dnd-kit `PointerSensor` requires 8px movement to activate drag
- Modal shows two amount inputs when income currency differs from main currency
- Must fill both inputs (source currency + main currency) for Save button to enable
- Use `fill()` method on inputs to properly replace values
- **All verification is done via UI**:
  - `historyPage.navigateTo('history')` → verify transaction visible in **full list** (no filter)
  - `historyPage.filterByType('income')` → verify transaction visible with filter
  - `historyPage.getInflowsAmount()` → check text contains "500"
  - `reportPage.navigateTo('report')` → `getIncomeAmount()` → check text contains "500"
- **For offline modes**: After base verification, go online, reload page, verify data is the same via UI
- **For sync-enabled-offline**: Wait for sync to complete after going online before reloading
- **For sync-enabled-online**: Wait for sync to complete and verify remote data

---

## 2. Income Transaction Edit

### Test: `should edit income transaction amount from history`

**File:** `e2e/tests/transaction-edit.spec.ts`

| Sync Mode             | Action                   | Prepare Steps                                                                                                                                                                                                                                                             | Verification Steps                                                                                                                                                                        |
| --------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sync-disabled         | Edit amount: 1000 → 1500 | 1. Seed account (USD Cash)<br>2. Seed income source (Salary)<br>3. Seed income transaction (1000 USD)<br>4. Update account balance to 2000<br>5. Navigate to history, filter by income<br>6. Click transaction "Initial salary"<br>7. Change amount to 1500, click Update | 1. Account balance = 2500<br>2. Transaction visible in history<br>3. History inflows shows 1,500<br>4. Report page shows 1,500                                                            |
| sync-disabled-offline | Edit amount: 1000 → 1500 | Same as sync-disabled                                                                                                                                                                                                                                                     | 1. Account balance = 2500<br>2. Transaction visible in history<br>3. History inflows shows 1,500<br>4. Report page shows 1,500                                                            |
| sync-enabled-online   | Edit amount: 1000 → 1500 | Same as sync-disabled                                                                                                                                                                                                                                                     | 1. Account balance = 2500<br>2. Transaction visible in history<br>3. History inflows shows 1,500<br>4. Report page shows 1,500<br>5. Wait for sync<br>6. Remote transaction amount = 1500 |
| sync-enabled-offline  | Edit amount: 1000 → 1500 | Same as sync-disabled                                                                                                                                                                                                                                                     | 1. Account balance = 2500<br>2. Transaction visible in history<br>3. History inflows shows 1,500<br>4. Report page shows 1,500                                                            |

---

## 3. Income Transaction Delete

### Test: `should delete income transaction and reverse balance`

**File:** `e2e/tests/transaction-edit.spec.ts`

| Sync Mode             | Action                    | Prepare Steps                                                                                                                                                                                                                                                           | Verification Steps                                                                                                                                                                                             |
| --------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sync-disabled         | Delete income transaction | 1. Seed account (USD Cash)<br>2. Seed income source (Salary)<br>3. Seed income transaction (2000 USD)<br>4. Update account balance to 3000<br>5. Navigate to history, filter by income<br>6. Click transaction "To be deleted"<br>7. Accept dialog, click delete button | 1. Account balance = 1000 (reversed)<br>2. Transaction count = 0<br>3. Transaction not visible in history<br>4. History inflows shows 0<br>5. Report page shows 0                                              |
| sync-disabled-offline | Delete income transaction | Same as sync-disabled                                                                                                                                                                                                                                                   | 1. Account balance = 1000<br>2. Transaction count = 0<br>3. Transaction not visible in history<br>4. History inflows shows 0<br>5. Report page shows 0                                                         |
| sync-enabled-online   | Delete income transaction | Same as sync-disabled                                                                                                                                                                                                                                                   | 1. Account balance = 1000<br>2. Transaction count = 0<br>3. Transaction not visible in history<br>4. History inflows shows 0<br>5. Report page shows 0<br>6. Wait for sync<br>7. Remote transactions count = 0 |
| sync-enabled-offline  | Delete income transaction | Same as sync-disabled                                                                                                                                                                                                                                                   | 1. Account balance = 1000<br>2. Transaction count = 0<br>3. Transaction not visible in history<br>4. History inflows shows 0<br>5. Report page shows 0                                                         |

---

## 4. Income Source Management

### Test: `should create an income source with USD currency`

**File:** `e2e/tests/income-source.spec.ts`

| Sync Mode             | Action               | Prepare Steps                                                                                                                     | Verification Steps                                                                                                     |
| --------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| sync-disabled         | Create income source | 1. Navigate to settings<br>2. Open income section<br>3. Click add<br>4. Fill name "Main Job"<br>5. Select currency USD<br>6. Save | 1. "Main Job" visible on page                                                                                          |
| sync-disabled-offline | Create income source | Same as sync-disabled                                                                                                             | 1. "Main Job" visible on page                                                                                          |
| sync-enabled-online   | Create income source | Same as sync-disabled                                                                                                             | 1. "Main Job" visible on page<br>2. Wait for sync<br>3. Remote sources count = 1<br>4. Remote source name = "Main Job" |
| sync-enabled-offline  | Create income source | Same as sync-disabled                                                                                                             | 1. "Main Job" visible on page                                                                                          |

### Test: `should create an income source with EUR currency (different from mainCurrency)`

**File:** `e2e/tests/income-source.spec.ts`

| Sync Mode             | Action                   | Prepare Steps                                                                                                                          | Verification Steps                                                                                                         |
| --------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| sync-disabled         | Create EUR income source | 1. Navigate to settings<br>2. Open income section<br>3. Click add<br>4. Fill name "Freelance EUR"<br>5. Select currency EUR<br>6. Save | 1. "Freelance EUR" visible on page                                                                                         |
| sync-disabled-offline | Create EUR income source | Same as sync-disabled                                                                                                                  | 1. "Freelance EUR" visible on page                                                                                         |
| sync-enabled-online   | Create EUR income source | Same as sync-disabled                                                                                                                  | 1. "Freelance EUR" visible on page<br>2. Wait for sync<br>3. Remote sources count = 1<br>4. Remote source currency = "EUR" |
| sync-enabled-offline  | Create EUR income source | Same as sync-disabled                                                                                                                  | 1. "Freelance EUR" visible on page                                                                                         |

### Test: `should create multiple income sources with different currencies`

**File:** `e2e/tests/income-source.spec.ts`

| Sync Mode             | Action                  | Prepare Steps                                                                                                        | Verification Steps                                                               |
| --------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| sync-disabled         | Create 2 income sources | 1. Navigate to settings<br>2. Open income section<br>3. Create "Primary Job" (USD)<br>4. Create "Side Project" (EUR) | 1. Both names visible on page                                                    |
| sync-disabled-offline | Create 2 income sources | Same as sync-disabled                                                                                                | 1. Both names visible on page                                                    |
| sync-enabled-online   | Create 2 income sources | Same as sync-disabled                                                                                                | 1. Both names visible on page<br>2. Wait for sync<br>3. Remote sources count = 2 |
| sync-enabled-offline  | Create 2 income sources | Same as sync-disabled                                                                                                | 1. Both names visible on page                                                    |

### Test: `should edit income source name`

**File:** `e2e/tests/income-source.spec.ts`

| Sync Mode            | Action    | Prepare Steps                                                                                                                                             | Verification Steps                                                                          |
| -------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| sync-disabled        | Edit name | 1. Seed income source "Test Income"<br>2. Navigate to settings<br>3. Open income section<br>4. Edit item<br>5. Change name to "Updated Income"<br>6. Save | 1. "Updated Income" visible<br>2. "Test Income" not visible                                 |
| sync-enabled-online  | Edit name | Same as sync-disabled                                                                                                                                     | 1. "Updated Income" visible<br>2. Wait for sync<br>3. Remote source name = "Updated Income" |
| sync-enabled-offline | Edit name | Same as sync-disabled                                                                                                                                     | 1. "Updated Income" visible                                                                 |

### Test: `should change income source currency`

**File:** `e2e/tests/income-source.spec.ts`

| Sync Mode           | Action          | Prepare Steps                                                                                                                                                       | Verification Steps                                                                    |
| ------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| sync-disabled       | Change currency | 1. Seed income source (Salary)<br>2. Navigate to settings<br>3. Open income section<br>4. Edit item<br>5. Select currency GBP<br>6. Save<br>7. Edit again to verify | 1. Currency button shows GBP                                                          |
| sync-enabled-online | Change currency | Same as sync-disabled                                                                                                                                               | 1. Currency button shows GBP<br>2. Wait for sync<br>3. Remote source currency = "GBP" |

### Test: `should delete an income source`

**File:** `e2e/tests/income-source.spec.ts`

| Sync Mode           | Action               | Prepare Steps                                                                                                                | Verification Steps                                                            |
| ------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| sync-disabled       | Delete income source | 1. Seed income source (Freelance)<br>2. Navigate to settings<br>3. Open income section<br>4. Accept dialog<br>5. Delete item | 1. "Freelance" not visible                                                    |
| sync-enabled-online | Delete income source | Same as sync-disabled                                                                                                        | 1. "Freelance" not visible<br>2. Wait for sync<br>3. Remote sources count = 0 |

### Test: `should show income source on dashboard after creation`

**File:** `e2e/tests/income-source.spec.ts`

| Sync Mode           | Action                    | Prepare Steps                                                                                                       | Verification Steps                                                                       |
| ------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| sync-disabled       | Create & verify dashboard | 1. Navigate to settings<br>2. Open income section<br>3. Create "Dashboard Income" (USD)<br>4. Navigate to dashboard | 1. Income source visible on dashboard                                                    |
| sync-enabled-online | Create & verify dashboard | Same as sync-disabled                                                                                               | 1. Income source visible on dashboard<br>2. Wait for sync<br>3. Remote sources count = 1 |

### Test: `should persist income source after offline and back online`

**File:** `e2e/tests/income-source.spec.ts`
**Mode:** `sync-enabled-offline` only

| Sync Mode            | Action                      | Prepare Steps                                                                         | Verification Steps                                                                                                                                                |
| -------------------- | --------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sync-enabled-offline | Create offline, sync online | 1. Navigate to settings<br>2. Open income section<br>3. Create "Offline Income" (USD) | 1. "Offline Income" visible<br>2. Sync queue count > 0<br>3. Go online<br>4. Wait for sync<br>5. Sync queue count = 0<br>6. Remote source name = "Offline Income" |

---

## 5. Report Page - Income Display

### Test: `should display monthly income correctly`

**File:** `e2e/tests/report.spec.ts`

| Sync Mode | Action         | Prepare Steps                                                                                                                  | Verification Steps             |
| --------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| All modes | Display income | 1. Seed account (USD Cash)<br>2. Seed income source (Salary)<br>3. Seed income transaction (2500 USD)<br>4. Navigate to report | 1. Income amount shows "2,500" |

### Test: `should calculate net flow correctly (income - expenses)`

**File:** `e2e/tests/report.spec.ts`

| Sync Mode | Action             | Prepare Steps                                                                                                                                                              | Verification Steps        |
| --------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| All modes | Calculate net flow | 1. Seed account (USD Cash)<br>2. Seed income source (Salary)<br>3. Seed category (Food)<br>4. Seed income (3000 USD)<br>5. Seed expense (800 USD)<br>6. Navigate to report | 1. Net flow shows "2,200" |

---

## 6. Dashboard - Income Source Visibility

### Test: `should hide income sources with hiddenFromDashboard flag`

**File:** `e2e/tests/dashboard.spec.ts`

| Sync Mode | Action             | Prepare Steps                                                                                                                                                                                                                    | Verification Steps                                    |
| --------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| All modes | Hide income source | 1. Seed account (USD Cash)<br>2. Seed category (Food)<br>3. Seed income source (Salary) - visible<br>4. Seed income source (Freelance) - hidden<br>5. Update Freelance with hiddenFromDashboard=true<br>6. Navigate to dashboard | 1. "Salary" visible<br>2. "Hidden Income" not visible |

---

## Test Summary

| Category                   | Test Count             | Modes                |
| -------------------------- | ---------------------- | -------------------- |
| Income Transaction Create  | 1 test × 4 modes = 4   | All                  |
| Income Transaction Edit    | 1 test × 4 modes = 4   | All                  |
| Income Transaction Delete  | 1 test × 4 modes = 4   | All                  |
| Income Source Create       | 3 tests × 4 modes = 12 | All                  |
| Income Source Edit         | 2 tests × 4 modes = 8  | All                  |
| Income Source Delete       | 1 test × 4 modes = 4   | All                  |
| Income Source Dashboard    | 1 test × 4 modes = 4   | All                  |
| Income Source Offline Sync | 1 test × 1 mode = 1    | sync-enabled-offline |
| Report Income Display      | 2 tests × 4 modes = 8  | All                  |
| Dashboard Visibility       | 1 test × 4 modes = 4   | All                  |

**Total: 53 test cases**

---

## Drag-and-Drop Implementation Details

### dnd-kit Activation Constraints

The app uses `@dnd-kit/core` with specific activation constraints:

```typescript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Must move 8px to activate drag
    },
  }),
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200, // Must hold 200ms
      tolerance: 5, // With 5px movement tolerance
    },
  })
)
```

### Test Implementation

```typescript
// Page object method
async performDragDrop(source: Locator, target: Locator): Promise<void> {
  const sourceBox = await source.boundingBox()
  const targetBox = await target.boundingBox()

  // Move to source
  await this.page.mouse.move(sourceCenter.x, sourceCenter.y)
  await this.page.waitForTimeout(50)

  // Mouse down
  await this.page.mouse.down()
  await this.page.waitForTimeout(50)

  // Move 10px to activate drag (dnd-kit requires 8px minimum)
  await this.page.mouse.move(sourceCenter.x + 10, sourceCenter.y + 10, { steps: 5 })
  await this.page.waitForTimeout(100)

  // Move to target
  await this.page.mouse.move(targetCenter.x, targetCenter.y, { steps: 15 })
  await this.page.waitForTimeout(100)

  // Drop
  await this.page.mouse.up()
  await this.page.waitForTimeout(300)
}
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

### Modal Input Handling

The QuickTransactionModal may show 1 or 2 amount inputs:

- **Single input**: When income source currency matches main currency
- **Two inputs**: When currencies differ (source currency + main currency)

```typescript
const amountInputs = page.locator('input[inputmode="decimal"]')
const inputCount = await amountInputs.count()

await amountInputs.first().fill('500')
if (inputCount > 1) {
  await amountInputs.nth(1).fill('500')
}
```

**Note:** Use `fill()` method instead of keyboard events - keyboard events append to existing values rather than replacing them.
