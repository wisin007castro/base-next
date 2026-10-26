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
      className="flex min-h-screen w-full flex-col overflow-x-hidden bg-canvas"
    >
      <div className="flex flex-1">
        <Sidebar />

        {/* Main Content */}
        <div
          className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out ${open ? 'ml-60 lg:ml-0' : 'ml-0'}`}
        >
          <Header />
          <main className="flex-1 overflow-auto p-2 md:p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}

export default MainLayout
