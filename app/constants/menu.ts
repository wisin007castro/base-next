import { AiOutlineHome } from 'react-icons/ai'
import { GrProjects } from 'react-icons/gr'
import { GoGear } from 'react-icons/go'
import { MdOutlineWebAsset, MdWebStories } from "react-icons/md";

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
    id: 'paginas',
    label: 'Proyectos',
    href: '/',
    icon: AiOutlineHome,
  },
]
