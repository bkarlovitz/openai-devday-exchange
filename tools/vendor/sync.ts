#!/usr/bin/env node
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readdirSync, lstatSync } from "node:fs";
import { rm, mkdir, readFile, writeFile, mkdtemp, rename } from "node:fs/promises";
import { join, resolve, relative, isAbsolute } from "node:path";

type Entry = { package: string; version: string; repo: string; ref: string; dir: string };
type Config = { outDir: string; entries: Entry[] };

const run = promisify(execFile);
const CONFIG_PATH = "vendor.config.json";
const REF_FILE = ".vendor-ref";
const ENTRY_FIELDS = ["package", "version", "repo", "ref", "dir"] as const;

const cmd = process.argv[2];
if (cmd !== "sync" && cmd !== "status") {
  console.error("Usage: node sync.ts <sync|status>");
  process.exit(1);
}
try {
  const config = await loadConfig();
  if (cmd === "sync") await sync(config);
  else await status(config);
} catch (error) {
  die((error as Error).message);
}

async function loadConfig(): Promise<Config> {
  if (!existsSync(CONFIG_PATH)) die(`${CONFIG_PATH} not found in current directory`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(CONFIG_PATH, "utf8"));
  } catch (err) {
    die(`Invalid JSON in ${CONFIG_PATH}: ${(err as Error).message}`);
  }
  if (typeof parsed !== "object" || parsed === null) badConfig("config must be an object");
  const o = parsed as Record<string, unknown>;
  if (typeof o.outDir !== "string" || !o.outDir.trim()) badConfig("outDir must be a nonempty string");
  const output = resolve(o.outDir);
  const rel = relative(process.cwd(), output);
  if (!rel || rel.startsWith("..") || isAbsolute(rel) || rel.split(/[\\/]/).includes(".git")) {
    badConfig("outDir must be a dedicated directory inside the project, outside .git");
  }
  let ancestor = output;
  while (ancestor !== process.cwd()) {
    if (existsSync(ancestor) && lstatSync(ancestor).isSymbolicLink()) badConfig("outDir cannot traverse symlinks");
    ancestor = resolve(ancestor, "..");
  }
  if (!Array.isArray(o.entries)) badConfig("entries must be an array");
  const entries = o.entries.map((e, i) => {
    if (typeof e !== "object" || e === null) badConfig(`entries[${i}] must be an object`);
    const ent = e as Record<string, unknown>;
    for (const f of ENTRY_FIELDS) {
      if (typeof ent[f] !== "string" || !(ent[f] as string).trim()) badConfig(`entries[${i}].${f} must be a string`);
    }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(ent.dir as string) || ent.dir === ".git") {
      badConfig(`entries[${i}].dir must be a simple directory name`);
    }
    return Object.fromEntries(ENTRY_FIELDS.map((f) => [f, ent[f]])) as Entry;
  });
  if (new Set(entries.map((e) => e.dir)).size !== entries.length) badConfig("entry directories must be unique");
  return { outDir: o.outDir, entries };
}

async function sync(config: Config) {
  const outDir = resolve(process.cwd(), config.outDir);
  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });

  let cloned = 0, skipped = 0, orphans = 0;
  for (const entry of config.entries) {
    const target = join(outDir, entry.dir);
    const tag = `[${entry.package}]`;
    if (!existsSync(target)) {
      console.log(`${tag} cloning ${entry.repo} at ${entry.ref}`);
      await clone(entry, target);
      cloned++;
      continue;
    }
    if (lstatSync(target).isSymbolicLink() || !lstatSync(target).isDirectory()) {
      die(`${target} must be a real directory`);
    }
    const current = await readRef(target);
    if (current === identity(entry)) {
      console.log(`${tag} already at ${entry.ref}, skipping`);
      skipped++;
    } else {
      console.log(`${tag} ref mismatch (have ${current ?? "unknown"}, want ${entry.ref}), re-cloning`);
      await clone(entry, target);
      cloned++;
    }
  }

  for (const name of orphansIn(outDir, config)) {
    console.log(`[orphan] removing ${name}`);
    await rm(join(outDir, name), { recursive: true, force: true });
    orphans++;
  }

  console.log(`Synced ${config.entries.length} entries (${cloned} cloned, ${skipped} skipped, ${orphans} orphans removed)`);
}

async function status(config: Config) {
  const outDir = resolve(process.cwd(), config.outDir);
  const rows: string[][] = [];
  for (const entry of config.entries) {
    const target = join(outDir, entry.dir);
    const present = existsSync(target);
    const matches = present ? ((await readRef(target)) === identity(entry) ? "yes" : "no") : null;
    rows.push([
      `${entry.package}@${entry.version}`,
      `ref=${entry.ref}`,
      `present=${present ? "yes" : "no"}`,
      matches === null ? "" : `matches=${matches}`,
    ]);
  }
  const widths = [0, 0, 0, 0];
  for (const r of rows) for (let i = 0; i < 4; i++) widths[i] = Math.max(widths[i], r[i].length);
  for (const r of rows) console.log(r.map((c, i) => c.padEnd(widths[i])).join("  ").trimEnd());

  if (existsSync(outDir)) {
    const orphans = orphansIn(outDir, config);
    if (orphans.length > 0) {
      console.log("\nOrphans (in outDir but not in config):");
      for (const o of orphans) console.log(`  ${o}`);
    }
  }
}

function identity(entry: Entry): string {
  return JSON.stringify({ repo: entry.repo, ref: entry.ref });
}

async function clone(entry: Entry, target: string) {
  const stage = await mkdtemp(join(resolve(target, ".."), ".vendor-stage-"));
  try {
    await run("git", ["init", "--quiet", stage]);
    await run("git", ["-C", stage, "fetch", "--quiet", "--depth=1", "--no-tags", "--", entry.repo, entry.ref]);
    await run("git", ["-C", stage, "checkout", "--quiet", "--detach", "FETCH_HEAD"]);
    await writeFile(join(stage, REF_FILE), identity(entry), "utf8");
    await rm(target, { recursive: true, force: true });
    await rename(stage, target);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

async function readRef(target: string): Promise<string | null> {
  const p = join(target, REF_FILE);
  if (!existsSync(p)) return null;
  return (await readFile(p, "utf8")).trim();
}

function orphansIn(outDir: string, config: Config): string[] {
  const declared = new Set(config.entries.map((e) => e.dir));
  return readdirSync(outDir).filter((name) => {
    return lstatSync(join(outDir, name)).isDirectory() && !declared.has(name);
  });
}

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function badConfig(msg: string): never {
  die(`Invalid vendor.config.json: ${msg}`);
}
