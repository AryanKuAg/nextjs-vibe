import { createHmac } from "node:crypto";
const chatId = process.argv[2];
const userId = "user_3H7Y1LSWYTXqGd8Ya2ZdI72tmh3";
const exp = Date.now() + 3600_000;
const secret = process.env.V0_PREVIEW_SECRET || process.env.CLERK_SECRET_KEY!;
console.log(`${userId}.${exp}.${createHmac("sha256", secret).update(`${chatId}.${userId}.${exp}`).digest("base64url")}`);
