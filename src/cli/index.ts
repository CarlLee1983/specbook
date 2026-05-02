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

program.parseAsync(process.argv).catch((e) => {
  console.error(e)
  process.exit(1)
})
