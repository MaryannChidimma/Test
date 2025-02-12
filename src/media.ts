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
    this.key = Math.random().toString(36).slice(2, 8);
  }

  async uploadUrl({
    sourceUrl,
    destinationDir,
    maxFileSize,
  }: {
    sourceUrl: string;
    destinationDir: string;
    maxFileSize: number;
  }) {
    let response;
    response = await request(sourceUrl);
    const contentType =
      response.headers["content-type"] || "application/octet-stream";

    const sizeHeader = response.headers["content-length"];
    const size = parseInt(
      Array.isArray(sizeHeader) ? sizeHeader[0] : sizeHeader ?? "0",
      10
    );

    if (!size || isNaN(size)) return { error: "Missing file size" };
    if (size > maxFileSize) return { error: "File too large" };

    if (!this.isAllowed(contentType as string))
      return { error: "Invalid file type" };

    for await (const chunk of response.body) {
      try {
        const parallelUploads3 = new Upload({
          client: this.s3,
          params: {
            Bucket: `${this.bucket}`,
            Key: `${destinationDir}/${this.key}`,
            Body: chunk,
          },
          tags: [],
          queueSize: 4,
          partSize: 1024 * 1024 * 5,
          leavePartsOnError: false,
        });
        const result = await parallelUploads3.done();
        return { data: result.Location };
      } catch (e) {
        console.log({ error: e });
      }
    }
  }

  private isAllowed(type?: string): boolean {
    return ["image/jpeg", "image/png", "image/gif", "video/mp4"].includes(
      type ?? ""
    );
  }
}

//use it here
const main = async () => {
  const cfg: S3Config = {
    s3Endpoint: "http://localhost:9000",
    accessKeyId: "dummy-user",
    secretAccessKey: "dummy-password",
    s3Region: "us-east-1",
    bucket: "dummy-bucket",
  };
  const media = new Media(cfg);
  const upload = await media.uploadUrl({
    sourceUrl:
      "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=5020&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    destinationDir: "images",
    maxFileSize: 150 * 1024 * 1024,
  });
  console.log({ upload });
};

main();
export default Media;
