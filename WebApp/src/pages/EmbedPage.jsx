import { useParams, useSearchParams } from 'react-router-dom'

export default function EmbedPage() {
  const { pageId, chartId } = useParams()
  const [searchParams] = useSearchParams()

  // For now, show a placeholder. Charts can be wired up later.
  return (
    <div className="p-4">
      <div className="text-center text-text-secondary py-12">
        <p className="text-lg font-medium">Embedded Chart</p>
        <p className="text-base mt-2">Page: {pageId} / Chart: {chartId}</p>
        <p className="text-sm mt-1 text-text-secondary/60">
          Filters: {searchParams.toString() || 'none'}
        </p>
      </div>
      <div className="text-center text-xs text-text-secondary/50 mt-8 border-t pt-2">
        Powered by BTS TransBorder Freight Dashboard
      </div>
    </div>
  )
}
