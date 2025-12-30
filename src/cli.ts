import { outro } from '@clack/prompts'
import cac from 'cac'

import { managementWorkSpaceCatalog } from '@/command/management.ts'
import { rollback } from '@/command/rollback.ts'
import { resolveConfig } from '@/config.ts'
import { version } from '../package.json'

const cli = cac('pcc')

cli
    .command('', 'Running pcc will execute into classification management')
    .option('--cwd <path>', 'Specify the working directory')
    .action(async (options: { cwd?: string }) => {
        try {
            const config = resolveConfig(options.cwd)
            await managementWorkSpaceCatalog(config)
        }
        catch (e) {
            outro(e as string)
        }
    })

cli
    .command('undo [backupId]', 'Restore files from backup')
    .option('--list', 'List all backups', { default: false })
    .option('--clear', 'Clear all backups', { default: false })
    .option('--delete <id>', 'Delete a specific backup')
    .option('--cwd <path>', 'Specify the working directory')
    .action(
        async (
            backupId: string | undefined,
            options: {
                list?: boolean
                clear?: boolean
                delete?: string
                cwd?: string
            },
        ) => {
            const config = resolveConfig(options.cwd)

            await rollback(backupId, config, options)
        },
    )

cli.help()
cli.version(version)
cli.parse()
