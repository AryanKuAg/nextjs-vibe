import "server-only";

import { prisma } from "@/lib/db";
import { PROJECT_STAGE } from "@/lib/project-stage";
import { getTemplate, templateZipUrl } from "@/lib/templates/registry";
import { v0 } from "@/lib/v0-client";
import { v0Failure } from "@/lib/v0-error";
import { V0_MODEL_CONFIGURATION } from "@/lib/v0-model";
import { buildSitePrompt, TEMPLATE_BUILD_PROMPT, type SiteBrief } from "@/lib/v0-site-prompt";

/**
 * Getting a project from "created" to "v0 is working on it".
 *
 * One path now. There used to be two — a cinematic build ran the video agent
 * first and opened the chat only once its clip landed — which is why the
 * builder had a "no chat yet, but nobody has failed" state. With the video
 * agent gone the chat is opened synchronously by whoever starts the build, so a
 * project with no chat is a build that failed to start, and nothing else.
 */

/**
 * Opens a project's v0 chat.
 *
 * Throws on failure; the caller owns the credit refund, because the caller is
 * the one that charged.
 */
export async function startProjectBuild(input: {
  projectId: string;
  brief: SiteBrief;
}): Promise<{ chatId: string }> {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true, name: true, templateId: true },
  });

  if (!project) throw new Error("Project not found");

  // A remix starts from somebody's finished repo rather than a blank page —
  // the same job the sandbox did by downloading a tarball and unpacking it.
  const template = getTemplate(project.templateId);

  if (template) {
    // From a zip rather than the repo-import call: see `templateZipUrl` for why
    // the latter produced chats with no readable files.
    const imported = await v0.chats.createFromZip({
      url: templateZipUrl(template),
      title: project.name,
      privacy: "private",
    });

    const chatId = imported.data?.chat?.id;
    if (imported.error !== undefined || !chatId) {
      throw v0Failure(imported, "The build service could not import the template repository.");
    }

    // The import is only half of what the sandbox used to do in one step: it
    // unpacked the repo AND ran it. Importing lands the files and stops — no
    // turn runs, so nothing is built and nothing is previewed, and the builder
    // opens on an empty chat with a preview that never arrives. This is the
    // other half.
    const started = await v0.messages.sendAsync({
      chatId,
      message: TEMPLATE_BUILD_PROMPT,
      modelConfiguration: V0_MODEL_CONFIGURATION,
    });

    if (started.error !== undefined || !started.data?.messageId) {
      throw v0Failure(
        started,
        "The build service imported the template but could not start the build.",
      );
    }

    await prisma.project.update({
      where: { id: project.id },
      data: {
        v0ChatId: chatId,
        // Same as the from-scratch path below: the builder reads this to know a
        // run is already in flight when the page opens.
        v0PendingMessageId: started.data.messageId,
        currentStage: PROJECT_STAGE.SITE,
      },
    });

    return { chatId };
  }

  const created = await v0.chats.createAsync({
    // No systemPrompt: v0 already knows the stack and the conventions, so the
    // whole instruction is the user's brief.
    message: buildSitePrompt(input.brief),
    modelConfiguration: V0_MODEL_CONFIGURATION,
    privacy: "private",
    // v0 fetches attachments itself, so a reference image has to be at a public
    // URL — a data URL is not something it can pull. Uploading happens when the
    // project is created, so by here it is already one.
    ...(input.brief.referenceImageUrl
      ? { attachments: [{ url: input.brief.referenceImageUrl }] }
      : {}),
  });

  if (created.error !== undefined || !created.data?.chatId) {
    // v0's own wording is far more useful than anything we could invent here —
    // "You have reached your daily message limit", for instance.
    throw v0Failure(created, "The build service did not return a chat.");
  }

  await prisma.project.update({
    where: { id: project.id },
    data: {
      v0ChatId: created.data.chatId,
      v0PendingMessageId: created.data.messageId,
      // The site stage begins the moment the chat exists. Nothing flips this
      // back afterwards — progress is read from v0's own stream now, not from a
      // column we would have to keep in sync.
      currentStage: PROJECT_STAGE.SITE,
    },
  });

  return { chatId: created.data.chatId };
}
