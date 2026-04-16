import { Inngest, EventSchemas } from "inngest";

type Events = {
  "code-agent/run": {
    data: {
      projectId: string;
      value: string;
      videoUrl?: string; // Swapped from explicit Frame Generation
      model?: string;
    };
  };
  "veo/generate": {
    data: {
      projectId: string;
      prompt: string;
      outputGcsUri: string;
      imageUrl?: string;
      imageBase64?: string;
      model?: string;
    };
  };
};

// Create a client to send and receive events
export const inngest = new Inngest({ 
  id: "vibe-development",
  schemas: new EventSchemas().fromRecord<Events>()
});
