'use client'
import React, { useContext } from 'react'
import { MenuContext } from '../context/MenuContext'
import { optionMenus } from '@/app/constants/menu'
import MenuItem from './components/MenuItem'

const Sidebar = () => {
  const { open, toggleMenu } = useContext(MenuContext)

  return (
    <>
      {/* Overlay para cerrar sidebar en móvil */}
      {open && (
        <div
          className='fixed inset-0 bg-black/50 lg:hidden z-30'
          onClick={toggleMenu}
        />
      )}

      <aside className={`
        bg-cyan-700 text-black
        dark:bg-brandOpacity dark:text-white
        overflow-y-auto overflow-x-hidden
        transition-all duration-300 ease-in-out
        ${open ? "w-60 visible" : "w-0 invisible"}
        lg:w-60 lg:visible
        flex flex-col
        fixed lg:static
        h-screen lg:h-auto
        z-40
      `}>
        {/* Aside Logo */}
        <div className='flex-shrink-0 px-4 border-b border-gray-700 bg-cyan-900'>
          <a href="/" className='text-xl font-bold h-14 grid grid-cols-1 content-center hover:text-brand/80 transition'>
            Logo Marca
          </a>
        </div>

        {/* Aside Menu */}
        <div className='flex-1 overflow-y-auto px-4 py-5'>
          <div className='space-y-2'>
            {optionMenus.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>



        {/* Aside Footer */}
        <div className='flex-shrink-0 px-4 py-5 border-t border-gray-700'>
          <button className='w-full px-4 py-2 bg-brand hover:bg-brand/90 text-white font-medium rounded-lg transition'>
            Documentation
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
