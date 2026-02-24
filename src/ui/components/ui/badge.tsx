import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-all duration-fast',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs',
        secondary:
          'bg-secondary text-secondary-foreground',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs',
        outline:
          'border border-border text-foreground bg-surface',
        muted:
          'bg-muted text-muted-foreground',
        // Status variants
        open:
          'bg-status-open/15 text-status-open border border-status-open/30',
        progress:
          'bg-status-progress/15 text-status-progress border border-status-progress/30',
        blocked:
          'bg-status-blocked/15 text-status-blocked border border-status-blocked/30',
        pending:
          'bg-status-pending/15 text-status-pending border border-status-pending/30',
        closed:
          'bg-status-closed/15 text-status-closed border border-status-closed/30',
        // Type variants
        epic:
          'bg-type-epic text-white shadow-xs',
        bug:
          'bg-type-bug text-white shadow-xs',
        task:
          'bg-type-task text-white shadow-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
