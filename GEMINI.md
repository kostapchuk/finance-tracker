# Finance Tracker - Project Context

## Overview
A React/TypeScript Progressive Web App (PWA) for personal finance management.
- **Tech Stack:** React, Vite, TypeScript, Zustand (State Management), Dexie.js (IndexedDB).
- **Localization:** EN/RU supported via custom implementation in `src/utils/i18n.ts`.
- **UI Architecture:** Custom-built UI primitives (Button, Input, Select, Dialog, etc.) in `src/components/ui/`. *Note: Does NOT use Radix UI.*

## Project Structure
- `src/app/`: App entry and routing.
- `src/components/ui/`: Core UI components.
- `src/database/`: Database schema (`db.ts`), types (`types.ts`), and CRUD repositories (`repositories.ts`).
- `src/features/`: Feature-based modules (Dashboard, Categories, Loans, Reports, Settings, Transactions).
- `src/store/`: Zustand global store (`useAppStore.ts`).
- `src/utils/`: Formatting and logic utilities (i18n, currency, date, colors).

## Key Data Types
- **Account:** `{ id, name, type, currency, balance, color, icon }`
- **Transaction:** Supports `income`, `expense`, `transfer`, `investment`, and `loan` types.
- **Loan:** `{ id, type, personName, amount, currency, paidAmount, status, accountId }`

## Recent Major Update: Loan System Overhaul
- **Multi-currency Support:** Loans can now have a different currency than the linked account. Dual amount inputs are shown in these cases.
- **Automated Transactions:** Creating or paying a loan now automatically generates a corresponding transaction and updates the linked account balance.
- **Required Accounts:** Loans must now be linked to an account.

## Upcoming Features (Planned)
### 1. Audio Expense Tracking (Gemini API)
- **Concept:** Voice-to-transaction feature using Gemini 2.0 Flash.
- **Flow:** User records audio → Gemini parses to JSON → QuickTransactionModal pre-fills.
- **Integration:** REST API call to Gemini with base64 audio. API key stored in `AppSettings`.

### 2. Guided Onboarding
- **Concept:** Interactive tutorial for first-time users.
- **Trigger:** Only shown if IndexedDB is empty (no accounts/transactions/income sources).
- **Seed Data:** Creates default "Salary" income, "Bank Account", and "Groceries" category on first launch.

### 3. PWA Update Notification
- **Implementation:** Using `vite-plugin-pwa` with `prompt` strategy.
- **UX:** Banner appears when a new version is available, prompting user to reload.

## Technical Notes
- **Custom Select Component:** When using the `Select` component, you must pass display text as children to `SelectValue` because it renders the raw value by default.
- **Store Actions:** Use `refreshAccounts()`, `refreshLoans()`, and `refreshTransactions()` from `useAppStore` to sync the UI after DB updates.
- **Build Status:** Several pre-existing lint/type errors exist in `CategoryTile.tsx`, `QuickTransactionModal.tsx`, `CategoryList.tsx`, and `Dashboard.tsx`.