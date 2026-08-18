async function main() {
  const { prisma } = await import("@/lib/db");
  const r = await prisma.project.findFirst({ where: { v0ChatId: { not: null } }, orderBy: { createdAt: "desc" },
    select: { name: true, v0ChatId: true, prompts: true } });
  let h = ""; for (const c of r!.v0ChatId!) h += c.charCodeAt(0).toString(16).padStart(2, "0");
  console.log("ROW", r!.name, r!.v0ChatId, h);
  console.log("BRIEF", JSON.stringify(Array.isArray(r!.prompts) ? r!.prompts[0] : null));
}
main().then(() => process.exit(0)).catch((e) => { console.error(String(e).slice(0,200)); process.exit(1); });
