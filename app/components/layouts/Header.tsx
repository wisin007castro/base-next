'use client'
import React, { useContext } from 'react'
import { FaAnglesRight } from 'react-icons/fa6'
import { BsSun, BsMoon } from "react-icons/bs";
import { MenuContext } from '../context/MenuContext'
import { useTheme } from 'next-themes'

const Header = () => {
  const { toggleMenu } = useContext(MenuContext)
  const { theme, setTheme } = useTheme()

  return (
    <header className='bg-cyan-600 dark:bg-brandOpacity border-b border-gray-200 dark:border-gray-700'>
      <div className='w-full'>
        <div className='flex items-stretch justify-between h-14'>
          {/* Mobile Toggle Menu */}
          <div className='flex lg:hidden items-center ps-3 me-1'>
            <button
              onClick={toggleMenu}
              className='p-2 hover:text-gray-100 dark:hover:bg-gray-700 rounded transition'
              title='Show aside menu'
            >
              <FaAnglesRight className='text-gray-700 dark:text-gray-300 cursor-pointer w-5 h-5' />
            </button>
          </div>

          {/* Mobile Logo */}
          <div className='flex items-center flex-grow lg:flex-grow-0'>
            <div className='text-lg font-bold text-brand dark:text-white px-4'>
              Brand
            </div>
          </div>

          {/* Main Wrapper */}
          <div className='flex items-stretch justify-between flex-grow lg:flex-grow'>
            {/* Left Section */}
            <div className='flex items-center gap-4 px-4'>
              {/* Add your left side content here */}
            </div>

            {/* Right Section */}
            <div className='flex items-center gap-4 px-4'>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className='p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center'
                title='Toggle theme'
              >
                {theme === 'dark' ? (
                  <BsSun className='w-5 h-5 text-yellow-400' />
                ) : (
                  <BsMoon className='w-5 h-5 text-gray-400' />
                )}
              </button>
            </div>
            <div className='flex items-center pr-4'>User Icon</div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
