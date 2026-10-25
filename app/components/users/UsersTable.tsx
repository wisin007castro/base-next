'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import {
  FiEdit2,
  FiTrash2,
  FiRotateCcw,
  FiMail,
  FiCheckCircle,
  FiUser,
  FiToggleLeft,
  FiToggleRight,
} from 'react-icons/fi'
import type { User } from '@/lib/types/user.types'
import type { BulkUserAction } from '@/lib/api/schemas/user.schema'
import { UserStatusBadge, UserVerifiedBadge, UserRolesBadges } from './UserStatusBadge'
import {
  BulkActionButton,
  BulkActionsBar,
  ConfirmDialog,
  DataTable,
  createColumnHelper,
  selectionColumn,
  type RowSelectionState,
} from '@/app/components/data-table'
import {
  useRemoveUser,
  useRestoreUser,
  useResendVerification,
  useVerifyUser,
  usePrefetchUser,
  useBulkUserAction,
} from '@/lib/hooks/users.hooks'

interface Props {
  users: User[] | undefined
  isLoading?: boolean
  isError?: boolean
  isStale?: boolean
  sort?: string
  onSortChange?: (sort: string) => void
  startIndex?: number
  /** Al cambiar (filtros, página…) se limpia la selección */
  selectionResetKey?: string
}

function UserAvatar({ user }: { user: User }) {
  const [imgError, setImgError] = useState(false)
  const thumbUrl = user.profile?.avatar_thumb_url
  return (
    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-[var(--accent-fg)]">
      {thumbUrl && !imgError ? (
        <Image
          src={thumbUrl}
          alt={user.username}
          fill
          className="object-cover"
          unoptimized
          onError={() => setImgError(true)}
        />
      ) : (
        <FiUser className="h-4 w-4" />
      )}
    </div>
  )
}

const iconBtn = 'rounded p-1.5 transition-colors disabled:opacity-50'
const col = createColumnHelper<User>()

/** Acciones que piden confirmación y su texto */
const CONFIRM: Partial<Record<BulkUserAction, { title: string; label: string; pending: string }>> = {
  delete: { title: 'Eliminar usuarios', label: 'Eliminar', pending: 'Eliminando...' },
  deactivate: { title: 'Desactivar usuarios', label: 'Desactivar', pending: 'Desactivando...' },
}

const DONE: Record<BulkUserAction, string> = {
  activate: 'activados',
  deactivate: 'desactivados',
  delete: 'eliminados',
  restore: 'restaurados',
}

