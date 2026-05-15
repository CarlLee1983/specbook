import { writeFile, mkdir, copyFile } from 'node:fs/promises'
import { join } from 'node:path'

export type BuildOptions = {
  rootDir: string
  srcDir: string
  outDir: string
  locales: readonly string[]
  primaryLocale: string
}

export type BuildResult =
  | { ok: true; writtenFiles: string[] }
  | { ok: false; error: string }

function renderChooser(locales: readonly string[], primary: string): string {
  return `<!DOCTYPE html>
<html lang="${primary}">
<head>
<meta charset="utf-8">
<title>User Guide — Select language</title>
<script>
(function () {
  var locales = ${JSON.stringify(locales)};
  var primary = ${JSON.stringify(primary)};
  var lang = (navigator.language || primary);
  var target = locales.indexOf(lang) !== -1 ? lang : primary;
  if (target === primary && lang !== primary) {
    for (var i = 0; i < locales.length; i++) {
      if (locales[i].toLowerCase().split('-')[0] === lang.toLowerCase().split('-')[0]) {
        target = locales[i];
        break;
      }
    }
  }
  location.replace(target + '/index.html');
})();
</script>
<noscript>
<ul>
${locales.map((l) => `  <li><a href="${l}/index.html">${l}</a></li>`).join('\n')}
</ul>
</noscript>
</head>
<body>
<p>Redirecting…</p>
</body>
</html>
`
}

export async function buildUserDocs(opts: BuildOptions): Promise<BuildResult> {
  const written: string[] = []
  const outRoot = join(opts.rootDir, opts.outDir)
  await mkdir(outRoot, { recursive: true })

  for (const locale of opts.locales) {
    const srcHtml = join(opts.rootDir, opts.srcDir, locale, 'index.html')
    const dstDir = join(outRoot, locale)
    const dstHtml = join(dstDir, 'index.html')
    await mkdir(dstDir, { recursive: true })
    await copyFile(srcHtml, dstHtml)
    written.push(dstHtml)
  }

  const chooserPath = join(outRoot, 'index.html')
  await writeFile(chooserPath, renderChooser(opts.locales, opts.primaryLocale), 'utf8')
  written.push(chooserPath)

  return { ok: true, writtenFiles: written }
}
