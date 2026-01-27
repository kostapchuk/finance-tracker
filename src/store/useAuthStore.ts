import { create } from 'zustand'
import { settingsRepo } from '@/database/repositories'
import { generateSalt, hashPassphrase, verifyPassphrase } from '@/features/auth/services/cryptoService'

interface AuthState {
  isAuthenticated: boolean
  isSetupComplete: boolean
  isLoading: boolean
  lastActivity: number
  autoLockMinutes: number

  initialize: () => Promise<void>
  setupPassphrase: (passphrase: string) => Promise<boolean>
  authenticate: (passphrase: string) => Promise<boolean>
  lock: () => void
  updateActivity: () => void
  checkAutoLock: () => void
  setAutoLockMinutes: (minutes: number) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isSetupComplete: false,
  isLoading: true,
  lastActivity: Date.now(),
  autoLockMinutes: 0,

  initialize: async () => {
    try {
      const settings = await settingsRepo.get()
      set({
        isSetupComplete: !!settings?.passphraseHash,
        autoLockMinutes: settings?.autoLockMinutes ?? 0,
        isLoading: false,
      })
    } catch (error) {
      console.error('Failed to initialize auth:', error)
      set({ isLoading: false })
    }
  },

  setupPassphrase: async (passphrase: string) => {
    try {
      const salt = await generateSalt()
      const hash = await hashPassphrase(passphrase, salt)
      await settingsRepo.setPassphrase(hash, salt)
      set({ isSetupComplete: true, isAuthenticated: true, lastActivity: Date.now() })
      return true
    } catch (error) {
      console.error('Failed to setup passphrase:', error)
      return false
    }
  },

  authenticate: async (passphrase: string) => {
    try {
      const settings = await settingsRepo.get()
      if (!settings?.passphraseHash || !settings?.passphraseSalt) {
        return false
      }

      const isValid = await verifyPassphrase(
        passphrase,
        settings.passphraseHash,
        settings.passphraseSalt
      )

      if (isValid) {
        set({ isAuthenticated: true, lastActivity: Date.now() })
      }

      return isValid
    } catch (error) {
      console.error('Failed to authenticate:', error)
      return false
    }
  },

  lock: () => {
    set({ isAuthenticated: false })
  },

  updateActivity: () => {
    set({ lastActivity: Date.now() })
  },

  checkAutoLock: () => {
    const { isAuthenticated, lastActivity, autoLockMinutes, lock } = get()
    if (!isAuthenticated) return
    // 0 means auto-lock is disabled
    if (autoLockMinutes === 0) return

    const inactiveTime = (Date.now() - lastActivity) / 1000 / 60
    if (inactiveTime >= autoLockMinutes) {
      lock()
    }
  },

  setAutoLockMinutes: async (minutes: number) => {
    await settingsRepo.update({ autoLockMinutes: minutes })
    set({ autoLockMinutes: minutes, lastActivity: Date.now() })
  },
}))
