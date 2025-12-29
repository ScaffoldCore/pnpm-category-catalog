import {
    copyFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    rmSync,
    statSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import pico from 'picocolors'

const FIXTURES_DIR = resolve('examples/fixtures')
const WORKSPACE_DIR = resolve('examples/workspace')

const scenarioName = process.argv[2]

function getAvailableScenarios(): string[] {
    if (!existsSync(FIXTURES_DIR)) {
        return []
    }
    return readdirSync(FIXTURES_DIR).filter((name) => {
        return statSync(join(FIXTURES_DIR, name)).isDirectory()
    })
}

function copyDir(src: string, dest: string): void {
    mkdirSync(dest, { recursive: true })
    for (const entry of readdirSync(src, { withFileTypes: true })) {
        const srcPath = join(src, entry.name)
        const destPath = join(dest, entry.name)
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath)
        }
        else {
            copyFileSync(srcPath, destPath)
        }
    }
}

function cleanDir(dir: string): void {
    if (existsSync(dir)) {
        rmSync(dir, { recursive: true })
    }
}

const scenarios = getAvailableScenarios()

if (!scenarioName) {
    console.log()
    console.log(
        `  ${pico.white(pico.bgCyan(' USAGE '))} pnpm examples:setup <scenario>`,
    )
    console.log()
    console.log(`  ${pico.cyan('Available scenarios:')}`)
    scenarios.forEach((name) => {
        console.log(`    - ${pico.green(name)}`)
    })
    console.log()
    process.exit(0)
}

if (!scenarios.includes(scenarioName)) {
    console.log()
    console.error(
        `  ${pico.white(pico.bgRed(' ERROR '))} ${pico.red(
            `Unknown scenario: ${scenarioName}`,
        )}`,
    )
    console.log()
    console.log(`  ${pico.cyan('Available scenarios:')}`)
    scenarios.forEach((name) => {
        console.log(`    - ${pico.green(name)}`)
    })
    console.log()
    process.exit(1)
}

const srcDir = join(FIXTURES_DIR, scenarioName)
const destDir = join(WORKSPACE_DIR, scenarioName)

cleanDir(destDir)
copyDir(srcDir, destDir)

console.log()
console.log(
    `  ${pico.white(pico.bgGreen(' DONE '))} ${pico.green(
        `Copied ${scenarioName} to workspace`,
    )}`,
)
console.log()
console.log(`  ${pico.cyan('Now run:')}`)
console.log(
    `    ${pico.yellow(
        `pnpm dev:${
            scenarioName === 'with-existing-catalogs' ? 'existing' : scenarioName
        }`,
    )}`,
)
console.log()
