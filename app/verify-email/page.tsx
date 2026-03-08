import Link from 'next/link'
import { FiCheckCircle, FiAlertCircle, FiInfo } from 'react-icons/fi'

interface Props {
  searchParams: Promise<{ status?: string; error?: string }>
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { status, error } = await searchParams

  type Variant = { icon: React.ReactNode; title: string; message: string; color: string }

  const variants: Record<string, Variant> = {
    success: {
      icon:    <FiCheckCircle className="h-12 w-12 text-green-500" />,
      title:   '¡Cuenta verificada!',
      message: 'Tu correo ha sido verificado correctamente. Ya podés iniciar sesión.',
      color:   'text-green-600 dark:text-green-400',
    },
    already: {
      icon:    <FiInfo className="h-12 w-12 text-sky-500" />,
      title:   'Ya verificado',
      message: 'Tu cuenta ya estaba verificada anteriormente.',
      color:   'text-sky-600 dark:text-sky-400',
    },
    invalid: {
      icon:    <FiAlertCircle className="h-12 w-12 text-red-500" />,
      title:   'Enlace inválido o expirado',
      message: 'El enlace de verificación no es válido o ha expirado. Solicitá uno nuevo al administrador.',
      color:   'text-red-600 dark:text-red-400',
    },
    missing: {
      icon:    <FiAlertCircle className="h-12 w-12 text-red-500" />,
      title:   'Token faltante',
      message: 'No se encontró el token de verificación en el enlace.',
      color:   'text-red-600 dark:text-red-400',
    },
    notfound: {
      icon:    <FiAlertCircle className="h-12 w-12 text-red-500" />,
      title:   'Usuario no encontrado',
      message: 'No se encontró el usuario asociado a este enlace.',
      color:   'text-red-600 dark:text-red-400',
    },
  }

  const key     = status ?? error ?? 'invalid'
  const variant = variants[key] ?? variants.invalid

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 shadow-sm text-center">
        <div className="flex justify-center mb-4">{variant.icon}</div>
        <h1 className={`text-xl font-semibold mb-2 ${variant.color}`}>{variant.title}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{variant.message}</p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-sky-600 px-5 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
        >
          Ir al inicio de sesión
        </Link>
      </div>
    </div>
  )
}
