export function WalletCoinsIllustration({className = 'h-32 w-40'}: {className?: string}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 150"
      className={className}
      fill="none">
      <circle cx="105" cy="75" r="58" fill="#E6F5EF" />
      <circle cx="154" cy="44" r="18" fill="#F4A81D" />
      <circle cx="154" cy="44" r="12" stroke="#FFF9EB" strokeWidth="2" />
      <path d="M150 38v12M158 38v12M149 41l10 6" stroke="#12201B" strokeWidth="2" strokeLinecap="round" />
      <circle cx="48" cy="108" r="13" fill="#F4A81D" />
      <rect x="42" y="48" width="96" height="68" rx="16" fill="#0E7C66" />
      <path d="M52 48V38c0-6 5-10 11-10h54c6 0 11 4 11 10v10" fill="#17A589" />
      <rect x="108" y="72" width="36" height="22" rx="11" fill="#0A5A4A" />
      <circle cx="119" cy="83" r="4" fill="#F4A81D" />
      <rect x="56" y="62" width="38" height="6" rx="3" fill="#8CD6C4" />
      <rect x="56" y="74" width="24" height="6" rx="3" fill="#8CD6C4" />
    </svg>
  );
}

export function PiggyBankIllustration({className = 'h-32 w-40'}: {className?: string}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 150"
      className={className}
      fill="none">
      <circle cx="100" cy="78" r="58" fill="#FEF5E1" />
      <circle cx="100" cy="28" r="14" fill="#F4A81D" />
      <path d="M96 23v10M104 23v10M95 26l10 4" stroke="#12201B" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="102" cy="84" rx="46" ry="34" fill="#0E7C66" />
      <path d="M84 54l-8-14 16 4" fill="#17A589" />
      <rect x="92" y="55" width="20" height="5" rx="2.5" fill="#12201B" />
      <ellipse cx="149" cy="85" rx="9" ry="12" fill="#17A589" />
      <circle cx="130" cy="74" r="3.5" fill="#FFFFFF" />
      <circle cx="130" cy="74" r="1.5" fill="#12201B" />
      <rect x="74" y="108" width="12" height="16" rx="5" fill="#0A5A4A" />
      <rect x="116" y="108" width="12" height="16" rx="5" fill="#0A5A4A" />
      <path d="M56 76c-8-4-12 4-6 10" stroke="#0A5A4A" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function CalendarPlanIllustration({className = 'h-32 w-40'}: {className?: string}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 150"
      className={className}
      fill="none">
      <circle cx="100" cy="76" r="56" fill="#EBF4FB" />
      <rect x="46" y="34" width="108" height="86" rx="18" fill="#FFFFFF" stroke="#0E7C66" strokeWidth="3" />
      <path d="M46 52c0-10 8-18 18-18h72c10 0 18 8 18 18v12H46V52Z" fill="#0E7C66" />
      <rect x="70" y="24" width="8" height="20" rx="4" fill="#F4A81D" />
      <rect x="122" y="24" width="8" height="20" rx="4" fill="#F4A81D" />
      <rect x="64" y="76" width="18" height="14" rx="4" fill="#E6F5EF" />
      <rect x="91" y="76" width="18" height="14" rx="4" fill="#F4A81D" />
      <rect x="118" y="76" width="18" height="14" rx="4" fill="#E6F5EF" />
      <rect x="64" y="96" width="18" height="14" rx="4" fill="#E6F5EF" />
      <rect x="91" y="96" width="18" height="14" rx="4" fill="#E6F5EF" />
      <circle cx="127" cy="103" r="7" fill="#17A589" />
      <path d="M124 103l2 2 4-4" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CompassHomeIllustration({className = 'h-28 w-36'}: {className?: string}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 150"
      className={className}
      fill="none">
      <circle cx="100" cy="76" r="56" fill="#E8F5F1" />
      <path d="M44 78L100 32l56 46v42c0 6-5 10-10 10H54c-5 0-10-4-10-10V78Z" fill="#FFFFFF" stroke="#0E7C66" strokeWidth="3" strokeLinejoin="round" />
      <path d="M36 80L100 28l64 52" stroke="#0E7C66" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="86" y="88" width="28" height="42" rx="6" fill="#17A589" />
      <circle cx="144" cy="42" r="14" fill="#F4A81D" />
      <rect x="58" y="84" width="18" height="18" rx="4" fill="#FEF3C7" />
    </svg>
  );
}

export function ProgressRing({
  percentage,
  color = '#0E7C66',
  trackColor = '#E2ECE7',
  centerTop,
  centerBottom,
  size = 96,
}: {
  percentage: number;
  color?: string;
  trackColor?: string;
  centerTop: string;
  centerBottom?: string;
  size?: number;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(percentage)));
  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: `conic-gradient(${color} ${pct}%, ${trackColor} ${pct}% 100%)`,
      }}
      role="img"
      aria-label={`${pct}%`}>
      <div
        className="flex flex-col items-center justify-center rounded-full bg-white text-center shadow-xs"
        style={{
          width: `${size - 18}px`,
          height: `${size - 18}px`,
        }}>
        <span className="text-sm font-extrabold leading-tight text-[#12201B] tabular-nums">
          {centerTop}
        </span>
        {centerBottom && (
          <span className="text-[11px] font-semibold leading-tight text-[#5A6B64]">
            {centerBottom}
          </span>
        )}
      </div>
    </div>
  );
}

export function ProgressBar({
  percentage,
  color = '#0E7C66',
  trackClassName = 'bg-[#E6EFEA]',
  heightClass = 'h-3',
}: {
  percentage: number;
  color?: string;
  trackClassName?: string;
  heightClass?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(percentage)));
  return (
    <div className={`w-full overflow-hidden rounded-full ${heightClass} ${trackClassName}`}>
      <div
        className={`bb-bar-fill ${heightClass} rounded-full`}
        style={{
          width: `${pct}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}
