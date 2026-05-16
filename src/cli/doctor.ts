import { Command } from 'commander'
import { resolve } from 'node:path'
import { runDoctor } from '../doctor/run-doctor.js'
import { formatReport } from '../doctor/format-text.js'

export function createDoctorCommand(): Command {
  return new Command('doctor')
    .description('Diagnose environment, project, and content health')
    .option('-r, --root <dir>', 'Path to .specbook directory', '.specbook')
    .option('--json', 'Emit JSON to stdout', false)
    .option('--verbose', 'Show passing checks', false)
    .action(
      async (opts: { root: string; json: boolean; verbose: boolean }) => {
        try {
          const report = await runDoctor({
            root: resolve(process.cwd(), opts.root),
          })
          if (opts.json) {
            process.stdout.write(JSON.stringify(report, null, 2) + '\n')
          } else {
            process.stdout.write(
              formatReport(report, { verbose: opts.verbose }) + '\n',
            )
          }
          process.exit(report.ok ? 0 : 1)
        } catch (e) {
          process.stderr.write(
            `doctor crashed: ${e instanceof Error ? e.message : String(e)}\n`,
          )
          process.exit(2)
        }
      },
    )
}
