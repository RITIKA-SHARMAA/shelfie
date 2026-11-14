#!/usr/bin/env node
/**
 * Evaluates "Read next" end to end against a running app.
 *
 *   npm run eval                        # http://localhost:3000
 *   npm run eval -- https://your-app.vercel.app
 *
 * For each sample shelf in eval/shelves.json it calls POST /api/recommend and
 * checks every suggestion automatically:
 *   - the request succeeds and returns 1-6 picks
 *   - each pick carries an Open Library work key (it was verified as a real book)
 *   - no pick is already on the shelf
 *   - each reason is present, at most 160 characters, and names a book from the shelf
 * It writes eval/results.json and eval/review.md, a sheet for scoring each set
 * of picks by hand (1-5), since "is this a good suggestion?" needs a human.
 */
import { readFile, writeFile } from "node:fs/promises";

const BASE = (process.argv[2] || process.env.EVAL_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const shelves = JSON.parse(await readFile(new URL("../eval/shelves.json", import.meta.url), "utf8"));
const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
for (const s of shelves) {
  const onShelf = [...(s.finished ?? []), ...(s.reading ?? []), ...(s.want ?? [])].map((b) => norm(b.title));
  const t0 = performance.now();
  let status = 0;
  let body = {};
  try {
    const res = await fetch(`${BASE}/api/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `eval-${s.id}` },
      body: JSON.stringify({ mood: s.mood, finished: s.finished ?? [], reading: s.reading ?? [], want: s.want ?? [] }),
    });
    status = res.status;
    body = await res.json().catch(() => ({}));
  } catch (err) {
    body = { error: String(err) };
  }
  const ms = Math.round(performance.now() - t0);
  const picks = body.picks ?? [];
  const fails = [];
  if (status !== 200) fails.push(`HTTP ${status} ${body.error ?? ""}`.trim());
  else {
    if (picks.length < 1 || picks.length > 6) fails.push(`${picks.length} picks`);
    if (picks.some((p) => !String(p.olKey ?? "").startsWith("/works/"))) fails.push("pick without an Open Library work");
    if (picks.some((p) => onShelf.includes(norm(p.title)))) fails.push("suggested a book already on the shelf");
    if (picks.some((p) => !p.reason || p.reason.length > 160)) fails.push("missing or long reason");
  }
  const groundedReasons = picks.filter((p) => onShelf.some((t) => t.length > 3 && norm(p.reason ?? "").includes(t))).length;
  results.push({ id: s.id, mood: s.mood, status, ms, pass: fails.length === 0, fails, groundedReasons, picks, model: body.model ?? null });
  console.log(
    `${fails.length ? "FAIL" : "pass"}  ${s.id.padEnd(15)} ${String(ms).padStart(6)} ms  ${picks.length} picks, ${groundedReasons} name a shelf book  ${fails.join("; ")}`,
  );
  await sleep(1500); // stay gentle with the free tier
}

const passed = results.filter((r) => r.pass).length;
const totalPicks = results.reduce((a, r) => a + r.picks.length, 0);
const grounded = results.reduce((a, r) => a + r.groundedReasons, 0);
const ms = results.map((r) => r.ms).sort((a, b) => a - b);
const summary = {
  ranAt: new Date().toISOString(),
  baseUrl: BASE,
  shelves: results.length,
  passed,
  totalPicks,
  reasonsNamingAShelfBook: totalPicks ? Number((grounded / totalPicks).toFixed(2)) : 0,
  medianMs: ms[Math.floor(ms.length / 2)],
  models: [...new Set(results.map((r) => r.model).filter(Boolean))],
};
await writeFile(new URL("../eval/results.json", import.meta.url), JSON.stringify({ summary, results }, null, 2) + "\n");
const review = [
  "# Read next: review sheet",
  "",
  `Run ${summary.ranAt} against ${BASE}. Automated checks: ${passed}/${results.length} shelves passed.`,
  "",
  "Score each set 1-5: are these books a reader of that shelf would actually want next?",
  "",
  ...results.flatMap((r) => [
    `## ${r.id} (${r.mood})`,
    "",
    ...(r.picks.length ? r.picks.map((p) => `- **${p.title}** by ${p.author}: ${p.reason}`) : [`_No picks: ${r.fails.join("; ")}_`]),
    "",
    "Score: __ / 5",
    "",
  ]),
].join("\n");
await writeFile(new URL("../eval/review.md", import.meta.url), review);
console.log(
  `\n${passed}/${results.length} passed · ${totalPicks} picks · median ${summary.medianMs} ms · wrote eval/results.json and eval/review.md`,
);
process.exit(passed === results.length ? 0 : 1);
