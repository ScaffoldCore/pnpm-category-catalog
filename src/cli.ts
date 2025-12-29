import { intro, outro } from '@clack/prompts'
import cac from 'cac'
import { glob } from 'glob'
import pc from 'picocolors'
import { resolveConfig } from '@/config.ts'
import { resolvePackageDependencies } from '@/dependencies.ts'
import { printTable, stringifyYamlWithTopLevelBlankLine, writeFile } from '@/utils.ts'
import { batchProcessCatalog, getWorkSpaceYaml } from '@/work.space.ts'
import { name, version } from '../package.json'

const cli = cac(name)

cli.command('')
    .option('--cwd <path>', 'Specify the working directory')
    .action(async (options: { cwd?: string }) => {
        try {
            const config = resolveConfig(options.cwd)
            const packagePathMap = await glob(['package.json', '*/**/package.json'], {
                cwd: config.cwd,
                ignore: ['**/node_modules/**'],
            })

            intro(pc.bgCyan(` Pnpm workspace catalog category manage [v${version}]`))

            const workSpaceYaml = await getWorkSpaceYaml(config)

            // 批量处理 catalog
            const workspace = await batchProcessCatalog({
                ...config,
                ...workSpaceYaml,
            })

            // 只有在进行了分类操作且确认保存后才进行后续处理
            if (!workspace) {
                return ''
            }

            // 显示创建的分类信息
            if (workspace.catalogs.categories) {
                printTable(workspace.catalogs.categories.reduce((acc: {
                    Dependencies: string
                    Catalog: string
                }[], category) => {
                    for (const pkg of category.packages) {
                        acc.push({
                            Dependencies: pkg,
                            Catalog: `catalog:${category.name}`,
                        })
                    }
                    return acc
                }, []))
            }

            // 更新 package.json 中的依赖版本
            const pkgFiles = resolvePackageDependencies(config, packagePathMap, workspace)
            const updatedFiles = pkgFiles.filter(i => i.isUpdate)

            if (updatedFiles.length > 0) {
                // console.log('\n📝 更新以下文件的依赖版本:')
                updatedFiles.forEach((i) => {
                    // console.log(`  - ${i.path}`)
                    // console.log(i.context)
                    writeFile(i.path, i.context)
                })
            }
            else {
                console.log('\nℹ️ 没有需要更新的 package.json 文件')
            }

            writeFile(workspace.path, stringifyYamlWithTopLevelBlankLine(workspace.context))
        }
        catch (e) {
            outro(e as string)
        }
    })

cli.help()
cli.version(version)
cli.parse()
