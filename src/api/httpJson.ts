import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const CACHE_DIR = "cache";
const USER_AGENT = "jdr-app/1.0 (personal tabletop tool)";

function cachePathFor(url: string, extension: string): string {
  const hash = createHash("sha1").update(url).digest("hex");
  return `${CACHE_DIR}/${hash}.${extension}`;
}

async function readCache(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

async function writeCache(path: string, body: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body, "utf-8");
}

async function fetchWithCache(url: string, extension: string): Promise<string> {
  const path = cachePathFor(url, extension);
  const cached = await readCache(path);
  if (cached !== null) return cached;

  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} on ${url}`);
  }
  const body = await response.text();
  await writeCache(path, body);
  return body;
}

export async function fetchJson<T>(url: string): Promise<T> {
  return JSON.parse(await fetchWithCache(url, "json")) as T;
}

export async function fetchText(url: string): Promise<string> {
  return fetchWithCache(url, "txt");
}
