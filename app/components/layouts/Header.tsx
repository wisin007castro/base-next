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
import { useMe } from '@/lib/hooks/me.hooks'

// Header is always dark (navy in light mode, deep-navy in dark) — white text throughout
function Avatar({ thumbUrl, initials, size = 8 }: { thumbUrl?: string | null; initials: string; size?: number }) {
  const [imgError, setImgError] = useState(false)
  const cls = `w-${size} h-${size} rounded-full shrink-0`
  const textSize = size <= 8 ? 'text-xs' : 'text-sm'
  if (thumbUrl && !imgError) {
    return (
      <div className={`${cls} relative overflow-hidden`}>
        <Image
          src={thumbUrl}
          alt="Avatar"
          fill
          className="object-cover"
          unoptimized
          onError={() => setImgError(true)}
        />
      </div>
    )
  }
  return (
    <div className={`${cls} flex items-center justify-center bg-accent font-bold text-[var(--accent-fg)] ${textSize}`}>
      {initials}
    </div>
  )
}

function UserMenu() {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const { data: me } = useMe({ enabled: status === 'authenticated' })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (status === 'loading') {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-white/20" />
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        <FiLogIn className="h-4 w-4" />
        Iniciar sesión
      </Link>
    )
  }

  const name = session.user?.name ?? 'Usuario'
  const email = session.user?.email ?? ''
  const initials = name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const thumbUrl = me?.profile?.avatar_thumb_url

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-white/[0.08]"
      >
        <Avatar thumbUrl={thumbUrl} initials={initials} size={8} />
        <span className="hidden max-w-32 truncate text-sm font-medium text-white sm:block">{name}</span>
        <FiChevronDown className={`h-3.5 w-3.5 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown — floats above header, uses content surface tokens */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-lg border border-[var(--line-2)] bg-surface shadow-sm">
          <div className="flex items-center gap-3 border-b border-[var(--line-1)] px-4 py-3">
            <Avatar thumbUrl={thumbUrl} initials={initials} size={10} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-1">{name}</p>
              <p className="truncate text-xs text-ink-3">{email}</p>
            </div>
          </div>

          <div className="p-1.5">
            <Link
              href="/perfil"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-[var(--line-1)] hover:text-ink-1"
            >
              <FiUser className="h-4 w-4" />
              Mi perfil
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-risk transition-colors hover:bg-[var(--risk-bg)]"
            >
              <FiLogOut className="h-4 w-4" />
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

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="border-b border-white/10 bg-header">
      <div className="w-full">
        <div className="flex h-14 items-stretch justify-between">
          {/* Mobile toggle */}
          <div className="me-1 flex items-center ps-3 lg:hidden">
            <button
              onClick={toggleMenu}
              className="rounded-md p-2 text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
              title="Mostrar menú"
            >
              {open ? <FaAnglesLeft className="h-5 w-5" /> : <FaAnglesRight className="h-5 w-5" />}
            </button>
          </div>

          {/* Brand */}
          <div className="flex flex-grow items-center lg:flex-grow-0">
            <div className="px-4 text-sm font-semibold uppercase tracking-widest text-white">Brand</div>
          </div>

          <div className="flex-grow" />

          {/* Right controls */}
          <div className="flex items-center gap-1 px-4">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-md p-2 text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
              title="Toggle theme"
            >
              {mounted && (theme === 'dark' ? <BsSun className="h-4 w-4" /> : <BsMoon className="h-4 w-4" />)}
            </button>

            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
