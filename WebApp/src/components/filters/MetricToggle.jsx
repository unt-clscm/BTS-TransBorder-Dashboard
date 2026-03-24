/**
 * MetricToggle — Two-button toggle for switching between Trade Value ($) and Weight (lb).
 * Sits in the filter sidebar above other filters.
 *
 * Props:
 *   @param {string} value — 'value' or 'weight'
 *   @param {function} onChange — called with 'value' or 'weight'
 */
import { Info } from 'lucide-react'

const OPTIONS = [
  { key: 'value', label: 'Trade Value ($)' },
  { key: 'weight', label: 'Weight (lb)' },
]

export default function MetricToggle({ value = 'value', onChange }) {
  return (
    <div className="flex flex-col gap-1 min-w-0 w-full">
      <span className="text-base font-medium text-text-secondary uppercase tracking-wider">
        Metric
      </span>
      <div className="flex rounded-lg border border-border overflow-hidden">
        {OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors duration-150 cursor-pointer
              ${value === opt.key
                ? 'bg-brand-blue text-white'
                : 'bg-white text-text-secondary hover:bg-surface-alt'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {value === 'weight' && (
        <div className="flex items-start gap-1.5 mt-1 text-xs text-amber-600 bg-amber-50 rounded-md px-2 py-1.5">
          <Info size={12} className="flex-shrink-0 mt-0.5" />
          <span>Weight is unavailable for surface exports (shown as zero).</span>
        </div>
      )}
    </div>
  )
}
