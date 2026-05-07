/**
 * Unified Theme Configuration
 * Single source of truth for all colors, spacing, typography
 */

export const THEME = {
  // Primary Colors - Cobalt-based
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    // Neutrals
    neutral: {
      white: '#ffffff',
      50: '#fafafa',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    // Semantic colors
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
    },
    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
    info: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
    },
    // Gradients
    gradient: {
      primary: 'from-indigo-600 to-indigo-700',
      success: 'from-green-500 to-green-600',
      warning: 'from-amber-500 to-amber-600',
      danger: 'from-red-600 to-red-700',
    },
  },

  // Spacing scale
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '2.5rem',
    '3xl': '3rem',
    '4xl': '4rem',
  },

  // Border radius
  radius: {
    none: '0',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },

  // Typography
  typography: {
    h1: 'text-4xl font-extrabold leading-tight tracking-tight',
    h2: 'text-3xl font-bold leading-tight tracking-tight',
    h3: 'text-2xl font-bold leading-snug tracking-tight',
    h4: 'text-xl font-bold leading-snug',
    h5: 'text-lg font-semibold',
    h6: 'text-base font-semibold',

    body: 'text-sm leading-relaxed',
    bodySm: 'text-xs leading-relaxed',
    label: 'text-sm font-medium',
    labelSm: 'text-xs font-medium uppercase tracking-wider',
    caption: 'text-xs text-gray-600',
  },

  // Shadows
  shadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  },

  // Transitions
  transition: {
    fast: 'transition-all duration-150',
    base: 'transition-all duration-200',
    slow: 'transition-all duration-300',
  },

  // Z-index scale
  zIndex: {
    dropdown: '10',
    sticky: '20',
    fixed: '30',
    modalBackdrop: '40',
    modal: '50',
    popover: '60',
    tooltip: '70',
  },

  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Component-specific values
  component: {
    card: {
      backgroundColor: 'bg-white',
      border: 'border border-slate-200/80',
      borderRadius: 'rounded-2xl',
      padding: 'p-5 sm:p-6',
      shadow: 'shadow-[0_8px_20px_-16px_rgba(15,23,42,0.32)]',
      hover: 'hover:border-slate-300/80 hover:shadow-[0_16px_28px_-20px_rgba(15,23,42,0.4)]',
      transition: 'transition-[box-shadow,border-color,background-color] duration-200',
    },
    button: {
      borderRadius: 'rounded-xl',
      fontWeight: 'font-semibold',
      transition: 'transition-all',
      focus: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    },
    input: {
      borderRadius: 'rounded-xl',
      border: 'border border-slate-300',
      padding: 'px-4 py-2.5',
      fontSize: 'text-sm',
      focus: 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    },
    modal: {
      borderRadius: 'rounded-2xl',
      maxWidth: 'max-w-2xl',
      shadow: 'shadow-2xl',
    },
    sidebar: {
      width: 'w-64',
      collapsedWidth: 'w-20',
      backgroundColor: 'bg-white/95 backdrop-blur-xl',
      border: 'border-r border-slate-200/80',
      borderTop: 'border-t border-slate-200/80',
      borderBottom: 'border-b border-slate-200/80',
      shadow: 'shadow-[0_8px_24px_-16px_rgba(15,23,42,0.3)]',
    },
    table: {
      headerBg: 'bg-slate-50/80',
      headerBorder: 'border-b border-slate-200/80',
      headerText: 'text-slate-600 uppercase tracking-[0.06em] text-xs font-semibold',
      bodyBorder: 'divide-y divide-slate-100',
      rowHover: 'hover:bg-slate-50/65',
      cellPadding: 'px-4 sm:px-6 py-3.5',
    },
    badge: {
      borderRadius: 'rounded-full',
      padding: 'px-3 py-1',
      fontSize: 'text-xs font-medium',
    },
  },
};

/**
 * Color variants for stat cards
 */
export const STAT_CARD_COLORS = {
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'text-indigo-600',
    border: 'border-indigo-100',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    border: 'border-green-100',
  },
  yellow: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    border: 'border-amber-100',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'text-orange-600',
    border: 'border-orange-100',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    border: 'border-red-100',
  },
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    border: 'border-blue-100',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    border: 'border-purple-100',
  },
  pink: {
    bg: 'bg-pink-50',
    icon: 'text-pink-600',
    border: 'border-pink-100',
  },
};

/**
 * Button variant styles
 */
export const BUTTON_VARIANTS = {
  primary: {
    base: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow',
    disabled: 'disabled:bg-indigo-400 disabled:cursor-not-allowed disabled:shadow-none',
  },
  secondary: {
    base: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm',
    disabled: 'disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50',
  },
  danger: {
    base: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow',
    disabled: 'disabled:bg-red-400 disabled:cursor-not-allowed disabled:shadow-none',
  },
  success: {
    base: 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow',
    disabled: 'disabled:bg-green-400 disabled:cursor-not-allowed disabled:shadow-none',
  },
  outline: {
    base: 'border border-indigo-600 text-indigo-600 hover:bg-indigo-50',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
  },
  ghost: {
    base: 'text-gray-700 hover:bg-gray-100',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
  },
};

/**
 * Status badge colors
 */
export const STATUS_BADGES = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  pending: 'bg-gray-100 text-gray-800',
  active: 'bg-indigo-100 text-indigo-800',
};

/**
 * Utility function to merge theme classes
 */
export function mergeThemeClasses(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Export for use in components
 */
export default THEME;
