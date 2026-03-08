'use client'
import { useState } from 'react'
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

// -------------------------------------------------------------------
// Helpers de UI
// -------------------------------------------------------------------
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 ' +
  'focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 ' +
  'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500'

const selectClass = inputClass

const sectionClass = 'rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4'
const sectionTitleClass = 'text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4'

// -------------------------------------------------------------------
// Componente
// -------------------------------------------------------------------
export function UserForm(props: Props) {
  const { mode, onSubmit, isLoading } = props
  const initial = mode === 'edit' ? props.user : null

  const { data: roles, isLoading: rolesLoading } = useRoles()

  const [username, setUsername] = useState(initial?.username ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [roleIds, setRoleIds] = useState<number[]>(initial?.roles?.map(r => r.id) ?? [])
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [password, setPassword] = useState('')
  const [passwordConf, setPasswordConf] = useState('')

  // Perfil
  const p = initial?.profile
  const [nombre, setNombre] = useState(p?.nombre ?? '')
  const [primerApellido, setPrimerApellido] = useState(p?.primer_apellido ?? '')
  const [segundoApellido, setSegundoApellido] = useState(p?.segundo_apellido ?? '')
  const [tipoDocumento, setTipoDocumento] = useState<DocumentType>(p?.tipo_documento ?? 'dni')
  const [numeroDocumento, setNumeroDocumento] = useState(p?.numero_documento ?? '')
  const [fechaNacimiento, setFechaNacimiento] = useState(p?.fecha_nacimiento ?? '')
  const [genero, setGenero] = useState<Gender>(p?.genero ?? 'prefiero_no_decir')
  // Contacto
  const [telefono, setTelefono] = useState(p?.telefono ?? '')
  const [telefonoAlt, setTelefonoAlt] = useState(p?.telefono_alternativo ?? '')
  // Dirección
  const [pais, setPais] = useState(p?.pais ?? '')
  const [departamento, setDepartamento] = useState(p?.departamento ?? '')
  const [ciudad, setCiudad] = useState(p?.ciudad ?? '')
  const [direccion, setDireccion] = useState(p?.direccion ?? '')
  const [codigoPostal, setCodigoPostal] = useState(p?.codigo_postal ?? '')

  function toggleRole(id: number) {
    setRoleIds(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const profile = {
      nombre,
      primer_apellido: primerApellido,
      segundo_apellido: segundoApellido || null,
      tipo_documento: tipoDocumento,
      numero_documento: numeroDocumento,
      fecha_nacimiento: fechaNacimiento,
      genero,
      telefono: telefono || null,
      telefono_alternativo: telefonoAlt || null,
      pais: pais || null,
      departamento: departamento || null,
      ciudad: ciudad || null,
      direccion: direccion || null,
      codigo_postal: codigoPostal || null,
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
          <Field label="Username *">
            <input className={inputClass} value={username} onChange={e => setUsername(e.target.value)} required placeholder="johndoe" />
          </Field>
          <Field label="Correo electrónico *">
            <input className={inputClass} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="john@ejemplo.com" />
          </Field>
          <Field label="Estado">
            <select className={selectClass} value={isActive ? 'true' : 'false'} onChange={e => setIsActive(e.target.value === 'true')}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </Field>
          <Field label={mode === 'create' ? 'Contraseña *' : 'Nueva contraseña (opcional)'}>
            <input className={inputClass} type="password" value={password} onChange={e => setPassword(e.target.value)} required={mode === 'create'} placeholder="••••••••" />
          </Field>
          <Field label="Confirmar contraseña">
            <input className={inputClass} type="password" value={passwordConf} onChange={e => setPasswordConf(e.target.value)} required={mode === 'create' || !!password} placeholder="••••••••" />
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
          <Field label="Nombre *">
            <input className={inputClass} value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="John" />
          </Field>
          <Field label="Primer apellido *">
            <input className={inputClass} value={primerApellido} onChange={e => setPrimerApellido(e.target.value)} required placeholder="Doe" />
          </Field>
          <Field label="Segundo apellido">
            <input className={inputClass} value={segundoApellido} onChange={e => setSegundoApellido(e.target.value)} placeholder="Smith" />
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
            <input className={inputClass} value={numeroDocumento} onChange={e => setNumeroDocumento(e.target.value)} required placeholder="12345678A" />
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
