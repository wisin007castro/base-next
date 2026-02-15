'use client'
import React, { useContext, useEffect, useState } from 'react'
import { FaAnglesRight, FaAnglesLeft } from 'react-icons/fa6'
import { BsSun, BsMoon } from "react-icons/bs";
import { MenuContext } from '../context/MenuContext'
import { useTheme } from 'next-themes'

const Header = () => {
  const { open, toggleMenu } = useContext(MenuContext)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className='bg-brand border-b border-gray-200 dark:border-gray-700'>
      <div className='w-full'>
        <div className='flex items-stretch justify-between h-14'>
          {/* Mobile Toggle Menu */}
          <div className='flex lg:hidden items-center ps-3 me-1'>
            {open && (
              <button
                onClick={toggleMenu}
                className='p-2 hover:text-gray-100 dark:hover:bg-gray-700 rounded transition'
                title='Mostrar menú'
              >
                <FaAnglesLeft className='cursor-pointer w-5 h-5' />
              </button>
            )}
            {!open && (
              <button
                onClick={toggleMenu}
                className='p-2 hover:text-gray-100 dark:hover:bg-gray-700 rounded transition'
                title='Mostrar menú'
              >
                <FaAnglesRight className='cursor-pointer w-5 h-5' />
              </button>
            )}
          </div>

          {/* Mobile Logo */}
          <div className='flex items-center flex-grow lg:flex-grow-0'>
            <div className='text-lg font-bold px-4'>
              Brand
            </div>
          </div>

          {/* Main Wrapper */}
          <div className='flex items-stretch justify-between flex-grow lg:flex-grow'>
            {/* Left Section */}
            <div className='flex items-center gap-4 px-4'>
              {/* Add your left side content here */}
            </div>
          </div>
          {/* Right Section */}
          <div className='flex items-center gap-4 px-4'>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className='p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center'
              title='Toggle theme'
            >
              {mounted && (theme === 'dark' ? (
                <BsSun className='w-5 h-5 text-yellow-400' />
              ) : (
                <BsMoon className='w-5 h-5 text-sky-200' />
              ))}
            </button>
          </div>
          <div className='flex items-center pr-4 font-bold'>User Icon</div>
        </div>
      </div>
    </header>
  )
}

export default Header
