import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import cac from 'cac'
import { glob } from 'glob'
import { resolveConfig } from '@/config.ts'
import { updatePackageDependencies } from '@/dependencies.ts'
import { stringifyYamlWithTopLevelBlankLine } from '@/utils.ts'
import { getNewWorkSpaceYaml } from '@/work.space.ts'
import { name, version } from '../package.json'

const cli = cac(name)

cli.command('')
    .action(async () => {
        const config = resolveConfig()
        const packagePathMap = await glob(['package.json', '*/**/package.json'], {
            cwd: config.cwd,
            ignore: ['**/node_modules/**'],
        })

        const packageDependencies = packagePathMap.map(p => JSON.parse(readFileSync(resolve(config.cwd, p), 'utf-8')))
        const workspace = await getNewWorkSpaceYaml(config)

        // 更新 package.json 中的依赖版本
        if (workspace && typeof workspace === 'object' && 'catalogs' in workspace && workspace.catalogs && workspace.catalogs.dependencies) {
            updatePackageDependencies(packagePathMap, workspace.catalogs, config.cwd)

            writeFileSync(workspace.path, stringifyYamlWithTopLevelBlankLine(workspace.context), 'utf-8')
        }
    })

cli.help()
cli.version(version)
cli.parse()
