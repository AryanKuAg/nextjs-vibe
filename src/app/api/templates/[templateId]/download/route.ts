import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getTemplate, templateZipUrl } from "@/lib/templates/registry";

/**
 * Hands a gallery template over as a zip.
 *
 * Templates are no longer something the builder can start from — they are a
 * starting point the customer takes away and runs themselves. This streams the
 * archive rather than redirecting to where it is actually hosted: the customer
 * gets a file from this application, named after the template, and the source
 * repository stays an implementation detail.
 *
 * `/api(.*)` is public in the middleware, so the auth check has to live here.
 * Without it this is an open proxy for anyone who can guess the path.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { templateId } = await params;
  const template = getTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: "Unknown template." }, { status: 404 });
  }

  const upstream = await fetch(templateZipUrl(template), { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "Could not download this template right now." },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${zipName(template.title)}.zip"`,
      "cache-control": "no-store",
    },
  });
}

function zipName(title: string) {
  return (
    title
      .trim()
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "template"
  );
}
