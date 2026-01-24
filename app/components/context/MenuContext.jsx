'use client'
import { createContext, useState } from 'react'

export const MenuContext = createContext()
const MenuContextProvider = ({ children }) => {
  const [open, setOpen] = useState(false)

  const toggleMenu = () => {
    console.log('Toggle Clicked: ' + !open)
    setOpen(!open)
  }

  return (
    <MenuContext.Provider value={{ open, toggleMenu }}>
      {children}
    </MenuContext.Provider>
  )
}

export default MenuContextProvider