import { cn } from '@/lib/utils';

/* eslint-disable @next/next/no-img-element -- brand SVGs contain embedded raster
   data, so next/image cannot optimize them; plain <img> is intentional. */

/** Theme-aware brand logo. Shows the dark logo by default and the light logo
 *  when the app is in light mode — swapped via CSS so there's no flash. */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      <img
        src="/dark-logo.svg"
        alt="CurrentState"
        className="block h-full w-auto [html[data-theme='light']_&]:hidden"
      />
      <img
        src="/light-logo.svg"
        alt="CurrentState"
        className="hidden h-full w-auto [html[data-theme='light']_&]:block"
      />
    </span>
  );
}
