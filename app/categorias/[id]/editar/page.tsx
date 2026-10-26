'use client'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useCategoria, useUpdateCategoria } from '@/lib/hooks/categorias.hooks'
import { CategoriaForm } from '@/app/components/categorias/CategoriaForm'
import type { CreateCategoriaInput } from '@/lib/api/schemas/categoria.schema'

export default function EditarCategoriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const categoriaId = Number(id)
  const router = useRouter()

  const { data: categoria, isLoading, isError } = useCategoria(categoriaId)
  const update = useUpdateCategoria(categoriaId)

  async function handleSubmit(data: CreateCategoriaInput) {
    await update.mutateAsync(data)
    router.push('/categorias')
  }

  if (isLoading) return <div className="py-16 text-center text-sm text-ink-3">Cargando…</div>
  if (isError || !categoria) {
    return (
      <div className="rounded-lg bg-[var(--risk-bg)] px-4 py-3 text-sm text-risk">
        No se encontró la categoría (si está eliminada, restáurela primero).
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-1">Editar categoría</h1>
        <p className="mt-0.5 text-sm text-ink-3">{categoria.nombre}</p>
      </div>
      <CategoriaForm categoria={categoria} onSubmit={handleSubmit} />
    </div>
  )
}
