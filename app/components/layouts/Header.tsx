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

// Header is always dark (navy in light mode, deep-navy in dark) — white text throughout
function Avatar({ thumbUrl, initials, size = 8 }: { thumbUrl?: string | null; initials: string; size?: number }) {
  const [imgError, setImgError] = useState(false)
  const cls = `w-${size} h-${size} rounded-full shrink-0`
  const textSize = size <= 8 ? 'text-xs' : 'text-sm'
  if (thumbUrl && !imgError) {
    return (
      <div className={`${cls} relative overflow-hidden`}>
        <Image src={thumbUrl} alt="Avatar" fill className="object-cover" unoptimized onError={() => setImgError(true)} />
      </div>
    )
  }
  return (
    <div className={`${cls} bg-accent flex items-center justify-center text-[var(--accent-fg)] font-bold ${textSize}`}>
      {initials}
    </div>
  )
}

function UserMenu() {
  const { data: session, status } = useSession()
  const [open, setOpen]     = useState(false)
  const [me, setMe]         = useState<User | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(data => data && setMe(data)).catch(() => null)
  }, [status])

  if (status === 'loading') {
    return <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse" />
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors"
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
        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/[0.08] transition-colors"
      >
        <Avatar thumbUrl={thumbUrl} initials={initials} size={8} />
        <span className="hidden sm:block text-sm font-medium text-white max-w-32 truncate">
          {name}
        </span>
        <FiChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown — floats above header, uses content surface tokens */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 rounded-lg border border-[var(--line-2)] bg-surface shadow-sm z-50">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--line-1)]">
            <Avatar thumbUrl={thumbUrl} initials={initials} size={10} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-1 truncate">{name}</p>
              <p className="text-xs text-ink-3 truncate">{email}</p>
            </div>
          </div>

          <div className="p-1.5">
            <Link
              href="/perfil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-sm text-ink-2 hover:bg-[var(--line-1)] hover:text-ink-1 transition-colors"
            >
              <FiUser className="w-4 h-4" />
              Mi perfil
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-sm text-risk hover:bg-[var(--risk-bg)] transition-colors"
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
    <header className='bg-header border-b border-white/10'>
      <div className='w-full'>
        <div className='flex items-stretch justify-between h-14'>
          {/* Mobile toggle */}
          <div className='flex lg:hidden items-center ps-3 me-1'>
            <button
              onClick={toggleMenu}
              className='p-2 text-white/60 hover:text-white hover:bg-white/[0.08] rounded-md transition-colors'
              title='Mostrar menú'
            >
              {open ? <FaAnglesLeft className='w-5 h-5' /> : <FaAnglesRight className='w-5 h-5' />}
            </button>
          </div>

          {/* Brand */}
          <div className='flex items-center flex-grow lg:flex-grow-0'>
            <div className='text-sm font-semibold tracking-widest uppercase px-4 text-white'>Brand</div>
          </div>

          <div className='flex-grow' />

          {/* Right controls */}
          <div className='flex items-center gap-1 px-4'>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className='p-2 rounded-md text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors'
              title='Toggle theme'
            >
              {mounted && (theme === 'dark'
                ? <BsSun className='w-4 h-4' />
                : <BsMoon className='w-4 h-4' />
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
