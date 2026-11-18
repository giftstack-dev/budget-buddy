import type {ReactNode} from 'react';

export type IconName =
  | 'utensils'
  | 'bus'
  | 'smartphone'
  | 'home'
  | 'zap'
  | 'users'
  | 'coffee'
  | 'film'
  | 'sparkles'
  | 'shirt'
  | 'gift'
  | 'heart-pulse'
  | 'piggy-bank'
  | 'wallet'
  | 'calendar'
  | 'shield-check'
  | 'check'
  | 'check-circle'
  | 'alert-triangle'
  | 'heart'
  | 'plus'
  | 'trash'
  | 'log-out'
  | 'arrow-right'
  | 'arrow-left'
  | 'help-circle'
  | 'layout-dashboard'
  | 'receipt'
  | 'file-spreadsheet'
  | 'message-square'
  | 'more-horizontal'
  | 'chevron-down'
  | 'x';

export function SvgSprite() {
  return (
    <svg aria-hidden="true" className="hidden" width="0" height="0">
      <defs>
        <symbol id="icon-utensils" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
        </symbol>

        <symbol id="icon-bus" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 6v6" />
          <path d="M15 6v6" />
          <path d="M2 12h19.6" />
          <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" />
          <circle cx="7" cy="18" r="2" />
          <path d="M9 18h5" />
          <circle cx="16" cy="18" r="2" />
        </symbol>

        <symbol id="icon-smartphone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
          <path d="M12 18h.01" />
        </symbol>

        <symbol id="icon-home" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </symbol>

        <symbol id="icon-zap" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </symbol>

        <symbol id="icon-users" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </symbol>

        <symbol id="icon-coffee" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
          <line x1="6" x2="6" y1="2" y2="4" />
          <line x1="10" x2="10" y1="2" y2="4" />
          <line x1="14" x2="14" y1="2" y2="4" />
        </symbol>

        <symbol id="icon-film" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M7 3v18" />
          <path d="M3 7.5h4" />
          <path d="M3 12h18" />
          <path d="M3 16.5h4" />
          <path d="M17 3v18" />
          <path d="M17 7.5h4" />
          <path d="M17 16.5h4" />
        </symbol>

        <symbol id="icon-sparkles" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
          <path d="M5 3v4" />
          <path d="M19 17v4" />
          <path d="M3 5h4" />
          <path d="M17 19h4" />
        </symbol>

        <symbol id="icon-shirt" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23Z" />
        </symbol>

        <symbol id="icon-gift" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="8" width="18" height="4" rx="1" />
          <path d="M12 8v13" />
          <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
          <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
        </symbol>

        <symbol id="icon-heart-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
        </symbol>

        <symbol id="icon-piggy-bank" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" />
          <path d="M2 9v1c0 1.1.9 2 2 2h1" />
          <path d="M16 11h.01" />
        </symbol>

        <symbol id="icon-wallet" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </symbol>

        <symbol id="icon-calendar" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </symbol>

        <symbol id="icon-shield-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <path d="m9 12 2 2 4-4" />
        </symbol>

        <symbol id="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </symbol>

        <symbol id="icon-check-circle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </symbol>

        <symbol id="icon-alert-triangle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" x2="12" y1="9" y2="13" />
          <line x1="12" x2="12.01" y1="17" y2="17" />
        </symbol>

        <symbol id="icon-heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </symbol>

        <symbol id="icon-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" x2="12" y1="5" y2="19" />
          <line x1="5" x2="19" y1="12" y2="12" />
        </symbol>

        <symbol id="icon-trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </symbol>

        <symbol id="icon-log-out" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" x2="9" y1="12" y2="12" />
        </symbol>

        <symbol id="icon-arrow-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" x2="19" y1="12" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </symbol>

        <symbol id="icon-arrow-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" x2="5" y1="12" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </symbol>

        <symbol id="icon-help-circle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" x2="12.01" y1="17" y2="17" />
        </symbol>

        <symbol id="icon-layout-dashboard" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </symbol>

        <symbol id="icon-receipt" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
          <path d="M8 7h8" />
          <path d="M8 12h8" />
          <path d="M8 17h5" />
        </symbol>

        <symbol id="icon-file-spreadsheet" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M8 13h2" />
          <path d="M14 13h2" />
          <path d="M8 17h2" />
          <path d="M14 17h2" />
        </symbol>

        <symbol id="icon-message-square" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </symbol>

        <symbol id="icon-more-horizontal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </symbol>

        <symbol id="icon-chevron-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </symbol>

        <symbol id="icon-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" x2="6" y1="6" y2="18" />
          <line x1="6" x2="18" y1="6" y2="18" />
        </symbol>
      </defs>
    </svg>
  );
}

export function Icon({name, className = 'h-5 w-5'}: {name: IconName; className?: string}) {
  return (
    <svg aria-hidden="true" className={`shrink-0 ${className}`}>
      <use href={`#icon-${name}`} />
    </svg>
  );
}

