'use client'
import { use, useState } from 'react'
import { useUser, useUpdateUser } from '@/lib/hooks/users.hooks'
import { useRoles } from '@/lib/hooks/roles.hooks'
import type { User, UpdateUserDto, DocumentType, Gender } from '@/lib/types/user.types'
import AvatarUpload from '@/app/components/users/AvatarUpload'

interface Props { params: Promise<{ id: string }> }

// ---------------------------------------------------------------------------
// Shared UI helpers
// ---------------------------------------------------------------------------
const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 ' +
  'focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 ' +
  'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500'

const selectClass = inputClass
const sectionClass = 'rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4'
const sectionTitleClass = 'text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {children}
    </div>
  )
}

function Alert({ type, message }: { type: 'success' | 'error'; message: string }) {
  const classes = type === 'success'
    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
    : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
  return <div className={`rounded-lg px-4 py-3 text-sm ${classes}`}>{message}</div>
}

// ---------------------------------------------------------------------------
// Sección: Datos de cuenta
// ---------------------------------------------------------------------------
function AccountSection({ user, userId }: { user: User; userId: number }) {
  const { data: allRoles, isLoading: rolesLoading } = useRoles()
  const update = useUpdateUser(userId)

  const [username, setUsername]         = useState(user.username)
  const [email, setEmail]               = useState(user.email)
  const [isActive, setIsActive]         = useState(user.is_active)
  const [roleIds, setRoleIds]           = useState<number[]>(user.roles?.map(r => r.id) ?? [])
  const [password, setPassword]         = useState('')
  const [passwordConf, setPasswordConf] = useState('')
  const [status, setStatus]             = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  function toggleRole(id: number) {
    setRoleIds(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password && password !== passwordConf) {
      setStatus({ type: 'error', msg: 'Las contraseñas no coinciden' })
      return
    }
    setStatus(null)
    const dto: UpdateUserDto = { username, email, is_active: isActive, role_ids: roleIds }
    if (password) { dto.password = password; dto.password_confirmation = passwordConf }
    try {
      await update.mutateAsync(dto)
      setStatus({ type: 'success', msg: 'Datos de cuenta actualizados' })
      setPassword('')
      setPasswordConf('')
    } catch (err: unknown) {
      setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Error al guardar' })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={sectionClass}>
        <p className={sectionTitleClass}>Datos de cuenta</p>
        {status && <Alert type={status.type} message={status.msg} />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Username *">
            <input className={inputClass} value={username} onChange={e => setUsername(e.target.value)} required />
          </Field>
          <Field label="Correo electrónico *">
            <input className={inputClass} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </Field>
          <Field label="Estado">
            <select className={selectClass} value={isActive ? 'true' : 'false'} onChange={e => setIsActive(e.target.value === 'true')}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </Field>
          <Field label="Nueva contraseña (opcional)">
            <input className={inputClass} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <Field label="Confirmar contraseña">
            <input className={inputClass} type="password" value={passwordConf} onChange={e => setPasswordConf(e.target.value)} placeholder="••••••••" required={!!password} />
          </Field>
        </div>

        {/* Roles */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Roles</label>
          {rolesLoading ? (
            <p className="text-xs text-gray-400">Cargando roles...</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {allRoles?.map(role => (
                <label key={role.id} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    checked={roleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{role.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={update.isPending}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 transition-colors"
          >
            {update.isPending ? 'Guardando...' : 'Actualizar cuenta'}
          </button>
        </div>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Sección: Datos personales, contacto y dirección
// ---------------------------------------------------------------------------
function PersonalSection({ user, userId }: { user: User; userId: number }) {
  const update = useUpdateUser(userId)
  const p = user.profile

  const [nombre, setNombre]                   = useState(p?.nombre ?? '')
  const [primerApellido, setPrimerApellido]   = useState(p?.primer_apellido ?? '')
  const [segundoApellido, setSegundoApellido] = useState(p?.segundo_apellido ?? '')
  const [tipoDocumento, setTipoDocumento]     = useState<DocumentType>(p?.tipo_documento ?? 'dni')
  const [numeroDocumento, setNumeroDocumento] = useState(p?.numero_documento ?? '')
  const [fechaNacimiento, setFechaNacimiento] = useState(p?.fecha_nacimiento ?? '')
  const [genero, setGenero]                   = useState<Gender>(p?.genero ?? 'prefiero_no_decir')
  const [telefono, setTelefono]               = useState(p?.telefono ?? '')
  const [telefonoAlt, setTelefonoAlt]         = useState(p?.telefono_alternativo ?? '')
  const [pais, setPais]                       = useState(p?.pais ?? '')
  const [departamento, setDepartamento]       = useState(p?.departamento ?? '')
  const [ciudad, setCiudad]                   = useState(p?.ciudad ?? '')
  const [direccion, setDireccion]             = useState(p?.direccion ?? '')
  const [codigoPostal, setCodigoPostal]       = useState(p?.codigo_postal ?? '')
  const [status, setStatus]                   = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    try {
      await update.mutateAsync({
        profile: {
          nombre, primer_apellido: primerApellido, segundo_apellido: segundoApellido || null,
          tipo_documento: tipoDocumento, numero_documento: numeroDocumento,
          fecha_nacimiento: fechaNacimiento, genero,
          telefono: telefono || null, telefono_alternativo: telefonoAlt || null,
          pais: pais || null, departamento: departamento || null, ciudad: ciudad || null,
          direccion: direccion || null, codigo_postal: codigoPostal || null,
        },
      })
      setStatus({ type: 'success', msg: 'Datos personales actualizados' })
    } catch (err: unknown) {
      setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Error al guardar' })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Datos personales */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>Datos personales</p>
        {status && <Alert type={status.type} message={status.msg} />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Nombre *">
            <input className={inputClass} value={nombre} onChange={e => setNombre(e.target.value)} required />
          </Field>
          <Field label="Primer apellido *">
            <input className={inputClass} value={primerApellido} onChange={e => setPrimerApellido(e.target.value)} required />
          </Field>
          <Field label="Segundo apellido">
            <input className={inputClass} value={segundoApellido} onChange={e => setSegundoApellido(e.target.value)} />
          </Field>
          <Field label="Tipo de documento *">
            <select className={selectClass} value={tipoDocumento} onChange={e => setTipoDocumento(e.target.value as DocumentType)}>
              <option value="dni">DNI</option>
              <option value="cedula">Cédula</option>
              <option value="pasaporte">Pasaporte</option>
              <option value="nie">NIE</option>
            </select>
          </Field>
          <Field label="Número de documento *">
            <input className={inputClass} value={numeroDocumento} onChange={e => setNumeroDocumento(e.target.value)} required />
          </Field>
          <Field label="Fecha de nacimiento *">
            <input className={inputClass} type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} required />
          </Field>
          <Field label="Género">
            <select className={selectClass} value={genero} onChange={e => setGenero(e.target.value as Gender)}>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
              <option value="prefiero_no_decir">Prefiero no decir</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Contacto */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>Contacto</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Teléfono">
            <input className={inputClass} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+34 600 000 000" />
          </Field>
          <Field label="Teléfono alternativo">
            <input className={inputClass} value={telefonoAlt} onChange={e => setTelefonoAlt(e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Dirección */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>Dirección</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="País">
            <input className={inputClass} value={pais} onChange={e => setPais(e.target.value)} />
          </Field>
          <Field label="Departamento / Provincia">
            <input className={inputClass} value={departamento} onChange={e => setDepartamento(e.target.value)} />
          </Field>
          <Field label="Ciudad">
            <input className={inputClass} value={ciudad} onChange={e => setCiudad(e.target.value)} />
          </Field>
          <Field label="Código postal">
            <input className={inputClass} value={codigoPostal} onChange={e => setCodigoPostal(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Dirección">
              <input className={inputClass} value={direccion} onChange={e => setDireccion(e.target.value)} />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={update.isPending}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 transition-colors"
        >
          {update.isPending ? 'Guardando...' : 'Actualizar datos personales'}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export default function EditarUsuarioPage({ params }: Props) {
  const { id } = use(params)
  const userId = Number(id)

  const { data: user, isLoading, isError } = useUser(userId)

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">Cargando usuario...</div>
  }

  if (isError || !user) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
        No se pudo cargar el usuario.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Editar usuario</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {user.username} · {user.email}
        </p>
      </div>

      <div className="flex justify-center">
        <AvatarUpload
          currentUrl={user.profile?.avatar_url}
          uploadUrl={`/api/upload/avatar/${userId}`}
        />
      </div>

      <AccountSection user={user} userId={userId} />
      <PersonalSection user={user} userId={userId} />
    </div>
  )
}
