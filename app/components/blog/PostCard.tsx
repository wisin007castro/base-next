'use client'
import Link from 'next/link'
import { FiMessageSquare } from 'react-icons/fi'
import { formatDate } from '@/app/components/data-table'
import { usePrefetchBlogPost } from '@/lib/hooks/blog.hooks'
import type { BlogPost } from '@/lib/types/blog.types'
import { VoteButtons } from './VoteButtons'

export function PostCard({ post, onCategoria }: { post: BlogPost; onCategoria?: (id: number) => void }) {
  const prefetch = usePrefetchBlogPost()
  const href = `/blog/${post.id}`

  return (
    <article
      onMouseEnter={() => prefetch(post.id)}
      className="flex flex-col rounded-xl border border-[var(--line-2)] bg-surface p-5 transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between gap-2 text-xs text-ink-3">
        <button
          type="button"
          onClick={() => onCategoria?.(post.categoria.id)}
          className="hover:bg-accent/20 rounded-full bg-[var(--accent-subtle)] px-2.5 py-0.5 font-medium text-accent"
          title={`Ver ${post.categoria.label}`}
        >
          {post.categoria.label}
        </button>
        <time dateTime={post.fecha_publicacion ?? post.created_at}>
          {formatDate(post.fecha_publicacion ?? post.created_at)}
        </time>
      </div>

      <h2 className="text-base font-semibold text-ink-1">
        <Link href={href} className="hover:text-accent">
          {post.titulo}
        </Link>
      </h2>
      <p className="mt-1 text-xs text-ink-3">por {post.autor.label}</p>
      {post.resumen && <p className="mt-3 line-clamp-3 text-sm text-ink-2">{post.resumen}</p>}

      <div className="mt-auto flex items-center justify-between pt-4">
        <VoteButtons postId={post.id} puntaje={post.puntaje} miVoto={post.mi_voto} size="sm" />
        <Link
          href={`${href}#comentarios`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-accent"
        >
          <FiMessageSquare className="h-4 w-4" />
          {post.comentarios_count}
          <span className="sr-only">comentarios</span>
        </Link>
      </div>
    </article>
  )
}
