import * as React from 'react';
import {cn} from '../../lib/utils';
import {ChevronDown} from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({className, children, ...props}, ref) => {
  return (
    <div className="relative">
      <select
        className={cn(
          'flex h-10 w-full appearance-none rounded-lg border border-border bg-surface px-4 py-2 pr-10 text-sm shadow-xs transition-all duration-fast cursor-pointer',
          'hover:border-border-subtle hover:bg-background',
          'focus:outline-none focus:border-primary focus:shadow-glow',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none" />
    </div>
  );
});
Select.displayName = 'Select';

export {Select};
