import { Inngest } from "inngest";

// App ID is environment-specific:
//   INNGEST_APP_ID=framerate-prod       → Production
//   INNGEST_APP_ID=framerate-uat        → UAT / Staging
//   (unset)                             → Local dev fallback
const appId = process.env.INNGEST_APP_ID || "framerate-dev";

export const inngest = new Inngest({
  id: appId,
  eventKey: process.env.INNGEST_EVENT_KEY || "local",
  // isDev must be false in prod/UAT so Inngest uses the real cloud, not local dev server
  isDev: process.env.NODE_ENV === "development" && !process.env.INNGEST_APP_ID,
});
