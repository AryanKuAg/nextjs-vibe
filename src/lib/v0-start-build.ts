import "server-only";

import { prisma } from "@/lib/db";
import { PROJECT_STAGE } from "@/lib/project-stage";
import { latestVideoUrl } from "@/lib/project-video";
import { getTemplate } from "@/lib/templates/registry";
import { uploadDataUrlToStorage } from "@/lib/upload-data-url";
import { v0 } from "@/lib/v0-client";
import { v0Failure } from "@/lib/v0-error";
import { V0_MODEL_CONFIGURATION } from "@/lib/v0-model";
import { buildSitePrompt, type SiteMode, type VideoMotion } from "@/lib/v0-site-prompt";

/**
 * Opens a project's v0 chat.
 *
 * This runs as part of creating the project, so by the time the browser reaches
 * `/projects/:id` the chat already exists and the builder renders a live run.
 * There is deliberately no intermediate screen asking the user to confirm the
 * prompt they just typed.
 *
 * Throws on failure. The caller owns the credit refund, because it is the one
 * that charged.
 */
export async function startProjectBuild(input: {
  projectId: string;
  prompt: string;
  /** Classic or Cinematic, chosen on the home page. */
  mode?: SiteMode;
  /** Cinematic only: how the video behaves once it is on the page. */
  motion?: VideoMotion;
  /** A video the user supplied by URL. Generated footage arrives separately. */
  videoUrl?: string | null;
  /** The footage the user described, when there is no file to point at. */
  videoDescription?: string | null;
  /** A reference image the user attached, as a data URL. */
  imageDataUrl?: string;
}): Promise<{ chatId: string }> {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true, name: true, templateId: true, videoUrls: true },
  });

  if (!project) throw new Error("Project not found");

  // A remix starts from somebody's finished repo rather than a blank page. v0
  // imports it directly, which is what the sandbox used to do by downloading a
  // tarball and unpacking it.
  const template = getTemplate(project.templateId);

  if (template) {
    const imported = await v0.chats.createFromRepo({
      repo: {
        url: `https://github.com/${template.repo}`,
        branch: template.branch,
      },
      title: project.name,
      privacy: "private",
    });

    const chatId = imported.data?.chat?.id;
    if (imported.error !== undefined || !chatId) {
      throw v0Failure(imported, "v0 could not import the template repository");
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { v0ChatId: chatId, currentStage: PROJECT_STAGE.SITE },
    });

    return { chatId };
  }

  // v0 fetches attachments itself, so a reference image has to be at a public
  // URL — a data URL is not something it can pull.
  const referenceImageUrl = await uploadDataUrlToStorage(
    input.imageDataUrl,
    `frames/${project.id}`,
  );

  const created = await v0.chats.createAsync({
    // No systemPrompt: v0 already knows the stack and the conventions, so the
    // whole instruction is the user's brief plus where the video goes.
    message: buildSitePrompt({
      mode: input.mode ?? "CLASSIC",
      prompt: input.prompt,
      motion: input.motion,
      videoDescription: input.videoDescription,
      // A URL the user pasted wins over anything the media pipeline produced
      // earlier: it is the more recent, more explicit instruction.
      videoUrl: input.videoUrl ?? latestVideoUrl(project.videoUrls),
    }),
    modelConfiguration: V0_MODEL_CONFIGURATION,
    privacy: "private",
    ...(referenceImageUrl ? { attachments: [{ url: referenceImageUrl }] } : {}),
  });

  if (created.error !== undefined || !created.data?.chatId) {
    // v0's own wording is far more useful than anything we could invent here —
    // "You have reached your daily message limit", for instance.
    throw v0Failure(created, "v0 did not return a chat");
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
