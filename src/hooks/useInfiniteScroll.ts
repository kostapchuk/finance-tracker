import { useEffect, useRef } from 'react'

interface UseInfiniteScrollOptions {
  onLoadMore: () => void
  hasMore: boolean
  isLoading: boolean
  threshold?: number
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 300,
}: UseInfiniteScrollOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isLoadingRef = useRef(isLoading)
  const hasMoreRef = useRef(hasMore)
  const loadingTriggeredRef = useRef(false)

  useEffect(() => {
    isLoadingRef.current = isLoading
    if (!isLoading) {
      loadingTriggeredRef.current = false
    }
  }, [isLoading])

  useEffect(() => {
    hasMoreRef.current = hasMore
  }, [hasMore])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const mainElement = container.closest('main')
    if (!mainElement) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = mainElement
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      if (
        distanceFromBottom < threshold &&
        hasMoreRef.current &&
        !isLoadingRef.current &&
        !loadingTriggeredRef.current
      ) {
        loadingTriggeredRef.current = true
        onLoadMore()
      }
    }

    mainElement.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      mainElement.removeEventListener('scroll', handleScroll)
    }
  }, [onLoadMore, threshold])

  return { scrollContainerRef: containerRef }
}
