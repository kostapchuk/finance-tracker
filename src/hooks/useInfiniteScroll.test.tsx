import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useInfiniteScroll } from './useInfiniteScroll'

type Callback = (entries: Pick<IntersectionObserverEntry, 'isIntersecting'>[]) => void

let callback: Callback
const observe = vi.fn()
const disconnect = vi.fn()
const options = vi.fn()

beforeEach(() => {
  observe.mockClear()
  disconnect.mockClear()
  options.mockClear()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: Callback, init: IntersectionObserverInit) {
        callback = cb
        options(init)
      }
      observe = observe
      disconnect = disconnect
    }
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function List(props: { onLoadMore: () => void; hasMore: boolean; isLoading: boolean }) {
  const { sentinelRef } = useInfiniteScroll(props)
  return <div ref={sentinelRef} />
}

function NoSentinel() {
  useInfiniteScroll({ onLoadMore: vi.fn(), hasMore: true, isLoading: false })
  return <span />
}

describe('useInfiniteScroll', () => {
  it('observes the sentinel and loads more when it becomes visible', () => {
    const onLoadMore = vi.fn()
    const { unmount } = render(<List onLoadMore={onLoadMore} hasMore isLoading={false} />)

    expect(observe).toHaveBeenCalledTimes(1)
    expect(options).toHaveBeenCalledWith({ rootMargin: '200px' })

    callback([{ isIntersecting: false }])
    expect(onLoadMore).not.toHaveBeenCalled()

    callback([{ isIntersecting: true }])
    expect(onLoadMore).toHaveBeenCalledTimes(1)

    unmount()
    expect(disconnect).toHaveBeenCalled()
  })

  it.each([
    ['there is nothing more', false, false],
    ['a page is already loading', true, true],
  ])('does not load when %s', (_name, hasMore, isLoading) => {
    const onLoadMore = vi.fn()
    render(<List onLoadMore={onLoadMore} hasMore={hasMore} isLoading={isLoading} />)

    callback([{ isIntersecting: true }])

    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('does nothing without a sentinel element', () => {
    render(<NoSentinel />)

    expect(observe).not.toHaveBeenCalled()
  })
})
