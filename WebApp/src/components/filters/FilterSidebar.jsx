/**
 * ── FILTER SIDEBAR ──────────────────────────────────────────────────────
 *
 * Sticky right-side sidebar that provides filter controls for dashboard pages.
 * This component is rendered by DashboardLayout and receives filter controls
 * as children from each page component.
 *
 * Features:
 *   - Collapse/expand toggle (PanelRightClose / PanelRightOpen icons)
 *   - Active filter tags — grouped by filter category with individual
 *     remove buttons (X) for each selected value
 *   - "Reset all filters" button — visible when any filters are active
 *   - "Back to top" button — appears after scrolling past 300px
 *   - Sticky positioning — sidebar sticks to top of viewport within
 *     the flex layout, scrolling its own content independently
 *
 * Props:
 *   - children      — Filter control components (FilterSelect, FilterMultiSelect)
 *                      passed from the page via DashboardLayout's `filters` prop
 *   - onResetAll    — Callback to clear all filters (provided by the page)
 *   - activeCount   — Number of active filter categories (drives badge count)
 *   - activeTags    — Array of { group, label, onRemove } for rendering tags
 *   - title         — Sidebar header text (default: "Filters")
 *
 * ── BOILERPLATE: HOW TO ADAPT ───────────────────────────────────────────
 * No changes are typically needed in this file when adapting for a new
 * dataset. Filter controls are defined in each page component and passed
 * as children. Only modify this if you want to change the sidebar's
 * layout, styling, collapse behavior, or add/remove global sidebar features.
 */
import { useState, useEffect, useRef } from 'react'
import { Filter, RotateCcw, PanelRightClose, PanelRightOpen, ArrowUp, Download } from 'lucide-react'
import ActiveFilterTags from '@/components/filters/ActiveFilterTags'
import { downloadCsv } from '@/lib/downloadCsv'

