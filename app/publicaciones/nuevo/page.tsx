'use client'
import { useRouter } from 'next/navigation'
import { useCreatePublicacion } from '@/lib/hooks/publicaciones.hooks'
import { PublicacionForm } from '@/app/components/publicaciones/PublicacionForm'
import type { CreatePublicacionInput } from '@/lib/api/schemas/publicacion.schema'

export default function NuevaPublicacionPage() {
  const router = useRouter()
  const create = useCreatePublicacion()

  async function handleSubmit(data: CreatePublicacionInput) {
    await create.mutateAsync(data)
    router.push('/publicaciones')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-1">Nueva publicación</h1>
        <p className="mt-0.5 text-sm text-ink-3">Completa los datos para crear una nueva publicación.</p>
      </div>
      <PublicacionForm onSubmit={handleSubmit} />
    </div>
  )
}
