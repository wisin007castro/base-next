'use client'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useEtiqueta, useUpdateEtiqueta } from '@/lib/hooks/etiquetas.hooks'
import { EtiquetaForm } from '@/app/components/etiquetas/EtiquetaForm'
import type { CreateEtiquetaInput } from '@/lib/api/schemas/etiqueta.schema'

export default function EditarEtiquetaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const etiquetaId = Number(id)
  const router = useRouter()

  const { data: etiqueta, isLoading, isError } = useEtiqueta(etiquetaId)
  const update = useUpdateEtiqueta(etiquetaId)

  async function handleSubmit(data: CreateEtiquetaInput) {
    await update.mutateAsync(data)
    router.push('/etiquetas')
  }

  if (isLoading) return <div className="py-16 text-center text-sm text-ink-3">Cargando…</div>
  if (isError || !etiqueta) {
    return <div className="rounded-lg bg-[var(--risk-bg)] px-4 py-3 text-sm text-risk">No se encontró la etiqueta.</div>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-1">Editar etiqueta</h1>
        <p className="mt-0.5 text-sm text-ink-3">{etiqueta.nombre}</p>
      </div>
      <EtiquetaForm etiqueta={etiqueta} onSubmit={handleSubmit} />
    </div>
  )
}
