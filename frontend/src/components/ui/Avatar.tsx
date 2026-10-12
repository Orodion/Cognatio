import { useState } from 'react';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/platform';

interface AvatarProps {
  initials: string;
  /** Profile picture; falls back to the initials if it is missing or cannot be loaded */
  imageUrl?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-16 w-16 text-lg',
  lg: 'h-24 w-24 text-2xl',
};

export function Avatar({ initials, imageUrl, className, size = 'md' }: AvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = !!imageUrl && failedUrl !== imageUrl;

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-semibold text-primary',
        sizeClasses[size],
        className,
      )}
      aria-hidden
    >
      {showImage ? (
        <img src={apiUrl(imageUrl)} alt="" className="h-full w-full object-cover" loading="lazy" onError={() => setFailedUrl(imageUrl)} />
      ) : (
        initials
      )}
    </div>
  );
}
