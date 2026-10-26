import { z } from '@/lib/validation/zod-config'
import { createUserSchema, DOCUMENT_TYPES, GENDERS } from '@/lib/api/schemas/user.schema'
import type { User, UserProfile } from '@/lib/types/user.types'

// Reglas de campo reutilizadas del schema del servidor
const { username, email, password } = createUserSchema.shape

/** Contraseña opcional: vacía = no cambiar */
const optionalPassword = z.union([z.literal(''), password])

const passwordsMatch = (v: { password: string; password_confirmation: string }) =>
  !v.password || v.password === v.password_confirmation
const passwordsMatchError = { message: 'Las contraseñas no coinciden', path: ['password_confirmation'] }

// ─── Datos personales (compartido: alta, edición admin y perfil) ──────────────
export const personalDataFields = {
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  primer_apellido: z.string().trim().min(1, 'El primer apellido es obligatorio').max(100),
  segundo_apellido: z.string().max(100),
  tipo_documento: z.enum(DOCUMENT_TYPES),
  numero_documento: z.string().trim().min(1, 'El número de documento es obligatorio').max(50),
  fecha_nacimiento: z.string().min(1, 'La fecha de nacimiento es obligatoria'),
  genero: z.enum(GENDERS),
  telefono: z.string().max(30),
  telefono_alternativo: z.string().max(30),
  pais: z.string().max(100),
  departamento: z.string().max(100),
  ciudad: z.string().max(100),
  direccion: z.string().max(255),
  codigo_postal: z.string().max(20),
}

export const personalDataFormSchema = z.object(personalDataFields)
export type PersonalDataFormValues = z.infer<typeof personalDataFormSchema>

export const personalDataDefaults = (p?: UserProfile | null): PersonalDataFormValues => ({
  nombre: p?.nombre ?? '',
  primer_apellido: p?.primer_apellido ?? '',
  segundo_apellido: p?.segundo_apellido ?? '',
  tipo_documento: p?.tipo_documento ?? 'dni',
  numero_documento: p?.numero_documento ?? '',
  fecha_nacimiento: p?.fecha_nacimiento ?? '',
  genero: p?.genero ?? 'prefiero_no_decir',
  telefono: p?.telefono ?? '',
  telefono_alternativo: p?.telefono_alternativo ?? '',
  pais: p?.pais ?? '',
  departamento: p?.departamento ?? '',
  ciudad: p?.ciudad ?? '',
  direccion: p?.direccion ?? '',
  codigo_postal: p?.codigo_postal ?? '',
})

/** Valores del form → `profile` del DTO (cadenas vacías → null) */
export const toProfileDto = (v: PersonalDataFormValues) => ({
  nombre: v.nombre,
  primer_apellido: v.primer_apellido,
  segundo_apellido: v.segundo_apellido || null,
  tipo_documento: v.tipo_documento,
  numero_documento: v.numero_documento,
  fecha_nacimiento: v.fecha_nacimiento,
  genero: v.genero,
  telefono: v.telefono || null,
  telefono_alternativo: v.telefono_alternativo || null,
  pais: v.pais || null,
  departamento: v.departamento || null,
  ciudad: v.ciudad || null,
  direccion: v.direccion || null,
  codigo_postal: v.codigo_postal || null,
})

// ─── Alta de usuario (admin) ──────────────────────────────────────────────────
export const createUserFormSchema = z
  .object({
    username,
    email,
    password,
    password_confirmation: z.string(),
    is_active: z.boolean(),
    role_ids: z.array(z.number().int().positive()),
    ...personalDataFields,
  })
  .refine(passwordsMatch, passwordsMatchError)

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>

export const createUserFormDefaults: CreateUserFormValues = {
  username: '',
  email: '',
  password: '',
  password_confirmation: '',
  is_active: true,
  role_ids: [],
  ...personalDataDefaults(),
}

export const toCreateUserDto = ({
  username,
  email,
  password,
  password_confirmation,
  is_active,
  role_ids,
  ...profile
}: CreateUserFormValues) => ({
  username,
  email,
  password,
  password_confirmation,
  is_active,
  role_ids,
  profile: toProfileDto(profile),
})

// ─── Cuenta de usuario (edición admin) ────────────────────────────────────────
export const userAccountFormSchema = z
  .object({
    username,
    email,
    is_active: z.boolean(),
    role_ids: z.array(z.number().int().positive()),
    password: optionalPassword,
    password_confirmation: z.string(),
  })
  .refine(passwordsMatch, passwordsMatchError)

export type UserAccountFormValues = z.infer<typeof userAccountFormSchema>

export const userAccountDefaults = (u: User): UserAccountFormValues => ({
  username: u.username,
  email: u.email,
  is_active: u.is_active,
  role_ids: u.roles?.map(r => r.id) ?? [],
  password: '',
  password_confirmation: '',
})

export const toUserAccountDto = ({ password, password_confirmation, ...rest }: UserAccountFormValues) =>
  password ? { ...rest, password, password_confirmation } : rest

// ─── Mi cuenta (perfil propio) ────────────────────────────────────────────────
export const myAccountFormSchema = z
  .object({
    username,
    email,
    password: optionalPassword,
    password_confirmation: z.string(),
    current_password: z.string(),
  })
  .refine(passwordsMatch, passwordsMatchError)
  .refine(v => !v.password || !!v.current_password, {
    message: 'La contraseña actual es requerida',
    path: ['current_password'],
  })

export type MyAccountFormValues = z.infer<typeof myAccountFormSchema>

export const myAccountDefaults = (u: User): MyAccountFormValues => ({
  username: u.username,
  email: u.email,
  password: '',
  password_confirmation: '',
  current_password: '',
})

export const toMyAccountDto = ({
  username,
  email,
  password,
  password_confirmation,
  current_password,
}: MyAccountFormValues) =>
  password ? { username, email, password, password_confirmation, current_password } : { username, email }

// ─── Opciones de selects ──────────────────────────────────────────────────────
export const documentTypeOptions = [
  { value: 'dni', label: 'DNI' },
  { value: 'cedula', label: 'Cédula' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'nie', label: 'NIE' },
] as const satisfies { value: (typeof DOCUMENT_TYPES)[number]; label: string }[]

export const genderOptions = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'otro', label: 'Otro' },
  { value: 'prefiero_no_decir', label: 'Prefiero no decir' },
] as const satisfies { value: (typeof GENDERS)[number]; label: string }[]

export const activeOptions = [
  { value: true, label: 'Activo' },
  { value: false, label: 'Inactivo' },
]
