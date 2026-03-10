'use client'
import { use, useState } from 'react'
import Link from 'next/link'
import { FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi'
import { useUser, useUpdateUser } from '@/lib/hooks/users.hooks'
import { useRoles } from '@/lib/hooks/roles.hooks'
import type { User, UpdateUserDto, DocumentType, Gender } from '@/lib/types/user.types'
import { ApiError } from '@/lib/api/users.api'
import AvatarUpload from '@/app/components/users/AvatarUpload'

interface Props { params: Promise<{ id: string }> }

// ---------------------------------------------------------------------------
// Shared UI helpers
// ---------------------------------------------------------------------------
const baseInput =
  'w-full rounded-lg bg-surface-inset px-3 py-2 text-sm text-ink-1 placeholder:text-ink-4 ' +
  'focus:outline-none focus:ring-1'

const inputClass =
  baseInput +
  ' border border-[var(--line-2)] focus:border-[var(--line-3)] focus:ring-[var(--accent)]/20'

const inputError =
  baseInput +
  ' border border-risk/60 focus:border-risk focus:ring-risk/20'

/** Devuelve la clase correcta según si hay error en ese campo */
const ci = (err?: string) => err ? inputError : inputClass

const selectClass = inputClass
const sectionClass = 'rounded-xl border border-[var(--line-2)] bg-surface p-4 space-y-4'
const sectionTitleClass = 'text-sm font-semibold text-ink-2 mb-4'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink-2">{label}</label>
      {children}
    </div>
  )
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-risk">{msg}</p>
}

