'use client'
import { useState } from 'react'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import type { CreateUserDto, UpdateUserDto, User, DocumentType, Gender } from '@/lib/types/user.types'
import { useRoles } from '@/lib/hooks/roles.hooks'

type Mode = 'create' | 'edit'

interface CreateProps {
  mode: 'create'
  onSubmit: (data: CreateUserDto) => void
  isLoading?: boolean
}

interface EditProps {
  mode: 'edit'
  user: User
  onSubmit: (data: UpdateUserDto) => void
  isLoading?: boolean
}

type Props = CreateProps | EditProps

// ---------------------------------------------------------------------------
// Helpers de UI
// ---------------------------------------------------------------------------
const baseInput =
  'w-full rounded-lg bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 ' +
  'focus:outline-none focus:ring-1 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500'

const inputClass =
  baseInput + ' border border-gray-300 focus:border-sky-500 focus:ring-sky-500 dark:border-gray-600'

const inputError =
  baseInput + ' border border-red-400 focus:border-red-400 focus:ring-red-400 dark:border-red-500'

const ci = (err?: string) => err ? inputError : inputClass
const selectClass = inputClass
const sectionClass = 'rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4'
const sectionTitleClass = 'text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4'

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export function UserForm(props: Props) {
  const { mode, onSubmit, isLoading } = props
  const initial = mode === 'edit' ? props.user : null

  const { data: roles, isLoading: rolesLoading } = useRoles()

  // Cuenta
  const [username, setUsername]         = useState(initial?.username ?? '')
  const [email, setEmail]               = useState(initial?.email ?? '')
  const [roleIds, setRoleIds]           = useState<number[]>(initial?.roles?.map(r => r.id) ?? [])
  const [isActive, setIsActive]         = useState(initial?.is_active ?? true)
  const [password, setPassword]         = useState('')
  const [passwordConf, setPasswordConf] = useState('')
  const [showPassword, setShowPassword]         = useState(false)
  const [showPasswordConf, setShowPasswordConf] = useState(false)

  // Perfil
  const p = initial?.profile
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

  // Errores de validación
  const [errors, setErrors] = useState<Record<string, string>>({})

  function toggleRole(id: number) {
    setRoleIds(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
  }

  /** Limpia el error de un campo cuando el usuario empieza a corregirlo */
  function clr(key: string) {
    setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {}

    // Username
    if (!username.trim())
      e.username = 'El username es obligatorio'
    else if (username.length < 3)
      e.username = 'Mínimo 3 caracteres'
    else if (username.length > 50)
      e.username = 'Máximo 50 caracteres'
    else if (!/^[a-zA-Z0-9_]+$/.test(username))
      e.username = 'Solo letras, números y guiones bajos'

    // Email
    if (!email.trim())
      e.email = 'El correo es obligatorio'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Correo electrónico inválido'

    // Contraseña — obligatoria al crear, opcional al editar
    if (mode === 'create') {
      if (!password)
        e.password = 'La contraseña es obligatoria'
      else if (password.length < 8)
        e.password = 'La contraseña debe tener al menos 8 caracteres'
      else if (password.length > 128)
        e.password = 'La contraseña no puede superar 128 caracteres'
      if (!e.password && password !== passwordConf)
        e.password_confirmation = 'Las contraseñas no coinciden'
    } else {
      if (password) {
        if (password.length < 8)
          e.password = 'La contraseña debe tener al menos 8 caracteres'
        else if (password.length > 128)
          e.password = 'La contraseña no puede superar 128 caracteres'
        if (!e.password && password !== passwordConf)
          e.password_confirmation = 'Las contraseñas no coinciden'
      }
    }

    // Perfil obligatorio
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})

    const profile = {
      nombre, primer_apellido: primerApellido, segundo_apellido: segundoApellido || null,
      tipo_documento: tipoDocumento, numero_documento: numeroDocumento,
      fecha_nacimiento: fechaNacimiento, genero,
      telefono: telefono || null, telefono_alternativo: telefonoAlt || null,
      pais: pais || null, departamento: departamento || null,
      ciudad: ciudad || null, direccion: direccion || null, codigo_postal: codigoPostal || null,
    }

    if (mode === 'create') {
      onSubmit({ username, email, password, password_confirmation: passwordConf, role_ids: roleIds, is_active: isActive, profile })
    } else {
      const dto: UpdateUserDto = { username, email, role_ids: roleIds, is_active: isActive, profile }
      if (password) { dto.password = password; dto.password_confirmation = passwordConf }
      onSubmit(dto)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cuenta */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>Datos de cuenta</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Username *" error={errors.username}>
            <input
              className={ci(errors.username)}
              value={username}
              onChange={e => { setUsername(e.target.value); clr('username') }}
              placeholder="johndoe"
            />
          </Field>

          <Field label="Correo electrónico *" error={errors.email}>
            <input
              className={ci(errors.email)}
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); clr('email') }}
              placeholder="john@ejemplo.com"
            />
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

          <Field label={mode === 'create' ? 'Contraseña *' : 'Nueva contraseña (opcional)'} error={errors.password}>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          <Field label="Confirmar contraseña" error={errors.password_confirmation}>
            <div className="relative">
              <input
                className={ci(errors.password_confirmation) + ' pr-10'}
                type={showPasswordConf ? 'text' : 'password'}
                value={passwordConf}
                onChange={e => { setPasswordConf(e.target.value); clr('password_confirmation') }}
                placeholder="••••••••"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPasswordConf(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showPasswordConf ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
        </div>

        {/* Roles */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Roles</label>
          {rolesLoading ? (
            <p className="text-xs text-gray-400">Cargando roles...</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {roles?.map(role => (
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
      </div>

      {/* Datos personales */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>Datos personales</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Nombre *" error={errors.nombre}>
            <input
              className={ci(errors.nombre)}
              value={nombre}
              onChange={e => { setNombre(e.target.value); clr('nombre') }}
              placeholder="John"
            />
          </Field>

          <Field label="Primer apellido *" error={errors.primer_apellido}>
            <input
              className={ci(errors.primer_apellido)}
              value={primerApellido}
              onChange={e => { setPrimerApellido(e.target.value); clr('primer_apellido') }}
              placeholder="Doe"
            />
          </Field>

          <Field label="Segundo apellido">
            <input
              className={inputClass}
              value={segundoApellido}
              onChange={e => setSegundoApellido(e.target.value)}
              placeholder="Smith"
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

          <Field label="Número de documento *" error={errors.numero_documento}>
            <input
              className={ci(errors.numero_documento)}
              value={numeroDocumento}
              onChange={e => { setNumeroDocumento(e.target.value); clr('numero_documento') }}
              placeholder="12345678A"
            />
          </Field>

          <Field label="Fecha de nacimiento *" error={errors.fecha_nacimiento}>
            <input
              className={ci(errors.fecha_nacimiento)}
              type="date"
              value={fechaNacimiento}
              onChange={e => { setFechaNacimiento(e.target.value); clr('fecha_nacimiento') }}
            />
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
        <p className={sectionTitleClass}>Datos de contacto</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Teléfono">
            <input className={inputClass} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+34 600 000 000" />
          </Field>
          <Field label="Teléfono alternativo">
            <input className={inputClass} value={telefonoAlt} onChange={e => setTelefonoAlt(e.target.value)} placeholder="+34 600 000 001" />
          </Field>
        </div>
      </div>

      {/* Dirección */}
      <div className={sectionClass}>
        <p className={sectionTitleClass}>Dirección</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="País">
            <input className={inputClass} value={pais} onChange={e => setPais(e.target.value)} placeholder="España" />
          </Field>
          <Field label="Departamento / Provincia">
            <input className={inputClass} value={departamento} onChange={e => setDepartamento(e.target.value)} placeholder="Madrid" />
          </Field>
          <Field label="Ciudad">
            <input className={inputClass} value={ciudad} onChange={e => setCiudad(e.target.value)} placeholder="Madrid" />
          </Field>
          <Field label="Código postal">
            <input className={inputClass} value={codigoPostal} onChange={e => setCodigoPostal(e.target.value)} placeholder="28001" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Dirección">
              <input className={inputClass} value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Calle Mayor 1, 2º A" />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 transition-colors"
        >
          {isLoading ? 'Guardando...' : mode === 'create' ? 'Crear usuario' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
