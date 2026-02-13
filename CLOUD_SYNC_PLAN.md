# Cloud Sync with Firebase Firestore

## Context

All data is currently stored locally in IndexedDB (Dexie.js). If the user clears browser data or loses their device, everything is gone. This plan adds an optional (enabled-by-default) cloud sync via Firebase Firestore, allowing data to persist in the cloud and sync across devices. Sync runs at most once per day to stay well within free tier limits.

**Phase 1** (this plan): Sync-key auth + Firebase sync
**Phase 2** (future): Telegram auth via Firebase Cloud Function
**Phase 3** (future): Hard limits on cloud storage per user

---

## Part 1: UUID Migration

Cross-device sync requires globally unique IDs. Current `++id` auto-increment produces local-only numeric IDs that collide across devices.

### 1a. ID utility

**New file: `src/utils/id.ts`**
```ts
export const generateId = () => crypto.randomUUID()
```

### 1b. Type changes

**File: `src/database/types.ts`**

All entity interfaces: change `id?: number` → `id: string` (no longer optional — generated before insert).
All foreign key fields (`accountId`, `categoryId`, `incomeSourceId`, `toAccountId`, `loanId`): change from `number` → `string`.

Add new types:
```ts
export type SyncEntityType = 'accounts' | 'incomeSources' | 'categories' | 'transactions' | 'loans' | 'customCurrencies'

export interface DeletionLogEntry {
  id: string
  entityType: SyncEntityType
  entityId: string
  deletedAt: Date
}
```

Extend `AppSettings`:
```ts
export interface AppSettings {
  id: string
  defaultCurrency: string
  blurFinancialFigures?: boolean
  syncEnabled: boolean       // NEW
  syncKey: string             // NEW - auto-generated UUID
  lastSyncAt?: Date           // NEW
  createdAt: Date
  updatedAt: Date
}
```

### 1c. Dexie schema v3

**File: `src/database/db.ts`**

Add v3 schema: change `++id` → `id` (string PK, no auto-increment), add `deletionLog` table. Write upgrade function that:
1. Reads all records from each table
2. Builds numeric→UUID ID map per table
3. Remaps all foreign keys in transactions using the maps
4. Remaps `Investment.accountId`, `Loan.accountId`
5. Writes back with new UUIDs
6. Creates settings with `syncEnabled: true`, `syncKey: generateId()`

### 1d. Repository updates

**File: `src/database/repositories.ts`**

- All `create()` methods: generate `id` via `generateId()` before `db.table.add()`, return `string`
- All `getById(id: number)` → `getById(id: string)`
- All `update(id: number, ...)` → `update(id: string, ...)`
- All `delete(id: number)` → `delete(id: string)` + add deletion log entry
- Add `deletionLogRepo` with `getAll()`, `getSince(date)`, `add()`, `clear()`

### 1e. Store updates

**File: `src/store/useAppStore.ts`**

- `historyCategoryFilter: number | null` → `string | null`
- `historyAccountFilter: number | null` → `string | null`
- `navigateToHistoryWithCategory(id: number)` → `(id: string)`
- `navigateToHistoryWithAccount(id: number)` → `(id: string)`
- Add sync state (see Part 3)

### 1f. Component updates (~15 files)

All files that use `.id!` as number, pass numeric IDs, or type IDs as `number`:
- `src/features/settings/components/SettingsPage.tsx` — `handleReorder` types, `SortableManagementItem` id prop
- `src/features/dashboard/components/Dashboard.tsx`
- `src/components/ui/QuickTransactionModal.tsx`
- `src/features/transactions/components/HistoryPage.tsx`
- `src/features/transactions/components/TransactionList.tsx`
- `src/features/loans/components/LoanForm.tsx`
- `src/features/loans/components/LoanList.tsx`
- `src/features/import/components/ImportAccountMapping.tsx`
- `src/features/import/components/ImportIncomeSourceMapping.tsx`
- `src/features/import/components/ImportCategoryMapping.tsx`
- `src/features/import/utils/importExecutor.ts`
- `src/utils/transactionBalance.ts`

