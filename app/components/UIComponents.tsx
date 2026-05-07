import { ReactNode, memo } from "react";
import { LucideIcon } from "lucide-react";
import { STAT_CARD_COLORS, THEME, mergeThemeClasses } from "@/app/lib/theme";

interface CardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: keyof typeof STAT_CARD_COLORS;
  trend?: { value: number; isPositive: boolean };
}

export const StatCard = memo(function StatCard({ title, value, icon: Icon, color = "indigo", trend }: CardProps) {
  const colors = STAT_CARD_COLORS[color] || STAT_CARD_COLORS.indigo;

  return (
    <div className={mergeThemeClasses(
      "group",
      THEME.component.card.backgroundColor,
      THEME.component.card.border,
      THEME.component.card.borderRadius,
      THEME.component.card.padding,
      THEME.component.card.shadow,
      THEME.component.card.hover,
      THEME.component.card.transition
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-slate-600 text-sm font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-slate-900 mb-2">{value}</p>
          {trend && (
            <p className={`text-sm font-medium flex items-center gap-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-gray-500 font-normal">vs last period</span>
            </p>
          )}
        </div>
        <div className={`${colors.bg} ${THEME.component.card.borderRadius} p-3 border border-white/70 shadow-inner transition-colors duration-200 group-hover:bg-white`}>
          <Icon className={colors.icon} size={24} />
        </div>
      </div>
    </div>
  );
});

interface Column {
  header: string;
  accessor: string;
  render?: (value: any, row?: any) => React.ReactNode;
}

interface DataTableProps {
  headers?: string[];
  data: any[] | any[][];
  columns?: Column[];
  onRowClick?: (rowIndex: number) => void;
}

export const DataTable = memo(function DataTable({ headers, data, columns, onRowClick }: DataTableProps) {
  // Support both old array format and new column format
  const isColumnsFormat = columns && columns.length > 0;

  return (
    <div className={mergeThemeClasses(
      THEME.component.card.backgroundColor,
      THEME.component.card.border,
      THEME.component.card.borderRadius,
      "overflow-hidden"
    )}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={mergeThemeClasses(
            THEME.component.table.headerBg,
            THEME.component.table.headerBorder
          )}>
            <tr>
              {isColumnsFormat ? (
                columns.map((col, index) => (
                  <th
                    key={index}
                    className={mergeThemeClasses(
                      THEME.component.table.cellPadding,
                      THEME.component.table.headerText,
                      "text-left"
                    )}
                  >
                    {col.header}
                  </th>
                ))
              ) : (
                headers?.map((header, index) => (
                  <th
                    key={index}
                    className={mergeThemeClasses(
                      THEME.component.table.cellPadding,
                      THEME.component.table.headerText,
                      "text-left"
                    )}
                  >
                    {header}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody className={THEME.component.table.bodyBorder}>
            {isColumnsFormat ? (
              (data as any[]).map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  onClick={() => onRowClick && onRowClick(rowIndex)}
                  className={mergeThemeClasses(
                    onRowClick ? "cursor-pointer" : "",
                    THEME.component.table.rowHover,
                    THEME.transition.base
                  )}
                >
                  {columns!.map((col, cellIndex) => (
                    <td key={cellIndex} className={mergeThemeClasses(
                      THEME.component.table.cellPadding,
                      "whitespace-nowrap text-sm text-gray-900"
                    )}>
                      {col.render ? col.render(row[col.accessor], row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              (data as any[][]).map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  onClick={() => onRowClick && onRowClick(rowIndex)}
                  className={mergeThemeClasses(
                    onRowClick ? "cursor-pointer" : "",
                    THEME.component.table.rowHover,
                    THEME.transition.base
                  )}
                >
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className={mergeThemeClasses(
                      THEME.component.table.cellPadding,
                      "whitespace-nowrap text-sm text-gray-900"
                    )}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export const Modal = memo(function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-slate-200/80 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[0_24px_80px_-32px_rgba(2,6,23,0.6)]">
        <div className="border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
});

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Button = memo(function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled = false,
  fullWidth = false,
  size = "md",
  className = "",
}: ButtonProps) {
  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white border border-blue-700/70 shadow-[0_8px_16px_-12px_rgba(37,99,235,0.85)] hover:shadow-[0_14px_24px_-16px_rgba(29,78,216,0.85)]",
    secondary: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-[0_8px_16px_-14px_rgba(15,23,42,0.55)] hover:border-slate-400",
    danger: "bg-red-600 hover:bg-red-700 text-white border border-red-700/70 shadow-[0_8px_16px_-12px_rgba(220,38,38,0.8)] hover:shadow-[0_14px_24px_-16px_rgba(185,28,28,0.8)]",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={mergeThemeClasses(
        variantClasses[variant as keyof typeof variantClasses] || variantClasses.primary,
        sizeClasses[size],
        fullWidth ? "w-full" : "",
        className,
        "rounded-xl font-semibold transition-[background-color,border-color,box-shadow,color] duration-200",
        "active:scale-[0.995]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-inherit",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      )}
    >
      {children}
    </button>
  );
});

interface InputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
}

export const Input = memo(function Input({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
}: InputProps) {
  return (
    <div>
      <label className={mergeThemeClasses(
        THEME.typography.label,
        "mb-2 block"
      )}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
      />
    </div>
  );
});

interface SelectProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}

export const Select = memo(function Select({
  label,
  value,
  onChange,
  options,
  required = false,
}: SelectProps) {
  return (
    <div>
      <label className={mergeThemeClasses(
        THEME.typography.label,
        "mb-2 block"
      )}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm bg-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
});

export const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200"></div>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent absolute top-0 left-0"></div>
      </div>
    </div>
  );
});

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export const PageHeader = memo(function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className={mergeThemeClasses(
      THEME.component.card.backgroundColor,
      THEME.component.card.border,
      "border-b px-4 sm:px-6 py-5 sm:py-6 backdrop-blur supports-backdrop-filter:bg-white/95"
    )}>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {action && <div className="w-full sm:w-auto">{action}</div>}
      </div>
    </div>
  );
});
