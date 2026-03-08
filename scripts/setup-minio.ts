import { S3Client, CreateBucketCommand, PutBucketPolicyCommand, HeadBucketCommand } from '@aws-sdk/client-s3'

const BUCKET = process.env.STORAGE_BUCKET ?? 'app-uploads'

const s3 = new S3Client({
  endpoint:        process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000',
  region:          process.env.STORAGE_REGION   ?? 'us-east-1',
  credentials: {
    accessKeyId:     process.env.STORAGE_ACCESS_KEY ?? 'minioadmin',
    secretAccessKey: process.env.STORAGE_SECRET_KEY ?? 'minioadmin',
  },
  forcePathStyle: true,
})

async function bucketExists(bucket: string) {
  try { await s3.send(new HeadBucketCommand({ Bucket: bucket })); return true }
  catch { return false }
}

async function main() {
  if (await bucketExists(BUCKET)) {
    console.log(`✔ Bucket "${BUCKET}" already exists`)
  } else {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }))
    console.log(`✔ Bucket "${BUCKET}" created`)
  }

  // Make bucket publicly readable so avatar URLs work without signing
  const policy = JSON.stringify({
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow', Principal: '*',
      Action: ['s3:GetObject'],
      Resource: [`arn:aws:s3:::${BUCKET}/*`],
    }],
  })
  await s3.send(new PutBucketPolicyCommand({ Bucket: BUCKET, Policy: policy }))
  console.log(`✔ Public read policy applied to "${BUCKET}"`)
}

main().catch(err => { console.error(err); process.exit(1) })
