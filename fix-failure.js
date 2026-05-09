const fs = require('fs');
let code = fs.readFileSync('src/inngest/functions.ts', 'utf-8');

const oldFailure = `    onFailure: async ({ error, event, step }) => {
      const projectId = event.data.event.data.projectId;
      // Guarantee the UI un-jams by writing a fallback Assistant message
      await step.run("unjam-ui", async () => {
        await prisma.message.create({
          data: {
            projectId: projectId,
            content: \`The code agent encountered a critical infrastructure error and exhausted all retries. The error was: \${error.message}. Please send another prompt to try again.\`,
            role: "ASSISTANT",
            type: "RESULT",
          }
        }).catch(err => console.error("Failed to write unjam message", err));

        await prisma.project.update({
          where: { id: projectId },
          data: { currentStage: "SCENE" }
        }).catch(() => { });
      });
    }`;

const newFailure = `    onFailure: async ({ error, event, step }) => {
      const projectId = event.data.event.data.projectId;
      
      // Guarantee the UI un-jams by writing a fallback Assistant message
      await step.run("unjam-ui", async () => {
        if (error.message !== "Generation was manually stopped.") {
          await prisma.message.create({
            data: {
              projectId: projectId,
              content: \`The code agent encountered a critical infrastructure error and exhausted all retries. The error was: \${error.message}. Please send another prompt to try again.\`,
              role: "ASSISTANT",
              type: "RESULT",
            }
          }).catch(err => console.error("Failed to write unjam message", err));
        }

        await prisma.project.update({
          where: { id: projectId },
          data: { currentStage: "SCENE" }
        }).catch(() => { });
      });
    }`;

code = code.replace(oldFailure, newFailure);
fs.writeFileSync('src/inngest/functions.ts', code);
