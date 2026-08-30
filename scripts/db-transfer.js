/**
 * Copy the rows from the old Neon project into the new Supabase database.
 *
 * DATA ONLY. Create the schema first, so Prisma's own migration history lands
 * in the target correctly:
 *
 *     npx prisma migrate deploy
 *     node scripts/db-transfer.js
 *
 * Reads both connection strings from .env:
 *   DATABASE_URL_OLD_V2   source
 *   DIRECT_URL            target (unpooled) — falls back to DATABASE_URL
 *
 * This uses the `pg` client the app already depends on rather than
 * pg_dump/pg_restore, which are not installed and would need Docker or a
 * Homebrew Postgres just to move a few thousand rows.
 *
 * Three details it exists to handle:
 *
 *   * Table order. Fragment references Message references Project, so the
 *     tables load parents-first and every foreign key resolves as rows land.
 *
 *   * JSON columns. node-postgres serialises a JS array into a *Postgres
 *     array* literal, not JSON — so `Project.sceneImageUrls` and friends would
 *     silently corrupt. Those columns are stringified and cast explicitly.
 *
 *   * Re-runnability. Every insert is ON CONFLICT DO NOTHING, so a partial run
 *     can simply be repeated.
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const ROOT = path.join(__dirname, "..");

// Read .env without sourcing it — values contain characters a shell would eat.
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, "")])
);

const SOURCE = env.DATABASE_URL_OLD_V2;
const TARGET = env.DIRECT_URL || env.DATABASE_URL;

/** Parents before children. */
const TABLES = ["Project", "Message", "Fragment", "Usage"];

/** Rows per INSERT. Postgres caps a statement at 65535 parameters. */
const BATCH = 200;

const host = (url) => url.replace(/^.*@/, "").replace(/[?].*$/, "");

async function columnsOf(client, table) {
  const { rows } = await client.query(
    `select column_name, data_type
       from information_schema.columns
      where table_schema = 'public' and table_name = $1
      order by ordinal_position`,
    [table]
  );
  return rows.map((r) => ({ name: r.column_name, isJson: r.data_type === "json" || r.data_type === "jsonb" }));
}

async function copyTable(src, dst, table) {
  const cols = await columnsOf(src, table);
  if (!cols.length) throw new Error(`${table}: no such table in the source`);

  const list = cols.map((c) => `"${c.name}"`).join(", ");
  const { rows } = await src.query(`select ${list} from public."${table}"`);
  if (!rows.length) return 0;

  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const params = [];
    const tuples = batch.map((row) => {
      const placeholders = cols.map((c) => {
        const v = row[c.name];
        // A JS array bound straight to a json column becomes a Postgres array
        // literal; stringify and cast so it lands as JSON.
        params.push(c.isJson && v !== null ? JSON.stringify(v) : v);
        return c.isJson ? `$${params.length}::jsonb` : `$${params.length}`;
      });
      return `(${placeholders.join(", ")})`;
    });

    const res = await dst.query(
      `insert into public."${table}" (${list}) values ${tuples.join(", ")} on conflict do nothing`,
      params
    );
    written += res.rowCount;
  }
  return written;
}

const count = async (c, t) =>
  Number((await c.query(`select count(*) from public."${t}"`)).rows[0].count);

(async () => {
  if (!SOURCE) throw new Error("DATABASE_URL_OLD_V2 is not set in .env");
  if (!TARGET) throw new Error("neither DIRECT_URL nor DATABASE_URL is set in .env");

  const src = new Client({ connectionString: SOURCE, connectionTimeoutMillis: 30000 });
  const dst = new Client({ connectionString: TARGET, connectionTimeoutMillis: 30000 });
  await src.connect();
  await dst.connect();

  console.log(`source: ${host(SOURCE)}`);
  console.log(`target: ${host(TARGET)}\n`);

  try {
    for (const t of TABLES) {
      process.stdout.write(`  ${t.padEnd(10)} `);
      const written = await copyTable(src, dst, t);
      console.log(`${written} rows`);
    }

    console.log("\n  " + "table".padEnd(10) + "source".padStart(8) + "target".padStart(8));
    let ok = true;
    for (const t of TABLES) {
      const [s, d] = [await count(src, t), await count(dst, t)];
      if (s !== d) ok = false;
      console.log(`  ${t.padEnd(10)}${String(s).padStart(8)}${String(d).padStart(8)}${s === d ? "" : "   MISMATCH"}`);
    }
    console.log(ok ? "\nAll tables match." : "\nRow counts differ — see above.");
    process.exitCode = ok ? 0 : 1;
  } finally {
    await src.end().catch(() => {});
    await dst.end().catch(() => {});
  }
})().catch((e) => {
  console.error("\nFAILED:", e.message);
  process.exitCode = 1;
});
