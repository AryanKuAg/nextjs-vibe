import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const auth = new GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});
const client = await auth.getClient();
const token = await client.getAccessToken();

const payload = {
  instances: [
    {
      prompt: "A smooth transition from a cat to a dog",
      image: {
        gcsUri: "gs://sites.framerate.space/frames/fa91586a-a3db-4478-b872-f6c03d672ad0/frame-1777905592113.png",
        mimeType: "image/png"
      },
      lastFrame: {
        gcsUri: "gs://sites.framerate.space/frames/fa91586a-a3db-4478-b872-f6c03d672ad0/frame-1777910092934.png",
        mimeType: "image/png"
      }
    }
  ],
  parameters: {
    aspectRatio: "16:9",
    resolution: "720p",
    durationSeconds: 8,
  }
};

const url = `https://us-central1-aiplatform.googleapis.com/v1beta1/projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/us-central1/publishers/google/models/veo-3.1-lite-generate-001:predictLongRunning`;

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token.token}`
  },
  body: JSON.stringify(payload)
});

console.log(await res.json());