export interface CategoryStyle {
  icon: IconName;
  circleBg: string;
  iconColor: string;
  barColor: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  food: {
    icon: 'utensils',
    circleBg: 'bg-[#FFF1E6]',
    iconColor: 'text-[#C2410C]',
    barColor: '#EA580C',
  },
  transport: {
    icon: 'bus',
    circleBg: 'bg-[#EBF3FF]',
    iconColor: 'text-[#1D4ED8]',
    barColor: '#2563EB',
  },
  data_airtime: {
    icon: 'smartphone',
    circleBg: 'bg-[#F3EEFF]',
    iconColor: 'text-[#6D28D9]',
    barColor: '#7C3AED',
  },
  rent: {
    icon: 'home',
    circleBg: 'bg-[#E6F7F5]',
    iconColor: 'text-[#0F766E]',
    barColor: '#0D9488',
  },
  household: {
    icon: 'home',
    circleBg: 'bg-[#E6F7F5]',
    iconColor: 'text-[#0F766E]',
    barColor: '#0D9488',
  },
  utilities: {
    icon: 'zap',
    circleBg: 'bg-[#FEF9C3]',
    iconColor: 'text-[#A16207]',
    barColor: '#CA8A04',
  },
  family_support: {
    icon: 'users',
    circleBg: 'bg-[#FCE7F3]',
    iconColor: 'text-[#BE185D]',
    barColor: '#DB2777',
  },
  eating_out: {
    icon: 'coffee',
    circleBg: 'bg-[#FEE2E2]',
    iconColor: 'text-[#B91C1C]',
    barColor: '#DC2626',
  },
  entertainment: {
    icon: 'film',
    circleBg: 'bg-[#EDE9FE]',
    iconColor: 'text-[#6D28D9]',
    barColor: '#7C3AED',
  },
  personal_care: {
    icon: 'sparkles',
    circleBg: 'bg-[#D1FAE5]',
    iconColor: 'text-[#047857]',
    barColor: '#059669',
  },
  clothing_shopping: {
    icon: 'shirt',
    circleBg: 'bg-[#E0E7FF]',
    iconColor: 'text-[#3730A3]',
    barColor: '#4F46E5',
  },
  gifts: {
    icon: 'gift',
    circleBg: 'bg-[#FFE4E6]',
    iconColor: 'text-[#BE123C]',
    barColor: '#E11D48',
  },
  giving: {
    icon: 'gift',
    circleBg: 'bg-[#FFE4E6]',
    iconColor: 'text-[#BE123C]',
    barColor: '#E11D48',
  },
  health: {
    icon: 'heart-pulse',
    circleBg: 'bg-[#DCFCE7]',
    iconColor: 'text-[#15803D]',
    barColor: '#16A34A',
  },
  savings: {
    icon: 'piggy-bank',
    circleBg: 'bg-[#FEF3C7]',
    iconColor: 'text-[#B45309]',
    barColor: '#D97706',
  },
  emergency_fund: {
    icon: 'piggy-bank',
    circleBg: 'bg-[#FEF3C7]',
    iconColor: 'text-[#B45309]',
    barColor: '#D97706',
  },
  festive_fund: {
    icon: 'piggy-bank',
    circleBg: 'bg-[#FEF3C7]',
    iconColor: 'text-[#B45309]',
    barColor: '#D97706',
  },
  goal: {
    icon: 'piggy-bank',
    circleBg: 'bg-[#FEF3C7]',
    iconColor: 'text-[#B45309]',
    barColor: '#D97706',
  },
  school_fees: {
    icon: 'calendar',
    circleBg: 'bg-[#EBF3FF]',
    iconColor: 'text-[#1D4ED8]',
    barColor: '#2563EB',
  },
  debt_payments: {
    icon: 'wallet',
    circleBg: 'bg-[#FEE2E2]',
    iconColor: 'text-[#B91C1C]',
    barColor: '#DC2626',
  },
  insurance_subscriptions: {
    icon: 'shield-check',
    circleBg: 'bg-[#F3EEFF]',
    iconColor: 'text-[#6D28D9]',
    barColor: '#7C3AED',
  },
  buffer: {
    icon: 'shield-check',
    circleBg: 'bg-[#E8F5F1]',
    iconColor: 'text-[#0A5A4A]',
    barColor: '#0E7C66',
  },
  no_spend: {
    icon: 'check-circle',
    circleBg: 'bg-[#DCFCE7]',
    iconColor: 'text-[#15803D]',
    barColor: '#16A34A',
  },
  other: {
    icon: 'wallet',
    circleBg: 'bg-[#F1F5F9]',
    iconColor: 'text-[#334155]',
    barColor: '#475569',
  },
};

export function getCategoryStyle(category: string): CategoryStyle {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.other;
}

export function CategoryCircle({
  category,
  size = 'md',
}: {
  category: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const st = getCategoryStyle(category);
  const dims =
    size === 'sm' ? 'h-9 w-9' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
  const iconDims =
    size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${dims} ${st.circleBg} ${st.iconColor}`}>
      <Icon name={st.icon} className={iconDims} />
    </span>
  );
}

export function TermHelp({title = "What's this?", children}: {title?: string; children: ReactNode}) {
  return (
    <details className="mt-2 rounded-2xl border border-[#DCE8E2] bg-[#F6FBF8] px-4 py-2.5 text-sm text-[#31443D]">
      <summary className="flex min-h-[36px] cursor-pointer list-none items-center gap-2 font-semibold text-[#0A5A4A]">
        <Icon name="help-circle" className="h-4 w-4 text-[#0E7C66]" />
        <span>{title}</span>
      </summary>
      <p className="mt-2 leading-relaxed text-[#31443D]">{children}</p>
    </details>
  );
}
