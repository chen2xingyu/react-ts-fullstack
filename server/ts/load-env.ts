/**
 * 环境变量引导（main.ts 的第一个 import，必须最先执行）
 *
 * 🎯 面试考点：ESM 静态 import 会被提升并按书写顺序求值。
 * 旧 server/config/index.js 内部 dotenv.config() 默认读 cwd/.env，
 * 从根目录 tsx 启动时读不到 server/.env，所以在此显式指定路径。
 * dotenv 默认不覆盖已存在的变量，与旧逻辑不冲突。
 */
import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url)) // server/ts
config({ path: resolve(here, '../.env') }) // server/.env