Changes are mechanical: `number` → `string`, remove `!` assertions where id is now required.

---

## Part 2: Firebase Setup

### 2a. Install

```bash
npm install firebase
```

### 2b. Config

**New file: `src/services/firebase/config.ts`**
- Initialize Firebase app with env vars (`VITE_FIREBASE_*`)
- Export `firestore` instance
- Lazy-init: only initialize when sync is enabled (so app works fine without Firebase config)

**New file: `.env.example`** — placeholder Firebase config vars (committed)
**Update: `.env.local`** — real Firebase values (gitignored by `*.local` pattern)

### 2c. Vite config

**File: `vite.config.ts`** — add `'vendor-firebase': ['firebase/app', 'firebase/firestore']` to manualChunks

### 2d. Firestore data structure

```
users/{syncKey}/
  metadata          — { syncKey, lastSyncAt, createdAt }
  data/
    accounts/{id}   — one doc per entity
    incomeSources/{id}
    categories/{id}
    transactions/{id}
    loans/{id}
    customCurrencies/{id}
    settings/main   — single settings doc
  deletionLog/{id}  — one doc per deletion event
```

### 2e. Firestore security rules

Open access scoped to `users/{syncKey}/**` (UUID is unguessable, 128-bit entropy). Tighten in Phase 2 with Firebase Auth.

---

## Part 3: Sync Service

**New files under `src/services/firebase/`:**

### `types.ts`
- `SyncProgress` type: `{ phase, current, total, entityType? }`
- Firestore converter types (Date ↔ Timestamp)

### `converters.ts`
- `entityToFirestore(entity)` — converts JS `Date` fields to Firestore `Timestamp`
- `entityFromFirestore(data)` — converts `Timestamp` back to `Date`

### `upload.ts`
- `uploadAllData(syncKey, onProgress)` — reads all Dexie tables, writes each entity as a Firestore doc. Batched writes (max 500/batch). Reports progress.

### `download.ts`
- `downloadAllData(syncKey)` — reads all subcollections, converts timestamps, returns structured data.

### `merge.ts`
Core merge algorithm (entity-level, last-write-wins by `updatedAt`):
- Cloud-only entities: insert locally (unless in local deletion log → skip)
- Local-only entities: upload to cloud (unless in cloud deletion log → delete locally)
- Both exist: compare `updatedAt`, newer wins
- Process deletion logs bidirectionally

### `sync.ts`
Orchestrator:
- `shouldSync(lastSyncAt)` — returns true if >24h since last sync
- `performSync(syncKey, lastSyncAt, onProgress)` — download → merge → apply changes → update timestamps
- `performFullUpload(syncKey, onProgress)` — used when enabling sync (no merge, just upload everything)
- `deleteCloudData(syncKey)` — used when disabling sync (iterate and delete all docs)

---

## Part 4: Store & App Integration

### Store changes (`src/store/useAppStore.ts`)

Add state:
```ts
syncEnabled: boolean
syncKey: string
lastSyncAt: Date | null
syncProgress: SyncProgress | null
isSyncing: boolean
```

Add actions:
- `setSyncEnabled(enabled)` — toggle sync, triggers upload or cloud delete
- `triggerSync()` — checks shouldSync(), runs performSync(), reloads data
- `setSyncProgress(progress)` — updates progress bar state

### App startup (`src/components/layout/AppShell.tsx`)

After `loadAllData()` completes, if `syncEnabled`:
```ts
useEffect(() => {
  if (!isLoading && syncEnabled) triggerSync()
}, [isLoading, syncEnabled])
```

`triggerSync()` internally checks `shouldSync(lastSyncAt)` and no-ops if <24h.

---

## Part 5: Settings UI

**File: `src/features/settings/components/SettingsPage.tsx`**

Add new "Cloud Sync" section between "Language" and "Data" sections:

