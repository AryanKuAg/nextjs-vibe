const { Storage } = require("@google-cloud/storage");
require("dotenv").config();

async function main() {
  const storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
  });

  const bucketName = process.env.GCS_BUCKET_NAME || "sites.framerate.space";
  const bucket = storage.bucket(bucketName);

  const corsConfiguration = [
    {
      origin: ["*"], // Allow all origins, or specify the Vercel domain
      method: ["GET", "OPTIONS"],
      responseHeader: ["Content-Type", "Access-Control-Allow-Origin"],
      maxAgeSeconds: 3600,
    },
  ];

  await bucket.setCorsConfiguration(corsConfiguration);
  console.log(`CORS configuration applied to bucket: ${bucketName}`);
}

main().catch(console.error);
