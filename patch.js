const fs = require('fs');

// Add cancelOn to code-agent/run
let functions = fs.readFileSync('src/inngest/functions.ts', 'utf-8');
functions = functions.replace(
  '{ event: "code-agent/run" },',
  '{\n    event: "code-agent/run",\n    cancelOn: [\n      {\n        event: "code-agent/cancel",\n        match: "data.projectId",\n      }\n    ]\n  },'
);
fs.writeFileSync('src/inngest/functions.ts', functions);

// Add cancelGeneration to procedures.ts
let procedures = fs.readFileSync('src/modules/projects/server/procedures.ts', 'utf-8');
procedures = procedures.replace(
  'cancelVideoGeneration: protectedProcedure',
  `cancelGeneration: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Stop the Inngest run
      await inngest.send({
        name: "code-agent/cancel",
        data: { projectId: input.projectId }
      });

      // Inject a cancellation message to unblock the UI
      await prisma.message.create({
        data: {
          projectId: input.projectId,
          role: "ASSISTANT",
          content: "Generation was manually stopped.",
          type: "TEXT",
          stage: "SITE"
        }
      });

      return { success: true };
    }),
  cancelVideoGeneration: protectedProcedure`
);
fs.writeFileSync('src/modules/projects/server/procedures.ts', procedures);