1. **Sync toggle** — Toggle component + Cloud icon. On enable: full upload with progress bar. On disable: confirmation dialog → delete cloud data.
2. **Info warning banner** (shown when sync is enabled) — informational banner below the toggle:
   - EN: "Your data is stored locally and synced to the cloud. It can be accessed from other devices using your sync key."
   - RU: "Данные хранятся локально и синхронизируются с облаком. Доступ с других устройств возможен по ключу синхронизации."
   - Styled as a subtle info card (`bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3`) with a `Info` icon from lucide-react.
3. **Progress bar** — shown during sync. CSS progress bar (`w-full h-2 bg-secondary rounded-full` with animated inner div).
4. **Sync key display** — monospace text + Copy button. Only shown when enabled.
5. **"Use Existing Key" button** — opens Dialog with Input to paste a key from another device. On confirm: saves new key, downloads cloud data, replaces local data, reloads.
6. **"Sync Now" button** — manual trigger with RefreshCw icon (spins while syncing).
7. **Last synced timestamp** — small text showing when last sync occurred.

When "Delete All Data" is triggered and sync is on: also clear cloud data.

Update footer text: when sync is enabled, change `dataStoredLocally` to show `dataStoredLocallyAndCloud` (new i18n key).

---

## Part 6: i18n

**File: `src/utils/i18n.ts`**

Add ~20 keys in both EN and RU:
- `cloudSync`, `cloudSyncDescription`, `syncKey`, `useSyncKey`, `useSyncKeyDescription`, `pasteSyncKey`, `copiedToClipboard`, `syncNow`, `lastSynced`, `disableSyncConfirmation`
- `syncInfoWarning` — "Your data is stored locally and synced to the cloud. It can be accessed from other devices using your sync key."
- `syncPhase_uploading`, `syncPhase_downloading`, `syncPhase_merging`, `syncPhase_done`, `syncPhase_error`

---

## Implementation Order

1. **UUID migration** (Parts 1a-1f) — Foundation, must be done first
   - Create `src/utils/id.ts`
   - Update types, db schema v3, repositories
   - Update store and all ~15 component files
   - Run lint + tests, fix all breakages

2. **Firebase setup** (Parts 2a-2e) — Infrastructure
   - Install firebase, create config, env files
   - Set up Firestore project + security rules

3. **Sync service** (Part 3) — Core logic
   - Create all files under `src/services/firebase/`
   - Unit-testable in isolation

4. **Store & app integration** (Part 4) — Wire it up
   - Add sync state/actions to store
   - Add auto-sync trigger to AppShell

5. **Settings UI** (Parts 5-6) — User-facing
   - Add i18n keys
   - Add Cloud Sync section to SettingsPage
   - Add sync key dialog

---

## Verification

1. **After UUID migration**: `npm run lint && npm test` — all existing E2E tests must pass
2. **After Firebase setup**: Verify Firebase initializes without errors in dev console
3. **After sync service**: Manual test — create data, trigger sync, check Firestore console for documents
4. **Cross-device test**: Copy sync key to another browser/device, enable sync, verify data appears
5. **Disable test**: Toggle sync off, confirm cloud data deleted in Firestore console
6. **Offline test**: Go offline, add transactions, go online, verify next sync uploads them
7. **24h throttle test**: Sync once, verify second sync within 24h is skipped (check console log)

---

## Key Files Summary

| File | Change |
|------|--------|
| `src/utils/id.ts` | NEW — `generateId()` |
| `src/database/types.ts` | IDs to string, add DeletionLogEntry, extend AppSettings |
| `src/database/db.ts` | Schema v3 + upgrade migration |
| `src/database/repositories.ts` | String IDs, deletion log, deletionLogRepo |
| `src/store/useAppStore.ts` | Sync state/actions, string filter types |
| `src/services/firebase/*` | NEW — config, sync, upload, download, merge, converters, types |
| `src/features/settings/components/SettingsPage.tsx` | Cloud Sync UI section |
| `src/utils/i18n.ts` | ~20 new translation keys |
| `src/components/layout/AppShell.tsx` | Auto-sync trigger after load |
| `vite.config.ts` | Firebase vendor chunk |
| `.env.example` | NEW — Firebase config placeholders |
| ~15 component files | Mechanical `number` → `string` ID changes |
