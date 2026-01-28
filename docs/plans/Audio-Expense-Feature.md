# Audio Expense Tracking via Gemini API

## Overview
Add a microphone button to the dashboard. User records a voice message describing an expense (Russian only for now). Audio is sent to Gemini API which returns structured JSON with category, amount, currency, and account. The QuickTransactionModal opens pre-populated with the parsed data for user verification.

## Architecture

### Flow
1. User taps mic button on dashboard
2. Browser MediaRecorder captures audio (webm/opus)
3. Audio blob is sent to Gemini API with a prompt containing available categories, accounts, and currencies
4. Gemini returns structured JSON: `{ categoryName, amount, currency, accountName, comment? }`
5. App matches names to actual IDs, opens QuickTransactionModal pre-populated
6. User verifies/edits and saves normally

### Gemini API Integration
- Use `gemini-2.0-flash` model via REST (no SDK needed)
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- Send audio as inline base64 data with `mimeType: "audio/webm"`
- API key stored in `AppSettings` (IndexedDB), entered in Settings page
- Prompt (Russian) includes list of category names, account names, and currencies so the model picks from valid options

### Structured Output Prompt
```
Ты помощник для учёта финансов. Пользователь надиктовал расход голосом.
Извлеки из аудио: категорию, сумму, валюту и счёт.

Доступные категории: [list]
Доступные счета: [list]
Доступные валюты: [list]

Верни ТОЛЬКО JSON без markdown:
{"categoryName": "...", "amount": 123.45, "currency": "BYN", "accountName": "...", "comment": "..."}

Если что-то неясно — выбери наиболее подходящий вариант.
```

## Files to Create

### `src/features/audio/components/AudioExpenseButton.tsx`
- Floating mic button rendered on Dashboard
- Handles MediaRecorder lifecycle (start/stop recording)
- Visual states: idle → recording (pulsing red) → processing (spinner)
- On recording stop: converts blob to base64, calls Gemini
- On response: matches categoryName/accountName to IDs, calls `onResult` callback

### `src/features/audio/utils/geminiApi.ts`
- `transcribeExpense(audioBase64, mimeType, categories, accounts, currencies, apiKey)` → parsed result
- Single `fetch` call to Gemini REST API
- Parses JSON from response text
- Returns `{ categoryName, amount, currency, accountName, comment? }`

## Files to Modify

### `src/database/types.ts`
- Add `geminiApiKey?: string` to `AppSettings` interface

### `src/database/db.ts`
- No schema change needed — Dexie is schemaless for non-indexed fields

### `src/features/settings/components/SettingsPage.tsx`
- Add "Gemini API Key" input field in a new "AI" or "Voice Input" section
- Save/load from `settingsRepo`

### `src/store/useAppStore.ts`
- Add `geminiApiKey: string` state field
- Load it during `initialize()` from settings

### `src/features/dashboard/components/Dashboard.tsx`
- Import and render `AudioExpenseButton`
- On result: find matching category/account by name, open QuickTransactionModal with pre-populated data
- Add new `TransactionMode` variant or extend existing expense mode to accept pre-filled amount/comment

### `src/components/ui/QuickTransactionModal.tsx`
- Accept optional `initialAmount`, `initialComment`, `initialDate` props
- Pre-populate `amount`, `comment`, `date` state from these props when provided

### `src/utils/i18n.ts`
- Add Russian translations: `geminiApiKey`, `voiceInput`, `recording`, `processing`, `voiceError`, `noApiKey`, `holdToRecord` (or similar)

## UI Design

### Mic Button
- Positioned bottom-right of dashboard, above the bottom nav (like a FAB)
- `Mic` icon from lucide-react
- Tap to start, tap again to stop (simpler than hold-to-record for mobile)
- States:
  - **Idle**: muted circle with mic icon
  - **Recording**: pulsing red circle, recording duration shown
  - **Processing**: spinner replacing mic icon
  - **Error**: brief toast/text shown, returns to idle

### Settings
- New section "Голосовой ввод" with a single password-type input for the API key

## Verification
- `npm run build` passes
- Enter Gemini API key in settings
- Tap mic on dashboard → speak "потратил 50 рублей на продукты в Евроопт" → stop
- QuickTransactionModal opens with category=Продукты, amount=50, currency=BYN pre-filled
- Edit if needed, save normally
- Transaction appears in history
