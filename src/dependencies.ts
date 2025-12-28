import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const updatePackageDependencies = (packagePathMap: any[], catalogs: any, cwd: string) => {
    const dependencyTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

    packagePathMap.forEach((path: any, index: number) => {
        const filePath = resolve(cwd, path)
        const context = JSON.parse(readFileSync(filePath, 'utf-8'))

        let updated = false

        dependencyTypes.forEach((depType) => {
            if (context[depType]) {
                Object.keys(context[depType]).forEach((depName) => {
                    // 检查这个依赖是否在选中的 dependencies 中
                    if (catalogs.dependencies[depName]) {
                        // 更新版本为 catalog:{$catalogs.name}
                        context[depType][depName] = `catalog:${catalogs.name}`
                        updated = true
                        // console.log(`更新 ${filePath} 中的 ${depName} 为 catalog:${catalogs.name}`)
                    }
                })
            }
        })

        // 如果有更新，写回到文件
        if (updated) {
            writeFileSync(filePath, `${JSON.stringify(context, null, 2)}\n`, 'utf-8')
        }
    })
}
