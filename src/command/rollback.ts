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
    outro(pc.yellow('没有找到任何备份'))
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

        outro(`共找到 ${backups.length} 个备份:`)

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
            message: `确认删除所有 ${backups.length} 个备份？`,
            initialValue: false,
        })

        isCancelProcess(confirmed, CANCEL_PROCESS)

        if (!confirmed) {
            outro('已取消')
            return
        }

        const deletedCount = clearBackups(config)
        outro(`已删除 ${pc.red(deletedCount)} 个备份`)
        return
    }

    if (options.delete) {
        const success = deleteBackup(config, options.delete)

        if (success) {
            outro(`已删除备份: ${options.delete}`)
        }
        else {
            outro(`未找到备份: ${options.delete}`)
        }

        return
    }

    const backup = backupId
        ? backups.find(b => b.manifest.id === backupId)
        : getLatestBackup(config)

    if (!backup) {
        outro(backupId ? `未找到备份: ${backupId}` : '没有找到任何备份')
        return
    }

    const { manifest } = backup

    log.info('备份信息:')
    printBackList([
        {
            backupId: pc.cyan(manifest.id),
            time: formatBackupTime(manifest.timestamp),
            files: manifest.files.map(f => f.relativePath).join(', '),
            description: manifest.description || '',
        },
    ])

    const confirmed = await confirm({
        message: `确认恢复这 ${manifest.files.length} 个文件？`,
    })

    if (!confirmed) {
        outro('已取消')
        return
    }

    const restoredCount = restoreBackup(config, manifest.id)

    if (restoredCount >= 0) {
        log.success(`已恢复 ${restoredCount} 个文件`)

        const shouldDelete = await confirm({
            message: '是否删除该备份？',
            initialValue: false,
        })

        if (shouldDelete) {
            deleteBackup(config, manifest.id)
            outro('备份已删除')
        }
    }
    else {
        outro('恢复失败')
    }
}
