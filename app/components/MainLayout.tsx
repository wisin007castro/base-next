'use client'
import React, { useContext } from 'react'


import Header from './layouts/Header'
import Sidebar from './layouts/Sidebar'
import { MenuContext } from './context/MenuContext'

const MainLayout = ({ children }) => {
  const { open } = useContext(MenuContext)

  return (
    <div className='bg-gray-100 dark:bg-gray-900 w-full min-h-screen flex flex-col overflow-x-hidden'>
      <div className='flex flex-1'>
        <Sidebar />

        {/* Main Content */}
        <div className={`flex flex-col flex-1 transition-all duration-300 ease-in-out ${open ? "lg:ml-0 ml-60" : "ml-0"}`}>
          <Header />
          <main className='flex-1 overflow-auto'>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

export default MainLayout