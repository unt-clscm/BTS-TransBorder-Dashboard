import { useMemo, useEffect, lazy, Suspense } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTransborderStore } from '@/stores/transborderStore'
import { CHART_REGISTRY } from '@/lib/chartRegistry'

const CHART_COMPONENTS = {
  LineChart: lazy(() => import('@/components/charts/LineChart')),
  DonutChart: lazy(() => import('@/components/charts/DonutChart')),
  StackedBarChart: lazy(() => import('@/components/charts/StackedBarChart')),
  BarChart: lazy(() => import('@/components/charts/BarChart')),
  TreemapChart: lazy(() => import('@/components/charts/TreemapChart')),
  LollipopChart: lazy(() => import('@/components/charts/LollipopChart')),
}

export default function EmbedPage() {
  const { pageId, chartId } = useParams()
  const [searchParams] = useSearchParams()

  const init = useTransborderStore((s) => s.init)
  const loading = useTransborderStore((s) => s.loading)
  const error = useTransborderStore((s) => s.error)
  const usTransborder = useTransborderStore((s) => s.usTransborder)

  useEffect(() => { init() }, [init])

  // Look up chart config
  const config = CHART_REGISTRY[pageId]?.[chartId]

  // Apply URL filter params to dataset
  const filteredData = useMemo(() => {
    if (!config || !usTransborder?.length) return []

    let rows = usTransborder

    const yearParam = searchParams.get('year')
    if (yearParam) {
      const years = yearParam.split(',').map(Number).filter(Number.isFinite)
      if (years.length) rows = rows.filter((d) => years.includes(d.Year))
    }

    const countryParam = searchParams.get('country')
    if (countryParam) {
      const countries = countryParam.split(',').map((s) => s.trim().toLowerCase())
      rows = rows.filter((d) => d.Country && countries.includes(d.Country.toLowerCase()))
    }

    const modeParam = searchParams.get('mode')
    if (modeParam) {
      const modes = modeParam.split(',').map((s) => s.trim().toLowerCase())
      rows = rows.filter((d) => d.Mode && modes.includes(d.Mode.toLowerCase()))
    }

    const tradeTypeParam = searchParams.get('tradeType')
    if (tradeTypeParam) {
      const tt = tradeTypeParam.toLowerCase()
      rows = rows.filter((d) => d.TradeType && d.TradeType.toLowerCase().includes(tt))
    }

    return rows
  }, [config, usTransborder, searchParams])

  // Build chart data from the registry's build function
  const chartOutput = useMemo(() => {
    if (!config || !filteredData.length) return null
    return config.build(filteredData)
  }, [config, filteredData])

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <p className="text-base text-red-600">Failed to load data: {error}</p>
      </div>
    )
  }

  // Unknown chart
  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center text-text-secondary">
          <p className="text-lg font-medium">Chart not found</p>
          <p className="text-base mt-1">
            No embeddable chart for <code>{pageId}/{chartId}</code>
          </p>
        </div>
      </div>
    )
  }

  // No data after filters
  if (!chartOutput) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <p className="text-base text-text-secondary">No data available for the current filters.</p>
      </div>
    )
  }

  const ChartComponent = CHART_COMPONENTS[config.chartType]
  if (!ChartComponent) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <p className="text-base text-red-600">Unknown chart type: {config.chartType}</p>
      </div>
    )
  }

  const mergedProps = { ...config.props, ...chartOutput.extraProps, data: chartOutput.data }

  return (
    <div className="p-4 h-screen flex flex-col">
      <h2 className="text-lg font-semibold text-text-primary mb-3">{config.title}</h2>
      <div className="flex-1 min-h-0">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <ChartComponent {...mergedProps} />
        </Suspense>
      </div>
      <div className="text-center text-xs text-text-secondary/50 mt-2 border-t pt-2">
        Powered by BTS TransBorder Freight Dashboard
      </div>
    </div>
  )
}
