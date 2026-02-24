# Transaction E2E Test Cases

## Modes

| Mode                    | Sync     | Network |
| ----------------------- | -------- | ------- |
| `sync-disabled`         | Disabled | Online  |
| `sync-disabled-offline` | Disabled | Offline |
| `sync-enabled-online`   | Enabled  | Online  |
| `sync-enabled-offline`  | Enabled  | Offline |

---

# [sync-disabled] - Sync Disabled, Online

## Income

### EDIT: should edit income transaction amount from history

**Prepare Steps:**

1. Setup clean state with sync-disabled mode
2. Seed USD Cash account (balance: 1000)
3. Seed Salary income source
4. Seed transaction: type=income, amount=1000, currency=USD, account=USD Cash, incomeSource=Salary, comment="Initial salary"
5. Update account balance to 2000
6. Refresh store data
7. Navigate to history, filter by income
8. Click transaction "Initial salary"
9. Change amount from 1000 to 1500
10. Click Update button

**Verification Steps:**

1. Verify account balance updated to 2500
2. Verify transaction visible in history with updated amount
3. Verify history page inflows shows 1,500
4. Verify report page income shows 1,500

**Mode:** sync-disabled

---

### DELETE: should delete income transaction and reverse balance

**Prepare Steps:**

1. Setup clean state with sync-disabled mode
2. Seed USD Cash account (balance: 1000)
3. Seed Salary income source
4. Seed transaction: type=income, amount=2000, currency=USD, account=USD Cash, incomeSource=Salary, comment="To be deleted"
5. Update account balance to 3000
6. Refresh store data
7. Verify initial balance = 3000
8. Setup dialog handler to accept confirmation
9. Navigate to history, filter by income
10. Click transaction "To be deleted"
11. Click delete button (trash icon)

**Verification Steps:**

1. Verify account balance reversed to 1000
2. Verify transaction count = 0
3. Verify transaction not visible in history
4. Verify history page inflows shows 0
5. Verify report page income shows 0

**Mode:** sync-disabled

---

## Expense

### EDIT: should edit expense transaction comment

**Prepare Steps:**

1. Setup clean state with sync-disabled mode
2. Seed USD Cash account (balance: 1000)
3. Seed Food category
4. Seed transaction: type=expense, amount=50, currency=USD, account=USD Cash, category=Food, comment="Old comment"
5. Update account balance to 950
6. Refresh store data
7. Navigate to history, filter by expense
8. Click transaction "Old comment"
9. Change comment to "Updated grocery shopping"
10. Click Update button

**Verification Steps:**

1. Verify updated comment visible in history
2. Verify old comment not visible
3. Verify history page outflows shows 50
4. Verify report page expenses shows 50

**Mode:** sync-disabled

---

### DELETE: should delete expense transaction and reverse balance

**Prepare Steps:**

1. Setup clean state with sync-disabled mode
2. Seed USD Cash account (balance: 1000)
3. Seed Food category
4. Seed transaction: type=expense, amount=75, currency=USD, account=USD Cash, category=Food, comment="Expense to delete"
5. Update account balance to 925
6. Refresh store data
7. Verify initial balance = 925
8. Setup dialog handler to accept confirmation
9. Navigate to history, filter by expense
10. Click transaction "Expense to delete"
11. Click delete button (trash icon)

**Verification Steps:**

1. Verify account balance reversed to 1000
2. Verify transaction not visible in history
3. Verify history page outflows shows 0
4. Verify report page expenses shows 0

**Mode:** sync-disabled

---

### DELETE: should delete transaction with temp ID (offline-created transaction)

**Prepare Steps:**

1. Setup clean state with sync-disabled mode
2. Seed USD Cash account (balance: 1000)
3. Seed Food category
4. Create transaction with temp ID directly in IndexedDB: type=expense, amount=50, currency=USD, account=USD Cash, category=Food, comment="Temp ID transaction", id="temp*${timestamp}*${random}"
5. Update account balance to 950
6. Refresh store data
7. Verify transaction count = 1
8. Setup dialog handler to accept confirmation
9. Navigate to history
10. Click transaction "Temp ID transaction"
11. Click delete button (trash icon)

**Verification Steps:**

1. Verify transaction count = 0
2. Verify account balance reversed to 1000
3. Verify transaction not visible in history

**Mode:** sync-disabled

---

### OTHER: should show newly created offline transaction in history

**Prepare Steps:**

1. Setup clean state with sync-disabled mode
2. Seed USD Cash account (balance: 1000)
3. Seed Food category
4. Create transaction with temp ID directly in IndexedDB: type=expense, amount=75, currency=USD, account=USD Cash, category=Food, comment="New offline transaction"
5. Refresh store data
6. Verify transaction count = 1

**Verification Steps:**

1. Navigate to history
2. Verify transaction visible with comment "New offline transaction"

**Mode:** sync-disabled

---

### OTHER: should show transaction immediately after creating while on history page

**Prepare Steps:**

1. Setup clean state with sync-disabled mode
2. Seed USD Cash account (balance: 1000)
3. Seed Food category
4. Navigate to history page
5. Verify initial transaction count = 0
6. Create transaction with temp ID directly in IndexedDB: type=expense, amount=99, currency=USD, account=USD Cash, category=Food, comment="Immediate show test"
7. Verify transaction count = 1
8. Refresh store data
9. Navigate to history

**Verification Steps:**

1. Verify transaction visible with comment "Immediate show test"

**Mode:** sync-disabled

---

## Transfer

### CREATE: should create transfer between accounts with same currency

**Prepare Steps:**

1. Setup clean state with sync-disabled mode
2. Seed USD Cash account (balance: 1000)
3. Seed USD Bank account (balance: 500)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=USD Bank
5. Update account balances: USD Cash=900, USD Bank=600
6. Refresh store data and reload page

**Verification Steps:**

1. Navigate to history, filter by transfers
2. Verify transaction visible with comment "Same currency transfer"
3. Verify USD Cash balance = 900
4. Verify USD Bank balance = 600
5. Verify transaction count = 1

**Mode:** sync-disabled

---

### CREATE: should create transfer between accounts with different currencies

**Prepare Steps:**

1. Setup clean state with sync-disabled mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=EUR Bank, toAmount=90
5. Update account balances: USD Cash=900, EUR Bank=2090
6. Refresh store data and reload page

**Verification Steps:**

1. Navigate to history, filter by transfers
2. Verify transaction visible with comment "Multi-currency transfer"
3. Verify USD Cash balance = 900
4. Verify EUR Bank balance = 2090
5. Verify transaction count = 1

