'use client'
import { useRouter } from 'next/navigation'
import { useCreateEtiqueta } from '@/lib/hooks/etiquetas.hooks'
import { EtiquetaForm } from '@/app/components/etiquetas/EtiquetaForm'
import type { CreateEtiquetaInput } from '@/lib/api/schemas/etiqueta.schema'

export default function NuevaEtiquetaPage() {
  const router = useRouter()
  const create = useCreateEtiqueta()

  async function handleSubmit(data: CreateEtiquetaInput) {
    await create.mutateAsync(data)
    router.push('/etiquetas')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-1">Nueva etiqueta</h1>
        <p className="mt-0.5 text-sm text-ink-3">Completa los datos para crear una nueva etiqueta.</p>
      </div>
      <EtiquetaForm onSubmit={handleSubmit} />
    </div>
  )
}
