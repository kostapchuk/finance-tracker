import * as React from 'react'

import { cn } from '@/utils/cn'

export interface DateInputProps {
  value: string
  onChange: (value: string) => void
  language: string
  placeholder?: string
  className?: string
}

const localeByLanguage: Record<string, string> = {
  en: 'en-US',
  ru: 'ru-RU',
}

function formatDisplayValue(value: string, language: string): string {
  if (!value) return ''
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return ''
  const date = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat(localeByLanguage[language] ?? 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/**
 * Wraps a native `<input type="date">` with an app-controlled visible label.
 * iOS renders the native date input's displayed value and width using the
 * device locale, ignoring the `lang` attribute, which broke layout and
 * language consistency on iPhone. Browsers also only open the picker when
 * clicking part of the native control (e.g. the calendar-icon area), so a
 * click anywhere on the invisible full-size input explicitly opens the
 * picker via `showPicker()` (falling back to `focus()` on older browsers).
 */
export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, language, placeholder, className }, forwardedRef) => {
    const innerRef = React.useRef<HTMLInputElement>(null)
    const displayValue = formatDisplayValue(value, language)

    const openPicker = (input: HTMLInputElement) => {
      if (typeof input.showPicker === 'function') {
        try {
          input.showPicker()
          return
        } catch {
          // showPicker() can throw (e.g. missing user activation); fall back to focus().
        }
      }
      input.focus()
    }

    return (
      <div
        className={cn(
          'relative flex h-9 w-full min-w-0 items-center rounded-md border border-input bg-background px-3 text-sm',
          className
        )}
      >
        <span className={cn('truncate', !displayValue && 'text-muted-foreground')}>
          {displayValue || placeholder}
        </span>
        <input
          ref={(node) => {
            innerRef.current = node
            if (typeof forwardedRef === 'function') forwardedRef(node)
            else if (forwardedRef) forwardedRef.current = node
          }}
          type="date"
          lang={language}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => openPicker(e.currentTarget)}
          aria-label={placeholder}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    )
  }
)
DateInput.displayName = 'DateInput'
