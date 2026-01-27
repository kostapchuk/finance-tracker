import { useState } from 'react'
import { KeyRound, Eye, EyeOff, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuthStore } from '@/store/useAuthStore'
import { useLanguage } from '@/hooks/useLanguage'

export function PassphraseSetup() {
  const [passphrase, setPassphrase] = useState('')
  const [confirmPassphrase, setConfirmPassphrase] = useState('')
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useLanguage()

  const setupPassphrase = useAuthStore((state) => state.setupPassphrase)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (passphrase.length < 4) {
      setError(t('passphraseTooShort'))
      return
    }

    if (passphrase !== confirmPassphrase) {
      setError(t('passphrasesDoNotMatch'))
      return
    }

    setIsLoading(true)
    const success = await setupPassphrase(passphrase)
    setIsLoading(false)

    if (!success) {
      setError(t('failedToSetupPassphrase'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{t('welcomeToFinanceTracker')}</CardTitle>
          <CardDescription>
            {t('setupPassphraseDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="passphrase">{t('passphrase')}</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="passphrase"
                  type={showPassphrase ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="pl-9 pr-10"
                  placeholder={t('enterYourPassphrase')}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassphrase">{t('confirmPassphrase')}</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassphrase"
                  type={showPassphrase ? 'text' : 'password'}
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  className="pl-9"
                  placeholder={t('confirmYourPassphrase')}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('settingUp') : t('continue')}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              {t('passphraseSecurityNote')}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
