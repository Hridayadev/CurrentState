import { cn } from '@/lib/utils';

export interface AvatarProps {
  emoji: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  xs: 'h-6 w-6 text-sm',
  sm: 'h-8 w-8 text-base',
  md: 'h-10 w-10 text-lg',
  lg: 'h-14 w-14 text-2xl',
  xl: 'h-20 w-20 text-4xl',
};

export function Avatar({ emoji, size = 'md', className }: AvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full border border-current/25 bg-gradient-to-b from-slate-700/50 to-slate-800/60 select-none',
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {emoji}
    </span>
  );
}