**Mode:** sync-disabled

---

### EDIT: should edit transfer transaction amounts for multi-currency

**Prepare Steps:**

1. Setup clean state with sync-disabled mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=EUR Bank, toAmount=90, comment="Initial transfer"
5. Update account balances: USD Cash=900, EUR Bank=2090
6. Refresh store data
7. Navigate to history, filter by transfers
8. Click transaction "Initial transfer"
9. Change USD amount to 150, EUR amount to 135
10. Click Update button

**Verification Steps:**

1. Verify USD Cash balance = 850
2. Verify EUR Bank balance = 2135
3. Verify transfer still visible in history

**Mode:** sync-disabled

---

### EDIT: should edit transfer and update both account balances

**Prepare Steps:**

1. Setup clean state with sync-disabled mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=EUR Bank, toAmount=90, comment="Initial transfer"
5. Update account balances: USD Cash=900, EUR Bank=2090
6. Refresh store data and reload page
7. Navigate to history, filter by transfers
8. Click transaction "Initial transfer"
9. Change amounts: USD=150, EUR=135
10. Click Update button

**Verification Steps:**

1. Verify USD Cash balance = 850
2. Verify EUR Bank balance = 2135
3. Verify transfer visible in history

**Mode:** sync-disabled

---

### DELETE: should delete transfer and reverse both account balances

**Prepare Steps:**

1. Setup clean state with sync-disabled mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=EUR Bank, toAmount=90, comment="Transfer to delete"
5. Update account balances: USD Cash=900, EUR Bank=2090
6. Refresh store data
7. Setup dialog handler to accept confirmation
8. Navigate to history, filter by transfers
9. Click transaction "Transfer to delete"
10. Click delete button (trash icon)

**Verification Steps:**

1. Verify USD Cash balance restored to 1000
2. Verify EUR Bank balance restored to 2000
3. Verify transfer not visible in history
4. Verify transaction count = 0

**Mode:** sync-disabled

---

### OTHER: should show transfer with correct amounts in history

**Prepare Steps:**

1. Setup clean state with sync-disabled mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=250, currency=USD, from=USD Cash, to=EUR Bank, toAmount=225, comment="Display test transfer"
5. Update account balances: USD Cash=750, EUR Bank=2225
6. Refresh store data and reload page

**Verification Steps:**

1. Navigate to history, filter by transfers
2. Verify transaction visible with comment "Display test transfer"
3. Verify amounts (250 or 225) displayed

**Mode:** sync-disabled

---

## Loan

### CREATE: should create a loan given (money lent out) - account balance decreases

**Prepare Steps:**

1. Setup clean state with sync-disabled mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button
6. Wait for accounts to load in form
7. Select type: given
8. Fill person name: "John Doe"
9. Fill description: "Vacation loan"
10. Select currency: USD
11. Select account: USD Cash
12. Fill amount: 500
13. Save

**Verification Steps:**

1. Verify loan appears in loans page with person name "John Doe"
2. Verify account balance decreased by 500
3. Verify transaction count = 1
4. Verify transaction appears in history page (filter by loans)
5. Verify history page outflows shows 500
6. Verify report page shows loan in "Owed to you" section

**Mode:** sync-disabled

---

### CREATE: should create a loan received (money borrowed) - account balance increases

**Prepare Steps:**

1. Setup clean state with sync-disabled mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button
6. Wait for accounts to load in form
7. Select type: received
8. Fill person name: "Jane Smith"
9. Fill description: "Personal loan"
10. Select currency: USD
11. Select account: USD Cash
12. Fill amount: 1000
13. Save

**Verification Steps:**

1. Verify loan appears in loans page with person name "Jane Smith"
2. Verify account balance increased by 1000
3. Verify transaction appears in history page (filter by loans)
4. Verify history page inflows shows 1,000
5. Verify report page shows debt in "You owe" section

**Mode:** sync-disabled

---

### CREATE: should create multi-currency loan (EUR loan, USD account)

**Prepare Steps:**

1. Setup clean state with sync-disabled mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button
6. Wait for accounts to load in form
7. Select type: given
8. Fill person name: "Pierre"
9. Fill description: "EUR loan"
10. Fill amount: 200
11. Select currency: EUR
12. Select account: USD Cash
13. Verify multi-currency mode is active
14. Fill account amount: 220
15. Save

**Verification Steps:**

1. Verify account balance decreased by 220 (account amount)
2. Verify transaction appears in history page (filter by loans)
3. Verify report page shows loan in "Owed to you" section with EUR amount

**Mode:** sync-disabled

---

### CREATE: should set due date for loan

**Prepare Steps:**

1. Setup clean state with sync-disabled mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button
6. Wait for accounts to load in form
7. Select type: given
8. Fill person name: "Bob"
9. Select currency: USD
10. Select account: USD Cash
11. Fill amount: 300
12. Set due date: 2025-06-15
13. Save

**Verification Steps:**

1. Verify loan appears in loans page with person name "Bob"
2. Verify transaction appears in history page (filter by loans)

**Mode:** sync-disabled

---

### CREATE: should show loan summary amounts correctly

**Prepare Steps:**

1. Setup clean state with sync-disabled mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button, wait for accounts to load
6. Create loan given: type=given, person="Person A", currency=USD, account=USD Cash, amount=1000
7. Save
8. Click Add button, wait for accounts to load
9. Create loan received: type=received, person="Person B", currency=USD, account=USD Cash, amount=500
10. Save

**Verification Steps:**

1. Verify loans page summary shows "Owed to you" = 1,000
2. Verify loans page summary shows "You owe" = 500
3. Verify both transactions appear in history (filter by loans)

**Mode:** sync-disabled

---

# [sync-disabled-offline] - Sync Disabled, Offline

## Income

### EDIT: should edit income transaction amount from history

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed Salary income source
4. Seed transaction: type=income, amount=1000, currency=USD, account=USD Cash, incomeSource=Salary, comment="Initial salary"
5. Update account balance to 2000
6. Refresh store data
7. Navigate to history, filter by income
8. Click transaction "Initial salary"
9. Change amount from 1000 to 1500
10. Click Update button

**Verification Steps:**

1. Verify account balance updated to 2500
2. Verify transaction visible in history with updated amount
3. Verify history page inflows shows 1,500
4. Verify report page income shows 1,500

**Mode:** sync-disabled-offline

---

