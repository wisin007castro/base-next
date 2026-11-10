import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { storageEnv } from '@/lib/env'
import { s3 } from './s3.client'

export async function uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
  const { bucket, publicUrl } = storageEnv()
  await s3().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }))
  return `${publicUrl}/${key}`
}

export async function deleteFile(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: storageEnv().bucket, Key: key }))
}

export async function getPresignedUploadUrl(key: string, contentType: string, expiresIn = 300): Promise<string> {
  return getSignedUrl(s3(), new PutObjectCommand({ Bucket: storageEnv().bucket, Key: key, ContentType: contentType }), {
    expiresIn,
  })
}

export function getPublicUrl(key: string): string {
  return `${storageEnv().publicUrl}/${key}`
}
