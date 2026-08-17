import "server-only";

import { Sandbox } from "@e2b/code-interpreter";

import { contentTypeFor, r2PublicBase } from "@/lib/r2";
import { uploadMediaAsset } from "@/lib/media-storage";
import { v0 } from "@/lib/v0-client";
import { v0Failure } from "@/lib/v0-error";

/**
 * Publishing a build to R2.
 *
 * v0 hands us source, not a site — `app/page.tsx`, a `package.json` whose build
 * script is `next build`. R2 is object storage: it serves files, it cannot make
 * them. So publishing means building, and building means running the customer's
 * own `next.config.mjs` and whatever their dependencies' install scripts do.
 * That is untrusted code, which is why it happens in a throwaway E2B sandbox
 * and not in this process.
 *
 * The sandbox does one thing — install, build, hand back `out/` — and is killed
 * immediately after. No agent, no hot reload, no session to keep alive.
 */

/** Long enough for a cold `npm install` plus a Next build, and no longer. */
const SANDBOX_TIMEOUT_MS = 6 * 60 * 1000;
const BUILD_TIMEOUT_MS = 5 * 60 * 1000;

const PROJECT_DIR = "/home/user/site";

export class PublishError extends Error {
  constructor(
    message: string,
    /** Build output, when there is any worth showing the user. */
    readonly detail?: string,
  ) {
    super(message);
    this.name = "PublishError";
  }
}

export type PublishResult = {
  url: string;
  fileCount: number;
};

export async function publishSiteToR2(input: {
  chatId: string;
  projectId: string;
}): Promise<PublishResult> {
  const files = await sourceFiles(input.chatId);

  const sandbox = await Sandbox.create({ timeoutMs: SANDBOX_TIMEOUT_MS });

  try {
    await writeProject(sandbox, files, input.projectId);
    await runBuild(sandbox);

    const exported = await collectExport(sandbox, input.projectId);
    if (exported.length === 0) {
      throw new PublishError("The build produced no files to publish.");
    }

    return await uploadExport(exported, input.projectId);
  } finally {
    // The sandbox bills for as long as it lives, and nothing here needs it to
    // outlive the request.
    await sandbox.kill().catch(() => {});
  }
}

async function sourceFiles(chatId: string) {
  const result = await v0.chats.getFiles({ chatId });
  if (result.error !== undefined) {
    throw v0Failure(result, "Could not read this build's files from v0.");
  }

  // Text and binary alike. Filtering to utf8 dropped every image v0 had put in
  // `public/` — icons, logos — so the build referenced files that were never
  // written and the published site 404'd on all of them.
  const files = (result.data?.files ?? []).map((file) => ({
    path: file.path,
    data:
      file.encoding === "base64"
        ? toArrayBuffer(Buffer.from(file.content ?? "", "base64"))
        : (file.content ?? ""),
  }));

  if (files.length === 0) {
    throw new PublishError("This build has no files yet.");
  }

  return files;
}

async function writeProject(
  sandbox: Sandbox,
  files: { path: string; data: string | ArrayBuffer }[],
  projectId: string,
) {
  await sandbox.files.write(
    files.map((file) => ({
      path: `${PROJECT_DIR}/${file.path}`,
      data: file.data,
    })),
  );

  // Static export is forced on rather than assumed: v0 does not set it, and
  // without it `next build` leaves a server bundle that R2 cannot run.
  //
  // `basePath` is the part that is easy to miss. A published site lives under
  // `/sites/<projectId>/`, but an export assumes it owns the origin root and
  // emits `/_next/...` for every stylesheet and chunk. Served from a path those
  // resolve to the domain root, 404, and the site renders as unstyled HTML —
  // which is exactly what it did. Telling Next where the site will live makes
  // it emit `/sites/<projectId>/_next/...`, and internal links with it.
  await sandbox.files.write([
    {
      path: `${PROJECT_DIR}/next.config.mjs`,
      data: `const nextConfig = {
  output: "export",
  basePath: ${JSON.stringify(sitePath(projectId))},
  assetPrefix: ${JSON.stringify(sitePath(projectId))},
  // A static host has no image optimiser to call.
  images: { unoptimized: true },
  // Every page becomes a directory with an index.html, which is what object
  // storage can actually serve for a path like /contact.
  trailingSlash: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
`,
    },
  ]);
}