### EDIT: should persist edited transaction in offline mode without sync

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed Salary income source
4. Seed transaction: type=income, amount=400, currency=USD, account=USD Cash, incomeSource=Salary, comment="Offline no sync edit"
5. Update account balance to 1400
6. Refresh store data
7. Navigate to history, filter by income
8. Click transaction "Offline no sync edit"
9. Change amount to 600
10. Click Update button
11. Capture balance and transaction count before reload
12. Reload page

**Verification Steps:**

1. Verify transaction visible in history before reload
2. Verify balance unchanged after reload
3. Verify transaction count unchanged after reload
4. Verify transaction still visible in history after reload

**Mode:** sync-disabled-offline

---

### DELETE: should delete income transaction and reverse balance

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed Salary income source
4. Seed transaction: type=income, amount=2000, currency=USD, account=USD Cash, incomeSource=Salary, comment="To be deleted"
5. Update account balance to 3000
6. Refresh store data
7. Verify initial balance = 3000
8. Setup dialog handler to accept confirmation
9. Navigate to history, filter by income
10. Click transaction "To be deleted"
11. Click delete button (trash icon)

**Verification Steps:**

1. Verify account balance reversed to 1000
2. Verify transaction count = 0
3. Verify transaction not visible in history
4. Verify history page inflows shows 0
5. Verify report page income shows 0

**Mode:** sync-disabled-offline

---

## Expense

### EDIT: should edit expense transaction comment

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed Food category
4. Seed transaction: type=expense, amount=50, currency=USD, account=USD Cash, category=Food, comment="Old comment"
5. Update account balance to 950
6. Refresh store data
7. Navigate to history, filter by expense
8. Click transaction "Old comment"
9. Change comment to "Updated grocery shopping"
10. Click Update button

**Verification Steps:**

1. Verify updated comment visible in history
2. Verify old comment not visible
3. Verify history page outflows shows 50
4. Verify report page expenses shows 50

**Mode:** sync-disabled-offline

---

### DELETE: should delete expense transaction and reverse balance

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed Food category
4. Seed transaction: type=expense, amount=75, currency=USD, account=USD Cash, category=Food, comment="Expense to delete"
5. Update account balance to 925
6. Refresh store data
7. Verify initial balance = 925
8. Setup dialog handler to accept confirmation
9. Navigate to history, filter by expense
10. Click transaction "Expense to delete"
11. Click delete button (trash icon)

**Verification Steps:**

1. Verify account balance reversed to 1000
2. Verify transaction not visible in history
3. Verify history page outflows shows 0
4. Verify report page expenses shows 0

**Mode:** sync-disabled-offline

---

### DELETE: should delete transaction with temp ID (offline-created transaction)

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed Food category
4. Create transaction with temp ID directly in IndexedDB: type=expense, amount=50, currency=USD, account=USD Cash, category=Food, comment="Temp ID transaction", id="temp*${timestamp}*${random}"
5. Update account balance to 950
6. Refresh store data
7. Verify transaction count = 1
8. Setup dialog handler to accept confirmation
9. Navigate to history
10. Click transaction "Temp ID transaction"
11. Click delete button (trash icon)

**Verification Steps:**

1. Verify transaction count = 0
2. Verify account balance reversed to 1000
3. Verify transaction not visible in history

**Mode:** sync-disabled-offline

---

### OTHER: should show newly created offline transaction in history

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed Food category
4. Create transaction with temp ID directly in IndexedDB: type=expense, amount=75, currency=USD, account=USD Cash, category=Food, comment="New offline transaction"
5. Refresh store data
6. Verify transaction count = 1

**Verification Steps:**

1. Navigate to history
2. Verify transaction visible with comment "New offline transaction"

**Mode:** sync-disabled-offline

---

### OTHER: should show transaction immediately after creating while on history page

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed Food category
4. Navigate to history page
5. Verify initial transaction count = 0
6. Create transaction with temp ID directly in IndexedDB: type=expense, amount=99, currency=USD, account=USD Cash, category=Food, comment="Immediate show test"
7. Verify transaction count = 1
8. Refresh store data
9. Navigate to history

**Verification Steps:**

1. Verify transaction visible with comment "Immediate show test"

**Mode:** sync-disabled-offline

---

### OTHER: should persist temp ID transaction in offline mode without sync

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed Food category
4. Create transaction with temp ID directly in IndexedDB: type=expense, amount=65, currency=USD, account=USD Cash, category=Food, comment="Offline no sync temp ID"
5. Update account balance to 935
6. Refresh store data
7. Verify transaction count = 1
8. Capture balance and transaction count before reload
9. Reload page

**Verification Steps:**

1. Verify transaction visible in history before reload
2. Verify balance unchanged after reload
3. Verify transaction count unchanged after reload
4. Verify transaction still visible in history after reload

**Mode:** sync-disabled-offline

---

## Transfer

### CREATE: should create transfer between accounts with same currency

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed USD Bank account (balance: 500)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=USD Bank
5. Update account balances: USD Cash=900, USD Bank=600
6. Refresh store data and reload page

**Verification Steps:**

1. Navigate to history, filter by transfers
2. Verify transaction visible with comment "Same currency transfer"
3. Verify USD Cash balance = 900
4. Verify USD Bank balance = 600
5. Verify transaction count = 1

**Mode:** sync-disabled-offline

---

### CREATE: should create transfer between accounts with different currencies

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=EUR Bank, toAmount=90
5. Update account balances: USD Cash=900, EUR Bank=2090
6. Refresh store data and reload page

**Verification Steps:**

1. Navigate to history, filter by transfers
2. Verify transaction visible with comment "Multi-currency transfer"
3. Verify USD Cash balance = 900
4. Verify EUR Bank balance = 2090
5. Verify transaction count = 1

**Mode:** sync-disabled-offline

---

### EDIT: should edit transfer transaction amounts for multi-currency

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=EUR Bank, toAmount=90, comment="Initial transfer"
5. Update account balances: USD Cash=900, EUR Bank=2090
6. Refresh store data
7. Navigate to history, filter by transfers
8. Click transaction "Initial transfer"
9. Change USD amount to 150, EUR amount to 135
10. Click Update button

**Verification Steps:**

1. Verify USD Cash balance = 850
2. Verify EUR Bank balance = 2135
3. Verify transfer still visible in history

**Mode:** sync-disabled-offline

---

### EDIT: should edit transfer and update both account balances

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=EUR Bank, toAmount=90, comment="Initial transfer"
5. Update account balances: USD Cash=900, EUR Bank=2090
6. Refresh store data and reload page
7. Navigate to history, filter by transfers
8. Click transaction "Initial transfer"
9. Change amounts: USD=150, EUR=135
10. Click Update button

