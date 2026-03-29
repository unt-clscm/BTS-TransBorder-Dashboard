import { ExternalLink, Download } from 'lucide-react'
import HeroStardust from '@/components/ui/HeroStardust'

const SECTIONS = [
  { id: 'source', label: 'Data Source' },
  { id: 'coverage', label: 'Data Coverage' },
  { id: 'year-range', label: 'Year Range Strategy' },
  { id: 'terminology', label: 'BTS Terminology' },
  { id: 'limitations', label: 'Known Limitations' },
  { id: 'port-history', label: 'Port History' },
  { id: 'downloads', label: 'Downloads' },
]

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <div className="gradient-blue text-white relative overflow-visible">
        <HeroStardust seed={91} animate />
        <div className="max-w-5xl mx-auto px-6 py-14 md:py-20 relative flex flex-col md:flex-row items-center gap-8">
          <img
            src={`${import.meta.env.BASE_URL}assets/Logos/BTS-Logo.svg`}
            alt="Bureau of Transportation Statistics"
            className="h-32 md:h-40 w-auto flex-shrink-0 drop-shadow-lg"
          />
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white text-balance">
              About the Data
            </h2>
            <p className="text-white/70 mt-3 text-base md:text-lg">
              How BTS TransBorder freight data was collected, structured, and prepared
              for this dashboard — and what you should know when interpreting the numbers.
            </p>
          </div>
        </div>
      </div>

      {/* Quick-jump nav */}
      <nav className="border-b border-border-light bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
          {SECTIONS.map((s, _i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })}
              className="whitespace-nowrap px-3 py-1.5 rounded-full text-base font-medium text-text-secondary hover:text-brand-blue hover:bg-brand-blue/5 transition-colors cursor-pointer"
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

        {/* ── Data Source ──────────────────────────────────────────────── */}
        <section id="source" className="mb-10 scroll-mt-16">
          <h2 className="text-xl font-bold text-text-primary mb-3">Data Source</h2>
          <p className="text-lg text-text-secondary leading-relaxed mb-4">
            The TransBorder freight data measures the value and quantity of goods flowing
            between the United States and its North American trade partners (Canada and
            Mexico) since April 1993. It is published monthly by the Bureau of
            Transportation Statistics (BTS) based on data from U.S. Customs and Border
            Protection.
          </p>
          <p className="text-lg text-text-secondary leading-relaxed">
            This dashboard focuses on the <strong>Texas&ndash;Mexico border</strong>,
            covering all surface ports of entry along the Texas border with Mexico. The
            underlying data is sourced from BTS TransBorder raw data files, which are
            published as downloadable datasets on the BTS website.
          </p>
          <a
            href="https://www.bts.gov/topics/transborder-raw-data"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-base font-semibold text-brand-blue hover:underline"
          >
            <ExternalLink size={14} />
            BTS TransBorder Raw Data
          </a>
        </section>

        {/* ── Data Coverage ───────────────────────────────────────────── */}
        <section id="coverage" className="mb-10 scroll-mt-16">
          <h2 className="text-xl font-bold text-text-primary mb-3">Data Coverage</h2>
          <p className="text-lg text-text-secondary leading-relaxed mb-4">
            The dataset spans <strong>April 1993 through 2025</strong>, comprising
            approximately <strong>39.5 million records</strong> across three BTS tables:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { code: 'DOT1', desc: 'State \u00D7 Port', detail: 'Trade value and weight by state, port, and mode of transportation.' },
              { code: 'DOT2', desc: 'State \u00D7 Commodity', detail: 'Trade value and weight by state, commodity (HS 2-digit), and mode.' },
              { code: 'DOT3', desc: 'Port \u00D7 Commodity', detail: 'Trade value and weight by port, commodity, and mode. Available from January 2007 only.' },
            ].map((t) => (
              <div key={t.code} className="bg-surface-alt rounded-lg p-4">
                <h5 className="text-base font-semibold text-text-primary mb-1">
                  {t.code} &mdash; {t.desc}
                </h5>
                <p className="text-lg text-text-secondary leading-relaxed">{t.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Year Range Strategy ─────────────────────────────────────── */}
        <section id="year-range" className="mb-10 scroll-mt-16">
          <h2 className="text-xl font-bold text-text-primary mb-3">Year Range Strategy</h2>
          <p className="text-lg text-text-secondary leading-relaxed mb-4">
            The <strong>Overview page</strong> shows the full range from{' '}
            <strong>1993 to 2025</strong>, providing a long-term view of trade trends
            across all available years.
          </p>
          <p className="text-lg text-text-secondary leading-relaxed mb-4">
            <strong>Detail pages</strong> (Port, Commodity, and Mode breakdowns) are
            limited to <strong>2007 and later</strong>. This is because a major data
            consolidation occurred in <strong>January 2007</strong>: BTS restructured
            its reporting from up to 24 separate file layouts into 3 standardized tables
            (Surface, Air/Vessel, and Pipeline). Pre-2007 data uses different schemas,
            field definitions, and commodity groupings that are not directly comparable
            with the modern format.
          </p>
          <p className="text-lg text-text-secondary leading-relaxed">
            By restricting detail pages to the post-consolidation period, the dashboard
            ensures consistent definitions across all breakdowns and avoids misleading
            comparisons that could arise from schema differences.
          </p>
        </section>

        {/* ── BTS Terminology ─────────────────────────────────────────── */}
        <section id="terminology" className="mb-10 scroll-mt-16">
          <h2 className="text-xl font-bold text-text-primary mb-3">BTS Terminology</h2>
          <p className="text-lg text-text-secondary leading-relaxed mb-4">
            The following terms appear throughout the dashboard and the underlying BTS
            data. Understanding them is important for interpreting the numbers correctly.
          </p>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-border-light shadow-sm p-5">
              <h4 className="text-base font-bold text-text-primary mb-2">Port State</h4>
              <p className="text-lg text-text-secondary leading-relaxed">
                The U.S. state where the port of entry is located. For this dashboard,
                the focus is on Texas ports along the Mexico border (e.g., Laredo, El Paso,
                Hidalgo, Brownsville).
              </p>
            </div>

            <div className="bg-white rounded-xl border border-border-light shadow-sm p-5">
              <h4 className="text-base font-bold text-text-primary mb-2">HS Codes (Harmonized Schedule)</h4>
              <p className="text-lg text-text-secondary leading-relaxed">
                TransBorder uses <strong>Harmonized Schedule (HS) 2-digit codes</strong> to
                classify commodities. These are <em>not</em> SCTG codes (Standard Classification
                of Transported Goods), which are used by the Commodity Flow Survey. HS codes
                range from 01 (Live Animals) to 99 (Special Classification Provisions).
              </p>
            </div>

            <div className="bg-white rounded-xl border border-border-light shadow-sm p-5">
              <h4 className="text-base font-bold text-text-primary mb-2">Trade Type</h4>
              <p className="text-lg text-text-secondary leading-relaxed">
                Whether goods are being <strong>exported</strong> from the United States or{' '}
                <strong>imported</strong> into the United States. The DF indicator further
                distinguishes domestic exports (DF=1) from re-exports (DF=2), though this
                distinction is only meaningful for export records.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-border-light shadow-sm p-5">
              <h4 className="text-base font-bold text-text-primary mb-2">Transportation Modes</h4>
              <p className="text-lg text-text-secondary leading-relaxed">
                BTS tracks goods movement by mode of transportation. The primary modes are:{' '}
                <strong>Truck</strong>, <strong>Rail</strong>, <strong>Pipeline</strong>,{' '}
                <strong>Air</strong>, <strong>Vessel</strong>, <strong>Mail</strong>,{' '}
                <strong>Other/Unknown</strong>, and <strong>Foreign Trade Zone (FTZ)</strong>.
                Truck and rail dominate Texas&ndash;Mexico surface trade. Air and vessel modes
                were added to the dataset in November 2003.
              </p>
            </div>
          </div>
        </section>

        {/* ── Known Data Limitations ──────────────────────────────────── */}
        <section id="limitations" className="mb-10 scroll-mt-16">
          <h2 className="text-xl font-bold text-text-primary mb-3">Known Data Limitations</h2>
          <p className="text-lg text-text-secondary leading-relaxed mb-4">
            Like any large federal dataset, TransBorder has structural limitations that
            affect certain analyses. These are not errors but reflect the design of the
            reporting system.
          </p>

          <ul className="space-y-3">
            {[
              'Export weight is only available for Air and Vessel modes. Surface export records (truck, rail, pipeline) do not include weight data.',
              'Freight charges are partially available for exports and near-complete for imports. Gaps are most common in older records.',
              'Port \u00D7 Commodity data (DOT3 table) only exists from January 2007 onward. There is no port-level commodity breakdown for earlier years.',
              'Air and vessel modes were added to TransBorder in November 2003. All data prior to that date covers surface transportation only.',
              'The DF (Domestic/Foreign) indicator is only meaningful for exports: 1 = domestic origin, 2 = re-export of foreign goods. Import records do not use this distinction.',
            ].map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-yellow flex-shrink-0" />
                <p className="text-lg text-text-secondary leading-relaxed">{item}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Port History ────────────────────────────────────────────── */}
        <section id="port-history" className="mb-10 scroll-mt-16">
          <h2 className="text-xl font-bold text-text-primary mb-3">Port History</h2>
          <p className="text-lg text-text-secondary leading-relaxed mb-4">
            Port definitions can change over time as CBP reorganizes its districts and
            ports of entry. The most significant recent change affecting Texas data:
          </p>
          <div className="bg-brand-blue/5 border border-brand-blue/15 rounded-xl p-5">
            <p className="text-lg text-text-secondary leading-relaxed">
              <strong className="text-text-primary">El Paso / Ysleta split (March 2020):</strong>{' '}
              Prior to March 2020, all El Paso&ndash;area crossings were reported under a single
              &ldquo;El Paso&rdquo; port code. Beginning in March 2020, CBP split this into two
              separate ports: <strong>El Paso</strong> (downtown bridges) and{' '}
              <strong>Ysleta</strong> (eastern bridges including Ysleta/Zaragoza). When analyzing
              long-term trends for the El Paso area, these two ports should be combined to maintain
              continuity with pre-2020 data.
            </p>
          </div>
        </section>

        {/* ── Downloads ───────────────────────────────────────────────── */}
        <section id="downloads" className="mb-10 scroll-mt-16">
          <h2 className="text-xl font-bold text-text-primary mb-3">Download the Data</h2>
          <p className="text-lg text-text-secondary leading-relaxed mb-4">
            The processed datasets used by this dashboard are available for download as
            CSV files. These files have been filtered to Texas&ndash;Mexico trade,
            cleaned, and enriched with decoded field labels.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`${import.meta.env.BASE_URL}data/dot1_state_port.csv`}
              download
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm font-medium"
            >
              <Download size={14} />
              DOT1 &mdash; State &times; Port
            </a>
            <a
              href={`${import.meta.env.BASE_URL}data/dot2_state_commodity.csv`}
              download
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm font-medium"
            >
              <Download size={14} />
              DOT2 &mdash; State &times; Commodity
            </a>
            <a
              href={`${import.meta.env.BASE_URL}data/dot3_port_commodity.csv`}
              download
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm font-medium"
            >
              <Download size={14} />
              DOT3 &mdash; Port &times; Commodity
            </a>
          </div>
          <p className="text-sm text-text-secondary/60 mt-3">
            Source: Bureau of Transportation Statistics, TransBorder Freight Data.
          </p>
        </section>

      </div>
    </>
  )
}