export default function FilterSidebar({ children, onResetAll, activeCount = 0, activeTags = [], title = 'Filters', pageDownload }) {
  const [collapsed, setCollapsed] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [dlOpen, setDlOpen] = useState(false)
  const [focusDlIdx, setFocusDlIdx] = useState(-1)
  const dlRef = useRef(null)
  const dlTriggerRef = useRef(null)
  const dlMenuItemRefs = useRef([])
  const lastScrollTopRef = useRef(false)

  useEffect(() => {
    const onScroll = () => {
      const shouldShow = window.scrollY > 300
      if (shouldShow !== lastScrollTopRef.current) {
        lastScrollTopRef.current = shouldShow
        setShowScrollTop(shouldShow)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close download dropdown on outside click
  useEffect(() => {
    if (!dlOpen) return
    const handler = (e) => {
      if (dlRef.current && !dlRef.current.contains(e.target)) setDlOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [dlOpen])

  // Focus menu item when focusDlIdx changes
  useEffect(() => {
    if (dlOpen && focusDlIdx >= 0 && dlMenuItemRefs.current[focusDlIdx]) {
      dlMenuItemRefs.current[focusDlIdx].focus()
    }
  }, [dlOpen, focusDlIdx])

  // Reset focusDlIdx when download dropdown closes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!dlOpen) setFocusDlIdx(-1)
  }, [dlOpen])

  // Keyboard handler for trigger button: open with ArrowDown/Space, close with Escape
  const handleDlTriggerKeyDown = (e) => {
    if ((e.key === 'ArrowDown' || e.key === ' ') && !dlOpen) {
      e.preventDefault()
      setDlOpen(true)
      setFocusDlIdx(0)
    } else if (e.key === 'Escape' && dlOpen) {
      e.preventDefault()
      setDlOpen(false)
    }
  }

  // Keyboard handler for the menu: arrow navigation and Escape
  const handleDlMenuKeyDown = (e) => {
    const items = dlMenuItemRefs.current.filter(Boolean)
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusDlIdx((prev) => Math.min(prev + 1, items.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusDlIdx((prev) => Math.max(prev - 1, 0))
        break
      case 'Escape':
        e.preventDefault()
        setDlOpen(false)
        dlTriggerRef.current?.focus()
        break
      case 'Tab':
        setDlOpen(false)
        break
      default:
        break
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const width = collapsed ? 'w-12' : 'w-72'

  return (
      <aside
        aria-label="Filters"
        className={`sticky top-0 self-start h-screen flex-shrink-0 flex flex-col z-40
          bg-[#edf1f7] border-l border-border-light shadow-sm
          transition-all duration-300 ease-in-out
          ${width}
        `}
      >
        {/* Header — always visible, never scrolls */}
        <div
          className={`flex items-center border-b border-border-light bg-[#e4e9f1] flex-shrink-0
            ${collapsed ? 'justify-center py-3 px-1' : 'justify-between px-4 py-3'}`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-brand-blue" />
              <span className="text-base font-semibold text-text-primary">{title}</span>
              {activeCount > 0 && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full
                               bg-brand-blue text-white text-base font-bold">
                  {activeCount}
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand filters' : 'Collapse filters'}
            aria-expanded={!collapsed}
            className="p-1 rounded-md text-text-secondary hover:text-brand-blue
                       hover:bg-surface-alt transition-all duration-150"
            title={collapsed ? 'Expand filters' : 'Collapse filters'}
          >
            {collapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          {/* Content */}
          {!collapsed && (
            <div className="p-4 space-y-4 animate-fade-in">
              <ActiveFilterTags activeTags={activeTags} />
              {/* Reset — right below active tags */}
              {onResetAll && activeCount > 0 && (
                <button
                  onClick={onResetAll}
                  className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-base font-medium
                             text-brand-blue border border-brand-blue/30 rounded-lg
                             hover:bg-brand-blue/5 transition-all duration-150"
                >
                  <RotateCcw size={12} />
                  Reset all filters
                </button>
              )}
              {activeCount > 0 && <div className="border-b border-border-light" />}
              <div className="w-full min-w-0">
                {children}
              </div>

              {/* Scroll to top */}
              {showScrollTop && (
                <button
                  onClick={scrollToTop}
                  className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-base font-medium
                             text-text-secondary border border-border-light rounded-lg
                             hover:text-brand-blue hover:border-brand-blue/30 hover:bg-brand-blue/5
                             transition-all duration-200 mt-1"
                >
                  <ArrowUp size={12} />
                  Back to top
                </button>
              )}

              {/* Page-level data download */}
              {pageDownload && (
                <div className="border-t border-border-light pt-4 mt-2 relative" ref={dlRef}>
                  <button
                    ref={dlTriggerRef}
                    onClick={() => setDlOpen((o) => !o)}
                    onKeyDown={handleDlTriggerKeyDown}
                    aria-expanded={dlOpen}
                    aria-haspopup="menu"
                    aria-controls={dlOpen ? 'sidebar-dl-menu' : undefined}
                    className="flex items-center justify-center gap-2 w-full px-3 py-2.5 text-base font-medium
                               text-brand-blue border border-brand-blue/30 rounded-lg
                               hover:bg-brand-blue/5 transition-all duration-150"
                  >
                    <Download size={14} />
                    Download Page Data
                  </button>
                  {dlOpen && (
                    <div
                      id="sidebar-dl-menu"
                      role="menu"
                      tabIndex={-1}
                      aria-label="Download options"
                      aria-orientation="vertical"
                      onKeyDown={handleDlMenuKeyDown}
                      className="mt-1 bg-white rounded-lg shadow-lg border border-border-light py-1 z-50"
                    >
                      {pageDownload.market?.data?.length > 0 && (
                        <button
                          ref={(el) => { dlMenuItemRefs.current[0] = el }}
                          role="menuitem"
                          onClick={() => { downloadCsv(pageDownload.market.data, pageDownload.market.filename, pageDownload.market.columns); setDlOpen(false); dlTriggerRef.current?.focus() }}
                          className="w-full text-left px-3 py-2 text-base text-text-primary hover:bg-surface-alt focus:bg-surface-alt focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-inset transition-colors outline-none"
                        >
                          Market Data (CSV)
                        </button>
                      )}
                      {pageDownload.segment?.data?.length > 0 && (
                        <button
                          ref={(el) => { dlMenuItemRefs.current[pageDownload.market?.data?.length > 0 ? 1 : 0] = el }}
                          role="menuitem"
                          onClick={() => { downloadCsv(pageDownload.segment.data, pageDownload.segment.filename, pageDownload.segment.columns); setDlOpen(false); dlTriggerRef.current?.focus() }}
                          className="w-full text-left px-3 py-2 text-base text-text-primary hover:bg-surface-alt focus:bg-surface-alt focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-inset transition-colors outline-none"
                        >
                          Segment Data (CSV)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Collapsed icon indicator */}
          {collapsed && activeCount > 0 && (
            <div className="flex flex-col items-center py-3 gap-2">
              <Filter size={14} className="text-brand-blue" />
              <span className="text-base font-bold text-brand-blue bg-brand-blue/10 rounded-full w-6 h-6
                             flex items-center justify-center">
                {activeCount}
              </span>
            </div>
          )}

          {/* Collapsed scroll to top */}
          {collapsed && showScrollTop && (
            <div className="flex justify-center py-2">
              <button
                onClick={scrollToTop}
                aria-label="Back to top"
                className="p-1.5 rounded-md text-text-secondary hover:text-brand-blue
                           hover:bg-surface-alt transition-all duration-150"
                title="Back to top"
              >
                <ArrowUp size={14} />
              </button>
            </div>
          )}
        </div>

      </aside>
  )
}
