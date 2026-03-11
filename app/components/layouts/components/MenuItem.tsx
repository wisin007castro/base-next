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

const MenuItem = ({ item }: MenuItemProps) => {
  const [expanded, setExpanded] = useState(false)
  const pathname = usePathname()
  const Icon = item.icon

  const isActive = item.href === pathname

  if (item.submenu && item.expandable) {
    const hasActiveChild = item.submenu.some(sub => sub.href === pathname)

    return (
      <div className='space-y-0.5'>
        <div
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center cursor-pointer transition-colors group ${
            hasActiveChild ? activeClass : inactiveClass
          }`}
        >
          {Icon && (
            <Icon className={`w-4 h-4 mr-3 shrink-0 ${
              hasActiveChild ? 'text-[var(--accent)]' : 'group-hover:text-[#c8daea]'
            }`} />
          )}
          <span className='font-medium text-sm flex-1'>{item.label}</span>
          <FaAngleRight
            className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </div>

        {expanded && (
          <div className='ml-4 space-y-0.5 border-l border-white/[0.06] pl-2'>
            {item.submenu.map((subitem) => {
              const SubIcon = subitem.icon
              const isSubActive = subitem.href === pathname
              return (
                <Link key={subitem.id} href={subitem.href || '#'}>
                  <div className={`flex items-center cursor-pointer transition-colors group ${
                    isSubActive ? activeClass : inactiveClass
                  }`}>
                    {SubIcon && (
                      <SubIcon className={`w-4 h-4 mr-3 shrink-0 ${
                        isSubActive ? 'text-[var(--accent)]' : 'group-hover:text-[#c8daea]'
                      }`} />
                    )}
                    <span className='font-medium text-sm'>{subitem.label}</span>
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
    <Link href={item.href}>
      <div className={`flex items-center cursor-pointer transition-colors group ${
        isActive ? activeClass : inactiveClass
      }`}>
        {Icon && (
          <Icon className={`w-4 h-4 mr-3 shrink-0 ${
            isActive ? 'text-[var(--accent)]' : 'group-hover:text-[#c8daea]'
          }`} />
        )}
        <span className='font-medium text-sm'>{item.label}</span>
      </div>
    </Link>
  )
}

export default MenuItem
