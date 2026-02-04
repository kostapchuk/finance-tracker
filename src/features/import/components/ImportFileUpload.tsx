import { useRef } from 'react'
import { Upload, FileText, AlertCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/hooks/useLanguage'
import { validateImportFile } from '../utils/csvParser'

interface ImportFileUploadProps {
  onFileSelect: (file: File) => void
  error: string | null
  setError: (error: string | null) => void
}

export function ImportFileUpload({ onFileSelect, error, setError }: ImportFileUploadProps) {
  const { t } = useLanguage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validationError = validateImportFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    onFileSelect(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return

    const validationError = validateImportFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    onFileSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6">
      <div className="text-center space-y-2">
        <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-semibold">{t('importSelectFile')}</h2>
        <p className="text-sm text-muted-foreground">{t('importFileHint')}</p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="w-full max-w-sm border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('importDropOrClick')}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="w-full max-w-sm p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Comma warning */}
      <div className="w-full max-w-sm p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2 text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span className="text-sm">{t('importCommaWarning')}</span>
      </div>

      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
        {t('importChooseFile')}
      </Button>
    </div>
  )
}
