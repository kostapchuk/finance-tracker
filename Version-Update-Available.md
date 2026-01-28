# PWA Update Notification

## Problem
When a new version is deployed, PWA users don't see it until they fully close and reopen the app. We need to detect new versions and prompt the user to reload.

## Approach
Use `vite-plugin-pwa` with `prompt` update strategy. It generates a service worker (via Workbox) that caches app assets and detects when a new version is available. When detected, show a toast/banner prompting the user to reload.

## Steps

### 1. Install `vite-plugin-pwa`
```
npm install -D vite-plugin-pwa
```

### 2. Update `vite.config.ts`
Add VitePWA plugin with:
- `registerType: 'prompt'` — don't auto-update, let user decide
- `workbox.globPatterns` — cache JS, CSS, HTML, icons
- `manifest: false` — keep existing `public/manifest.json`

### 3. Create `src/components/ui/UpdatePrompt.tsx`
- Uses the `useRegisterSW` hook from `virtual:pwa-register/react`
- Listens for `onNeedRefresh` callback
- Shows a small banner/toast at the top: "Доступно обновление" with a "Обновить" button
- Calls `updateServiceWorker(true)` on click to activate the new SW and reload

### 4. Render `UpdatePrompt` in `AppShell.tsx`
- Add `<UpdatePrompt />` inside the AppShell layout so it's visible on all pages

### 5. Add i18n translations
- `updateAvailable`: "Update available" / "Доступно обновление"
- `updateNow`: "Update" / "Обновить"

## Files to modify
- `package.json` — add `vite-plugin-pwa` devDependency
- `vite.config.ts` — add VitePWA plugin config
- `src/components/layout/AppShell.tsx` — render `<UpdatePrompt />`
- `src/utils/i18n.ts` — add translation keys

## Files to create
- `src/components/ui/UpdatePrompt.tsx` — update notification banner

## Verification
- `npm run build` passes
- `dist/sw.js` is generated
- On deploy, existing PWA users see "Доступно обновление" banner
- Tapping "Обновить" reloads the app with the new version
