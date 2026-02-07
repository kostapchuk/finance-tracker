import { createContext, useContext } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

declare global {
  interface Window {
    __TEST_FORCE_SW_UPDATE__?: boolean
  }
}

interface ServiceWorkerContextValue {
  needRefresh: boolean
  updateServiceWorker: () => void
}

const ServiceWorkerContext = createContext<ServiceWorkerContextValue>({
  needRefresh: false,
  updateServiceWorker: () => {},
})

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  const showUpdate = needRefresh || !!window.__TEST_FORCE_SW_UPDATE__

  return (
    <ServiceWorkerContext.Provider
      value={{
        needRefresh: showUpdate,
        updateServiceWorker: () => updateServiceWorker(true),
      }}
    >
      {children}
    </ServiceWorkerContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useServiceWorker() {
  return useContext(ServiceWorkerContext)
}
