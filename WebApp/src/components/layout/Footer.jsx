export default function Footer() {
  return (
    <footer className="bg-brand-gray-light/60 border-t border-border">
      <div className="container-chrome py-4 flex items-center justify-center">
        <p className="text-base text-text-secondary flex items-center gap-1.5">
          Data source:{' '}
          <img
            src={`${import.meta.env.BASE_URL}assets/Logos/BTS-Logo.svg`}
            alt="Bureau of Transportation Statistics"
            className="h-5 w-auto inline"
          />
          Bureau of Transportation Statistics (BTS) TransBorder Freight Data, 1993–2025
        </p>
      </div>
    </footer>
  )
}