**Verification Steps:**

1. Verify USD Cash balance = 850
2. Verify EUR Bank balance = 2135
3. Verify transfer visible in history

**Mode:** sync-disabled-offline

---

### DELETE: should delete transfer and reverse both account balances

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=EUR Bank, toAmount=90, comment="Transfer to delete"
5. Update account balances: USD Cash=900, EUR Bank=2090
6. Refresh store data
7. Setup dialog handler to accept confirmation
8. Navigate to history, filter by transfers
9. Click transaction "Transfer to delete"
10. Click delete button (trash icon)

**Verification Steps:**

1. Verify USD Cash balance restored to 1000
2. Verify EUR Bank balance restored to 2000
3. Verify transfer not visible in history
4. Verify transaction count = 0

**Mode:** sync-disabled-offline

---

### OTHER: should show transfer with correct amounts in history

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=250, currency=USD, from=USD Cash, to=EUR Bank, toAmount=225, comment="Display test transfer"
5. Update account balances: USD Cash=750, EUR Bank=2225
6. Refresh store data and reload page

**Verification Steps:**

1. Navigate to history, filter by transfers
2. Verify transaction visible with comment "Display test transfer"
3. Verify amounts (250 or 225) displayed

**Mode:** sync-disabled-offline

---

### OTHER: should persist transfer in offline mode without sync

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=250, currency=USD, from=USD Cash, to=EUR Bank, toAmount=225, comment="Offline no sync transfer"
5. Update account balances: USD Cash=750, EUR Bank=2225
6. Refresh store data
7. Capture balances and transaction count before reload
8. Reload page

**Verification Steps:**

1. Verify transfer visible in history before reload
2. Verify balances unchanged after reload
3. Verify transaction count unchanged after reload
4. Verify transfer still visible in history after reload

**Mode:** sync-disabled-offline

---

## Loan

### CREATE: should create a loan given (money lent out) - account balance decreases

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button
6. Wait for accounts to load in form
7. Select type: given
8. Fill person name: "John Doe"
9. Fill description: "Vacation loan"
10. Select currency: USD
11. Select account: USD Cash
12. Fill amount: 500
13. Save

**Verification Steps:**

1. Verify loan appears in loans page with person name "John Doe"
2. Verify account balance decreased by 500
3. Verify transaction count = 1
4. Verify transaction appears in history page (filter by loans)
5. Verify history page outflows shows 500
6. Verify report page shows loan in "Owed to you" section

**Mode:** sync-disabled-offline

---

### CREATE: should create a loan received (money borrowed) - account balance increases

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button
6. Wait for accounts to load in form
7. Select type: received
8. Fill person name: "Jane Smith"
9. Fill description: "Personal loan"
10. Select currency: USD
11. Select account: USD Cash
12. Fill amount: 1000
13. Save

**Verification Steps:**

1. Verify loan appears in loans page with person name "Jane Smith"
2. Verify account balance increased by 1000
3. Verify transaction appears in history page (filter by loans)
4. Verify history page inflows shows 1,000
5. Verify report page shows debt in "You owe" section

**Mode:** sync-disabled-offline

---

### CREATE: should create multi-currency loan (EUR loan, USD account)

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button
6. Wait for accounts to load in form
7. Select type: given
8. Fill person name: "Pierre"
9. Fill description: "EUR loan"
10. Fill amount: 200
11. Select currency: EUR
12. Select account: USD Cash
13. Verify multi-currency mode is active
14. Fill account amount: 220
15. Save

**Verification Steps:**

1. Verify account balance decreased by 220 (account amount)
2. Verify transaction appears in history page (filter by loans)
3. Verify report page shows loan in "Owed to you" section with EUR amount

**Mode:** sync-disabled-offline

---

### CREATE: should set due date for loan

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button
6. Wait for accounts to load in form
7. Select type: given
8. Fill person name: "Bob"
9. Select currency: USD
10. Select account: USD Cash
11. Fill amount: 300
12. Set due date: 2025-06-15
13. Save

**Verification Steps:**

1. Verify loan appears in loans page with person name "Bob"
2. Verify transaction appears in history page (filter by loans)

**Mode:** sync-disabled-offline

---

### CREATE: should show loan summary amounts correctly

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button, wait for accounts to load
6. Create loan given: type=given, person="Person A", currency=USD, account=USD Cash, amount=1000
7. Save
8. Click Add button, wait for accounts to load
9. Create loan received: type=received, person="Person B", currency=USD, account=USD Cash, amount=500
10. Save

**Verification Steps:**

1. Verify loans page summary shows "Owed to you" = 1,000
2. Verify loans page summary shows "You owe" = 500
3. Verify both transactions appear in history (filter by loans)

**Mode:** sync-disabled-offline

---

### OTHER: should persist loan in offline mode without sync

**Prepare Steps:**

1. Setup clean state with sync-disabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button, wait for accounts to load
6. Create loan: type=given, person="Offline No Sync Loan", currency=USD, account=USD Cash, amount=300
7. Save
8. Verify loan visible in loans page
9. Verify account balance decreased by 300
10. Verify transaction visible in history (filter by loans)
11. Capture state (balance, transaction count)
12. Go online and reload page

**Verification Steps:**

1. Verify loan appears in loans page before reload
2. Verify account balance decreased
3. Verify transaction appears in history before reload
4. Verify balance unchanged after reload
5. Verify transaction count unchanged after reload
6. Verify loan still visible in loans page after reload
7. Verify transaction still visible in history after reload

**Mode:** sync-disabled-offline

---

# [sync-enabled-online] - Sync Enabled, Online

## Income

### EDIT: should edit income transaction amount from history

**Prepare Steps:**

1. Setup clean state with sync-enabled-online mode
2. Seed USD Cash account (balance: 1000)
3. Seed Salary income source
4. Seed transaction: type=income, amount=1000, currency=USD, account=USD Cash, incomeSource=Salary, comment="Initial salary"
5. Update account balance to 2000
6. Refresh store data
7. Navigate to history, filter by income
8. Click transaction "Initial salary"
9. Change amount from 1000 to 1500
10. Click Update button

**Verification Steps:**

1. Verify account balance updated to 2500
2. Verify transaction visible in history with updated amount
3. Verify history page inflows shows 1,500
4. Verify report page income shows 1,500
5. Wait for sync to complete
6. Verify remote transactions count = 1
7. Verify remote transaction amount = 1500

**Mode:** sync-enabled-online

---

### DELETE: should delete income transaction and reverse balance

**Prepare Steps:**

