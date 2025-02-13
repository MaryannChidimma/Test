import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { Upload } from "@aws-sdk/lib-storage";
import { request } from "undici";

dotenv.config();

export interface S3Config {
  s3Endpoint: string;
  s3Region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

class Media {
  private s3: S3Client;
  public bucket: string;
  public endpointURL: string;
  public key: string;

  constructor(cfg: S3Config) {
    this.s3 = new S3Client({
      endpoint: cfg.s3Endpoint,
      region: cfg.s3Region,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
      forcePathStyle: true,
    });
    this.endpointURL = cfg.s3Endpoint;
    this.bucket = cfg.bucket;
    this.key = `test${Math.random().toString(36).slice(2, 8)}`;
  }
  private readonly mimeToExtension: { [key: string]: string } = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "application/pdf": "pdf",
  };
  private isAllowed(contentType: string): boolean {
    return ["image/jpeg", "image/png", "image/gif", "video/mp4"].includes(
      contentType ?? ""
    );
  }

  private getFileExtension(contentType: string): string {
    return this.mimeToExtension[contentType] || "bin";
  }

  private async getFileMetadata(response: any) {
    const contentType =
      response.headers["content-type"] || "application/octet-stream";
    const sizeHeader = response.headers["content-length"];
    const size = parseInt(
      Array.isArray(sizeHeader) ? sizeHeader[0] : sizeHeader ?? "0",
      10
    );

    return { contentType, size };
  }

  private async uploadToS3(
    chunk: any,
    destinationDir: string,
    key: string,
    extension: string
  ) {
    const formattedKey = `${destinationDir}/${key}.${extension}`;
    const parallelUploads3 = new Upload({
      client: this.s3,
      params: {
        Bucket: this.bucket,
        Key: formattedKey,
        Body: chunk,
      },
      tags: [],
      queueSize: 4,
      partSize: 1024 * 1024 * 5,
      leavePartsOnError: false,
    });

    return await parallelUploads3.done();
  }

  public async uploadUrl({
    sourceUrl,
    destinationDir,
    maxFileSize,
  }: {
    sourceUrl: string;
    destinationDir: string;
    maxFileSize: number;
  }) {
    try {
      const response = await request(sourceUrl);
      const { contentType, size } = await this.getFileMetadata(response);

      if (!size || isNaN(size)) {
        return { error: "Missing file size" };
      }

      if (size > maxFileSize) {
        return { error: "File too large" };
      }

      if (!this.isAllowed(contentType)) {
        return { error: "Invalid file type" };
      }
      const extension = this.getFileExtension(contentType);
      const result = await this.uploadToS3(
        response.body,
        destinationDir,
        this.key,
        extension
      );
      return { data: result.Location };
    } catch (error) {
      console.error("Error uploading file:", error);
      return { error: "Failed to upload file" };
    }
  }
}

export default Media;
