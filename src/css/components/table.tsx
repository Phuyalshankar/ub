// /src/lib/table.tsx
// 📊 Table Components - Table, Header, Row, Cell, Pagination

import React, { forwardRef, useState } from 'react';
import { ub } from '../mycss';
import { Button } from './core';

// ==================== UTILITIES ====================

const cls = (...classes: (string | undefined | false | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};

const safeUb = (classString: string): string => {
  return ub(classString);
};

// ==================== COLOR HELPERS ====================

const bgColor = (color: string, shade: number, opacity?: number): string => {
  return opacity ? `bg-${color}-${shade}/${opacity}` : `bg-${color}-${shade}`;
};

const textColor = (color: string, shade: number, opacity?: number): string => {
  return opacity ? `text-${color}-${shade}/${opacity}` : `text-${color}-${shade}`;
};

const borderColor = (color: string, shade: number, opacity?: number): string => {
  return opacity ? `border-${color}-${shade}/${opacity}` : `border-${color}-${shade}`;
};

// ==================== TYPES ====================

export type TableSize = 'sm' | 'md' | 'lg';
export type TableVariant = 'default' | 'bordered' | 'striped' | 'minimal';

// ==================== TABLE ====================

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
  variant?: TableVariant;
  size?: TableSize;
  fullWidth?: boolean;
  stickyHeader?: boolean;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(({
  children,
  variant = 'default',
  size = 'md',
  fullWidth = true,
  stickyHeader = false,
  className = '',
  ...props
}, ref) => {
  const variantClasses = {
    default: safeUb(cls('border-collapse', borderColor('gray', 100), 'border')),
    bordered: safeUb(cls('border-collapse', borderColor('gray', 100), 'border-2')),
    striped: safeUb(cls('border-collapse', '[&>tbody>tr:nth-child(odd)]:bg-gray-20')),
    minimal: 'border-collapse',
  };

  const sizeClasses = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' };

  return (
    <div className={cls(fullWidth ? 'w-full' : '', 'overflow-x-auto')}>
      <table ref={ref} className={cls(variantClasses[variant], sizeClasses[size], fullWidth ? 'w-full' : '', className)} {...props}>
        {children}
      </table>
    </div>
  );
});

Table.displayName = 'Table';

// ==================== TABLE HEADER ====================

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
  sticky?: boolean;
}

export const TableHeader = forwardRef<HTMLTableSectionElement, TableHeaderProps>(({
  children,
  sticky = false,
  className = '',
  ...props
}, ref) => {
  return <thead ref={ref} className={cls(sticky ? 'sticky top-0' : '', className)} {...props}>{children}</thead>;
});

TableHeader.displayName = 'TableHeader';

// ==================== TABLE BODY ====================

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(({
  children,
  className = '',
  ...props
}, ref) => {
  return <tbody ref={ref} className={className} {...props}>{children}</tbody>;
});

TableBody.displayName = 'TableBody';

// ==================== TABLE FOOTER ====================

export interface TableFooterProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const TableFooter = forwardRef<HTMLTableSectionElement, TableFooterProps>(({
  children,
  className = '',
  ...props
}, ref) => {
  return <tfoot ref={ref} className={cls(safeUb(cls(bgColor('gray', 20), 'font-medium')), className)} {...props}>{children}</tfoot>;
});

TableFooter.displayName = 'TableFooter';

// ==================== TABLE ROW ====================

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  hover?: boolean;
  selected?: boolean;
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(({
  children,
  hover = true,
  selected = false,
  className = '',
  ...props
}, ref) => {
  return (
    <tr
      ref={ref}
      className={cls(hover ? 'hover:bg-gray-30' : '', selected ? safeUb(bgColor('blue', 30)) : '', 'transition-colors duration-150', className)}
      {...props}
    >
      {children}
    </tr>
  );
});

TableRow.displayName = 'TableRow';

// ==================== TABLE HEADER CELL ====================

export interface TableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | false;
  onSort?: () => void;
}

export const TableHeaderCell = forwardRef<HTMLTableCellElement, TableHeaderCellProps>(({
  children,
  sortable = false,
  sorted = false,
  onSort,
  className = '',
  ...props
}, ref) => {
  return (
    <th
      ref={ref}
      className={cls(safeUb(cls('text-left font-medium p-3', bgColor('gray', 40), textColor('gray', 220), 'border-b-2', borderColor('gray', 100))), sortable ? 'cursor-pointer select-none' : '', className)}
      onClick={sortable ? onSort : undefined}
      {...props}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortable && <span className={safeUb(textColor('gray', 150))}>{sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '↕'}</span>}
      </div>
    </th>
  );
});

TableHeaderCell.displayName = 'TableHeaderCell';

// ==================== TABLE CELL ====================

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(({
  children,
  className = '',
  ...props
}, ref) => {
  return <td ref={ref} className={cls('p-3 border-b', safeUb(borderColor('gray', 80)), className)} {...props}>{children}</td>;
});

TableCell.displayName = 'TableCell';

// ==================== TABLE PAGINATION ====================

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  totalItems?: number;
  showPageSize?: boolean;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  totalItems,
  showPageSize = false,
  pageSizeOptions = [10, 25, 50, 100],
  onPageSizeChange,
}) => {
  return (
    <div className={safeUb(cls('flex items-center justify-between mt-4', textColor('gray', 200)))}>
      <div className="flex items-center gap-2">
        {showPageSize && onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className={safeUb(cls('p-1 border rounded-1', borderColor('gray', 150), bgColor('gray', 0)))}
          >
            {pageSizeOptions.map(size => <option key={size} value={size}>{size} per page</option>)}
          </select>
        )}
        {totalItems !== undefined && <span className="text-sm">Total: {totalItems} items</span>}
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
          Previous
        </Button>
        <span className="text-sm">Page {currentPage} of {totalPages}</span>
        <Button size="sm" variant="ghost" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
          Next
        </Button>
      </div>
    </div>
  );
};

TablePagination.displayName = 'TablePagination';

// ==================== TABLE TOOLBAR ====================

export interface TableToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({ children, className = '' }) => {
  return <div className={cls('flex items-center justify-between p-4 border-b', safeUb(borderColor('gray', 100)), className)}>{children}</div>;
};

TableToolbar.displayName = 'TableToolbar';

// ==================== TABLE SORTING HOOK ====================

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export const useTableSort = <T,>(initialSort?: SortConfig) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(initialSort || null);

  const requestSort = (key: string) => {
    setSortConfig((current) => {
      if (current && current.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortedData = (data: T[], compareFn?: (a: T, b: T, config: SortConfig) => number) => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      if (compareFn) return compareFn(a, b, sortConfig);

      const aValue = (a as any)[sortConfig.key];
      const bValue = (b as any)[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  return { sortConfig, requestSort, getSortedData };
};