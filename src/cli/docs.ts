import { Command } from 'commander'
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, join, extname } from 'node:path'
import { scaffoldUserDocs } from '../docs/scaffold.js'
import { buildUserDocs } from '../docs/build.js'
import { validateUserDocs } from '../docs/validator.js'
import { normalizeCoverageFlag } from '../docs/coverage.js'
import { patchConfig, renderDocsUserSnippet } from '../docs/patch-config.js'
import { loadConfig } from '../content/load-config.js'
import type { DocsUserConfig } from '../schema/docs.js'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
}

async function tryLoadDocsUserConfig(root: string): Promise<DocsUserConfig | null> {
  const configPath = resolve(root, '.specbook/specbook.config.ts')
  try {
    const cfg = await loadConfig(configPath)
    return cfg.docs?.user ?? null
  } catch {
    return null
  }
}

export function createDocsCommand(): Command {
  const cmd = new Command('docs').description(
    'Manage user-facing documentation (docs/user/)',
  )

  cmd
    .command('init')
    .description('Scaffold docs/user/<locale>/{index.md,index.html}')
    .option('-r, --root <dir>', 'Project root', process.cwd())
    .option('--locales <list>', 'Comma-separated locales (e.g. en,zh-TW)')
    .option('--theme <name>', 'Theme name', 'anthropic-warm')
    .option(
      '--coverage <list>',
      'Coverage: "all" | "1,3,5" | "install-setup,..."',
      'all',
    )
    .option('--project <name>', 'Project name (defaults to package.json name)')
    .option('--tagline <text>', 'One-line tagline', '')
    .option('--github <url>', 'GitHub URL', '')
    .option('--force', 'Overwrite existing files', false)
    .option(
      '--write-config',
      'Patch .specbook/specbook.config.ts to enable docs.user',
      false,
    )
    .action(async (opts) => {
      const root = resolve(opts.root)
      const userCfg = await tryLoadDocsUserConfig(root)
      const locales =
        (opts.locales as string | undefined)
          ?.split(',')
          .map((s) => s.trim()) ??
        userCfg?.locales ??
        ['zh-TW', 'en']
      const cov = normalizeCoverageFlag(String(opts.coverage))
      if (typeof cov === 'object' && 'error' in cov) {
        console.error(cov.error)
        process.exit(1)
      }
      const pkg = await readFile(resolve(root, 'package.json'), 'utf8')
        .then((s) => JSON.parse(s))
        .catch(() => ({}))
      const projectName = opts.project ?? pkg.name ?? 'Project'

      const r = await scaffoldUserDocs({
        rootDir: root,
        outDir: 'docs/user/',
        projectName,
        tagline: opts.tagline ?? '',
        githubUrl: opts.github ?? '',
        locales,
        theme: opts.theme,
        coverage: cov,
        force: !!opts.force,
      })
      if (!r.ok) {
        console.error(r.error)
        process.exit(1)
      }
      for (const f of r.writtenFiles) console.log('wrote', f)

      if (opts.writeConfig) {
        const configPath = resolve(root, '.specbook/specbook.config.ts')
        if (!existsSync(configPath)) {
          console.error(
            `expected ${configPath} (run \`specbook init\` first)`,
          )
          process.exit(1)
        }
        const original = await readFile(configPath, 'utf8')
        const result = patchConfig(original, {
          enabled: true,
          locales,
          theme: opts.theme,
          coverage: cov,
        })
        if (result.kind === 'patched') {
          await writeFile(configPath, result.text, 'utf8')
          console.log(`patched ${configPath} (added docs.user)`)
        } else if (result.kind === 'skipped') {
          console.log(`${configPath} already has docs.user; left untouched`)
        } else {
          console.error(
            `could not patch ${configPath}: ${result.reason}. paste this manually:`,
          )
          console.log(renderDocsUserSnippet(locales, opts.theme, cov))
          process.exit(1)
        }
      }
    })

  cmd
    .command('validate')
    .description('Validate doc-key alignment in docs/user/')
    .option('-r, --root <dir>', 'Project root', process.cwd())
    .action(async (opts) => {
      const root = resolve(opts.root)
      const userCfg = await tryLoadDocsUserConfig(root)
      if (!userCfg || !userCfg.enabled) {
        console.error('docs.user not enabled in config; see specbook docs init')
        process.exit(1)
      }
      const r = await validateUserDocs(resolve(root, 'docs/user/'), userCfg)
      if (r.ok) {
        console.log('docs.user OK')
        process.exit(0)
      }
      for (const err of r.errors) console.error(JSON.stringify(err))
      process.exit(1)
    })

  cmd
    .command('dev')
    .description('Preview docs/user/ in a local browser')
    .option('-r, --root <dir>', 'Project root', process.cwd())
    .option('-p, --port <port>', 'Port', (v) => Number(v), 4123)
    .action(async (opts) => {
      const baseDir = resolve(opts.root, 'docs/user/')
      const server = createServer(async (req, res) => {
        let urlPath = req.url ?? '/'
        if (urlPath === '/') urlPath = '/index.html'
        const filePath = join(baseDir, urlPath)
        try {
          const data = await readFile(filePath)
          const mime = MIME[extname(filePath)] ?? 'application/octet-stream'
          res.writeHead(200, { 'Content-Type': mime })
          res.end(data)
        } catch {
          res.writeHead(404)
          res.end('Not found')
        }
      })
      server.listen(opts.port, () => {
        console.log(`docs.user preview at http://localhost:${opts.port}/`)
      })
    })

  cmd
    .command('build')
    .description('Build docs/user/ into dist/user/')
    .option('-r, --root <dir>', 'Project root', process.cwd())
    .option('--skip-validate', 'Skip validate before build', false)
    .action(async (opts) => {
      const root = resolve(opts.root)
      const userCfg = await tryLoadDocsUserConfig(root)
      if (!userCfg || !userCfg.enabled) {
        console.error('docs.user not enabled in config')
        process.exit(1)
      }
      if (!opts.skipValidate) {
        const v = await validateUserDocs(resolve(root, 'docs/user/'), userCfg)
        if (!v.ok) {
          console.error(
            'validate failed; aborting build (use --skip-validate to bypass)',
          )
          for (const e of v.errors) console.error(JSON.stringify(e))
          process.exit(1)
        }
      }
      const r = await buildUserDocs({
        rootDir: root,
        srcDir: 'docs/user/',
        outDir: 'dist/user/',
        locales: userCfg.locales,
        primaryLocale: userCfg.locales[0]!,
      })
      if (!r.ok) {
        console.error(r.error)
        process.exit(1)
      }
      for (const f of r.writtenFiles) console.log('wrote', f)
    })

  return cmd
}
