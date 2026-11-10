import { useMutation, useQuery, useQueryClient, queryOptions } from '@tanstack/react-query'
import { settingsApi } from '@/lib/api/settings.api'
import { settingsKeys } from '@/lib/constants/query-keys'

export const settingsQueries = {
  /** Nombre y logo (sidebar, cabecera, login): cambian poco */
  public: () =>
    queryOptions({
      queryKey: settingsKeys.public(),
      queryFn: ({ signal }) => settingsApi.getPublic(signal),
      staleTime: 5 * 60 * 1000,
    }),
  system: () =>
    queryOptions({ queryKey: settingsKeys.section('system'), queryFn: ({ signal }) => settingsApi.getSystem(signal) }),
  access: () =>
    queryOptions({ queryKey: settingsKeys.section('access'), queryFn: ({ signal }) => settingsApi.getAccess(signal) }),
  mail: () =>
    queryOptions({ queryKey: settingsKeys.section('mail'), queryFn: ({ signal }) => settingsApi.getMail(signal) }),
}

export const usePublicSettings = () => useQuery(settingsQueries.public())
export const useSystemSettings = () => useQuery(settingsQueries.system())
export const useAccessSettings = () => useQuery(settingsQueries.access())
export const useMailSettings = () => useQuery(settingsQueries.mail())

/** Guardar una sección: actualiza su caché y la pública (nombre/logo en el layout) */
function useSave<T, R>(section: 'system' | 'access' | 'mail', mutationFn: (dto: T) => Promise<R>, message: string) {
  const qc = useQueryClient()
  return useMutation({
    meta: { successToast: message },
    mutationFn,
    onSuccess: data => {
      qc.setQueryData(settingsKeys.section(section), data)
      qc.invalidateQueries({ queryKey: settingsKeys.public() })
    },
  })
}

export const useSaveSystemSettings = () =>
  useSave('system', settingsApi.saveSystem, 'Configuración del sistema guardada')
export const useSaveAccessSettings = () => useSave('access', settingsApi.saveAccess, 'Configuración de acceso guardada')
export const useSaveMailSettings = () => useSave('mail', settingsApi.saveMail, 'Configuración de correo guardada')

export const useTestMail = () =>
  useMutation({
    mutationFn: settingsApi.testMail,
    meta: { errorToast: true },
  })
