# Onboarding Flow Implementation Plan

## Overview
Create a guided onboarding experience for first-time users with default seed data and interactive tutorials for core app functionality.

## Default Data (Created on First Launch)

| Type | Name | Details |
|------|------|---------|
| Income Source | "Salary" | Default icon, green color |
| Bank Account | "Bank Account" | Type: bank, main currency |
| Expense Category | "Groceries" | Type: expense, default icon |

## Onboarding Steps (5 total)

1. **Welcome** - Brief intro explaining the app concept
2. **Record Income** - Drag Salary → Bank Account (interactive)
3. **Record Expense** - Drag Bank Account → Groceries (interactive)
4. **Currency Settings** - Show how to change main currency
5. **Completion** - "You're ready!" success screen

**Skip button** available at every step to exit onboarding immediately.

## Implementation

### 1. Onboarding Trigger Logic

**Show onboarding ONLY when ALL conditions are true:**
- No accounts in IndexedDB
- No transactions in IndexedDB
- No income sources in IndexedDB
- `onboardingCompleted` flag is NOT set in localStorage

**Do NOT show onboarding if ANY of these are true:**
- User has ANY accounts in IndexedDB → existing user, skip
- User has ANY transactions in IndexedDB → existing user, skip
- User has ANY income sources in IndexedDB → existing user, skip
- `onboardingCompleted` flag is set in localStorage → already completed/skipped

**Critical:** Check IndexedDB data FIRST before checking localStorage flag. This ensures existing users who upgrade to the new version with onboarding will never see it - their existing data automatically opts them out.

### 2. Store & Persistence

**File:** `src/store/useAppStore.ts`

Add to store:
```typescript
onboardingCompleted: boolean
onboardingStep: number // 0-5 (0=not started, 1-5=steps)
setOnboardingStep: (step: number) => void
completeOnboarding: () => void
skipOnboarding: () => void
```

**Persistence:** Use `localStorage` key `'finance-tracker-onboarding-completed'`

### 3. Create Seed Data on First Launch

**File:** `src/components/layout/AppShell.tsx`

In `loadAllData()` flow:
```
1. Load all data from IndexedDB (accounts, transactions, incomeSources)
2. Check if user has ANY existing data:
   - accounts.length > 0 OR
   - transactions.length > 0 OR
   - incomeSources.length > 0
3. IF existing data found:
   → Set onboardingCompleted = true (existing user, never show onboarding)
   → Skip to normal app usage
4. ELSE (no data in IndexedDB):
   - Check localStorage for 'finance-tracker-onboarding-completed'
   - IF flag is set:
     → Skip onboarding (user previously skipped/completed)
   - ELSE:
     → Create default seed data (Salary, Bank Account, Groceries)
     → Set onboardingStep: 1 to start onboarding
```

**This ensures:**
- Existing users with data in IndexedDB NEVER see onboarding
- New users who cleared localStorage but kept data won't see it
- Only truly fresh installs trigger onboarding

### 3. Onboarding Component Structure

**New Files:**
```
src/components/onboarding/
├── OnboardingOverlay.tsx    # Main overlay controller
├── OnboardingStep.tsx       # Step indicator (dots 1-5)
├── WelcomeStep.tsx          # Step 1: Welcome message
├── IncomeStep.tsx           # Step 2: Highlight income→account
├── ExpenseStep.tsx          # Step 3: Highlight account→category
├── CurrencyStep.tsx         # Step 4: Show settings path
└── CompletionStep.tsx       # Step 5: Success screen
```

### 4. Step Details

**Step 1 - Welcome:**
- Modal overlay with app logo/name
- Brief text: "Track your finances with drag & drop"
- "Get Started" button → advances to step 2

**Step 2 - Record Income (Interactive):**
- Spotlight/highlight on Salary income tile
- Tooltip: "Drag your income source..."
- Arrow pointing to Bank Account
- Tooltip on account: "...and drop it here to record income"
- Intercept drag-end: if correct action, advance to step 3
- Skip button available

**Step 3 - Record Expense (Interactive):**
- Spotlight on Bank Account
- Tooltip: "Now drag your account..."
- Arrow pointing to Groceries
- Tooltip: "...to an expense category"
- Intercept drag-end: if correct action, advance to step 4
- Skip button available

**Step 4 - Currency Settings:**
- Show pointer to Settings nav item
- On settings click, highlight currency selector
- "Next" button to advance to completion

**Step 5 - Completion:**
- Success modal with checkmark/celebration icon
- "You're all set!" message
- Brief recap of what they learned
- "Start Using App" button to finish

**All Steps:**
- Skip button in corner to exit onboarding immediately
- Skipping marks onboarding as complete (won't show again)

### 5. Integration Points

**Dashboard.tsx:**
- Import `OnboardingOverlay`
- Pass `onboardingStep` to control highlights
- On `handleDragEnd`: check if onboarding action completed

**AppShell.tsx:**
- Initialize onboarding state from localStorage
- Create seed data if first-time user

**BottomNav.tsx:**
- Highlight settings icon during step 4

### 6. Translations

**File:** `src/utils/i18n.ts`

Add keys:
```
onboardingWelcomeTitle, onboardingWelcomeText,
onboardingIncomeTitle, onboardingIncomeText,
onboardingExpenseTitle, onboardingExpenseText,
onboardingCurrencyTitle, onboardingCurrencyText,
onboardingCompletionTitle, onboardingCompletionText,
onboardingSkip, onboardingNext, onboardingDone,
onboardingGetStarted, onboardingStartApp
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/store/useAppStore.ts` | Add onboarding state & actions |
| `src/components/layout/AppShell.tsx` | Seed data creation, init onboarding |
| `src/features/dashboard/components/Dashboard.tsx` | Render OnboardingOverlay, handle step completion |
| `src/components/layout/BottomNav.tsx` | Highlight for step 4 |
| `src/utils/i18n.ts` | Add translation keys |

## New Files to Create

| File | Purpose |
|------|---------|
| `src/components/onboarding/OnboardingOverlay.tsx` | Main onboarding controller |
| `src/components/onboarding/OnboardingTooltip.tsx` | Tooltip with arrow component |
| `src/components/onboarding/OnboardingSpotlight.tsx` | Dim background, spotlight element |

## Verification

**Happy Path (Fresh Install):**
1. Clear localStorage and IndexedDB to simulate fresh install
2. Open app - should see Welcome step (step 1)
3. Click "Get Started" - should highlight Salary tile (step 2)
4. Drag Salary to Bank Account - should advance and show transaction modal
5. Complete transaction, see step 3 highlight on account
6. Drag account to Groceries - should advance to step 4
7. See settings nav highlighted, click it
8. See currency selector highlighted, click "Next"
9. See completion screen with success message (step 5)
10. Click "Start Using App" - onboarding complete
11. Refresh - should not see onboarding again

**Skip Test:**
1. Clear localStorage/IndexedDB
2. Open app - see Welcome step
3. Click "Skip" button
4. Onboarding dismissed, default data still present
5. Refresh - should not see onboarding again

**Existing User Test:**
1. Clear localStorage only (keep IndexedDB with existing data)
2. Open app - should NOT see onboarding
3. User goes directly to dashboard with their existing data
