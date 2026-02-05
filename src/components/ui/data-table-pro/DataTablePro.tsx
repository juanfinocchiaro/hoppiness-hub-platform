import { cn } from '@/lib/utils';
import { Table, TableHeader } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton, TableEmpty, TableError } from './TableStates';
import { DataToolbar } from './DataToolbar';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface DataTableProProps {
  title?: string;
  columns: number;
  header: ReactNode;
  children: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  onRetry?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  emptyProps?: EmptyProps;
  asCard?: boolean;
  className?: string;
}

/**
 * Tabla avanzada con estados de loading/error/empty integrados.
 */
export function DataTablePro({
  title,
  columns,
  header,
  children,
  isLoading = false,
  isError = false,
  isEmpty = false,
  onRetry,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
  actions,
  emptyProps,
  asCard = false,
  className,
}: DataTableProProps) {
  const showToolbar = onSearchChange || filters || actions;

  const tableContent = (
    <>
      {showToolbar && (
        <DataToolbar
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          filters={filters}
          actions={actions}
        />
      )}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>{header}</TableHeader>
          {isLoading ? (
            <TableSkeleton columns={columns} />
          ) : isError ? (
            <TableError columns={columns} onRetry={onRetry} />
          ) : isEmpty ? (
            <TableEmpty
              columns={columns}
              icon={emptyProps?.icon}
              title={emptyProps?.title}
              description={emptyProps?.description}
              action={emptyProps?.action}
            />
          ) : (
            children
          )}
        </Table>
      </div>
    </>
  );

  if (asCard) {
    return (
      <Card className={cn(className)}>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className={title ? '' : 'pt-6'}>
          {tableContent}
        </CardContent>
      </Card>
    );
  }

  return <div className={cn(className)}>{tableContent}</div>;
}
