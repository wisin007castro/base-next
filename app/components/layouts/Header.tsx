'use client'
import React, { useContext, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FaAnglesRight, FaAnglesLeft } from 'react-icons/fa6'
import { BsSun, BsMoon } from 'react-icons/bs'
import { FiLogOut, FiLogIn, FiUser, FiChevronDown } from 'react-icons/fi'
import { useSession, signOut } from 'next-auth/react'
import { MenuContext } from '../context/MenuContext'
import { useTheme } from 'next-themes'
import type { User } from '@/lib/types/user.types'

function Avatar({ thumbUrl, initials, size = 8 }: { thumbUrl?: string | null; initials: string; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full shrink-0`
  if (thumbUrl) {
    return (
      <div className={`${cls} relative overflow-hidden`}>
        <Image src={thumbUrl} alt="Avatar" fill className="object-cover" unoptimized />
      </div>
    )
  }
  const textSize = size <= 8 ? 'text-xs' : 'text-sm'
  return (
    <div className={`${cls} bg-sky-600 flex items-center justify-center text-white font-bold ${textSize}`}>
      {initials}
    </div>
  )
}

function UserMenu() {
  const { data: session, status } = useSession()
  const [open, setOpen]     = useState(false)
  const [me, setMe]         = useState<User | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Obtener perfil del usuario para el avatar thumb
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(data => data && setMe(data)).catch(() => null)
  }, [status])

  if (status === 'loading') {
    return <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse" />
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-sky-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
      >
        <FiLogIn className="w-4 h-4" />
        Iniciar sesión
      </Link>
    )
  }

  const name     = session.user?.name ?? 'Usuario'
  const email    = session.user?.email ?? ''
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const thumbUrl = me?.profile?.avatar_thumb_url

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
      >
        <Avatar thumbUrl={thumbUrl} initials={initials} size={8} />
        <span className="hidden sm:block text-sm font-medium text-gray-800 dark:text-gray-100 max-w-32 truncate">
          {name}
        </span>
        <FiChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-50">
          {/* Datos del usuario */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <Avatar thumbUrl={thumbUrl} initials={initials} size={10} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{email}</p>
            </div>
          </div>

          {/* Acciones */}
          <div className="p-1.5">
            <Link
              href="/perfil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <FiUser className="w-4 h-4" />
              Mi perfil
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <FiLogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const Header = () => {
  const { open, toggleMenu } = useContext(MenuContext)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  return (
    <header className='bg-brand border-b border-gray-200 dark:border-gray-700'>
      <div className='w-full'>
        <div className='flex items-stretch justify-between h-14'>
          {/* Mobile Toggle Menu */}
          <div className='flex lg:hidden items-center ps-3 me-1'>
            <button
              onClick={toggleMenu}
              className='p-2 hover:text-gray-100 dark:hover:bg-gray-700 rounded transition'
              title='Mostrar menú'
            >
              {open ? <FaAnglesLeft className='w-5 h-5' /> : <FaAnglesRight className='w-5 h-5' />}
            </button>
          </div>

          {/* Mobile Logo */}
          <div className='flex items-center flex-grow lg:flex-grow-0'>
            <div className='text-lg font-bold px-4'>Brand</div>
          </div>

          {/* Center spacer */}
          <div className='flex-grow' />

          {/* Right Section */}
          <div className='flex items-center gap-2 px-4'>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className='p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition'
              title='Toggle theme'
            >
              {mounted && (theme === 'dark'
                ? <BsSun className='w-5 h-5 text-yellow-400' />
                : <BsMoon className='w-5 h-5 text-sky-200' />
              )}
            </button>

            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
