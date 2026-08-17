import "server-only";

import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/db";
import { PROJECT_STAGE } from "@/lib/project-stage";
import { latestVideoUrl } from "@/lib/project-video";
import { getTemplate } from "@/lib/templates/registry";
import { v0 } from "@/lib/v0-client";
import { v0Failure } from "@/lib/v0-error";
import { V0_MODEL_CONFIGURATION } from "@/lib/v0-model";
import {
  buildSitePrompt,
  needsGeneratedVideo,
  siteBriefOf,
  videoLookFor,
  videoRequestFor,
  type SiteBrief,
} from "@/lib/v0-site-prompt";

/**
 * Getting a project from "created" to "v0 is working on it".
 *
 * Two paths, decided entirely by the brief the user filled in — there is no
 * router and no agent choosing between them:
 *
 *   footage in hand  ->  open the v0 chat now
 *   footage to make  ->  run the video agent, open the chat when its URL lands
 *
 * The second path is why the builder can open on a project with no chat yet.
 * That is a real state, not a failure, and `v0.workspace` reports it as one.
 */

/** What starting a project did. `pending` means the video agent has it now. */
export type BuildStart = { chatId: string } | { pending: "video" };

export async function beginProjectBuild(input: {
  projectId: string;
  userId: string;
  brief: SiteBrief;
}): Promise<BuildStart> {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true, templateId: true, videoUrls: true },
  });

  if (!project) throw new Error("Project not found");

  // A video the media pipeline already produced counts as footage in hand.
  // Without this a retry after a v0 failure would pay to generate a second one.
  const brief: SiteBrief = {
    ...input.brief,
    videoUrl: input.brief.videoUrl ?? latestVideoUrl(project.videoUrls) ?? undefined,
  };

  // A remix starts from somebody else's finished repo, so there is no page for
  // a background to go behind and nothing for the brief to describe.
  const isRemix = Boolean(getTemplate(project.templateId));

  if (!isRemix && needsGeneratedVideo(brief)) {
    const request = videoRequestFor(brief);

    await prisma.project.update({
      where: { id: project.id },
      data: { currentStage: PROJECT_STAGE.GENERATING_VIDEO },
    });

    await inngest.send({
      name: "veo/generate",
      data: {
        projectId: project.id,
        userId: input.userId,
        prompt: request.prompt,
        refinePrompt: request.refinePrompt,
        // Decides the shot: a held loop for a hero, a travelling camera for a
        // scroll-driven background.
        experiencePref: videoLookFor(brief.motion),
        model: "bytedance/seedance-1.5-pro",
        // The half that is new. Everything else here is the media pipeline as
        // it already was; this is what makes it hand off to v0 when it lands.
        buildSiteAfter: true,
      },
    });

    return { pending: "video" };
  }

  return startProjectBuild({ projectId: project.id, brief });
}

/**
 * Opens a project's v0 chat.
 *
 * Called directly when the brief needs no footage, and from the tail of the
 * video agent when it does. Throws on failure; the caller owns the credit
 * refund, because the caller is the one that charged.
 */
export async function startProjectBuild(input: {
  projectId: string;
  brief: SiteBrief;
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

  const brief: SiteBrief = {
    ...input.brief,
    // A URL on the brief wins over anything the media pipeline produced
    // earlier: it is the more recent, more explicit instruction.
    videoUrl: input.brief.videoUrl ?? latestVideoUrl(project.videoUrls) ?? undefined,
  };

  const created = await v0.chats.createAsync({
    // No systemPrompt: v0 already knows the stack and the conventions, so the
    // whole instruction is the user's brief plus what to do with the video.
    message: buildSitePrompt(brief),
    modelConfiguration: V0_MODEL_CONFIGURATION,
    privacy: "private",
    // v0 fetches attachments itself, so a reference image has to be at a public
    // URL — a data URL is not something it can pull. Uploading happens when the
    // project is created, so by here it is already one.
    ...(brief.referenceImageUrl ? { attachments: [{ url: brief.referenceImageUrl }] } : {}),
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

/**
 * Starts the site for a project whose video has just finished.
 *
 * Lives here rather than in the video agent so the v0 call has exactly one
 * shape wherever it is made. Returns false when there is nothing to do, which
 * is the ordinary case for every video that was not part of a build.
 */
export async function startBuildAfterVideo(input: {
  projectId: string;
  videoUrl: string;
}): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { prompts: true, v0ChatId: true },
  });

  // Already has a chat: this video was a regenerate, not the opening build.
  if (!project || project.v0ChatId) return false;

  const brief = siteBriefOf(project.prompts);
  if (!brief) return false;

  await startProjectBuild({
    projectId: input.projectId,
    brief: { ...brief, videoUrl: input.videoUrl },
  });

  return true;
}
