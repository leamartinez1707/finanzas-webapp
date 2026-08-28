import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/global/Header'
import Footer from '@/components/global/Footer'
import { blogPosts, getBlogPost, formatPostDate } from '@/lib/blog-posts'

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return { title: 'Novedades — Nido' }
  return {
    title: `${post.title} — Nido`,
    description: post.excerpt,
  }
}

// Unguarded, same as app/page.tsx — publicly browsable, no route group.
export default async function NovedadPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <Header entryHref="/ingresar" entryLabel="Ya tengo cuenta" showNovedadesLink={false} />

        <article className="py-10 sm:py-16">
          <Link
            href="/novedades"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Novedades
          </Link>

          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {formatPostDate(post.date)}
          </p>
          <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {post.title}
          </h1>

          <div className="mt-8 max-w-2xl space-y-4 text-pretty leading-relaxed text-foreground">
            {post.content}
          </div>

          <div className="mt-10 rounded-3xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">
              ¿Todavía no usás Nido?
            </p>
            <Link
              href="/ingresar?modo=registro"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Armá tu Nido hoy
            </Link>
          </div>
        </article>

        <Footer entryHref="/ingresar" entryLabel="Ya tengo cuenta" />
      </div>
    </div>
  )
}
