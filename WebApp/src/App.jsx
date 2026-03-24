import { useEffect } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useTransborderStore } from '@/stores/transborderStore'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import PageTransition from '@/components/ui/PageTransition'
import PageWrapper from '@/components/layout/PageWrapper'
import OverviewPage from '@/pages/Overview'
import USMexicoPage from '@/pages/USMexico'
import USMexicoPortsPage from '@/pages/USMexicoPorts'
import TexasMexicoPage from '@/pages/TexasMexico'
import TradeByModePage from '@/pages/TradeByMode'
import TradeByCommodityPage from '@/pages/TradeByCommodity'
import TradeByStatePage from '@/pages/TradeByState'
import AboutPage from '@/pages/About'

import NotFoundPage from '@/pages/NotFound'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])
  return null
}

function DataLoadError({ error, onRetry, retrying }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-lg px-6">
        <AlertTriangle size={48} className="text-brand-orange mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-text-primary mb-2">
          Unable to load data
        </h2>
        <p className="text-base text-text-secondary mb-2">
          The dashboard could not load its data files. This may be a temporary
          network issue or the data files may be missing from the server.
        </p>
        <p className="text-base text-text-secondary/70 mb-6 font-mono break-all">
          {error}
        </p>
        <button
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-base font-medium text-white
                     bg-brand-blue rounded-lg hover:bg-brand-blue-dark transition-colors
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RefreshCw size={16} className={retrying ? 'animate-spin' : ''} />
          {retrying ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    </div>
  )
}

function AppContent() {
  const init = useTransborderStore((s) => s.init)
  const loading = useTransborderStore((s) => s.loading)
  const error = useTransborderStore((s) => s.error)

  useEffect(() => { init() }, [init])

  return (
    <PageWrapper>
      <ScrollToTop />
      {error ? (
        <DataLoadError error={error} onRetry={init} retrying={loading} />
      ) : (
        <ErrorBoundary onRetry={init}>
          <PageTransition>
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/us-mexico" element={<USMexicoPage />} />
              <Route path="/us-mexico/ports" element={<USMexicoPortsPage />} />
              <Route path="/texas-mexico" element={<TexasMexicoPage />} />
              <Route path="/trade-by-mode" element={<TradeByModePage />} />
              <Route path="/commodities" element={<TradeByCommodityPage />} />
              <Route path="/trade-by-state" element={<TradeByStatePage />} />
              <Route path="/about" element={<AboutPage />} />


              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </PageTransition>
        </ErrorBoundary>
      )}
    </PageWrapper>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  )
}
