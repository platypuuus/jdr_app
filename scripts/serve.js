import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { networkInterfaces } from "node:os";

const ROOT = "web";
const PORT = Number(process.env.PORT ?? 8080);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function localAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  const relative = url.pathname === "/" ? "index.html" : normalize(url.pathname).replace(/^[/\\]+/, "");
  const path = join(ROOT, relative);

  try {
    const body = await readFile(path);
    response.writeHead(200, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("404");
  }
});

server.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
  for (const address of localAddresses()) {
    console.log(`http://${address}:${PORT}  (depuis le telephone, meme wifi)`);
  }
});
