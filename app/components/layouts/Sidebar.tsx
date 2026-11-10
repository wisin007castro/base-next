'use client'
import React, { useContext } from 'react'
import { useSession } from 'next-auth/react'
import { MenuContext } from '../context/MenuContext'
import { optionMenus } from '@/app/constants/menu'
import MenuItem from './components/MenuItem'
import { Brand } from './components/Brand'
import Link from 'next/link'

const Sidebar = () => {
  const { open, toggleMenu } = useContext(MenuContext)
  const { data: session } = useSession()
  const user = session?.user as { roles?: string[]; permissions?: string[] } | undefined
  const userRoles = user?.roles ?? []
  const userPerms = user?.permissions ?? []
  const isAdmin = userRoles.includes('admin')

  const visibleMenus = optionMenus.filter(item => {
    if (item.allowedRoles && !item.allowedRoles.some(r => userRoles.includes(r))) return false
    if (item.permission && !isAdmin && !userPerms.includes(item.permission)) return false
    return true
  })

  return (
    <>
      {/* Overlay para cerrar sidebar en móvil */}
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={toggleMenu} />}

      {/* Sidebar — always dark regardless of color mode */}
      <aside
        className={`overflow-y-auto overflow-x-hidden bg-sidebar text-slate-400 transition-all duration-300 ease-in-out ${open ? 'visible w-60' : 'invisible w-0'} fixed z-40 flex h-screen flex-col border-r border-[var(--sidebar-border)] lg:visible lg:static lg:h-auto lg:w-60`}
      >
        {/* Logo */}
        <div className="flex-shrink-0 border-b border-[var(--sidebar-border)] px-4">
          <Link
            href="/"
            className="flex h-14 items-center text-sm font-semibold uppercase tracking-widest text-slate-100 transition-colors hover:text-indigo-300"
          >
            <Brand />
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-0.5">
            {visibleMenus.map(item => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-[var(--sidebar-border)] px-3 py-4">
          <button className="w-full rounded-md bg-white/[0.06] px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.10] hover:text-white">
            Documentation
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
