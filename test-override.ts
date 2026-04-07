import { GoogleAuth } from 'google-auth-library';
import { gemini } from '@inngest/agent-kit';

async function main() {
    const auth = new GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: [
            'https://www.googleapis.com/auth/cloud-platform',
            'https://www.googleapis.com/auth/generative-language'
        ],
    });
    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    const token = tokenRes.token as string;
    
    console.log("Token obtained", token.substring(0, 10));

    // Create the base model
    const baseModel = gemini({ model: 'gemini-3.1-pro-preview' as any });
    
    // Override!
    baseModel.url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent`;
    baseModel.headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
    };

    console.log("Modified model:", baseModel.url);

    // manually simulate what inngest does
    const body: any = { contents: [{ role: "user", parts: [{ text: "p" }] }] };
    baseModel.onCall?.(null as any, body);

    console.log("Sending request to:", baseModel.url);
    const resp = await fetch(baseModel.url, {
        method: "POST",
        headers: baseModel.headers,
        body: JSON.stringify(body)
    });
    
    console.log("Status:", resp.status);
    console.log("Response:", await resp.text());
}

main().catch(console.error);
