import { describe, it, expect, vi, beforeEach } from "vitest";
import fixtures from "./fixtures.json" assert { type: "json" };
import Media, { S3Config } from "./media.js";

// // Mock AWS SDK
// vi.mock("aws-sdk", async () => {
//   const actualAWS = await vi.importActual<typeof import("aws-sdk")>("aws-sdk");
//   return {
//     ...actualAWS,
//     S3: vi.fn().mockImplementation(() => ({
//       upload: vi.fn().mockReturnValue({
//         promise: vi.fn().mockResolvedValue({ Location: "https://mock-url.com/media" }),
//       }),
//     })),
//   };
// });

// // Mock undici request
// vi.mock("undici", () => ({
//   request: vi.fn().mockImplementation((url: string) => {
//     if (fixtures["2mb_image"].includes(url)) {
//       return Promise.resolve({
//         statusCode: 200,
//         headers: { "content-length": "500000", "content-type": "image/jpeg" },
//         body: {
//           pipe: vi.fn(),
//           on: vi.fn((event, callback) => {
//             if (event === "data") callback(Buffer.from("mock data"));
//             if (event === "end") callback();
//           }),
//         },
//       });
//     }
//     if (fixtures["150mb_video"].includes(url)) {
//       return Promise.resolve({
//         statusCode: 200,
//         headers: { "content-length": "15000000", "content-type": "image/jpeg" },
//         body: { pipe: vi.fn() },
//       });
//     }
//     if (fixtures.invalid_image.includes(url)) {
//       return Promise.resolve({
//         statusCode: 200,
//         headers: { "content-length": "500000", "content-type": "application/pdf" },
//         body: { pipe: vi.fn() },
//       });
//     }
//     return Promise.resolve({ statusCode: 404 });
//   }),
// }));

// describe("Media Uploads", () => {
//   let media: Media;

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
    const result = await media.uploadFromUrl({
      sourceUrl: fixtures["2mb_image"],
      destinationDir: "uploads/test.jpg",
      maxFileSize: 10 * 1000 * 1000,
    });
    expect(result).toEqual({
      data: `${media.endpointURL}/${media.bucket}/uploads/test.jpg`,
    });
  });

  it("rejects oversized files", async () => {
    
     const result = await media.uploadFromUrl({
        sourceUrl: fixtures["150mb_video"],
        destinationDir: "uploads/large.jpg",
        maxFileSize: 10 * 1000 * 1000,
      })

    expect(result).toEqual({error: "File too large"})
  });

  it("rejects invalid file types", async () => {
    const result = await media.uploadFromUrl({
      sourceUrl: fixtures.invalid_image,
      destinationDir: "/upload/invalid_image",
      maxFileSize: 10 * 1000 * 1000,
    });
    expect(result).toEqual({ status: 400, error: "Invalid file" });
  });

  it("handles bad URLs", async () => {
    const result = await media.uploadFromUrl({
      sourceUrl: "https://example.com/404.jpg",
      destinationDir: "uploads/notfound.jpg",
      maxFileSize: 10 * 1000 * 1000,
    });
    expect(result).toEqual({ status: 404, error: "File not found" });
  });
});
