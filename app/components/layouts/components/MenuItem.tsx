'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaAngleRight } from 'react-icons/fa'
import { OptionMenu } from '@/app/constants/menu'

interface MenuItemProps {
  item: OptionMenu
}

// Signature active state: left-edge 2px indigo indicator + subtle fill
// Inactive: --ink-2 navy value (#8ba6c8) — blue-tinted, nativo del mundo navy del sidebar
const activeClass = 'rounded-r-md bg-white/[0.08] border-l-2 border-[var(--accent)] pl-[14px] pr-4 py-2.5 text-white'
const inactiveClass = 'rounded-md hover:bg-white/[0.05] px-4 py-2.5 text-[#8ba6c8] hover:text-[#c8daea]'

/** Activo en su ruta y en las de debajo (/categorias → /categorias/nuevo, /blog → /blog/5); "/" solo exacto */
const matches = (href: string | undefined, pathname: string) =>
  !!href && (pathname === href || (href !== '/' && pathname.startsWith(`${href}/`)))

const MenuItem = ({ item }: MenuItemProps) => {
  const pathname = usePathname()
  const hasActiveChild = !!item.submenu?.some(sub => matches(sub.href, pathname))
  // Abierto de entrada si estamos dentro de una de sus páginas
  const [expanded, setExpanded] = useState(hasActiveChild)
  // …y también al navegar hacia una de ellas (el sidebar no se desmonta entre páginas)
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    if (hasActiveChild) setExpanded(true)
  }
  const Icon = item.icon

  const isActive = matches(item.href, pathname)

  if (item.submenu && item.expandable) {
    return (
      <div className="space-y-0.5">
        <div
          onClick={() => setExpanded(!expanded)}
          className={`group flex cursor-pointer items-center transition-colors ${
            hasActiveChild ? activeClass : inactiveClass
          }`}
        >
          {Icon && (
            <Icon
              className={`mr-3 h-4 w-4 shrink-0 ${
                hasActiveChild ? 'text-[var(--accent)]' : 'group-hover:text-[#c8daea]'
              }`}
            />
          )}
          <span className="flex-1 text-sm font-medium">{item.label}</span>
          <FaAngleRight className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>

        {expanded && (
          <div className="ml-4 space-y-0.5 border-l border-white/[0.06] pl-2">
            {item.submenu.map(subitem => {
              const SubIcon = subitem.icon
              const isSubActive = matches(subitem.href, pathname)
              return (
                <Link key={subitem.id} href={subitem.href || '#'} aria-current={isSubActive ? 'page' : undefined}>
                  <div
                    className={`group flex cursor-pointer items-center transition-colors ${
                      isSubActive ? activeClass : inactiveClass
                    }`}
                  >
                    {SubIcon && (
                      <SubIcon
                        className={`mr-3 h-4 w-4 shrink-0 ${
                          isSubActive ? 'text-[var(--accent)]' : 'group-hover:text-[#c8daea]'
                        }`}
                      />
                    )}
                    <span className="text-sm font-medium">{subitem.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (!item.href) return null

  return (
    <Link href={item.href} aria-current={isActive ? 'page' : undefined}>
      <div
        className={`group flex cursor-pointer items-center transition-colors ${isActive ? activeClass : inactiveClass}`}
      >
        {Icon && (
          <Icon
            className={`mr-3 h-4 w-4 shrink-0 ${isActive ? 'text-[var(--accent)]' : 'group-hover:text-[#c8daea]'}`}
          />
        )}
        <span className="text-sm font-medium">{item.label}</span>
      </div>
    </Link>
  )
}

export default MenuItem
