import { createV0Client } from "v0";
async function main() {
  const v0 = createV0Client({ auth: () => process.env.V0_API_KEY! });
  const res = await v0.chats.getFiles({ chatId: "qmnIrZ3r1vP" });
  const files = (res.data?.files ?? []) as { path: string; content?: string; encoding?: string }[];
  const page = files.find((f) => f.path === "app/page.tsx")?.content ?? "";
  const lines = page.split("\n");
  lines.forEach((l, i) => {
    if (/ScrollyVideo|scrolly|VIDEO|pixabay|dynamic\(|use client|import /i.test(l)) console.log(`${i + 1}: ${l.slice(0, 160)}`);
  });
}
main().then(() => process.exit(0)).catch((e) => { console.error(String(e).slice(0,300)); process.exit(1); });
