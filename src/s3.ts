import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function createPresignedUploadUrl(params: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  key: string;
  contentType?: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${params.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: params.accessKeyId,
      secretAccessKey: params.secretAccessKey,
    },
  });

  const command = new PutObjectCommand({
    Bucket: params.bucketName,
    Key: params.key,
    ContentType: params.contentType || 'application/octet-stream',
  });

  return await getSignedUrl(client, command, {
    expiresIn: params.expiresInSeconds || 3600, // 1 hour
  });
}
