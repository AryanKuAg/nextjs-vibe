export const dynamic = "force-dynamic";

/**
 * The holding page the preview iframe sits on while v0 boots the sandbox.
 *
 * A build finishing and its preview becoming reachable are seconds apart, so
 * the proxy redirects here instead of erroring, and this page walks back to it
 * every two seconds until it serves the real site. The meta refresh is the retry
 * loop; the postMessage tells the builder to keep its own spinner up rather than
 * declaring the frame loaded.
 *
 * It lives on its own route prefix, not under `/api/v0-preview/:id/loading`, so
 * a generated site that happens to have a `/loading` page cannot shadow it.
 */
export async function GET(request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  const previewPath = `/api/v0-preview/${encodeURIComponent(chatId)}`;
  const requested = new URL(request.url).searchParams.get("returnTo");

  // Only ever bounce back into this chat's own preview: `returnTo` arrives in a
  // URL the iframe can rewrite, and an unchecked value here is an open redirect.
  const returnTo =
    requested === previewPath ||
    requested?.startsWith(`${previewPath}/`) ||
    requested?.startsWith(`${previewPath}?`)
      ? requested
      : previewPath;

  return new Response(
    `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="2;url=${escapeHtml(returnTo)}" />
    <script>
      const notify = () => parent.postMessage({ type: "v0-preview-loading" }, window.location.origin);
      notify();
      setInterval(notify, 250);
    </script>
    <style>
      html, body { height: 100%; margin: 0; }
      body {
        align-items: center;
        background: #181818;
        color: rgba(255, 255, 255, 0.5);
        display: flex;
        font: 14px system-ui, sans-serif;
        justify-content: center;
      }
    </style>
  </head>
  <body>Starting preview…</body>
</html>`,
    {
      headers: {
        "cache-control": "no-store",
        "content-type": "text/html; charset=utf-8",
      },
    },
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
