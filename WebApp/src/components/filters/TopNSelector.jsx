/**
 * TopNSelector — Small dropdown to control how many items a ranking chart shows.
 * Sits in ChartCard's headerRight slot.
 *
 * Props:
 *   @param {number} value — currently selected N
 *   @param {function} onChange — called with the new N (number)
 *   @param {number[]} [options] — choices to offer (default [5, 10, 15, 20])
 */
import SelectChevron from './SelectChevron'

const DEFAULT_OPTIONS = [5, 10, 15, 20]

export default function TopNSelector({ value, onChange, options = DEFAULT_OPTIONS }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-text-secondary whitespace-nowrap">Top</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="appearance-none px-2 py-1 pr-6 rounded border border-border bg-white text-text-primary
                     text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue/30 cursor-pointer"
          aria-label="Number of items to show"
        >
          {options.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <SelectChevron />
      </div>
    </div>
  )
}
