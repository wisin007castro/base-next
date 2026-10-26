'use client'
import { useRouter } from 'next/navigation'
import { useCreateCategoria } from '@/lib/hooks/categorias.hooks'
import { CategoriaForm } from '@/app/components/categorias/CategoriaForm'
import type { CreateCategoriaInput } from '@/lib/api/schemas/categoria.schema'

export default function NuevaCategoriaPage() {
  const router = useRouter()
  const create = useCreateCategoria()

  async function handleSubmit(data: CreateCategoriaInput) {
    await create.mutateAsync(data)
    router.push('/categorias')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-1">Nueva categoría</h1>
        <p className="mt-0.5 text-sm text-ink-3">Completa los datos para crear una nueva categoría.</p>
      </div>
      <CategoriaForm onSubmit={handleSubmit} />
    </div>
  )
}
