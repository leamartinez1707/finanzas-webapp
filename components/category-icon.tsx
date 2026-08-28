import { cn } from '@/lib/utils'
import { CATEGORIES } from '@/lib/categories'
import type { CategoryId } from '@/lib/types'

const SIZES = {
  sm: 'size-8 [&_svg]:size-4',
  md: 'size-10 [&_svg]:size-4.5',
  lg: 'size-12 [&_svg]:size-5',
}

export function CategoryIcon({
  category,
  size = 'md',
  className,
}: {
  category: CategoryId
  size?: keyof typeof SIZES
  className?: string
}) {
  const c = CATEGORIES[category]
  const Icon = c.icon
  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-xl', SIZES[size], className)}
      style={{ backgroundColor: `color-mix(in oklch, ${c.color} 16%, transparent)`, color: c.color }}
    >
      <Icon strokeWidth={2.25} />
    </span>
  )
}
