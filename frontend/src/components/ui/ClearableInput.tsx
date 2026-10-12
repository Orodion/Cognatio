import * as React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Input, type InputProps } from './Input';

export interface ClearableInputProps extends InputProps {
  onClear: () => void;
  /** Additional elements on the right inside the field (e.g. calendar button) */
  trailing?: React.ReactNode;
}

/** Input field that shows an X to clear it on mouse-over/focus. */
export const ClearableInput = React.forwardRef<HTMLInputElement, ClearableInputProps>(({ className, onClear, trailing, value, disabled, ...props }, ref) => {
  const { t } = useTranslation();
  const hasValue = value !== undefined && value !== null && String(value) !== '';

  return (
    <div className="group relative">
      <Input ref={ref} value={value} disabled={disabled} className={cn(trailing ? 'pr-16' : 'pr-9', className)} {...props} />
      <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
        {hasValue && !disabled && (
          <button
            type="button"
            onClick={onClear}
            aria-label={t('common.clear')}
            title={t('common.clear')}
            className="rounded-sm p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {trailing}
      </div>
    </div>
  );
});
ClearableInput.displayName = 'ClearableInput';
