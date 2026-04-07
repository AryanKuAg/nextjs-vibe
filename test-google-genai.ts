/**
 * Test file: Verifies @google/genai SDK is getting a response from gemini-3.1-pro-preview
 * Run: set -a && source .env && set +a && npx tsx test-google-genai.ts
 */
import { GoogleGenAI } from '@google/genai';
import { GoogleAuth } from 'google-auth-library';

async function main() {
  // --- Step 1: Get OAuth token from Service Account ---
  console.log('📡 Step 1: Fetching OAuth token from Service Account...');
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/generative-language',
    ],
  });
  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  const accessToken = tokenRes.token as string;
  console.log('✅ Token obtained.\n');

  // --- Step 2: Initialize GoogleGenAI with the OAuth token ---
  // We use the Gemini API (generativelanguage.googleapis.com) which we confirmed works.
  // Note: GOOGLE_CLOUD_API_KEY is NOT used here; we use the OAuth token instead.
  console.log('🤖 Step 2: Initializing GoogleGenAI with OAuth token...');
  const ai = new GoogleGenAI({
    apiKey: accessToken,
    // Point to the generative language API (AI Studio endpoint), confirmed working
    httpOptions: {
      baseUrl: 'https://generativelanguage.googleapis.com',
    },
  });

  const model = 'gemini-3.1-pro-preview';

  const generationConfig = {
    maxOutputTokens: 500,
    temperature: 1,
    topP: 0.95,
    seed: 0,
    thinkingConfig: {
      thinkingLevel: 'HIGH',
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'OFF' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'OFF' },
    ],
  };

  // --- Step 3: Send a streaming request ---
  console.log(`📤 Step 3: Sending streaming request to "${model}"...\n`);
  try {
    const streamingResp = await ai.models.generateContentStream({
      model,
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Say "API is working!" and then explain in 1 sentence what Gemini 3.1 Pro is. Keep it short.' }],
        },
      ],
      config: generationConfig as any,
    });

    console.log('--- Model Response (streamed) ---');
    for await (const chunk of streamingResp) {
      if (chunk.text) {
        process.stdout.write(chunk.text);
      }
    }
    console.log('\n--- End of Response ---');
    console.log('\n✅ SUCCESS: API is responding correctly with @google/genai!');
  } catch (err: any) {
    console.error('\n❌ ERROR:', err?.message || err);
  }
}

main().catch(console.error);
