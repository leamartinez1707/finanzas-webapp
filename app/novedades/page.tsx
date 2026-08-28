import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Header from '@/components/global/Header'
import Footer from '@/components/global/Footer'
import { blogPosts, formatPostDate } from '@/lib/blog-posts'

export const metadata = {
  title: 'Novedades — Nido',
  description: 'Lo último que sumamos a Nido, contado a medida que va saliendo.',
}

// Unguarded, same as app/page.tsx — publicly browsable, no route group.
export default function NovedadesPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <Header entryHref="/ingresar" entryLabel="Ya tengo cuenta" showNovedadesLink={false} />

        <section className="py-10 sm:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Nido
          </Link>
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-primary">
            Novedades
          </p>
          <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Lo último que sumamos a Nido.
          </h1>
          <p className="mt-3 max-w-lg text-pretty text-muted-foreground">
            Cada vez que agregamos algo nuevo, lo contamos acá.
          </p>

          <div className="mt-10 space-y-4">
            {blogPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/novedades/${post.slug}`}
                className="group block rounded-3xl border border-border bg-card p-6 transition-colors hover:bg-muted/50"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {formatPostDate(post.date)}
                </p>
                <h2 className="mt-1.5 text-lg font-bold tracking-tight">{post.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {post.excerpt}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  Leer más
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <Footer entryHref="/ingresar" entryLabel="Ya tengo cuenta" />
      </div>
    </div>
  )
}