1. Setup clean state with sync-enabled-online mode
2. Seed USD Cash account (balance: 1000)
3. Seed Salary income source
4. Seed transaction: type=income, amount=2000, currency=USD, account=USD Cash, incomeSource=Salary, comment="To be deleted"
5. Update account balance to 3000
6. Refresh store data
7. Verify initial balance = 3000
8. Setup dialog handler to accept confirmation
9. Navigate to history, filter by income
10. Click transaction "To be deleted"
11. Click delete button (trash icon)

**Verification Steps:**

1. Verify account balance reversed to 1000
2. Verify transaction count = 0
3. Verify transaction not visible in history
4. Verify history page inflows shows 0
5. Verify report page income shows 0
6. Wait for sync to complete
7. Verify remote transactions count = 0

**Mode:** sync-enabled-online

---

## Expense

### EDIT: should edit expense transaction comment

**Prepare Steps:**

1. Setup clean state with sync-enabled-online mode
2. Seed USD Cash account (balance: 1000)
3. Seed Food category
4. Seed transaction: type=expense, amount=50, currency=USD, account=USD Cash, category=Food, comment="Old comment"
5. Update account balance to 950
6. Refresh store data
7. Navigate to history, filter by expense
8. Click transaction "Old comment"
9. Change comment to "Updated grocery shopping"
10. Click Update button

**Verification Steps:**

1. Verify updated comment visible in history
2. Verify old comment not visible
3. Verify history page outflows shows 50
4. Verify report page expenses shows 50
5. Wait for sync to complete
6. Verify remote transaction comment = "Updated grocery shopping"

**Mode:** sync-enabled-online

---

### DELETE: should delete expense transaction and reverse balance

**Prepare Steps:**

1. Setup clean state with sync-enabled-online mode
2. Seed USD Cash account (balance: 1000)
3. Seed Food category
4. Seed transaction: type=expense, amount=75, currency=USD, account=USD Cash, category=Food, comment="Expense to delete"
5. Update account balance to 925
6. Refresh store data
7. Verify initial balance = 925
8. Setup dialog handler to accept confirmation
9. Navigate to history, filter by expense
10. Click transaction "Expense to delete"
11. Click delete button (trash icon)

**Verification Steps:**

1. Verify account balance reversed to 1000
2. Verify transaction not visible in history
3. Verify history page outflows shows 0
4. Verify report page expenses shows 0
5. Wait for sync to complete
6. Verify remote transactions count = 0

**Mode:** sync-enabled-online

---

## Transfer

### CREATE: should create transfer between accounts with same currency

**Prepare Steps:**

1. Setup clean state with sync-enabled-online mode
2. Seed USD Cash account (balance: 1000)
3. Seed USD Bank account (balance: 500)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=USD Bank
5. Update account balances: USD Cash=900, USD Bank=600
6. Refresh store data and reload page

**Verification Steps:**

1. Navigate to history, filter by transfers
2. Verify transaction visible with comment "Same currency transfer"
3. Verify USD Cash balance = 900
4. Verify USD Bank balance = 600
5. Verify transaction count = 1
6. Wait for sync to complete
7. Verify remote transactions count = 1
8. Verify remote transaction type = transfer

**Mode:** sync-enabled-online

---

### CREATE: should create transfer between accounts with different currencies

**Prepare Steps:**

1. Setup clean state with sync-enabled-online mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=EUR Bank, toAmount=90
5. Update account balances: USD Cash=900, EUR Bank=2090
6. Refresh store data and reload page

**Verification Steps:**

1. Navigate to history, filter by transfers
2. Verify transaction visible with comment "Multi-currency transfer"
3. Verify USD Cash balance = 900
4. Verify EUR Bank balance = 2090
5. Verify transaction count = 1
6. Wait for sync to complete
7. Verify remote transactions count = 1
8. Verify remote transaction toAmount = 90

**Mode:** sync-enabled-online

---

### EDIT: should edit transfer transaction amounts for multi-currency

**Prepare Steps:**

1. Setup clean state with sync-enabled-online mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=EUR Bank, toAmount=90, comment="Initial transfer"
5. Update account balances: USD Cash=900, EUR Bank=2090
6. Refresh store data
7. Navigate to history, filter by transfers
8. Click transaction "Initial transfer"
9. Change USD amount to 150, EUR amount to 135
10. Click Update button

**Verification Steps:**

1. Verify USD Cash balance = 850
2. Verify EUR Bank balance = 2135
3. Verify transfer still visible in history
4. Wait for sync to complete
5. Verify remote transaction amount = 150

**Mode:** sync-enabled-online

---

### EDIT: should edit transfer and update both account balances

**Prepare Steps:**

1. Setup clean state with sync-enabled-online mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=EUR Bank, toAmount=90, comment="Initial transfer"
5. Update account balances: USD Cash=900, EUR Bank=2090
6. Refresh store data and reload page
7. Navigate to history, filter by transfers
8. Click transaction "Initial transfer"
9. Change amounts: USD=150, EUR=135
10. Click Update button

**Verification Steps:**

1. Verify USD Cash balance = 850
2. Verify EUR Bank balance = 2135
3. Verify transfer visible in history
4. Wait for sync to complete
5. Verify remote transaction amount = 150
6. Verify remote transaction toAmount = 135

**Mode:** sync-enabled-online

---

### DELETE: should delete transfer and reverse both account balances

**Prepare Steps:**

1. Setup clean state with sync-enabled-online mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=EUR Bank, toAmount=90, comment="Transfer to delete"
5. Update account balances: USD Cash=900, EUR Bank=2090
6. Refresh store data
7. Setup dialog handler to accept confirmation
8. Navigate to history, filter by transfers
9. Click transaction "Transfer to delete"
10. Click delete button (trash icon)

**Verification Steps:**

1. Verify USD Cash balance restored to 1000
2. Verify EUR Bank balance restored to 2000
3. Verify transfer not visible in history
4. Verify transaction count = 0
5. Wait for sync to complete
6. Verify remote transactions count = 0

**Mode:** sync-enabled-online

---

### OTHER: should show transfer with correct amounts in history

**Prepare Steps:**

1. Setup clean state with sync-enabled-online mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=250, currency=USD, from=USD Cash, to=EUR Bank, toAmount=225, comment="Display test transfer"
5. Update account balances: USD Cash=750, EUR Bank=2225
6. Refresh store data and reload page

**Verification Steps:**

1. Navigate to history, filter by transfers
2. Verify transaction visible with comment "Display test transfer"
3. Verify amounts (250 or 225) displayed
4. Wait for sync to complete
5. Verify remote transactions count = 1

