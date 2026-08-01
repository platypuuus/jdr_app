import { mkdir, readFile, writeFile } from "node:fs/promises";

const OUT_PATH = "out/table-de-donjon.html";

// Le fichier unique doit tourner depuis file:// sur un telephone : ni fetch, ni import
// de module voisin ne fonctionnent dans ce contexte. On fusionne donc les deux modules
// en un seul script et on injecte les donnees dans window.
async function main() {
  const [html, css, tirage, app, data] = await Promise.all([
    readFile("web/index.html", "utf-8"),
    readFile("web/style.css", "utf-8"),
    readFile("web/tirage.js", "utf-8"),
    readFile("web/app.js", "utf-8"),
    readFile("web/data.json", "utf-8"),
  ]);

  const tirageInline = tirage.replace(/^export /gm, "");
  const appInline = app.replace(/^import .*? from "\.\/tirage\.js";\n/m, "");

  const page = html
    .replace('<link rel="stylesheet" href="style.css" />', `<style>\n${css}\n</style>`)
    .replace(
      '<script type="module" src="app.js"></script>',
      `<script>window.DONNEES_INTEGREES = ${data};</script>\n    <script>\n${tirageInline}\n${appInline}\n</script>`
    );

  if (page.includes("style.css") || page.includes('src="app.js"')) {
    throw new Error("Inlining incomplet : le gabarit HTML a change");
  }

  await mkdir("out", { recursive: true });
  await writeFile(OUT_PATH, page, "utf-8");

  const kilos = Math.round(Buffer.byteLength(page, "utf-8") / 1024);
  console.log(`Ecrit : ${OUT_PATH} (${kilos} Ko, autonome)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
