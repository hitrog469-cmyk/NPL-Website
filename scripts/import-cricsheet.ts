/**
 * Idempotent Cricsheet NPL import.
 *
 *   npm run import:cricsheet            download from cricsheet.org
 *   npm run import:cricsheet -- <zip>   import a local zip instead
 *
 * Writes raw match JSON to data/cricsheet/npl/ unchanged, plus manifest.json
 * with checksums. Files whose checksum is unchanged are left untouched, so a
 * re-run with no upstream changes produces no git diff.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { dataDir, PARSER_VERSION, type ImportManifest, type ImportManifestEntry } from "@npl/data";

const SOURCE_URL = "https://cricsheet.org/downloads/npl_json.zip";

async function main() {
  const local = process.argv[2];
  let zip: Uint8Array;
  if (local) {
    zip = new Uint8Array(readFileSync(local));
    console.log(`Reading local archive ${local}`);
  } else {
    console.log(`Downloading ${SOURCE_URL}`);
    const res = await fetch(SOURCE_URL);
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
    zip = new Uint8Array(await res.arrayBuffer());
  }
  console.log(`Archive ${zip.byteLength} bytes, sha256 ${sha256(zip)}`);

  const files = unzipSync(zip);
  const outDir = path.join(dataDir(), "cricsheet", "npl");
  mkdirSync(outDir, { recursive: true });
  const manifestPath = path.join(outDir, "manifest.json");
  const previous: ImportManifest | null = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : null;
  const prevByFile = new Map(previous?.matches.map((m) => [m.file, m]) ?? []);

  const now = new Date().toISOString();
  const entries: ImportManifestEntry[] = [];
  let added = 0, updated = 0, unchanged = 0;

  for (const [name, bytes] of Object.entries(files)) {
    if (name === "LICENSE.txt" || name === "README.txt") {
      writeIfChanged(path.join(outDir, name), bytes);
      continue;
    }
    if (!/^\d+\.json$/.test(name)) {
      console.warn(`Skipping unexpected file ${name}`);
      continue;
    }
    const hash = sha256(bytes);
    const meta = JSON.parse(strFromU8(bytes)).meta as { data_version: string; revision: number; created: string };
    const prev = prevByFile.get(name);
    if (prev?.sha256 === hash) {
      unchanged++;
      entries.push(prev);
      continue;
    }
    prev ? updated++ : added++;
    writeFileSync(path.join(outDir, name), bytes);
    entries.push({ id: name.replace(".json", ""), file: name, sha256: hash, dataVersion: meta.data_version, revision: meta.revision, created: meta.created, importedAt: now });
  }

  const removed = [...prevByFile.keys()].filter((f) => !files[f]);
  if (removed.length) console.warn(`Upstream no longer lists ${removed.length} file(s); keeping local copies: ${removed.join(", ")}`);
  for (const f of removed) entries.push(prevByFile.get(f)!);

  entries.sort((a, b) => a.id.localeCompare(b.id));
  const manifest: ImportManifest = {
    source: SOURCE_URL,
    licence: "Open Data Commons Attribution License (ODC-By) v1.0 — https://opendatacommons.org/licenses/by/1-0/",
    parserVersion: PARSER_VERSION,
    matches: entries,
  };
  writeIfChanged(manifestPath, new TextEncoder().encode(JSON.stringify(manifest, null, 2) + "\n"));

  console.log(`Matches in archive: ${entries.length - removed.length}. Added ${added}, updated ${updated}, unchanged ${unchanged}.`);
}

function sha256(b: Uint8Array) {
  return createHash("sha256").update(b).digest("hex");
}

function writeIfChanged(p: string, bytes: Uint8Array) {
  if (existsSync(p) && sha256(readFileSync(p)) === sha256(bytes)) return;
  writeFileSync(p, bytes);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
