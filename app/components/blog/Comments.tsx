'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FiTrash2 } from 'react-icons/fi'
import { Form, FieldTextarea, FormStatus, SubmitButton } from '@/app/components/form'
import { ConfirmDialog } from '@/app/components/data-table'
import { comentarioSchema, type ComentarioInput } from '@/lib/api/schemas/blog.schema'
import { useComentar, useComentarios, useEliminarComentario } from '@/lib/hooks/blog.hooks'
import type { Comentario } from '@/lib/types/blog.types'

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

function NuevoComentario({ postId }: { postId: number }) {
  const comentar = useComentar(postId)
  const form = useForm<ComentarioInput>({ resolver: zodResolver(comentarioSchema), defaultValues: { contenido: '' } })

  async function onSubmit(values: ComentarioInput) {
    await comentar.mutateAsync(values)
    form.reset({ contenido: '' })
  }

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-3">
      <FormStatus />
      <FieldTextarea
        control={form.control}
        name="contenido"
        label="Deja un comentario"
        placeholder="¿Qué opinas?"
        rows={3}
      />
      <div className="flex justify-end">
        <SubmitButton pendingText="Publicando...">Comentar</SubmitButton>
      </div>
    </Form>
  )
}

export function Comments({ postId, total }: { postId: number; total: number }) {
  const { data: comentarios, isLoading, isError } = useComentarios(postId)
  const eliminar = useEliminarComentario(postId)
  const [toDelete, setToDelete] = useState<Comentario | null>(null)

  return (
    <section id="comentarios" aria-labelledby="comentarios-title" className="space-y-5">
      <h2 id="comentarios-title" className="text-base font-semibold text-ink-1">
        Comentarios ({total})
      </h2>

      <NuevoComentario postId={postId} />

      {isLoading && <p className="text-sm text-ink-3">Cargando comentarios…</p>}
      {isError && <p className="text-sm text-risk">No se pudieron cargar los comentarios.</p>}
      {comentarios?.length === 0 && <p className="text-sm text-ink-3">Sé el primero en comentar.</p>}

      <ul className="space-y-3">
        {comentarios?.map(c => (
          <li key={c.id} className="rounded-xl border border-[var(--line-2)] bg-surface p-4">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-sm">
                <span className="font-medium text-ink-1">{c.autor.label}</span>
                <span className="ml-2 text-xs text-ink-4">{fechaHora(c.created_at)}</span>
              </p>
              {c.puedo_eliminar && (
                <button
                  type="button"
                  onClick={() => setToDelete(c)}
                  title="Eliminar comentario"
                  className="rounded p-1 text-ink-4 transition-colors hover:bg-[var(--risk-bg)] hover:text-risk"
                >
                  <FiTrash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="whitespace-pre-line text-sm text-ink-2">{c.contenido}</p>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar comentario"
        isPending={eliminar.isPending}
        error={eliminar.error?.message}
        onCancel={() => {
          setToDelete(null)
          eliminar.reset()
        }}
        onConfirm={() => toDelete && eliminar.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      >
        ¿Eliminar este comentario? Esta acción no se puede deshacer.
      </ConfirmDialog>
    </section>
  )
}
