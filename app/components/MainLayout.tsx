'use client'
import React, { useContext } from 'react'
import { useSession } from 'next-auth/react'
import Header from './layouts/Header'
import Sidebar from './layouts/Sidebar'
import { MenuContext } from './context/MenuContext'

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { open } = useContext(MenuContext)
  const { data: session } = useSession()
  const isAdmin = (session?.user as { roles?: string[] })?.roles?.includes('admin')

  return (
    <div
      data-admin={isAdmin ? 'true' : undefined}
      className='bg-canvas w-full min-h-screen flex flex-col overflow-x-hidden'
    >
      <div className='flex flex-1'>
        <Sidebar />

        {/* Main Content */}
        <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out ${open ? "lg:ml-0 ml-60" : "ml-0"}`}>
          <Header />
          <main className='flex-1 overflow-auto p-2 md:p-4 lg:p-6'>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

export default MainLayout
