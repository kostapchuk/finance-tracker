export function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function getStartOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function getEndOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function getStartOfYear(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), 0, 1)
}

export function getEndOfYear(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999)
}
