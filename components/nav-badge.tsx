// Numerito de notificación compartido entre bottom-nav.tsx y app-sidebar.tsx.
// No renderiza nada en 0 (a diferencia del badge fijo que tenían antes) y
// capea la vista en "9+" para no romper el layout con un número largo.
export function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
      {count > 9 ? '9+' : count}
    </span>
  )
}
