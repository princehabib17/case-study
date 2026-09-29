// Bundles the scroll demo into ONE self-contained HTML file (JS, CSS and fonts inlined).
import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";

const result = await build({
  entryPoints: ["web/main.tsx"],
  bundle: true,
  minify: process.env.NOMINIFY ? false : true,
  write: false,
  outdir: "dist",
  jsx: "automatic",
  format: "iife",
  target: "es2020",
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".woff": "dataurl", ".woff2": "dataurl", ".json": "json" },
  logLevel: "warning",
});

const js = result.outputFiles.find((f) => f.path.endsWith(".js")).text;
const css = result.outputFiles.find((f) => f.path.endsWith(".css"))?.text ?? "";
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Renesource — Scroll Build</title>
<style>${css}
html,body{margin:0;background:#E9EBEF}</style>
</head>
<body>
<div id="root"></div>
<script>${js.replace(/<\/script/gi, "<\\/script")}</script>
</body>
</html>`;
mkdirSync("dist", { recursive: true });
writeFileSync("dist/scroll-demo.html", html);
console.log(`dist/scroll-demo.html  ${(html.length / 1024 / 1024).toFixed(2)} MB`);
