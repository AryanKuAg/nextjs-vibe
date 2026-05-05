require('dotenv').config();
const { GoogleAuth } = require('google-auth-library');

async function test() {
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  
  const payload = {
    instances: [
      {
        prompt: "A beautiful sunset over mountains",
        image: {
          gcsUri: "gs://sites.framerate.space/frames/cm27nmd850000y1nmb472b53x/upload-1740927011400.png",
          mimeType: "image/png"
        },
        endImage: {
          gcsUri: "gs://sites.framerate.space/frames/cm27nmd850000y1nmb472b53x/upload-1740927011400.png",
          mimeType: "image/png"
        }
      }
    ],
    parameters: {
      aspectRatio: "16:9",
      resolution: "720p",
      durationSeconds: 8,
      includeAudio: false,
      generateAudio: false
    }
  };

  const res = await fetch(`https://us-central1-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/us-central1/publishers/google/models/veo-3.1-lite-generate-001:predictLongRunning`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  console.log(data);
}
test().catch(console.error);