async function runBuild(sandbox: Sandbox) {
  const install = await sandbox.commands.run(
    "npm install --no-audit --no-fund --loglevel=error",
    { cwd: PROJECT_DIR, timeoutMs: BUILD_TIMEOUT_MS },
  );

  if (install.exitCode !== 0) {
    throw new PublishError("Installing dependencies failed.", tail(install.stderr || install.stdout));
  }

  const build = await sandbox.commands.run("npx --yes next build", {
    cwd: PROJECT_DIR,
    timeoutMs: BUILD_TIMEOUT_MS,
  });

  if (build.exitCode !== 0) {
    const output = `${build.stdout}\n${build.stderr}`;

    // The common, explainable failure: something in the site genuinely needs a
    // server, so there is nothing static to upload. Worth saying plainly rather
    // than handing over a stack trace.
    const needsServer =
      /export const dynamic|generateStaticParams|Route .* couldn't be rendered statically|"use server"/i.test(
        output,
      );

    throw new PublishError(
      needsServer
        ? "This site uses server-side features, so it cannot be published as a static site yet."
        : "The site failed to build.",
      tail(output),
    );
  }
}

/** Everything Next wrote to `out/`, as bytes, with paths relative to it. */
async function collectExport(
  sandbox: Sandbox,
  projectId: string,
): Promise<{ path: string; body: Buffer }[]> {
  const listed = await sandbox.commands.run(
    `find out -type f -printf '%P\\n'`,
    { cwd: PROJECT_DIR, timeoutMs: 60_000 },
  );

  if (listed.exitCode !== 0) {
    throw new PublishError("The build finished but produced no export directory.");
  }

  const paths = listed.stdout.split("\n").map((line) => line.trim()).filter(Boolean);

  return Promise.all(
    paths.map(async (path) => {
      const bytes = Buffer.from(
        await sandbox.files.read(`${PROJECT_DIR}/out/${path}`, { format: "bytes" }),
      );

      return {
        path,
        body: path.endsWith(".html") ? anchorToSitePath(bytes, projectId) : bytes,
      };
    }),
  );
}

/**
 * Prefixes anything `basePath` left behind.
 *
 * Next applies `basePath` to routes and to its own bundles, but not to URLs
 * declared in metadata — the favicon and app icons come out as `/icon.svg`,
 * which on a site served from `/sites/<id>/` resolves to the domain root and
 * 404s. The same is true of any hand-written root-relative URL in the markup.
 * Rewriting the exported HTML catches all of them at once.
 */
function anchorToSitePath(html: Buffer, projectId: string): Buffer {
  const base = sitePath(projectId);

  const rewritten = html
    .toString("utf8")
    // `/x` but never `//host`, and never something already anchored.
    .replace(/\b(href|src|content)=(["'])\/(?!\/)/g, (attribute, key, quote) => `${key}=${quote}${base}/`)
    .replaceAll(`${base}${base}/`, `${base}/`);

  return Buffer.from(rewritten, "utf8");
}

/**
 * Every key the browser might ask for, given one exported file.
 *
 * R2 serves objects by exact key and does nothing clever: it has no notion of
 * an index document, so `…/contact/` is simply a key that does not exist and
 * returns 404. A Cloudflare Transform Rule can paper over that, but then the
 * site only works while a dashboard setting nobody can see from the code
 * remains correct.
 *
 * So each page is written at every address that can reach it — `contact/index.html`,
 * `contact/` and `contact` — and the site works on a plain bucket with no rules
 * attached. Only HTML is duplicated, which is a rounding error next to the JS
 * and fonts that make up the bulk of an export.
 */
function keysFor(prefix: string, path: string): string[] {
  const keys = [`${prefix}/${path}`];

  if (path === "index.html") {
    keys.push(`${prefix}/`, prefix);
  } else if (path.endsWith("/index.html")) {
    const directory = path.slice(0, -"/index.html".length);
    keys.push(`${prefix}/${directory}/`, `${prefix}/${directory}`);
  }

  return keys;
}

/** The sandbox SDK writes ArrayBuffers, not Node Buffers. */
function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

/** Where a published site lives, as a URL path. Also its Next `basePath`. */
function sitePath(projectId: string) {
  return `/sites/${projectId}`;
}

async function uploadExport(
  files: { path: string; body: Buffer }[],
  projectId: string,
): Promise<PublishResult> {
  const prefix = `sites/${projectId}`;

  const objects = files.flatMap((file) =>
    keysFor(prefix, file.path).map((key) => ({
      key,
      body: file.body,
      // Derived from the source path, not the key: the duplicates are
      // extensionless, and guessing from those would serve HTML as a download.
      contentType: contentTypeFor(file.path),
    })),
  );

  if (!files.some((file) => file.path === "index.html")) {
    throw new PublishError("The build produced no index.html.");
  }

  await Promise.all(
    objects.map((object) =>
      uploadMediaAsset({
        buffer: object.body,
        key: object.key,
        contentType: object.contentType,
      }),
    ),
  );

  return {
    url: `${r2PublicBase()}/${prefix}/`,
    fileCount: files.length,
  };
}

/** Build logs are long and the useful part is at the end. */
function tail(output: string, lines = 25) {
  return output.trim().split("\n").slice(-lines).join("\n");
}
