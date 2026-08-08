import { cn } from '@/lib/utils'
import { initials } from '@/lib/format'
import type { Member } from '@/lib/types'

const SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
}

export function PersonAvatar({
  member,
  size = 'md',
  className,
  ring = false,
}: {
  member: Pick<Member, 'name' | 'color'>
  size?: keyof typeof SIZES
  className?: string
  ring?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold text-white shadow-sm',
        SIZES[size],
        ring && 'ring-2 ring-card',
        className,
      )}
      style={{ backgroundColor: `var(--${member.color})` }}
      aria-hidden="true"
    >
      {initials(member.name)}
    </span>
  )
}

export function AvatarStack({
  members,
  size = 'sm',
  max = 4,
}: {
  members: Pick<Member, 'name' | 'color'>[]
  size?: keyof typeof SIZES
  max?: number
}) {
  const shown = members.slice(0, max)
  const rest = members.length - shown.length
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((m, i) => (
        <PersonAvatar key={i} member={m} size={size} ring />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ring-2 ring-card',
            SIZES[size],
          )}
        >
          +{rest}
        </span>
      )}
    </div>
  )
}
