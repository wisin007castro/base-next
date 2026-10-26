import { AiOutlineHome } from 'react-icons/ai'
import { GrProjects } from 'react-icons/gr'
import { GoGear } from 'react-icons/go'
import { MdOutlineWebAsset, MdWebStories } from 'react-icons/md'
import { HiOutlineUsers, HiOutlineViewGrid } from 'react-icons/hi'
import { RiShieldKeyholeLine, RiLockPasswordLine } from 'react-icons/ri'

export interface OptionMenu {
  id: string
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
  submenu?: OptionMenu[]
  expandable?: boolean
  allowedRoles?: string[] // si se define, solo usuarios con alguno de esos roles lo ven
  permission?: string // si se define, solo usuarios con ese permiso (o admin) lo ven
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
    label: 'Páginas',
    href: '/',
    icon: AiOutlineHome,
  },
  {
    id: 'administracion',
    label: 'Administración',
    icon: GoGear,
    expandable: true,
    allowedRoles: ['admin'],
    submenu: [
      {
        id: 'usuarios-lista',
        label: 'Usuarios',
        href: '/usuarios',
        icon: HiOutlineUsers,
      },
      {
        id: 'roles',
        label: 'Roles',
        href: '/roles',
        icon: RiShieldKeyholeLine,
      },
      {
        id: 'permisos',
        label: 'Permisos',
        href: '/permisos',
        icon: RiLockPasswordLine,
      },
    ],
  },
  // Módulos generados con `npm run gen:crud` (icono por defecto: HiOutlineViewGrid)
  // @gen:begin etiquetas
  {
    id: 'etiquetas',
    label: 'Etiquetas',
    href: '/etiquetas',
    icon: HiOutlineViewGrid,
    permission: 'etiquetas.view',
  },
  // @gen:end etiquetas
  // @gen:begin categorias
  {
    id: 'categorias',
    label: 'Categorías',
    href: '/categorias',
    icon: HiOutlineViewGrid,
    permission: 'categorias.view',
  },
  // @gen:end categorias
  // @gen:begin publicaciones
  {
    id: 'publicaciones',
    label: 'Publicaciones',
    href: '/publicaciones',
    icon: HiOutlineViewGrid,
    permission: 'publicaciones.view',
  },
  // @gen:end publicaciones
  // @gen:menu
]
