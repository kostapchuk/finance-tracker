# Persistent cloud DB (Supabase) — high-level plan

> Supersedes the former `CLOUD_SYNC_PLAN.md` at the repo root, which targeted Firebase and
> was built around an `++id` → UUID primary-key migration this plan rejects as unshippable.

## Context

All data lives only in IndexedDB (`FinanceTrackerDB`, Dexie, schema **v3**). Clear browser data, lose the phone, or have iOS evict the PWA's storage and everything is gone. The only backup is a manual JSON export in Settings.

Goal: a real persistent DB behind the app, rolled out in three phases, with **no existing user losing data or getting a broken app at any point**.

**Decisions:** Supabase; anonymous identity + transferable security key; per-table rollout.

---

## The one decision that shapes everything: don't migrate the primary key

"Give every row a UUID" reads as "switch the tables from `++id` to string UUID primary keys." **Don't.** Dexie throws on primary-key changes (`dexie.js:3829`, tripped by the `auto` flag flipping at `:3926`), so it would mean deleting and recreating all seven object stores inside one `versionchange` transaction — plus a doubled-storage backup copy, a long transaction iOS can kill, and a `number`→`string` sweep across ~15 component files. Every existing user gets a white screen if any of it is wrong.

The cloud needs a globally-unique key per row. Nothing requires it to be the *local* key. So: **add an unindexed `uid: string` field alongside the numeric id.** Unindexed means it isn't part of the Dexie schema, which means:

> **`FinanceTrackerDB` stays at v3 through P1 and P2. No version bump, no upgrade function, no `versionchange` transaction, nothing to roll back.**

Old cached bundles keep working against the same schema — no `blocked` hangs, no `VersionError` when someone declines the PWA update prompt. Local numeric ids stay local forever; P3's restore path maps `uid` → fresh local ids, the same shape the JSON import already does.

---

## P1 — `uid` on every row

**Ships invisibly. No schema change, no UI, no network.**

- `src/utils/id.ts` — `newId()`. Must fall back to `crypto.getRandomValues` when `crypto.randomUUID` is missing (it's secure-context-only, so it's `undefined` when testing the PWA over `vite --host` on a LAN IP).
- `uid?: string` added to each entity type — optional, so nothing else has to change.
- **Assign it in a Dexie `creating` hook, not in the repos.** 17 mutation sites already bypass the repositories: both `clear()` blocks in `SettingsPage.tsx` (`:203-207`, `:287-291`), the five JSON-import `bulkAdd`s (`:210-259`), and `importExecutor.ts:42,49`. Repo-level assignment misses every one, including the CSV importer — the largest write in the app. Verified in source: `dexie.js:4981` passes the hook the actual object being written and fires once per row, so `bulkAdd` is covered; `:4955` routes `clear()` through `deleteRange` → `deleting` per key *with the existing value*, so deletes carry their uid.
- **Backfill existing rows** in a background job: page by primary key, ~500 rows per transaction, cursor stored so it resumes after a crash or eviction. Idempotent (`row.uid ? row : {...row, uid: newId()}`), adds no storage beyond one short string per row, and if it never finishes nothing breaks — those rows just aren't synced yet.
- New users are correct from their first write and never need the backfill.

**Exit criteria:** every row has a `uid`; users noticed nothing.

---

## Security key — gate between P1 and P2

Must land before P2 pushes a single byte: you cannot write to the cloud without knowing whose data it is, and retrofitting identity after data exists means a second migration.

