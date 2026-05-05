import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({ 
  id: "vibe-development",
  eventKey: process.env.INNGEST_EVENT_KEY || "local",
  isDev: process.env.NODE_ENV === "development"
});
