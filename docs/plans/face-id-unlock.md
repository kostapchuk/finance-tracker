# Face ID / Touch ID Unlock for PWA

## Summary
Add biometric unlock (Face ID/Touch ID) as an alternative to passphrase entry using the Web Authentication API (WebAuthn). Supported on iOS Safari 14+ including PWA standalone mode.

## How It Works
1. User sets up passphrase (existing flow)
2. User enables "Face ID unlock" in Settings
3. WebAuthn creates a credential stored in iOS Keychain/Secure Enclave
4. On app lock, user can tap "Unlock with Face ID" button
5. If biometric fails or is cancelled, fall back to passphrase

## Implementation Steps

### 1. Add biometric fields to AppSettings
**File:** `src/database/types.ts`
```typescript
export interface AppSettings {
  // ... existing fields ...
  biometricEnabled?: boolean
  biometricCredentialId?: string
}
```

### 2. Create biometric service
**File:** `src/features/auth/services/biometricService.ts`

Functions:
- `checkBiometricAvailability()` - Check if Face ID/Touch ID available
- `registerBiometricCredential()` - Create WebAuthn credential (on enable)
- `authenticateWithBiometric(credentialId)` - Verify user with Face ID

Key implementation notes:
- Use `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` to check support
- Set `authenticatorAttachment: 'platform'` to force Face ID/Touch ID
- Set `userVerification: 'required'` to require biometric
- Store only `credentialId` in IndexedDB (private key stays in Secure Enclave)

### 3. Update auth store
**File:** `src/store/useAuthStore.ts`

Add:
- `biometricEnabled: boolean` state
- `biometricCredentialId: string | null` state
- `authenticateWithBiometric()` action - calls biometric service, sets `isAuthenticated = true` on success
- `enableBiometric()` / `disableBiometric()` actions

### 4. Update PassphraseEntry component
**File:** `src/features/auth/components/PassphraseEntry.tsx`

Add:
- Check if biometric is available and enabled
- Show "Unlock with Face ID" button below passphrase form
- On button click, call `authenticateWithBiometric()`
- Auto-trigger biometric on mount (with user gesture from previous interaction)

### 5. Add biometric toggle in Settings
**File:** `src/features/settings/components/SettingsPage.tsx`

In Security section, add:
- Toggle switch: "Face ID / Touch ID unlock"
- Only show if biometric is available on device
- On enable: call `registerBiometricCredential()`, save credential ID
- On disable: clear credential ID from settings

### 6. Add i18n translations
**File:** `src/utils/i18n.ts`

Keys:
- `faceIdUnlock` / `touchIdUnlock` - "Face ID Unlock" / "Разблокировка Face ID"
- `unlockWithBiometric` - "Unlock with Face ID" / "Разблокировать Face ID"
- `biometricNotAvailable` - "Biometric authentication not available"
- `biometricSetupFailed` - "Failed to set up biometric unlock"

## Files to Modify
- `src/database/types.ts` - Add biometric fields to AppSettings
- `src/database/repositories.ts` - Add methods to save/clear biometric settings
- `src/store/useAuthStore.ts` - Add biometric state and actions
- `src/features/auth/components/PassphraseEntry.tsx` - Add Face ID button
- `src/features/settings/components/SettingsPage.tsx` - Add toggle switch
- `src/utils/i18n.ts` - Add translations

## Files to Create
- `src/features/auth/services/biometricService.ts` - WebAuthn wrapper

## Limitations
- **User gesture required**: WebAuthn must be triggered by button tap (not auto on page load)
- **iOS only stores credential**: The credential persists across browser/PWA sessions via iCloud Keychain
- **Passphrase still required**: Biometric is convenience only; passphrase remains the primary auth method
- **HTTPS required**: WebAuthn requires secure context (works on localhost for dev)

## Verification
1. `npm run build` passes
2. On iOS device with Face ID:
   - Settings shows "Face ID Unlock" toggle
   - Enable toggle triggers Face ID prompt
   - Lock app, see "Unlock with Face ID" button
   - Tap button, Face ID prompt appears
   - Successful scan unlocks app
3. On device without biometric: toggle is hidden
4. Disable toggle removes biometric option from lock screen
