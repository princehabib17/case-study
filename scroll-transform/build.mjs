// Bundles the page into ONE self-contained HTML file (JS, CSS, fonts and map data inlined).
import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const r = await build({
  entryPoints: ["src/main.js"], bundle: true, minify: true, write: false, outdir: "dist",
  format: "iife", target: "es2020", loader: { ".woff": "dataurl", ".woff2": "dataurl", ".json": "json" }, logLevel: "warning",
});
const js = r.outputFiles.find((f) => f.path.endsWith(".js")).text;
const css = r.outputFiles.find((f) => f.path.endsWith(".css")).text;
const html = readFileSync("src/index.html", "utf8")
  .replace("/*__CSS__*/", () => css)
  .replace("/*__JS__*/", () => js.replace(/<\/script/gi, "<\\/script"));
mkdirSync("dist", { recursive: true });
writeFileSync("dist/wireframe-to-website.html", html);
console.log(`dist/wireframe-to-website.html  ${(html.length / 1024 / 1024).toFixed(2)} MB`);
