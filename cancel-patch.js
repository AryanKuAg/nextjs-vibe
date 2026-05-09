const fs = require('fs');

let functions = fs.readFileSync('src/inngest/functions.ts', 'utf-8');

// 1. Add NonRetriableError import
functions = functions.replace(
  'import { inngest } from "./client";',
  'import { inngest } from "./client";\nimport { NonRetriableError } from "inngest";'
);

// 2. Add checkCancellation helper
const checkHelper = `

const checkCancellation = async (projectId: string) => {
  const pCheck = await prisma.project.findUnique({
    where: { id: projectId },
    select: { messages: { orderBy: { createdAt: "desc" }, take: 1 } }
  });
  if (pCheck?.messages?.[0]?.content === "Generation was manually stopped.") {
    throw new NonRetriableError("Generation was manually stopped.");
  }
};

`;

functions = functions.replace(
  'function geminiVertexKey(modelName: string) {',
  checkHelper + 'function geminiVertexKey(modelName: string) {'
);

// 3. Inject checkCancellation into initialNetwork router
functions = functions.replace(
  'router: async ({ network }) => {',
  'router: async ({ network }) => {\n        await checkCancellation(event.data.projectId);'
);

// 4. Inject checkCancellation into fixerNetwork router
// (Since we already replaced the first router, let's use a regex or specific replace)
// Actually, it will replace the first one. Let's do it manually with regex.
functions = functions.replace(
  /router: async \(\{\s*network\s*\}\) => \{/g,
  'router: async ({ network }) => {\n        await checkCancellation(event.data.projectId);'
);

// 5. Inject checkCancellation into the while loop
functions = functions.replace(
  'while (!isBuildSuccessful && attempt <= maxRetries) {',
  'while (!isBuildSuccessful && attempt <= maxRetries) {\n      await checkCancellation(event.data.projectId);'
);

fs.writeFileSync('src/inngest/functions.ts', functions);
