import type { IConfig } from '@/types'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cancel, isCancel } from '@clack/prompts'
import { Table } from 'console-table-printer'
import { parseDocument, YAMLMap } from 'yaml'
import { DEPENDENCY_TYPES } from '@/constant.ts'

export type DependencyUsageMap = Map<string, string[]>

export function scanDependencyUsage(
    config: IConfig,
    packagePaths: string[],
): DependencyUsageMap {
    const usageMap: DependencyUsageMap = new Map()

    for (const pkgPath of packagePaths) {
        const filePath = resolve(config.cwd, pkgPath)
        const fileContent = readFileSync(filePath, 'utf-8')
        const pkgData = JSON.parse(fileContent)

        const pkgName
            = pkgData.name
                || (pkgPath === 'package.json'
                    ? 'root'
                    : pkgPath.replace('/package.json', ''))

        for (const depType of DEPENDENCY_TYPES) {
            const deps = pkgData[depType]
            if (deps) {
                for (const depName of Object.keys(deps)) {
                    if (!usageMap.has(depName)) {
                        usageMap.set(depName, [])
                    }
                    usageMap.get(depName)!.push(pkgName)
                }
            }
        }
    }

    return usageMap
}

/**
 * 格式化依赖使用信息用于显示
 * 规则：
 * - 0 个：返回 "未使用"
 * - 1-3 个：显示具体包名
 * - >3 个：显示前两个 + "等 N 个包"
 */
export function formatDependencyUsage(
    usageMap: DependencyUsageMap,
    depName: string,
): string {
    const users = usageMap.get(depName) || []

    if (users.length === 0) {
        return 'unused'
    }

    if (users.length <= 3) {
        return users.join(', ')
    }

    return `${users.slice(0, 2).join(', ')} 等 ${users.length} 个包`
}

export const stringifyYamlWithTopLevelBlankLine = (value: string) => {
    const doc = parseDocument(value)

    if (doc.contents && doc.contents instanceof YAMLMap) {
        const items = doc.contents.items

        items.forEach((item: any, index: number) => {
            if (index > 0) {
                item.key.commentBefore = '\n'
            }
        })
    }

    return doc.toString()
}

export const writeFile = (path: string, content: string) => {
    writeFileSync(path, content, 'utf-8')
}

export const printTable = (data: any) => {
    const p = new Table()

    p.addColumns([
        { name: 'Dependencies', alignment: 'left' },
        { name: 'Catalog', alignment: 'left' },
    ])

    p.addRows(data)
    return p.printTable()
}

export const isCancelProcess = (value: unknown, message: string) => {
    if (isCancel(value)) {
        cancel(message)
        return process.exit(0)
    }
}
