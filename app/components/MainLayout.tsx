'use client'
import React, { useContext } from 'react'


import MainHeader from './layouts/MainHeader'
import Link from 'next/link'
import { AiOutlineHome } from 'react-icons/ai'
import { GrProjects } from 'react-icons/gr'
import { FaAngleRight } from 'react-icons/fa'
import { MenuContext } from './context/MenuContext'

const MainLayout = ({ children }) => {

  const { open } = useContext(MenuContext)
  return (
    <div className='bg-gray-100 dark:bg-gray-900 w-screen min-h-screen flex flex-col'>
      <div className='flex flex-1'>
        {/* Aside Sidebar */}
        <aside className={`
          bg-cyan-600 text-black
          dark:bg-brandOpacity dark:text-white
          border-r border-gray-700
          overflow-y-auto overflow-x-hidden
          transition-all duration-300 ease-in-out
          ${open ? "w-60 visible" : "w-0 invisible"}
          lg:w-60 lg:visible
          flex flex-col
        `}>
          {/* Aside Logo */}
          <div className='flex-shrink-0 px-6 py-4 border-b border-gray-700'>
            <div className='flex items-center justify-between'>
              <a href="/" className='text-xl font-bold text-brand hover:text-brand/80 transition'>
                Logo Marca
              </a>
              <button
                className='lg:hidden p-2 hover:bg-gray-700 rounded transition'
                onClick={() => { }}
                title='Toggle sidebar'
              >
                <FaAngleRight className='w-4 h-4' />
              </button>
            </div>
          </div>

          {/* Aside Menu */}
          <div className='flex-1 overflow-y-auto px-4 py-5'>
            <div className='space-y-2'>
              {/* Menu Item - Home */}
              <Link href="/">
                <div className='flex items-center px-4 py-3 cursor-pointer rounded-lg transition group
                  hover:bg-brand text-gray-300 hover:text-white
                '>
                  <AiOutlineHome className='w-5 h-5 mr-3 group-hover:text-sky-600 text-bold' />
                  <span className='font-medium'>Home</span>
                </div>
              </Link>

              {/* Menu Item - Projects */}
              <div className='flex items-center px-4 py-3 cursor-pointer rounded-lg transition group
                hover:bg-brand text-gray-300 hover:text-white
              '>
                <GrProjects className='w-5 h-5 mr-3 group-hover:text-sky-600' />
                <span className='font-medium flex-1'>Projects</span>
                <FaAngleRight className='w-4 h-4 group-hover:translate-x-1 transition' />
              </div>
              <Link href="/">
                <div className='flex items-center px-4 py-3 cursor-pointer rounded-lg transition group
                  hover:bg-brand text-gray-300 hover:text-white
                '>
                  <AiOutlineHome className='w-5 h-5 mr-3 group-hover:text-sky-600 text-bold' />
                  <span className='font-medium'>Proyectos</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Aside Footer */}
          <div className='flex-shrink-0 px-4 py-5 border-t border-gray-700'>
            <button className='w-full px-4 py-2 bg-brand hover:bg-brand/90 text-white font-medium rounded-lg transition'>
              Documentation
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className='flex flex-col flex-1'>
          <MainHeader />
          <main className='flex-1 overflow-auto'>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

export default MainLayout