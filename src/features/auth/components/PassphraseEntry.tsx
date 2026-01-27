import { useState, useRef } from 'react'
import { KeyRound, Eye, EyeOff, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuthStore } from '@/store/useAuthStore'
import { useLanguage } from '@/hooks/useLanguage'

export function PassphraseEntry() {
  const [passphrase, setPassphrase] = useState('')
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useLanguage()

  const authenticate = useAuthStore((state) => state.authenticate)
  const inputRef = useRef<HTMLInputElement>(null)

  const focusInput = () => {
    inputRef.current?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!passphrase) {
      setError(t('pleaseEnterPassphrase'))
      return
    }

    setIsLoading(true)
    const success = await authenticate(passphrase)
    setIsLoading(false)

    if (!success) {
      setError(t('incorrectPassword'))
      setPassphrase('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4" onClick={focusInput}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{t('welcomeBack')}</CardTitle>
          <CardDescription>
            {t('unlockDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="passphrase">{t('passphrase')}</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  id="passphrase"
                  type={showPassphrase ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="pl-9 pr-10"
                  placeholder={t('enterYourPassphrase')}
                  autoComplete="current-password"
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

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('unlocking') : t('unlock')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
