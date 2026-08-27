import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Logo } from '@/components/brand'

export const metadata = {
  title: 'Nido — Las cuentas de tu casa, sin planillas',
  description:
    'Gastos compartidos con división 1/N, objetivos de ahorro en común y tus finanzas personales, todo en un solo lugar.',
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        {/* --- nav --- */}
        <header className="flex items-center justify-between py-6">
          <Logo />
          <Link
            href="/ingresar"
            className="text-sm font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Ya tengo cuenta
          </Link>
        </header>

        {/* --- hero --- */}
        <section className="grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <h1 className="text-balance text-[2.5rem] font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Lo tuyo, lo suyo,
              <br />
              y lo de los dos.
            </h1>
            <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
              Nido junta los gastos compartidos de tu casa, los objetivos de
              ahorro en común y tus finanzas personales — sin planillas, sin
              números perdidos en el chat.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/ingresar?modo=registro"
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-transform active:translate-y-px"
              >
                Crear mi cuenta
                <ArrowRight className="size-[18px]" />
              </Link>
              <Link
                href="#como-funciona"
                className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Ver cómo funciona
              </Link>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Cada gasto en su moneda — pesos, dólares, lo que sea. Gratis para empezar.
            </p>
          </div>

          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700 flex justify-center lg:justify-end">
            <NestMark className="h-[220px] w-[260px] sm:h-[280px] sm:w-[330px]" />
          </div>
        </section>

        {/* --- settlement demo --- */}
        <section id="como-funciona" className="scroll-mt-8 py-10 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Así se saldan las cuentas
          </p>
          <h2 className="mt-2 max-w-lg text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            Nido calcula quién le debe a quién, con el mínimo de pagos posible.
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <SettlementDemo />
            <ExpenseDemo />
          </div>
        </section>

        {/* --- features --- */}
        <section className="py-10 sm:py-16">
          <div className="grid gap-4 sm:grid-cols-3">
            <FeatureCard
              eyebrow="Gastos compartidos"
              title="División 1/N automática"
              detail="Cargás el gasto, Nido lo reparte entre quienes viven en la casa."
              swatch="var(--person-1)"
            />
            <FeatureCard
              eyebrow="Objetivos en común"
              title="Ahorren para algo juntos"
              detail="Un pozo compartido con meta y fecha, con el aporte de cada uno a la vista."
              swatch="var(--person-4)"
            />
            <FeatureCard
              eyebrow="Ahorros personales"
              title="Lo tuyo, aparte"
              detail="Tus gastos y tus ahorros personales no se mezclan con los del hogar."
              swatch="var(--person-2)"
            />
          </div>
        </section>

        {/* --- final CTA --- */}
        <section className="py-14 text-center sm:py-20">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Armá tu Nido hoy.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-pretty text-muted-foreground">
            Invitás a tu pareja o roommates cuando quieras. Empezar es gratis.
          </p>
          <Link
            href="/ingresar?modo=registro"
            className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-transform active:translate-y-px"
          >
            Crear mi cuenta
            <ArrowRight className="size-[18px]" />
          </Link>
        </section>

        {/* --- footer --- */}
        <footer className="flex flex-col items-center gap-3 border-t border-border py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <Logo className="opacity-70" />
          <p>© {new Date().getFullYear()} Nido</p>
          <Link href="/ingresar" className="font-medium text-foreground hover:underline">
            Ya tengo cuenta
          </Link>
        </footer>
      </div>
    </div>
  )
}

// Two overlapping circles — one per person, in the same palette the app
// uses for member avatars — meeting in a shared middle rendered in the
// brand's primary green. The literal shape of "your money, their money,
// and what you build together."
function NestMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 340 280" className={className} role="img" aria-label="Dos círculos superpuestos representando finanzas compartidas">
      <defs>
        <clipPath id="nido-lens-clip">
          <circle cx="130" cy="140" r="108" />
        </clipPath>
      </defs>
      <circle cx="130" cy="140" r="108" fill="var(--person-1)" fillOpacity="0.85" />
      <circle cx="210" cy="140" r="108" fill="var(--person-2)" fillOpacity="0.85" />
      <circle cx="210" cy="140" r="108" fill="var(--primary)" clipPath="url(#nido-lens-clip)" />
    </svg>
  )
}

function SettlementDemo() {
  return (
    <div className="flex flex-col justify-center rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <Avatar initial="M" color="var(--person-1)" />
        <div className="flex-1 border-t border-dashed border-border" />
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        <div className="flex-1 border-t border-dashed border-border" />
        <Avatar initial="T" color="var(--person-2)" />
      </div>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Mica</span> le debe{' '}
        <span className="font-semibold text-primary">$U 1.850</span> a{' '}
        <span className="font-semibold text-foreground">Tomi</span>
      </p>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        className="mt-4 w-full rounded-2xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Registrar pago
      </button>
    </div>
  )
}

function ExpenseDemo() {
  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Supermercado del mes
      </p>
      <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">$U 4.200</p>
      <div className="mt-4 flex items-center gap-2">
        <div className="flex -space-x-2">
          <Avatar initial="M" color="var(--person-1)" size="sm" ring />
          <Avatar initial="T" color="var(--person-2)" size="sm" ring />
        </div>
        <p className="text-sm text-muted-foreground">dividido 1/2 · $U 2.100 c/u</p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 rounded-full bg-primary" />
      </div>
    </div>
  )
}

function Avatar({
  initial,
  color,
  size = 'md',
  ring = false,
}: {
  initial: string
  color: string
  size?: 'sm' | 'md'
  ring?: boolean
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${
        size === 'sm' ? 'size-8 text-xs' : 'size-11 text-sm'
      } ${ring ? 'ring-2 ring-card' : ''}`}
      style={{ backgroundColor: color }}
    >
      {initial}
    </span>
  )
}

function FeatureCard({
  eyebrow,
  title,
  detail,
  swatch,
}: {
  eyebrow: string
  title: string
  detail: string
  swatch: string
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <span
        className="inline-block size-2.5 rounded-full"
        style={{ backgroundColor: swatch }}
        aria-hidden
      />
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {eyebrow}
      </p>
      <h3 className="mt-1.5 text-lg font-bold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  )
}