**Mode:** sync-enabled-online

---

## Loan

### CREATE: should create a loan given (money lent out) - account balance decreases

**Prepare Steps:**

1. Setup clean state with sync-enabled-online mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button
6. Wait for accounts to load in form
7. Select type: given
8. Fill person name: "John Doe"
9. Fill description: "Vacation loan"
10. Select currency: USD
11. Select account: USD Cash
12. Fill amount: 500
13. Save

**Verification Steps:**

1. Verify loan appears in loans page with person name "John Doe"
2. Verify account balance decreased by 500
3. Verify transaction count = 1
4. Verify transaction appears in history page (filter by loans)
5. Verify history page outflows shows 500
6. Verify report page shows loan in "Owed to you" section
7. Wait for sync to complete
8. Verify remote loans count = 1
9. Verify remote loan personName = "John Doe"
10. Verify remote loan type = "given"

**Mode:** sync-enabled-online

---

### CREATE: should create a loan received (money borrowed) - account balance increases

**Prepare Steps:**

1. Setup clean state with sync-enabled-online mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button
6. Wait for accounts to load in form
7. Select type: received
8. Fill person name: "Jane Smith"
9. Fill description: "Personal loan"
10. Select currency: USD
11. Select account: USD Cash
12. Fill amount: 1000
13. Save

**Verification Steps:**

1. Verify loan appears in loans page with person name "Jane Smith"
2. Verify account balance increased by 1000
3. Verify transaction appears in history page (filter by loans)
4. Verify history page inflows shows 1,000
5. Verify report page shows debt in "You owe" section
6. Wait for sync to complete
7. Verify remote loans count = 1
8. Verify remote loan type = "received"

**Mode:** sync-enabled-online

---

### CREATE: should create multi-currency loan (EUR loan, USD account)

**Prepare Steps:**

1. Setup clean state with sync-enabled-online mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button
6. Wait for accounts to load in form
7. Select type: given
8. Fill person name: "Pierre"
9. Fill description: "EUR loan"
10. Fill amount: 200
11. Select currency: EUR
12. Select account: USD Cash
13. Verify multi-currency mode is active
14. Fill account amount: 220
15. Save

**Verification Steps:**

1. Verify account balance decreased by 220 (account amount)
2. Verify transaction appears in history page (filter by loans)
3. Verify report page shows loan in "Owed to you" section with EUR amount
4. Wait for sync to complete
5. Verify remote loan currency = "EUR"

**Mode:** sync-enabled-online

---

### CREATE: should set due date for loan

**Prepare Steps:**

1. Setup clean state with sync-enabled-online mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button
6. Wait for accounts to load in form
7. Select type: given
8. Fill person name: "Bob"
9. Select currency: USD
10. Select account: USD Cash
11. Fill amount: 300
12. Set due date: 2025-06-15
13. Save

**Verification Steps:**

1. Verify loan appears in loans page with person name "Bob"
2. Verify transaction appears in history page (filter by loans)
3. Wait for sync to complete
4. Verify remote loan dueDate is defined

**Mode:** sync-enabled-online

---

### CREATE: should show loan summary amounts correctly

**Prepare Steps:**

1. Setup clean state with sync-enabled-online mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button, wait for accounts to load
6. Create loan given: type=given, person="Person A", currency=USD, account=USD Cash, amount=1000
7. Save
8. Click Add button, wait for accounts to load
9. Create loan received: type=received, person="Person B", currency=USD, account=USD Cash, amount=500
10. Save

**Verification Steps:**

1. Verify loans page summary shows "Owed to you" = 1,000
2. Verify loans page summary shows "You owe" = 500
3. Verify both transactions appear in history (filter by loans)
4. Wait for sync to complete
5. Verify remote loans count = 2

**Mode:** sync-enabled-online

---

# [sync-enabled-offline] - Sync Enabled, Offline

## Income

### EDIT: should edit income transaction amount from history

**Prepare Steps:**

1. Setup clean state with sync-enabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed Salary income source
4. Seed transaction: type=income, amount=1000, currency=USD, account=USD Cash, incomeSource=Salary, comment="Initial salary"
5. Update account balance to 2000
6. Refresh store data
7. Navigate to history, filter by income
8. Click transaction "Initial salary"
9. Change amount from 1000 to 1500
10. Click Update button

**Verification Steps:**

1. Verify account balance updated to 2500
2. Verify transaction visible in history with updated amount
3. Verify history page inflows shows 1,500
4. Verify report page income shows 1,500

**Mode:** sync-enabled-offline

---

### EDIT: should persist edited transaction after offline and back online

**Prepare Steps:**

1. Setup clean state with sync-enabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed Salary income source
4. Seed transaction: type=income, amount=500, currency=USD, account=USD Cash, incomeSource=Salary, comment="Offline edit test"
5. Update account balance to 1500
6. Refresh store data
7. Navigate to history, filter by income
8. Click transaction "Offline edit test"
9. Change amount to 750
10. Click Update button
11. Capture balance and transaction count before going online
12. Verify sync queue has pending items (count > 0)
13. Go online
14. Wait for sync to complete
15. Verify sync queue is empty (count = 0)
16. Reload page

**Verification Steps:**

1. Verify balance unchanged after reload
2. Verify transaction count unchanged after reload
3. Verify transaction still visible in history with updated amount
4. Verify remote transaction amount = 750

**Mode:** sync-enabled-offline

---

### DELETE: should delete income transaction and reverse balance

**Prepare Steps:**

1. Setup clean state with sync-enabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed Salary income source
4. Seed transaction: type=income, amount=2000, currency=USD, account=USD Cash, incomeSource=Salary, comment="To be deleted"
5. Update account balance to 3000
6. Refresh store data
7. Verify initial balance = 3000
8. Setup dialog handler to accept confirmation
9. Navigate to history, filter by income
10. Click transaction "To be deleted"
11. Click delete button (trash icon)

**Verification Steps:**

1. Verify account balance reversed to 1000
2. Verify transaction count = 0
3. Verify transaction not visible in history
4. Verify history page inflows shows 0
5. Verify report page income shows 0

**Mode:** sync-enabled-offline

---

## Expense

### EDIT: should edit expense transaction comment

**Prepare Steps:**

1. Setup clean state with sync-enabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed Food category
4. Seed transaction: type=expense, amount=50, currency=USD, account=USD Cash, category=Food, comment="Old comment"
5. Update account balance to 950
6. Refresh store data
7. Navigate to history, filter by expense
8. Click transaction "Old comment"
9. Change comment to "Updated grocery shopping"
10. Click Update button

