import { describe, it, expect, vi, beforeEach } from "vitest";
import fixtures from "./fixtures.json" assert { type: "json" };
import Media, { S3Config } from "./media.js";

describe("Media Uploads", () => {
  let media: Media;
  beforeEach(() => {
    const cfg: S3Config = {
      s3Endpoint: "http://localhost:9000",
      accessKeyId: "dummy-user",
      secretAccessKey: "dummy-password",
      s3Region: "us-east-1",
      bucket: "dummy-bucket",
    };
    media = new Media(cfg);
  });

  it("should upload a valid url", async () => {
    const data = {
      sourceUrl: fixtures["2mb_image"],
      destinationDir: "images",
      maxFileSize: 10 * 1000 * 1000,
    }
    const result = await media.uploadUrl(data);
    expect(result).toEqual({
      data: `${media.endpointURL}/${media.bucket}/${data.destinationDir}/${media.key}`,
    });
  });

  it("rejects oversized files", async () => {
    
     const result = await media.uploadUrl({
        sourceUrl: fixtures["150mb_video"],
        destinationDir: "uploads/large.jpg",
        maxFileSize: 10 * 1000 * 1000,
      })

    expect(result).toEqual({error: "File too large"})
  });

  it("rejects invalid file types", async () => {
    const result = await media.uploadUrl({
      sourceUrl: fixtures.invalid_image,
      destinationDir: "/upload/invalid_image",
      maxFileSize: 10 * 1000 * 1000,
    });
    expect(result).toEqual({error:"Invalid file type"});
  });

  it("handles bad URLs", async () => {
    const result = await media.uploadUrl({
      sourceUrl: "https://example.com/404.jpg",
      destinationDir: "uploads/notfound.jpg",
      maxFileSize: 10 * 1000 * 1000,
    });
    expect(result).toEqual({error: "Invalid file type"});
  });
});
