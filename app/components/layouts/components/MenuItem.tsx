'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { FaAngleRight } from 'react-icons/fa'
import { MenuItem } from '@/app/constants/menu'

interface MenuItemProps {
  item: MenuItem
}

const MenuItem = ({ item }: MenuItemProps) => {
  const [expanded, setExpanded] = useState(false)
  const Icon = item.icon

  if (item.submenu && item.expandable) {
    return (
      <div className='space-y-1'>
        <div
          onClick={() => setExpanded(!expanded)}
          className='flex items-center px-4 py-3 cursor-pointer rounded-lg transition group hover:bg-brand'
        >
          {Icon && <Icon className='w-5 h-5 mr-3 group-hover:text-sky-600' />}
          <span className='font-medium flex-1'>{item.label}</span>
          <FaAngleRight
            className={`w-4 h-4 group-hover:translate-x-1 transition transform ${expanded ? 'rotate-90' : ''
              }`}
          />
        </div>

        {expanded && (
          <div className='ml-6 space-y-1'>
            {item.submenu.map((subitem) => {
              const SubIcon = subitem.icon
              return (
                <Link key={subitem.id} href={subitem.href || '#'}>
                  <div className='flex items-center px-4 py-3 cursor-pointer rounded-lg transition group hover:bg-brand'>
                    {SubIcon && <SubIcon className='w-4 h-4 mr-3 group-hover:text-sky-600' />}
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

  if (!item.href) {
    return null
  }

  return (
    <Link href={item.href}>
      <div className='flex items-center px-4 py-3 cursor-pointer rounded-lg transition group hover:bg-brand'>
        {Icon && <Icon className='w-5 h-5 mr-3 group-hover:text-sky-600 text-bold' />}
        <span className='font-medium'>{item.label}</span>
      </div>
    </Link>
  )
}

export default MenuItem
