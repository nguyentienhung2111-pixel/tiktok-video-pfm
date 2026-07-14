import { cn } from '@/lib/utils';

/**
 * Renders a preformatted scorecard value, splitting a trailing currency symbol
 * (₫ / đ) so it can be shown smaller next to the number. The value is kept on a
 * single line (whitespace-nowrap); width comes from a wider (3-column) grid.
 * `numberClassName` controls the responsive size of the number per grid density.
 */
export function ScorecardValue({
  value,
  numberClassName,
}: {
  value: string;
  numberClassName?: string;
}) {
  const match = value.match(/^(.*?)(\s*[₫đ])$/u);
  const number = match ? match[1] : value;
  const unit = match ? match[2].trim() : '';

  return (
    <p className="mt-2 flex items-baseline gap-1 whitespace-nowrap text-white">
      <span className={cn('font-black leading-tight', numberClassName ?? 'text-2xl sm:text-3xl')}>
        {number}
      </span>
      {unit && <span className="text-sm font-bold text-[#94a3b8]">{unit}</span>}
    </p>
  );
}
