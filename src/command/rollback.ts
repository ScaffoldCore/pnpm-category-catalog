import type { Dictionary } from 'console-table-printer/dist/src/models/common'
import type { BackupInfo } from '@/backup.ts'
import type { IConfig } from '@/types'
import { confirm, intro, log, outro } from '@clack/prompts'
import boxen from 'boxen'
import { Table } from 'console-table-printer'
import pc from 'picocolors'
import { clearBackups, deleteBackup, formatBackupTime, getLatestBackup, listBackups, restoreBackup } from '@/backup.ts'
import { CANCEL_PROCESS } from '@/constant.ts'
import { isCancelProcess } from '@/utils.ts'
import { version } from '../../package.json'

const printBackList = (insertedRows: Dictionary[]): void => {
    const print = new Table()

    print.addColumns([
        { name: 'backupId', alignment: 'left', color: 'cyan' },
        { name: 'time', alignment: 'left' },
        { name: 'files', alignment: 'left', color: 'red' },
        { name: 'description', alignment: 'left' },
    ])

    print.addRows(insertedRows)

    print.printTable()
}

const hasNoBack = () => {
    outro(pc.yellow('No backups were found.'))
}

export const rollback = async (
    backupId: string | undefined,
    config: IConfig,
    options: any,
): Promise<void> => {
    intro(pc.bgCyan(` Pnpm workspace catalog - Undo [v${version}]`))

    const backups = listBackups(config)

    if (options.list) {
        if (backups.length === 0) {
            hasNoBack()
            return
        }

        outro(`${backups.length} backups found:`)

        printBackList(backups.map((back: BackupInfo) => ({
            backupId: back.manifest.id,
            time: formatBackupTime(back.manifest.timestamp),
            files: back.manifest.files.length,
            description: back.manifest.description || '',
        })))

        console.log(boxen(
            `If you want to restore a certain management classification data,
you can use the following codemod:
Run "npx pnpm-category-catalog undo [backupId]"`,
            {
                title: 'Tips',
                padding: 1,
                margin: 0,
                borderStyle: 'round',
                borderColor: 'blue',
            },
        ))
        return
    }

    if (options.clear) {
        if (backups.length === 0) {
            hasNoBack()
            return
        }

        const confirmed = await confirm({
            message: `Are you sure to delete all the backup files?`,
            initialValue: false,
        })

        isCancelProcess(confirmed, CANCEL_PROCESS)

        if (!confirmed) {
            outro(CANCEL_PROCESS)
            return
        }

        const deletedCount = clearBackups(config)
        outro(`All current backups have been deleted!`)
        return
    }

    if (options.delete) {
        const success = deleteBackup(config, options.delete)

        if (success) {
            outro(`BackupID \`${pc.cyan(options.delete)}\` has been removed.`)
        }
        else {
            outro(`BackupID \`${pc.cyan(options.delete)}\` not found.`)
        }

        return
    }

    const backup = backupId
        ? backups.find(b => b.manifest.id === backupId)
        : getLatestBackup(config)

    if (!backup) {
        outro(backupId ? `BackupID \`${pc.cyan(backupId)}\` not found` : 'No backups were found.')
        return
    }

    const { manifest } = backup

    log.info('Backup information:')
    printBackList([
        {
            backupId: pc.cyan(manifest.id),
            time: formatBackupTime(manifest.timestamp),
            files: manifest.files.map(f => f.relativePath).join(', '),
            description: manifest.description || '',
        },
    ])

    const confirmed = await confirm({
        message: `Are you sure to restore the above-mentioned backup files?`,
    })

    if (!confirmed) {
        outro(CANCEL_PROCESS)
        return
    }

    const restoredCount = restoreBackup(config, manifest.id)

    if (restoredCount >= 0) {
        log.success(`🎉 Congratulations, your current backup is restored.`)

        const shouldDelete = await confirm({
            message: 'Delete cached backup files?',
            initialValue: false,
        })

        if (shouldDelete) {
            deleteBackup(config, manifest.id)
            outro('Done. Cache file has been deleted.')
        }
    }
    else {
        outro('Recovery failure!')
    }
}
