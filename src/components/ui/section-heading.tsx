import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface SectionHeadingProps {
  level?: 'page' | 'section' | 'subsection';
  children: ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'span';
}

const levelClasses: Record<NonNullable<SectionHeadingProps['level']>, string> = {
  page: 'text-2xl font-bold tracking-tight text-foreground',
  section: 'text-lg font-semibold text-foreground',
  subsection: 'text-sm font-semibold uppercase tracking-wide text-muted-foreground',
};

const defaultTag: Record<NonNullable<SectionHeadingProps['level']>, SectionHeadingProps['as']> = {
  page: 'h1',
  section: 'h2',
  subsection: 'h3',
};

export function SectionHeading({
  level = 'section',
  children,
  className,
  as,
}: SectionHeadingProps) {
  const Tag = as ?? defaultTag[level] ?? 'h2';
  return <Tag className={cn(levelClasses[level], className)}>{children}</Tag>;
}
