import { Badge } from '@/components/ui/badge';
import { CLASSIFICATION_META } from '@/lib/classification';
import type { Classification } from '@/types';
import { cn } from '@/lib/utils';

export function ClassificationBadge({
  classification,
  className,
}: {
  classification: Classification;
  className?: string;
}) {
  const meta = CLASSIFICATION_META[classification];
  return (
    <Badge className={cn('capitalize', className)} classification={classification}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </Badge>
  );
}
