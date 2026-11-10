// A small static web server with no dependencies, so the site can be opened
// the way browsers require (ES modules do not load from file://).
//   node scripts/serve.mjs        then open http://localhost:5173
//   PORT=8080 node scripts/serve.mjs
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT) || 5173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8"
};

// Resolve a request path inside the project, refusing anything that escapes it.
function safePath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  } catch (error) {
    return null;
  }
  const candidate = normalize(join(root, decoded));
  if (candidate !== root && !candidate.startsWith(root + sep)) return null;
  return candidate;
}

async function fileInfo(path) {
  try {
    return await stat(path);
  } catch (error) {
    return null;
  }
}

const server = createServer(async function (request, response) {
  try {
    let filePath = safePath(request.url || "/");
    if (!filePath) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }
    let info = await fileInfo(filePath);
    if (info && info.isDirectory()) {
      filePath = join(filePath, "index.html");
      info = await fileInfo(filePath);
    }
    if (!info) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": MIME[extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    response.end(body);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Server error: " + error.message);
  }
});

server.listen(port, function () {
  console.log("Space Legacy is running at http://localhost:" + port);
  console.log("Press Ctrl+C to stop.");
});
