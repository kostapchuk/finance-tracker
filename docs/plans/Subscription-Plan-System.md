# Plan: Subscription Plan System (Free + Premium)

## Context

The app is a purely local PWA with no cloud sync yet. Cloud sync via Firebase is planned (see `CLOUD_SYNC_PLAN.md`). This change introduces plan tier infrastructure (Free + Premium) so that when cloud sync is implemented, sync restrictions are already enforceable. **Only cloud sync features are gated** — all local features remain unlimited on both tiers.

Free tier restrictions (enforced when cloud sync is built):
- Sync frequency limited to once per 24 hours
- Single device sync only

Premium tier:
- Real-time / unlimited sync frequency
- Multi-device sync

---

## Changes

### Step 1: Types — `src/database/types.ts`

Add at end of file:

```typescript
export type PlanTier = 'free' | 'premium'

export type PlanFeature =
  | 'cloud_sync'            // both tiers (free = throttled)
  | 'cloud_sync_realtime'   // premium only: no throttle
  | 'multi_device_sync'     // premium only
```

Extend `AppSettings` with optional `planTier` field (no DB migration needed — Dexie stores full objects):

```typescript
export interface AppSettings {
  // ... existing fields ...
  planTier?: PlanTier  // defaults to 'free' when absent
}
```

### Step 2: Plan config utility — `src/utils/plan.ts` (NEW)

Static config defining which features each tier has access to and sync frequency limits:

```typescript
PLAN_FEATURES: Record<PlanFeature, PlanTier[]>  // maps feature → allowed tiers
SYNC_FREQUENCY_LIMITS: Record<PlanTier, number> // free: 24h, premium: 0 (no limit)
canUseFeature(tier, feature): boolean
getSyncFrequencyLimit(tier): number
```

### Step 3: Store — `src/store/useAppStore.ts`

- Add `planTier: PlanTier` to state (default `'free'`)
- Add `setPlanTier(tier)` action — persists to `settingsRepo.update()` then sets state (same pattern as `setMainCurrency`)
- In `loadAllData()`, read `settings?.planTier || 'free'` and include in both `set()` calls

### Step 4: Hook — `src/hooks/usePlan.ts` (NEW)

Thin wrapper over store + plan config:

```typescript
function usePlan() {
  const planTier = useAppStore(state => state.planTier)
  return {
    tier: planTier,
    isPremium: planTier === 'premium',
    isFree: planTier === 'free',
    can: (feature: PlanFeature) => canUseFeature(planTier, feature),
    syncFrequencyLimit: getSyncFrequencyLimit(planTier),
  }
}
```

This is the single abstraction boundary. When Firebase Auth adds server-side plan verification, only the internals change — all consumers stay untouched.

### Step 5: i18n keys — `src/utils/i18n.ts`

Add ~10 keys in both EN and RU:

- `plan`, `freePlan`, `premiumPlan`
- `freePlanDescription` — "Cloud sync limited to once per 24h."
- `premiumPlanDescription` — "Real-time sync, multi-device support."
- `premiumFeature`, `upgradeToPremium`, `upgrade`, `active`
- `upgradePromptMessage` — "{feature} is available on Premium."
- `upgradePromptComingSoon` — "Upgrade option coming soon."

### Step 6: UpgradePrompt component — `src/components/ui/UpgradePrompt.tsx` (NEW)

Reusable dialog for when a user hits a plan restriction. Uses existing `Dialog` + `Button` components and `Crown` icon from lucide-react. The "Upgrade to Premium" button is disabled (no payment system yet).

### Step 7: Settings UI — `src/features/settings/components/SettingsPage.tsx`

Add a "Plan" section between the "Language & Currency" section (line ~501) and the "Data" section (line ~503). Shows:

- Current plan tier with `Crown` icon
- Plan description
- "Upgrade" button (free tier) → opens `UpgradePrompt`
- "Active" label (premium tier)

---

## Files Summary

| File | Change |
|------|--------|
| `src/database/types.ts` | Add `PlanTier`, `PlanFeature`, extend `AppSettings` |
| `src/utils/plan.ts` | **NEW** — feature config, `canUseFeature()`, `getSyncFrequencyLimit()` |
| `src/store/useAppStore.ts` | Add `planTier` state + `setPlanTier` action |
| `src/hooks/usePlan.ts` | **NEW** — `usePlan()` hook |
| `src/utils/i18n.ts` | Add ~10 keys (EN + RU) |
| `src/components/ui/UpgradePrompt.tsx` | **NEW** — upgrade prompt dialog |
| `src/features/settings/components/SettingsPage.tsx` | Add Plan section in settings |

## Verification

1. `npm run lint` — no errors
2. `npm test` — all existing tests pass
3. Manual: Open Settings → Plan section visible, shows "Free Plan"
4. Manual: Click "Upgrade" → UpgradePrompt dialog opens with disabled upgrade button
5. Write tests for `canUseFeature()` and `getSyncFrequencyLimit()` utilities
