const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_CLOUD_API_KEY,
});

async function main() {
  const streamingResp = await ai.models.generateContentStream({
    model: "gemini-3.1-flash-image-preview",
    contents: [{ role: "user", parts: [{ text: "a beautiful landscape" }] }],
    config: {
      maxOutputTokens: 8192,
      temperature: 1,
      topP: 0.95,
      responseModalities: ["IMAGE"],
      safetySettings: [
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" },
      ]
    }
  });

  for await (const chunk of streamingResp) {
    console.log(JSON.stringify(chunk, null, 2));
  }
}

main().catch(console.error);
