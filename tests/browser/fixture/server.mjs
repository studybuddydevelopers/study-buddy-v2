import http from "node:http";
import path from "node:path";
import { readFile, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { build } from "esbuild";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// Test-only loopback server. No Next configuration, .env files or API handlers.
const root = fileURLToPath(new URL("../../../", import.meta.url));
const fixture = fileURLToPath(new URL("./", import.meta.url));
const require = createRequire(import.meta.url);
const config = require("../../../tailwind.config.js");
const { outputFiles } = await build({
  entryPoints: [path.join(fixture, "app.tsx")],
  absWorkingDir: root,
  bundle: true,
  write: false,
  outfile: "bundle.js",
  jsx: "automatic",
  format: "iife",
  platform: "browser",
  alias: {
    "@": root,
    "next/navigation": path.join(fixture, "navigation.ts"),
    "next/link": path.join(fixture, "link.tsx"),
    "next/image": path.join(fixture, "image.tsx"),
    "next/dynamic": path.join(fixture, "dynamic.ts"),
    "@/components/CaptchaChallenge": path.join(fixture, "captcha.tsx"),
    "@/lib/supabaseClient": path.join(fixture, "supabase.ts"),
  },
  define: { "process.env": "{}" },
  loader: { ".svg": "dataurl" },
});
const css = await postcss([
  tailwindcss({ ...config, content: [...config.content, "./tests/browser/fixture/**/*.tsx"] }),
  autoprefixer(),
]).process(await readFile(path.join(root, "app/globals.css"), "utf8"), { from: path.join(root, "app/globals.css") });
const html = '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Study Buddy accessibility fixture</title><link rel="stylesheet" href="/fixture.css"></head><body><div id="fixture"></div><script src="/fixture.js"></script></body></html>';
const publicRoot = await realpath(path.join(root, "public"));
const types = { ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://127.0.0.1:3105").pathname;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'none'");
  if (req.method !== "GET" || pathname.startsWith("/api/")) {
    res.writeHead(501); res.end("API requests must be mocked by the test"); return;
  }
  if (pathname === "/fixture.js" || pathname === "/fixture.css") {
    res.setHeader("Content-Type", pathname.endsWith(".js") ? "text/javascript" : "text/css");
    res.end(pathname.endsWith(".js") ? outputFiles.find((file) => file.path.endsWith(".js")).contents : css.css);
    return;
  }
  if (pathname.startsWith("/images/") || pathname.startsWith("/icons/") || pathname === "/logo-icon.svg") {
    try {
      const file = await realpath(path.join(publicRoot, decodeURIComponent(pathname)));
      if (!file.startsWith(publicRoot + path.sep)) throw new Error("Not a public asset");
      res.setHeader("Content-Type", types[path.extname(file)] ?? "application/octet-stream");
      res.end(await readFile(file));
    } catch { res.writeHead(404); res.end(); }
    return;
  }
  res.setHeader("Content-Type", "text/html");
  res.end(html);
});
server.listen(3105, "127.0.0.1", () => console.log("Accessibility fixture ready on loopback port 3105"));
process.on("SIGTERM", () => { server.close(); server.closeAllConnections(); });
