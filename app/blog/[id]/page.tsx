'use client'
import { use } from 'react'
import Link from 'next/link'
import { FiArrowLeft, FiEdit2 } from 'react-icons/fi'
import { useBlogPost } from '@/lib/hooks/blog.hooks'
import { useCan } from '@/lib/hooks/use-can'
import { formatDate } from '@/app/components/data-table'
import { VoteButtons } from '@/app/components/blog/VoteButtons'
import { Comments } from '@/app/components/blog/Comments'

export default function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const postId = Number(use(params).id)
  const { data: post, isLoading, isError } = useBlogPost(postId)
  const canEdit = useCan('publicaciones.edit')

  if (isLoading) return <p className="py-16 text-center text-sm text-ink-3">Cargando…</p>
  if (isError || !post) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="rounded-lg bg-[var(--risk-bg)] px-4 py-3 text-sm text-risk">
          No se encontró la publicación (puede que no esté publicada).
        </p>
        <Link href="/blog" className="text-sm text-accent hover:underline">
          Volver al blog
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-accent">
          <FiArrowLeft className="h-4 w-4" />
          Blog
        </Link>
        {canEdit && (
          <Link
            href={`/publicaciones/${post.id}/editar`}
            className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-accent"
          >
            <FiEdit2 className="h-4 w-4" />
            Editar
          </Link>
        )}
      </div>

      <article className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-3">
          <Link
            href={`/blog?categoria_id=${post.categoria.id}`}
            className="hover:bg-accent/20 rounded-full bg-[var(--accent-subtle)] px-2.5 py-0.5 font-medium text-accent"
          >
            {post.categoria.label}
          </Link>
          <span>
            por <span className="font-medium text-ink-2">{post.autor.label}</span>
          </span>
          <time dateTime={post.fecha_publicacion ?? post.created_at}>
            {formatDate(post.fecha_publicacion ?? post.created_at)}
          </time>
        </div>
        <h1 className="text-2xl font-semibold text-ink-1">{post.titulo}</h1>
        {post.resumen && <p className="text-base text-ink-2">{post.resumen}</p>}
        <div className="whitespace-pre-line text-sm leading-relaxed text-ink-2">{post.contenido}</div>
        <div className="border-t border-[var(--line-2)] pt-4">
          <VoteButtons postId={post.id} puntaje={post.puntaje} miVoto={post.mi_voto} />
        </div>
      </article>

      <Comments postId={post.id} total={post.comentarios_count} />
    </div>
  )
}
