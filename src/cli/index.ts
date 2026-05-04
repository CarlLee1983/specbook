#!/usr/bin/env node
import { Command } from 'commander'
import { resolve } from 'node:path'
import { runValidate } from './validate.js'

const program = new Command()

program
  .name('specbook')
  .description('Static site generator for software project specifications')
  .version('0.1.0')

program
  .command('init')
  .description('Scaffold .specbook/ in current project')
  .option('-r, --root <dir>', 'Project root', process.cwd())
  .option('--force', 'Overwrite existing files', false)
  .option('--only <list>', 'Comma-separated kinds (overview,tech-stack,...)')
  .action(async (opts: { root: string; force: boolean; only?: string }) => {
    const { runInitCli } = await import('./init.js')
    const only = opts.only
      ? (opts.only.split(',').map((s) => s.trim()) as never[])
      : undefined
    const r = await runInitCli({ root: opts.root, force: opts.force, only })
    process.stdout.write(r.summary + '\n')
    process.exit(r.exitCode)
  })

program
  .command('validate')
  .description('Validate .specbook/content/* against schemas')
  .option('-r, --root <dir>', 'Path to .specbook directory', '.specbook')
  .action(async (opts: { root: string }) => {
    const root = resolve(process.cwd(), opts.root)
    const result = await runValidate(root)
    if (result.ok) {
      console.log('All content valid.')
      process.exit(0)
    }
    console.error('Validation failed:')
    for (const e of result.errors) console.error('  - ' + e)
    process.exit(1)
  })

program
  .command('build')
  .description('Build static site to .specbook/dist')
  .option('-r, --root <dir>', 'Path to .specbook directory', '.specbook')
  .option('--base <base>', 'Public base path (e.g. /repo/)')
  .action(async (opts: { root: string; base?: string }) => {
    const { runBuild } = await import('./build.js')
    await runBuild({ root: resolve(process.cwd(), opts.root), base: opts.base })
  })

program
  .command('export')
  .description('Export a client-facing system specification document')
  .option('-r, --root <dir>', 'Path to .specbook directory', '.specbook')
  .option('-o, --out <dir>', 'Output directory', '.specbook/dist/client-spec')
  .option('-f, --formats <list>', 'Comma-separated formats (md,html)', 'md,html')
  .action(async (opts: { root: string; out: string; formats: string }) => {
    const { parseExportFormats, runExport } = await import('./export.js')
    await runExport({
      root: resolve(process.cwd(), opts.root),
      outDir: resolve(process.cwd(), opts.out),
      formats: parseExportFormats(opts.formats),
    })
  })

program
  .command('dev')
  .description('Start dev server with HMR')
  .option('-r, --root <dir>', 'Path to .specbook directory', '.specbook')
  .option('-p, --port <port>', 'Port number', (v) => Number(v), 5173)
  .action(async (opts: { root: string; port: number }) => {
    const { runDev } = await import('./dev.js')
    await runDev({ root: resolve(process.cwd(), opts.root), port: opts.port })
  })

program
  .command('gaps')
  .description('Detect placeholder / unfinished sections in .specbook/content')
  .option('-r, --root <dir>', 'Path to .specbook directory', '.specbook')
  .option('--json', 'Emit JSON to stdout', false)
  .action(async (opts: { root: string; json: boolean }) => {
    const { runGapsCli } = await import('./gaps.js')
    const r = await runGapsCli({ root: opts.root, json: opts.json })
    if (r.stdout) process.stdout.write(r.stdout + '\n')
    if (r.stderr) process.stderr.write(r.stderr + '\n')
    process.exit(r.exitCode)
  })

program.parseAsync(process.argv).catch((e) => {
  console.error(e)
  process.exit(1)
})
