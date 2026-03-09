'use client'
import { useRef, useState } from 'react'
import Image from 'next/image'
import { FiUpload, FiUser } from 'react-icons/fi'

interface UploadResult {
  avatar_url:       string
  avatar_key:       string
  avatar_thumb_url: string
  avatar_thumb_key: string
}

interface Props {
  currentUrl?: string | null
  uploadUrl: string
  onUploaded?: (result: UploadResult) => void
}

export default function AvatarUpload({ currentUrl, uploadUrl, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview]   = useState<string | null>(currentUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(uploadUrl, { method: 'POST', body: fd })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? 'Error al subir imagen')
      }
      const data: UploadResult = await res.json()
      // Mostrar la versión full como preview local
      setPreview(data.avatar_url)
      onUploaded?.(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen')
      setPreview(currentUrl ?? null)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative h-24 w-24 cursor-pointer rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
        onClick={() => !uploading && inputRef.current?.click()}
        title="Haz clic para cambiar el avatar"
      >
        {preview ? (
          <Image src={preview} alt="Avatar" fill className="object-cover" unoptimized />
        ) : (
          <FiUser className="h-10 w-10 text-gray-400" />
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400 disabled:opacity-50"
      >
        <FiUpload className="h-3.5 w-3.5" />
        {uploading ? 'Subiendo...' : 'Cambiar foto'}
      </button>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