**Verification Steps:**

1. Verify updated comment visible in history
2. Verify old comment not visible
3. Verify history page outflows shows 50
4. Verify report page expenses shows 50

**Mode:** sync-enabled-offline

---

### DELETE: should delete expense transaction and reverse balance

**Prepare Steps:**

1. Setup clean state with sync-enabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed Food category
4. Seed transaction: type=expense, amount=75, currency=USD, account=USD Cash, category=Food, comment="Expense to delete"
5. Update account balance to 925
6. Refresh store data
7. Verify initial balance = 925
8. Setup dialog handler to accept confirmation
9. Navigate to history, filter by expense
10. Click transaction "Expense to delete"
11. Click delete button (trash icon)

**Verification Steps:**

1. Verify account balance reversed to 1000
2. Verify transaction not visible in history
3. Verify history page outflows shows 0
4. Verify report page expenses shows 0

**Mode:** sync-enabled-offline

---

### OTHER: should sync temp ID transaction when coming online

**Prepare Steps:**

1. Setup clean state with sync-enabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed Food category
4. Create transaction with temp ID directly in IndexedDB: type=expense, amount=80, currency=USD, account=USD Cash, category=Food, comment="Sync temp ID test"
5. Update account balance to 920
6. Refresh store data
7. Verify transaction count = 1
8. Navigate to history and verify transaction visible
9. Capture balance and transaction count before going online
10. Verify sync queue has pending items (count > 0)
11. Go online
12. Wait for sync to complete
13. Verify sync queue is empty (count = 0)
14. Reload page

**Verification Steps:**

1. Verify transaction visible in history before going online
2. Verify balance unchanged after reload
3. Verify transaction count unchanged after reload
4. Verify transaction still visible in history after reload
5. Verify remote transactions count = 1
6. Verify remote transaction amount = 80
7. Verify remote transaction comment = "Sync temp ID test"

**Mode:** sync-enabled-offline

---

## Transfer

### CREATE: should create transfer between accounts with same currency

**Prepare Steps:**

1. Setup clean state with sync-enabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed USD Bank account (balance: 500)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=USD Bank
5. Update account balances: USD Cash=900, USD Bank=600
6. Refresh store data and reload page

**Verification Steps:**

1. Navigate to history, filter by transfers
2. Verify transaction visible with comment "Same currency transfer"
3. Verify USD Cash balance = 900
4. Verify USD Bank balance = 600
5. Verify transaction count = 1

**Mode:** sync-enabled-offline

---

### CREATE: should create transfer between accounts with different currencies

**Prepare Steps:**

1. Setup clean state with sync-enabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=EUR Bank, toAmount=90
5. Update account balances: USD Cash=900, EUR Bank=2090
6. Refresh store data and reload page

**Verification Steps:**

1. Navigate to history, filter by transfers
2. Verify transaction visible with comment "Multi-currency transfer"
3. Verify USD Cash balance = 900
4. Verify EUR Bank balance = 2090
5. Verify transaction count = 1

**Mode:** sync-enabled-offline

---

### EDIT: should edit transfer transaction amounts for multi-currency

**Prepare Steps:**

1. Setup clean state with sync-enabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=EUR Bank, toAmount=90, comment="Initial transfer"
5. Update account balances: USD Cash=900, EUR Bank=2090
6. Refresh store data
7. Navigate to history, filter by transfers
8. Click transaction "Initial transfer"
9. Change USD amount to 150, EUR amount to 135
10. Click Update button

**Verification Steps:**

1. Verify USD Cash balance = 850
2. Verify EUR Bank balance = 2135
3. Verify transfer still visible in history

**Mode:** sync-enabled-offline

---

### EDIT: should edit transfer and update both account balances

**Prepare Steps:**

1. Setup clean state with sync-enabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=EUR Bank, toAmount=90, comment="Initial transfer"
5. Update account balances: USD Cash=900, EUR Bank=2090
6. Refresh store data and reload page
7. Navigate to history, filter by transfers
8. Click transaction "Initial transfer"
9. Change amounts: USD=150, EUR=135
10. Click Update button

**Verification Steps:**

1. Verify USD Cash balance = 850
2. Verify EUR Bank balance = 2135
3. Verify transfer visible in history

**Mode:** sync-enabled-offline

---

### DELETE: should delete transfer and reverse both account balances

**Prepare Steps:**

1. Setup clean state with sync-enabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=100, currency=USD, from=USD Cash, to=EUR Bank, toAmount=90, comment="Transfer to delete"
5. Update account balances: USD Cash=900, EUR Bank=2090
6. Refresh store data
7. Setup dialog handler to accept confirmation
8. Navigate to history, filter by transfers
9. Click transaction "Transfer to delete"
10. Click delete button (trash icon)

**Verification Steps:**

1. Verify USD Cash balance restored to 1000
2. Verify EUR Bank balance restored to 2000
3. Verify transfer not visible in history
4. Verify transaction count = 0

**Mode:** sync-enabled-offline

---

### OTHER: should show transfer with correct amounts in history

**Prepare Steps:**

1. Setup clean state with sync-enabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=250, currency=USD, from=USD Cash, to=EUR Bank, toAmount=225, comment="Display test transfer"
5. Update account balances: USD Cash=750, EUR Bank=2225
6. Refresh store data and reload page

**Verification Steps:**

1. Navigate to history, filter by transfers
2. Verify transaction visible with comment "Display test transfer"
3. Verify amounts (250 or 225) displayed

**Mode:** sync-enabled-offline

---

### OTHER: should persist transfer after offline and back online

**Prepare Steps:**

1. Setup clean state with sync-enabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Seed EUR Bank account (balance: 2000)
4. Seed transaction: type=transfer, amount=300, currency=USD, from=USD Cash, to=EUR Bank, toAmount=270, comment="Offline transfer"
5. Update account balances: USD Cash=700, EUR Bank=2270
6. Refresh store data
7. Capture balances and transaction count before going online
8. Verify sync queue has pending items (count > 0)
9. Go online
10. Wait for sync to complete
11. Verify sync queue is empty (count = 0)
12. Reload page

**Verification Steps:**

1. Verify transfer visible in history before going online
2. Verify balances unchanged after reload
3. Verify transaction count unchanged after reload
4. Verify transfer still visible in history after reload
5. Verify remote transactions count = 1
6. Verify remote transaction comment = "Offline transfer"

**Mode:** sync-enabled-offline

---

## Loan

### CREATE: should create a loan given (money lent out) - account balance decreases

