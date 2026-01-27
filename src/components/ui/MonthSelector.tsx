import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useLanguage } from '@/hooks/useLanguage'

export function MonthSelector() {
  const selectedMonth = useAppStore((state) => state.selectedMonth)
  const setSelectedMonth = useAppStore((state) => state.setSelectedMonth)
  const { language } = useLanguage()

  const goToPreviousMonth = () => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() - 1)
    setSelectedMonth(newDate)
  }

  const goToNextMonth = () => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() + 1)
    setSelectedMonth(newDate)
  }

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      month: 'long',
      year: 'numeric'
    })
  }

  const isCurrentMonth = () => {
    const now = new Date()
    return (
      selectedMonth.getMonth() === now.getMonth() &&
      selectedMonth.getFullYear() === now.getFullYear()
    )
  }

  return (
    <div className="flex items-center justify-between px-4 py-1">
      <button
        onClick={goToPreviousMonth}
        className="p-2 rounded-full hover:bg-secondary active:bg-secondary/80 touch-target"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h2 className="text-lg font-semibold">
        {formatMonth(selectedMonth)}
      </h2>
      <button
        onClick={goToNextMonth}
        disabled={isCurrentMonth()}
        className="p-2 rounded-full hover:bg-secondary active:bg-secondary/80 touch-target disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label="Next month"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}
