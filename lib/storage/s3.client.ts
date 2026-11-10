import { S3Client } from '@aws-sdk/client-s3'
import { storageEnv } from '@/lib/env'

let client: S3Client | undefined

/** Cliente S3/MinIO creado al primer uso: sin STORAGE_* la app arranca y solo falla al subir archivos */
export function s3() {
  if (!client) {
    const cfg = storageEnv()
    client = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      credentials: { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secretKey },
      forcePathStyle: true, // required for MinIO
    })
  }
  return client
}