- **`supabase.auth.signInAnonymously()`** → a real JWT and durable `auth.uid()` the client can't forge. A sync key stored as a plain column is *not* securable by RLS, because with the anon key the client controls the `WHERE` clause.
- Data is owned by a **vault**, not a user, so a second device can join one: `vaults(id, sync_key_hash)` + `vault_members(vault_id, user_id)`. RLS everywhere: `vault_id in (select vault_id from vault_members where user_id = auth.uid())`.
- The user-visible **security key** is a UUID shown in Settings; only its hash is stored. A second device calls a `security definer` RPC `link_device(key)` that resolves the hash and adds the caller to the vault — the key is never exposed to `SELECT`, and the RPC is the one place to rate-limit.
- Because identity is a real `auth.uid()`, attaching an email later is `updateUser()` on the same user — no second migration.
- Client config lazy-loads from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (already in `.env.local`). **The app must work fully with them absent.** Needs `.env.example`, Vercel env vars, an `ImportMetaEnv` augmentation (`src/vite-env.d.ts` doesn't exist yet), and a `vendor-supabase` chunk.

---

## P2 — Async worker publishes to the cloud, one table at a time

**Write-only. Local stays the source of truth; the cloud is a mirror it can't read back yet.**

- **Outbox in a separate Dexie database** (`FinanceTrackerSyncDB`). The one genuinely new table doesn't go near the user's data schema — which is what keeps the main DB at v3. Bonus: "reset sync" becomes `syncDb.delete()`.
- **Capture** extends the P1 hooks. Hook callbacks are synchronous and can't write to another DB inline, so entries stage in a `WeakMap` keyed by the Dexie transaction and drain on `trans.on('complete')` — post-commit, so an aborted transaction's entries are simply GC'd.
- **Payloads are full row snapshots, never diffs.** Makes the server upsert idempotent (safe to replay after an ambiguous network failure), makes out-of-order delivery harmless, and lets N writes to one row coalesce into one push. Not theoretical — `accountRepo.updateBalance` fires on *every* transaction.
- **FK translation at push time**: local FKs are numeric, so the transport maps them to uids from the four small parent tables just before upload. Pure function; a bug there corrupts only the cloud copy.
- **Worker loop**: claim ≤100 due entries → coalesce → one batched request → settle per-entry, so one poison row can't wedge the queue. Exponential backoff with jitter; `attempts >= 10` or a 4xx → `failed`, which drops out of the claim range. Failed count surfaces in Settings with a manual retry. Triggers: ~2s after `loadAllData()`, `online`, `visibilitychange`, debounced after enqueue, plus a 60s floor.
- **Server**: one `records` table keyed by `(vault_id, entity_type, uid)` with a `jsonb` payload. Recommended over per-entity tables *for now* — enabling a table stays a client flag flip with no server migration, and nothing queries the columns while it's write-only. Revisit when P3 needs server-side filtering.
- **Per-table rollout flag.** `accounts: true` first, everything else `false`. Flipping one on triggers a one-time backfill enqueue for that table, guarded by a marker. Order: `accounts` → `incomeSources`/`categories`/`customCurrencies` → `loans` → `transactions` → `settings`, one per release, watching the failed count between each.

**Exit criteria:** all seven tables mirroring cleanly, failed count ~0 in the wild.

---

## P3 — Offline-first PWA (own plan; sketch only)

This is where the app stops being local-only and becomes a real offline-first client of the cloud DB.

- **Read/restore path first** — `link_device(key)` → download the vault → hydrate an empty local DB, minting fresh local ids and remapping uid FKs. Restore-on-empty is a much simpler problem than merge and delivers most of the user value (new device, wiped storage), and it has **no conflicts by construction** — there are no local rows to disagree with.
- **Then two-way sync** — pull changed rows since a watermark, resolve per the rule below, plus a server-side deletion log (tombstones are the one thing the P2 design deliberately can't recover on its own).
- **Then true offline behaviour** — background sync so a queued write survives the app being closed, and a sync-status indicator. `registerType: 'prompt'` stays, but the update flow needs revisiting once two bundle versions can write to one vault.

### Conflict resolution: local wins

**When a row exists both locally and in the cloud and they differ, the local version wins** — keep it, discard the incoming one, and re-enqueue local to overwrite the cloud. Not last-write-wins by `updatedAt`.

Rationale: the device in front of the user is the source of truth, which is the same invariant P1/P2 already run on. It's predictable ("what I see on this phone is what's real"), it needs no clock trust across devices, and it can never silently overwrite something the user is currently looking at.

Three consequences to handle explicitly, not discover later:

- **Deletes must be exempt.** Under a naive local-wins, a row deleted on device B comes back from the dead on device A, because A's copy "wins" over the absence. Tombstones from the server deletion log always apply, regardless of local state. A resurrection bug is far more alarming to a user than a lost edit.
- **Edits made on the other device are silently dropped** when both touched the same row. Acceptable at per-row granularity for a personal finance app with occasional multi-device use — but it means P3 should log discarded incoming versions (and ideally surface a count), so this is diagnosable rather than mysterious.
- **`account.balance` must be recomputed after any merge**, never merged. It's derived from the transaction set, so a local-wins account row paired with a merged transaction set will drift out of agreement. Recompute from transactions post-merge and reconcile via the existing `applyTransactionBalance` logic rather than trusting the merged field.

In P2 this rule is trivially satisfied — nothing is read back, so the cloud is whatever the last device pushed. Multi-device users won't get coherent cloud state until P3, which is fine while it's a write-only backup.

---

## Safety invariants

1. **A sync bug must never prevent a user from saving.** Every hook body is `try/catch`-wrapped. A throw inside a `creating` hook aborts the user's write — this is the highest-risk surface in the whole design, and this rule is what contains it.
2. **The sync DB failing to open must not block app start.** Lazy-init + catch → run with sync disabled. Private mode and evicted storage must degrade, not break.
3. **No sync code on the first-paint path**; everything starts after `loadAllData()` resolves.
4. **Never `await` a flush** from a repo or component.
5. **Cloud writes are idempotent**, so any retry, replay, or double-backfill is harmless.

Because P1 and P2 introduce no schema migration, the entire class of migration failures — upgrade throws, `blocked` on a stale tab, `VersionError` on an old cached bundle, quota exhaustion mid-rewrite, partial writes — **cannot occur**. The residual risks are the hook surface (invariant 1), the sync DB opening (invariant 2), and hook overhead on the CSV import path (measure before shipping P1).

---

## Verification

Add `fake-indexeddb` (devDep + one line in `src/test/setup.ts` — that's the whole setup cost; there are currently **zero** tests for db/repos/store).

- **Hook coverage** — the load-bearing test. Assert `uid` assignment and outbox entries after `add`, `bulkAdd`, `put`, `update`, `Collection.modify`, `delete`, and `clear()`. Plus: a hook that throws must **not** abort the user's write.
- **Backfill** — seed uid-less rows, run a batch, kill mid-way, re-run: assert resumption, no duplicates, no lost rows, second full run is a no-op.
- **Pure logic, no infra** — coalescing, backoff, error classification, FK translation, the uid↔local-id remap.
- **Worker via injection** — batch splits, backoff progression, attempt exhaustion, poison-entry isolation, no concurrent flushes.
- **E2E** — extend `e2e/helpers/indexeddb.helper.ts` with an outbox reader; assert queue contents after real UI actions.
- **Manual on a real v3 profile** — export JSON, install the new build, confirm no reload prompt and no visible change, let the backfill run, export again and diff. Repeat on an iOS device with the PWA installed.

Full CI gate after each phase, per `CLAUDE.md`: `lint`, `format:check`, `type-coverage`, `test:coverage`, `npm audit`, `build`, `playwright test`.

---

## Execution order

0. **Docs** — remove `CLOUD_SYNC_PLAN.md`, add this plan. One commit, no code.
1. **P1** — `newId()` + `uid?` on the entity types → `fake-indexeddb` + hook-coverage tests → the `creating`/`updating` hooks → the resumable backfill job. Ship; verify uids populate in the wild.
2. **Security key** — anonymous auth, vault tables + RLS, `link_device` RPC, Settings UI for the key.
3. **P2** — sync DB + outbox → capture → worker → Supabase transport. Ship with `accounts: true` only, then one table per release.
4. **P3** — separate plan, written once P2 is real.

The side fix below is independent and can land at any point.

## Side fix, independent of all three phases

The JSON import (`SettingsPage.tsx:193-291`) strips `id` and relies on autoincrement **without remapping any foreign key** — restoring a backup whose ids weren't a contiguous `1..N` silently re-points transactions at the wrong accounts. Fix by exporting/importing `uid` and remapping FKs through it (shares P3's remap helper). Bump the export envelope to `version: 2`, keep a `version: 1` branch.
