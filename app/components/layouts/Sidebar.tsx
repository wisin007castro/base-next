'use client'
import React, { useContext } from 'react'
import { useSession } from 'next-auth/react'
import { MenuContext } from '../context/MenuContext'
import { optionMenus } from '@/app/constants/menu'
import MenuItem from './components/MenuItem'
import Link from 'next/link'

const Sidebar = () => {
  const { open, toggleMenu } = useContext(MenuContext)
  const { data: session } = useSession()
  const userRoles = (session?.user as { roles?: string[] })?.roles ?? []

  const visibleMenus = optionMenus.filter((item) => {
    if (!item.allowedRoles) return true
    return item.allowedRoles.some((r) => userRoles.includes(r))
  })

  return (
    <>
      {/* Overlay para cerrar sidebar en móvil */}
      {open && (
        <div
          className='fixed inset-0 bg-black/50 lg:hidden z-30'
          onClick={toggleMenu}
        />
      )}

      {/* Sidebar — always dark regardless of color mode */}
      <aside
        className={`
          bg-sidebar text-slate-400
          overflow-y-auto overflow-x-hidden
          transition-all duration-300 ease-in-out
          ${open ? "w-60 visible" : "w-0 invisible"}
          lg:w-60 lg:visible
          flex flex-col
          fixed lg:static
          h-screen lg:h-auto
          z-40
          border-r border-[var(--sidebar-border)]
        `}
      >
        {/* Logo */}
        <div className='flex-shrink-0 px-4 border-b border-[var(--sidebar-border)]'>
          <Link
            href='/'
            className='text-sm font-semibold tracking-widest uppercase h-14 flex items-center text-slate-100 hover:text-indigo-300 transition-colors'
          >
            Logo Marca
          </Link>
        </div>

        {/* Navigation */}
        <div className='flex-1 overflow-y-auto px-3 py-4'>
          <div className='space-y-0.5'>
            {visibleMenus.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className='flex-shrink-0 px-3 py-4 border-t border-[var(--sidebar-border)]'>
          <button className='w-full px-3 py-2 bg-white/[0.06] hover:bg-white/[0.10] text-slate-300 hover:text-white text-sm font-medium rounded-md transition-colors'>
            Documentation
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