**Prepare Steps:**

1. Setup clean state with sync-enabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button
6. Wait for accounts to load in form
7. Select type: given
8. Fill person name: "John Doe"
9. Fill description: "Vacation loan"
10. Select currency: USD
11. Select account: USD Cash
12. Fill amount: 500
13. Save

**Verification Steps:**

1. Verify loan appears in loans page with person name "John Doe"
2. Verify account balance decreased by 500
3. Verify transaction count = 1
4. Verify transaction appears in history page (filter by loans)
5. Verify history page outflows shows 500
6. Verify report page shows loan in "Owed to you" section

**Mode:** sync-enabled-offline

---

### CREATE: should create a loan received (money borrowed) - account balance increases

**Prepare Steps:**

1. Setup clean state with sync-enabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button
6. Wait for accounts to load in form
7. Select type: received
8. Fill person name: "Jane Smith"
9. Fill description: "Personal loan"
10. Select currency: USD
11. Select account: USD Cash
12. Fill amount: 1000
13. Save

**Verification Steps:**

1. Verify loan appears in loans page with person name "Jane Smith"
2. Verify account balance increased by 1000
3. Verify transaction appears in history page (filter by loans)
4. Verify history page inflows shows 1,000
5. Verify report page shows debt in "You owe" section

**Mode:** sync-enabled-offline

---

### CREATE: should create multi-currency loan (EUR loan, USD account)

**Prepare Steps:**

1. Setup clean state with sync-enabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button
6. Wait for accounts to load in form
7. Select type: given
8. Fill person name: "Pierre"
9. Fill description: "EUR loan"
10. Fill amount: 200
11. Select currency: EUR
12. Select account: USD Cash
13. Verify multi-currency mode is active
14. Fill account amount: 220
15. Save

**Verification Steps:**

1. Verify account balance decreased by 220 (account amount)
2. Verify transaction appears in history page (filter by loans)
3. Verify report page shows loan in "Owed to you" section with EUR amount

**Mode:** sync-enabled-offline

---

### CREATE: should set due date for loan

**Prepare Steps:**

1. Setup clean state with sync-enabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button
6. Wait for accounts to load in form
7. Select type: given
8. Fill person name: "Bob"
9. Select currency: USD
10. Select account: USD Cash
11. Fill amount: 300
12. Set due date: 2025-06-15
13. Save

**Verification Steps:**

1. Verify loan appears in loans page with person name "Bob"
2. Verify transaction appears in history page (filter by loans)

**Mode:** sync-enabled-offline

---

### CREATE: should show loan summary amounts correctly

**Prepare Steps:**

1. Setup clean state with sync-enabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button, wait for accounts to load
6. Create loan given: type=given, person="Person A", currency=USD, account=USD Cash, amount=1000
7. Save
8. Click Add button, wait for accounts to load
9. Create loan received: type=received, person="Person B", currency=USD, account=USD Cash, amount=500
10. Save

**Verification Steps:**

1. Verify loans page summary shows "Owed to you" = 1,000
2. Verify loans page summary shows "You owe" = 500
3. Verify both transactions appear in history (filter by loans)

**Mode:** sync-enabled-offline

---

### OTHER: should persist loan after offline and back online

**Prepare Steps:**

1. Setup clean state with sync-enabled-offline mode
2. Seed USD Cash account (balance: 1000)
3. Refresh store data
4. Navigate to loans page
5. Click Add button, wait for accounts to load
6. Create loan: type=given, person="Offline Loan", currency=USD, account=USD Cash, amount=750
7. Save
8. Verify loan visible in loans page
9. Verify transaction visible in history (filter by loans)
10. Capture state (balance, transaction count)
11. Verify sync queue has pending items (count > 0)
12. Go online
13. Wait for sync to complete
14. Verify sync queue is empty (count = 0)
15. Reload page

**Verification Steps:**

1. Verify loan appears in loans page before going online
2. Verify transaction appears in history before going online
3. Verify balance unchanged after reload
4. Verify transaction count unchanged after reload
5. Verify loan still visible in loans page after reload
6. Verify transaction still visible in history after reload
7. Verify remote loans count = 1
8. Verify remote loan personName = "Offline Loan"

**Mode:** sync-enabled-offline

---

# Summary Table

## By Mode

| Mode                  | Total Tests |
| --------------------- | ----------- |
| sync-disabled         | 17          |
| sync-disabled-offline | 21          |
| sync-enabled-online   | 17          |
| sync-enabled-offline  | 19          |

## By Type

| Type     | CREATE | EDIT | DELETE | OTHER | Total |
| -------- | ------ | ---- | ------ | ----- | ----- |
| Income   | 0      | 3    | 2      | 0     | 5     |
| Expense  | 0      | 2    | 4      | 5     | 11    |
| Transfer | 2      | 4    | 2      | 4     | 12    |
| Loan     | 5      | 0    | 0      | 3     | 8     |

## By Operation

| Operation | Tests |
| --------- | ----- |
| CREATE    | 7     |
| EDIT      | 9     |
| DELETE    | 8     |
| OTHER     | 12    |

## Detailed Coverage by Mode and Type

| Mode                  | Type     | CREATE | EDIT | DELETE | OTHER |
| --------------------- | -------- | ------ | ---- | ------ | ----- |
| sync-disabled         | Income   | 0      | 1    | 1      | 0     |
| sync-disabled         | Expense  | 0      | 1    | 2      | 2     |
| sync-disabled         | Transfer | 2      | 2    | 1      | 1     |
| sync-disabled         | Loan     | 5      | 0    | 0      | 0     |
| sync-disabled-offline | Income   | 0      | 2    | 1      | 0     |
| sync-disabled-offline | Expense  | 0      | 1    | 2      | 3     |
| sync-disabled-offline | Transfer | 2      | 2    | 1      | 2     |
| sync-disabled-offline | Loan     | 5      | 0    | 0      | 1     |
| sync-enabled-online   | Income   | 0      | 1    | 1      | 0     |
| sync-enabled-online   | Expense  | 0      | 1    | 1      | 0     |
| sync-enabled-online   | Transfer | 2      | 2    | 1      | 1     |
| sync-enabled-online   | Loan     | 5      | 0    | 0      | 0     |
| sync-enabled-offline  | Income   | 0      | 2    | 1      | 0     |
| sync-enabled-offline  | Expense  | 0      | 1    | 1      | 1     |
| sync-enabled-offline  | Transfer | 2      | 2    | 1      | 2     |
| sync-enabled-offline  | Loan     | 5      | 0    | 0      | 1     |
