'use client'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { usePublicacion, useUpdatePublicacion } from '@/lib/hooks/publicaciones.hooks'
import { PublicacionForm } from '@/app/components/publicaciones/PublicacionForm'
import type { CreatePublicacionInput } from '@/lib/api/schemas/publicacion.schema'

export default function EditarPublicacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const publicacionId = Number(id)
  const router = useRouter()

  const { data: publicacion, isLoading, isError } = usePublicacion(publicacionId)
  const update = useUpdatePublicacion(publicacionId)

  async function handleSubmit(data: CreatePublicacionInput) {
    await update.mutateAsync(data)
    router.push('/publicaciones')
  }

  if (isLoading) return <div className="py-16 text-center text-sm text-ink-3">Cargando…</div>
  if (isError || !publicacion) {
    return (
      <div className="rounded-lg bg-[var(--risk-bg)] px-4 py-3 text-sm text-risk">
        No se encontró la publicación (si está eliminada, restáurela primero).
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-1">Editar publicación</h1>
        <p className="mt-0.5 text-sm text-ink-3">{publicacion.titulo}</p>
      </div>
      <PublicacionForm publicacion={publicacion} onSubmit={handleSubmit} />
    </div>
  )
}
