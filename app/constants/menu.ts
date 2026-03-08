import { AiOutlineHome } from 'react-icons/ai'
import { GrProjects } from 'react-icons/gr'
import { GoGear } from 'react-icons/go'
import { MdOutlineWebAsset, MdWebStories } from "react-icons/md";
import { HiOutlineUsers } from 'react-icons/hi';

export interface OptionMenu {
  id: string
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
  submenu?: OptionMenu[]
  expandable?: boolean
}

export const optionMenus: OptionMenu[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/',
    icon: AiOutlineHome,
  },
  {
    id: 'blog',
    label: 'Blog',
    href: '/blog',
    icon: MdOutlineWebAsset,
  },
  {
    id: 'proyectos',
    label: 'Proyectos',
    icon: GrProjects,
    expandable: true,
    submenu: [
      {
        id: 'proyectos-internos',
        label: 'Internos',
        href: '/proyectos/internos',
        icon: MdWebStories,
      },
    ],
  },
  {
    id: 'usuarios',
    label: 'Usuarios',
    icon: HiOutlineUsers,
    expandable: true,
    submenu: [
      {
        id: 'usuarios-lista',
        label: 'Listado',
        href: '/usuarios',
        icon: HiOutlineUsers,
      },
      {
        id: 'usuarios-nuevo',
        label: 'Nuevo usuario',
        href: '/usuarios/nuevo',
        icon: AiOutlineHome,
      },
    ],
  },
  {
    id: 'paginas',
    label: 'Páginas',
    href: '/paginas',
    icon: AiOutlineHome,
  },
]
