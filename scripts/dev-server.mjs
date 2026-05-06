import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { existsSync, readFileSync, statSync } from "node:fs";

const root = join(process.cwd(), "dist");
const port = Number(process.env.PORT || 5173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const requested = normalize(decodeURIComponent(url.pathname))
    .replace(/^[/\\]+/, "")
    .replace(/^(\.\.[/\\])+/, "");
  let file = join(root, requested === "/" ? "index.html" : requested);
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    file = join(root, "index.html");
  }
  response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
  response.end(readFileSync(file));
}).listen(port, "127.0.0.1", () => {
  console.log(`Cantilever Replacement Tracker running at http://localhost:${port}`);
});