function Alert({ type, message }: { type: 'success' | 'error'; message: string }) {
  const classes = type === 'success'
    ? 'bg-[var(--ok-bg)] text-ok'
    : 'bg-[var(--risk-bg)] text-risk'
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
  const [showPassword, setShowPassword]         = useState(false)
  const [showPasswordConf, setShowPasswordConf] = useState(false)
  const [errors, setErrors]             = useState<Record<string, string>>({})
  const [status, setStatus]             = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  function toggleRole(id: number) {
    setRoleIds(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
  }

  /** Limpia el error de un campo individual cuando el usuario empieza a escribir */
  function clr(key: string) {
    setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!username.trim())
      e.username = 'El username es obligatorio'
    else if (username.length < 3)
      e.username = 'Mínimo 3 caracteres'
    else if (username.length > 50)
      e.username = 'Máximo 50 caracteres'
    else if (!/^[a-zA-Z0-9_]+$/.test(username))
      e.username = 'Solo letras, números y guiones bajos'

    if (!email.trim())
      e.email = 'El correo es obligatorio'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Correo electrónico inválido'

    if (password) {
      if (password.length < 8)
        e.password = 'La contraseña debe tener al menos 8 caracteres'
      else if (password.length > 128)
        e.password = 'La contraseña no puede superar 128 caracteres'
      if (!e.password && password !== passwordConf)
        e.password_confirmation = 'Las contraseñas no coinciden'
    }

    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setStatus(null)
    const dto: UpdateUserDto = { username, email, is_active: isActive, role_ids: roleIds }
    if (password) { dto.password = password; dto.password_confirmation = passwordConf }
    try {
      await update.mutateAsync(dto)
      setStatus({ type: 'success', msg: 'Datos de cuenta actualizados' })
      setPassword('')
      setPasswordConf('')
    } catch (err: unknown) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        const mapped: Record<string, string> = {}
        for (const [field, messages] of Object.entries(err.fieldErrors)) {
          if (messages && messages.length > 0) mapped[field] = messages[0]
        }
        setErrors(mapped)
      }
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
            <input
              className={ci(errors.username)}
              value={username}
              onChange={e => { setUsername(e.target.value); clr('username') }}
            />
            <FieldError msg={errors.username} />
          </Field>

          <Field label="Correo electrónico *">
            <input
              className={ci(errors.email)}
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); clr('email') }}
            />
            <FieldError msg={errors.email} />
          </Field>

          <Field label="Estado">
            <select
              className={selectClass}
              value={isActive ? 'true' : 'false'}
              onChange={e => setIsActive(e.target.value === 'true')}
            >
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </Field>

          <Field label="Nueva contraseña (opcional)">
            <div className="relative">
              <input
                className={ci(errors.password) + ' pr-10'}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); clr('password'); clr('password_confirmation') }}
                placeholder="••••••••"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2 transition-colors"
              >
                {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
            <FieldError msg={errors.password} />
          </Field>

          <Field label="Confirmar contraseña">
            <div className="relative">
              <input
                className={ci(errors.password_confirmation) + ' pr-10'}
                type={showPasswordConf ? 'text' : 'password'}
                value={passwordConf}
                onChange={e => { setPasswordConf(e.target.value); clr('password_confirmation') }}
                placeholder="••••••••"
                required={!!password}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPasswordConf(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2 transition-colors"
              >
                {showPasswordConf ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
            <FieldError msg={errors.password_confirmation} />
          </Field>
        </div>

        {/* Roles */}
        <div>
          <label className="mb-2 block text-sm font-medium text-ink-2">Roles</label>
          {rolesLoading ? (
            <p className="text-xs text-ink-3">Cargando roles...</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {allRoles?.map(role => (
                <label key={role.id} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="rounded border-[var(--line-3)] text-accent focus:ring-[var(--accent)]/30"
                    checked={roleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                  <span className="text-sm text-ink-2 capitalize">{role.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={update.isPending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors"
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
  const [errors, setErrors]                   = useState<Record<string, string>>({})
  const [status, setStatus]                   = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  function clr(key: string) {
    setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!nombre.trim())
      e.nombre = 'El nombre es obligatorio'
    if (!primerApellido.trim())
      e.primer_apellido = 'El primer apellido es obligatorio'
    if (!numeroDocumento.trim())
      e.numero_documento = 'El número de documento es obligatorio'
    if (!fechaNacimiento)
      e.fecha_nacimiento = 'La fecha de nacimiento es obligatoria'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
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
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        const mapped: Record<string, string> = {}
        for (const [field, messages] of Object.entries(err.fieldErrors)) {
          if (messages && messages.length > 0) mapped[field] = messages[0]
        }
        setErrors(mapped)
      }
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
            <input
              className={ci(errors.nombre)}
              value={nombre}
              onChange={e => { setNombre(e.target.value); clr('nombre') }}
            />
            <FieldError msg={errors.nombre} />
          </Field>

          <Field label="Primer apellido *">
            <input
              className={ci(errors.primer_apellido)}
              value={primerApellido}
              onChange={e => { setPrimerApellido(e.target.value); clr('primer_apellido') }}
            />
            <FieldError msg={errors.primer_apellido} />
          </Field>

          <Field label="Segundo apellido">
            <input
              className={inputClass}
              value={segundoApellido}
              onChange={e => setSegundoApellido(e.target.value)}
            />
          </Field>

          <Field label="Tipo de documento *">
            <select
              className={selectClass}
              value={tipoDocumento}
              onChange={e => setTipoDocumento(e.target.value as DocumentType)}
            >
              <option value="dni">DNI</option>
              <option value="cedula">Cédula</option>
              <option value="pasaporte">Pasaporte</option>
              <option value="nie">NIE</option>
            </select>
          </Field>

          <Field label="Número de documento *">
            <input
              className={ci(errors.numero_documento)}
              value={numeroDocumento}
              onChange={e => { setNumeroDocumento(e.target.value); clr('numero_documento') }}
            />
            <FieldError msg={errors.numero_documento} />
          </Field>

          <Field label="Fecha de nacimiento *">
            <input
              className={ci(errors.fecha_nacimiento)}
              type="date"
              value={fechaNacimiento}
              onChange={e => { setFechaNacimiento(e.target.value); clr('fecha_nacimiento') }}
            />
            <FieldError msg={errors.fecha_nacimiento} />
          </Field>

          <Field label="Género">
            <select
              className={selectClass}
              value={genero}
              onChange={e => setGenero(e.target.value as Gender)}
            >
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
            <input
              className={inputClass}
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              placeholder="+34 600 000 000"
            />
          </Field>
          <Field label="Teléfono alternativo">
            <input
              className={inputClass}
              value={telefonoAlt}
              onChange={e => setTelefonoAlt(e.target.value)}
            />
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
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors"
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
    return <div className="py-16 text-center text-sm text-ink-3">Cargando usuario...</div>
  }

  if (isError || !user) {
    return (
      <div className="rounded-lg bg-[var(--risk-bg)] px-4 py-3 text-sm text-risk">
        No se pudo cargar el usuario.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink-1">Editar usuario</h1>
          <p className="mt-0.5 text-sm text-ink-3">
            {user.username} · {user.email}
          </p>
        </div>
        <Link
          href="/usuarios"
          className="flex items-center gap-1.5 rounded-lg border border-[var(--line-2)] px-3 py-1.5 text-sm text-ink-2 hover:bg-[var(--line-1)] transition-colors shrink-0"
        >
          <FiArrowLeft className="w-4 h-4" />
          Volver al listado
        </Link>
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
