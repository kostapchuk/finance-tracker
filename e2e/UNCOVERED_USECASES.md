# E2E Test Coverage Gaps

This document lists use cases and features that are **not currently covered** by E2E tests.

## Investments

- [ ] Create investment position (buy)
- [ ] Sell investment position
- [ ] Update investment current price
- [ ] View investment portfolio
- [ ] Investment profit/loss calculation
- [ ] Investment transactions in history

## Reports Page

- [x] View monthly summary *(report.spec.ts)*
- [x] View spending by category chart *(report.spec.ts)*
- [x] View 6-month trend chart *(report.spec.ts)*
- [x] Navigate between months in reports *(report.spec.ts)*
- [x] Verify totals match transaction data *(report.spec.ts)*

## Settings - Data Management

- [ ] Export data to JSON
- [ ] Import data from JSON backup
- [ ] Import from BudgetOK
- [ ] Delete all data with confirmation
- [ ] Verify data integrity after import

## Settings - Preferences

- [ ] Change language (EN ↔ RU)
- [ ] Change main currency
- [ ] Toggle blur mode for financial figures
- [ ] Verify UI updates after language change

## Custom Currencies

- [ ] Create custom currency
- [ ] Edit custom currency
- [ ] Delete custom currency
- [ ] Use custom currency in accounts/transactions

## Onboarding Flow

- [ ] Complete onboarding step by step
- [ ] Skip onboarding
- [ ] Verify onboarding state persistence
- [ ] Re-trigger onboarding after data reset

> Note: Onboarding is known to have issues per CLAUDE.md

## Dashboard - Month Navigation

- [ ] Navigate to previous month
- [ ] Navigate to next month
- [ ] Verify monthly totals update correctly
- [ ] Verify category/income tiles show correct month data

## Dashboard - Section Interactions

- [ ] Collapse/expand income section
- [ ] Collapse/expand expenses section
- [ ] Verify collapsed state persists (localStorage)
- [ ] Click on category tile to navigate to filtered history
- [ ] Click on account card to navigate to filtered history

## Budget Tracking

- [x] Category budget progress indicator *(budget.spec.ts)*
- [ ] Budget exceeded warning/styling
- [x] Weekly budget period calculation *(budget.spec.ts)*
- [x] Yearly budget period calculation *(budget.spec.ts)*
- [x] Budget vs actual in reports *(budget.spec.ts)*

## History Page - Advanced Filters

- [x] Filter by custom date range *(history-filters.spec.ts)*
- [x] Filter by specific account *(history-filters.spec.ts)*
- [x] Filter by specific category/source *(history-filters.spec.ts)*
- [x] Combined filters (date + account + type) *(history-filters.spec.ts)*
- [x] Search transactions by comment *(history-filters.spec.ts)*
- [x] Search transactions by account name *(history-filters.spec.ts)*

## Entity Management - Edge Cases

- [ ] Reorder accounts via drag-and-drop
- [ ] Reorder categories via drag-and-drop
- [ ] Reorder income sources via drag-and-drop
- [ ] Hide account from dashboard
- [ ] Hide category from dashboard
- [ ] Hide income source from dashboard

## Transaction Edge Cases

- [ ] Edit transaction date
- [ ] Transaction with very large amount
- [ ] Transaction with decimal precision (crypto)
- [ ] Cancel transaction creation (swipe down)
- [ ] Change account during transaction creation
- [ ] Change category during expense creation
- [ ] Change source during income creation

## Loan Edge Cases

- [ ] Loan with due date approaching
- [ ] Overdue loan indicator
- [ ] Edit loan after partial payment
- [ ] Delete loan with existing payments
- [ ] View loan transactions in history filtered

## PWA / Mobile Specific

- [ ] App works offline (IndexedDB persistence)
- [ ] Install PWA prompt
- [x] PWA update notification (dot badge + settings card) *(update-notification.spec.ts)*
- [ ] Safe area handling on iOS
- [ ] Keyboard handling on mobile forms
- [ ] Pull-to-refresh behavior

## Error Handling

- [ ] Handle invalid form input gracefully
- [ ] Handle database errors
- [ ] Handle network errors during export
- [ ] Recover from corrupted localStorage

---

## Coverage Summary

### High Priority (Core Functionality) - ✅ IMPLEMENTED
1. ✅ Reports page - users rely on this for insights
2. ✅ Budget tracking - key feature for expense management
3. ✅ History advanced filters - important for finding transactions

### Medium Priority (Quality of Life)
4. Settings preferences (language, blur mode)
5. Month navigation on dashboard
6. Entity reordering

### Low Priority (Edge Cases)
7. Investments (if not heavily used)
8. Custom currencies
9. PWA-specific features
10. Error handling edge cases

---

## New Tests Added

### report.spec.ts (11 tests)
- Empty state display
- Monthly income display
- Monthly expenses display
- Net flow calculation
- Spending by category chart
- 6-month trend chart
- Previous month navigation
- Next month navigation
- Data changes when navigating months
- Total balance from all accounts

### history-filters.spec.ts (9 tests)
- Filter by account
- Filter by category
- Filter by date - today
- Filter by date - this month
- Filter by custom date range
- Search by comment
- Search by account name
- Combined filters (type + account)
- Clear filters

### budget.spec.ts (10 tests)
- Create category with monthly budget
- Create category with weekly budget
- Create category with yearly budget
- Edit budget amount
- Edit budget period
- Track expenses against budget on dashboard
- Show category spending in reports
- Create category without budget
- Remove budget from existing category
- Multiple categories with different budget periods