export function UsersTable({ users, startIndex = 1, selectionResetKey, ...tableProps }: Props) {
  const { data: session } = useSession()
  const selfId = session?.user?.id
  const remove = useRemoveUser()
  const restore = useRestoreUser()
  const resend = useResendVerification()
  const verify = useVerifyUser()
  const bulk = useBulkUserAction()
  const prefetchUser = usePrefetchUser()

  const [toDelete, setToDelete] = useState<User | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pendingBulk, setPendingBulk] = useState<BulkUserAction | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Limpiar la selección cuando cambian filtros/página (patrón "reset on prop change", sin efecto)
  const [prevResetKey, setPrevResetKey] = useState(selectionResetKey)
  if (selectionResetKey !== prevResetKey) {
    setPrevResetKey(selectionResetKey)
    setRowSelection({})
  }

  const selected = (users ?? []).filter(u => rowSelection[String(u.id)])
  const anyDeleted = selected.some(u => u.deleted_at)
  const anyAlive = selected.some(u => !u.deleted_at)

  function runBulk(action: BulkUserAction) {
    bulk.mutate(
      { action, ids: selected.map(u => u.id) },
      {
        onSuccess: ({ affected, skipped }) => {
          setRowSelection({})
          setPendingBulk(null)
          setNotice(
            `${affected} ${affected === 1 ? 'usuario' : 'usuarios'} ${DONE[action]}` +
              (skipped.length ? ' (se omitió tu propio usuario)' : ''),
          )
        },
      },
    )
  }

  const askBulk = (action: BulkUserAction) => (CONFIRM[action] ? setPendingBulk(action) : runBulk(action))

  const editLinkProps = (user: User) => ({
    href: `/usuarios/${user.id}/editar`,
    onMouseEnter: () => prefetchUser(user.id),
    onFocus: () => prefetchUser(user.id),
  })

  // El id de las columnas ordenables es la clave de orden de la API
  const columns = [
    selectionColumn<User>(),
    col.display({
      id: 'index',
      header: '#',
      cell: ({ row }) => startIndex + row.index,
      meta: { className: 'text-ink-3' },
    }),
    col.accessor('username', {
      header: 'Usuario',
      cell: ({ row: { original: user } }) => (
        <Link {...editLinkProps(user)} className="group flex items-center gap-2.5">
          <UserAvatar user={user} />
          <div className="min-w-0">
            <div className="truncate font-medium text-ink-1 transition-colors group-hover:text-accent">
              {user.username}
            </div>
            <div className="group-hover:text-accent/70 truncate text-xs text-ink-3 transition-colors">{user.email}</div>
          </div>
        </Link>
      ),
    }),
    col.display({
      id: 'name',
      header: 'Nombre',
      meta: { className: 'text-ink-2' },
      cell: ({ row: { original: user } }) =>
        user.profile ? (
          [user.profile.nombre, user.profile.primer_apellido].filter(Boolean).join(' ')
        ) : (
          <span className="italic text-ink-4">Sin perfil</span>
        ),
    }),
    col.display({ id: 'roles', header: 'Rol', cell: ({ row }) => <UserRolesBadges roles={row.original.roles} /> }),
    col.display({ id: 'status', header: 'Estado', cell: ({ row }) => <UserStatusBadge user={row.original} /> }),
    col.display({
      id: 'verified',
      header: 'Verificado',
      cell: ({ row }) => <UserVerifiedBadge verifiedAt={row.original.email_verified_at} />,
    }),
    col.accessor('last_login_at', {
      header: 'Último acceso',
      meta: { className: 'text-xs text-ink-3' },
      cell: ({ getValue }) => {
        const value = getValue()
        return value ? new Date(value).toLocaleDateString('es') : '—'
      },
    }),
    col.display({
      id: 'actions',
      header: 'Acciones',
      meta: { align: 'right' },
      cell: ({ row: { original: user } }) => (
        <div className="flex items-center justify-end gap-1">
          {user.deleted_at ? (
            <button
              onClick={() => restore.mutate(user.id)}
              disabled={restore.isPending}
              title="Restaurar"
              className={`${iconBtn} text-ok hover:bg-[var(--ok-bg)]`}
            >
              <FiRotateCcw className="h-4 w-4" />
            </button>
          ) : (
            <>
              {!user.email_verified_at && (
                <>
                  <button
                    onClick={() => verify.mutate(user.id)}
                    disabled={verify.isPending}
                    title="Verificar manualmente"
                    className={`${iconBtn} text-ok hover:bg-[var(--ok-bg)]`}
                  >
                    <FiCheckCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => resend.mutate(user.id)}
                    disabled={resend.isPending}
                    title="Reenviar verificación por email"
                    className={`${iconBtn} text-warn hover:bg-[var(--warn-bg)]`}
                  >
                    <FiMail className="h-4 w-4" />
                  </button>
                </>
              )}
              <Link
                {...editLinkProps(user)}
                title="Editar"
                className={`${iconBtn} text-accent hover:bg-[var(--accent-subtle)]`}
              >
                <FiEdit2 className="h-4 w-4" />
              </Link>
              <button
                onClick={() => setToDelete(user)}
                title="Eliminar"
                className={`${iconBtn} text-risk hover:bg-[var(--risk-bg)]`}
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    }),
  ]

  const confirm = pendingBulk ? CONFIRM[pendingBulk] : undefined

  return (
    <div className="space-y-3">
      {notice && (
        <div className="flex items-center justify-between rounded-lg bg-[var(--ok-bg)] px-4 py-2.5 text-sm text-ok">
          {notice}
          <button type="button" onClick={() => setNotice(null)} className="text-xs underline">
            Cerrar
          </button>
        </div>
      )}

      <BulkActionsBar count={selected.length} onClear={() => setRowSelection({})}>
        {anyAlive && (
          <>
            <BulkActionButton
              onClick={() => askBulk('activate')}
              disabled={bulk.isPending}
              icon={<FiToggleRight className="h-4 w-4" />}
            >
              Activar
            </BulkActionButton>
            <BulkActionButton
              onClick={() => askBulk('deactivate')}
              disabled={bulk.isPending}
              icon={<FiToggleLeft className="h-4 w-4" />}
            >
              Desactivar
            </BulkActionButton>
            <BulkActionButton
              onClick={() => askBulk('delete')}
              disabled={bulk.isPending}
              tone="danger"
              icon={<FiTrash2 className="h-4 w-4" />}
            >
              Eliminar
            </BulkActionButton>
          </>
        )}
        {anyDeleted && (
          <BulkActionButton
            onClick={() => askBulk('restore')}
            disabled={bulk.isPending}
            icon={<FiRotateCcw className="h-4 w-4" />}
          >
            Restaurar
          </BulkActionButton>
        )}
      </BulkActionsBar>
      {bulk.isError && !pendingBulk && (
        <p className="rounded-lg bg-[var(--risk-bg)] px-4 py-2.5 text-sm text-risk">{bulk.error.message}</p>
      )}

      <DataTable
        mode="server"
        columns={columns}
        data={users}
        getRowId={u => String(u.id)}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        // Un admin no puede seleccionarse a sí mismo (no puede desactivarse ni eliminarse)
        enableRowSelection={row => String(row.original.id) !== selfId}
        errorMessage="Error al cargar los usuarios. Verifica la conexión con la API."
        emptyMessage="No se encontraron usuarios."
        {...tableProps}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar usuario"
        isPending={remove.isPending}
        error={remove.error?.message}
        onCancel={() => {
          setToDelete(null)
          remove.reset()
        }}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      >
        ¿Eliminar a <strong className="text-ink-1">{toDelete?.username}</strong>? Podrás restaurarlo desde &quot;Incluir
        eliminados&quot;.
      </ConfirmDialog>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ''}
        confirmLabel={confirm?.label}
        pendingLabel={confirm?.pending}
        isPending={bulk.isPending}
        error={bulk.error?.message}
        onCancel={() => {
          setPendingBulk(null)
          bulk.reset()
        }}
        onConfirm={() => pendingBulk && runBulk(pendingBulk)}
      >
        Se aplicará a <strong className="text-ink-1">{selected.length}</strong>{' '}
        {selected.length === 1 ? 'usuario' : 'usuarios'}:{' '}
        {selected
          .slice(0, 5)
          .map(u => u.username)
          .join(', ')}
        {selected.length > 5 && ` y ${selected.length - 5} más`}.
      </ConfirmDialog>
    </div>
  )
}
