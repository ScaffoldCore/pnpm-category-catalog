import * as path from 'node:path'
import * as process from 'node:process'

export const resolveConfig = (cwd?: string) => {
    return {
        cwd: cwd ? path.resolve(cwd) : process.cwd(),
    }
}
