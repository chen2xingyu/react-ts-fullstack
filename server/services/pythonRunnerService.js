const { spawn } = require('child_process')
const path = require('path')
const os = require('os')
const fs = require('fs')

// Python 解释器路径：优先用 .env 的 PYTHON_PATH（指向装了 akshare/pandas 的 python），否则用 PATH 里的 python
const PYTHON = process.env.PYTHON_PATH || 'python'
const TIMEOUT_MS = 30000
const MAX_LEN = 50000

/**
 * 执行用户提交的 Python 代码，捕获 stdout/stderr
 *
 * 实现：写临时文件后 spawn 执行（避免 -c 的引号/转义问题，且支持长代码）。
 * 安全：30s 超时、工作目录隔离到 os.tmpdir()、执行完删除临时文件。
 * 编码：PYTHONIOENCODING=utf-8 确保中文输出不乱码。
 */
function runCode(code) {
  return new Promise((resolve) => {
    const tmpFile = path.join(os.tmpdir(), `pyrun_${Date.now()}_${process.pid}.py`)
    fs.writeFileSync(tmpFile, code, 'utf8')

    const stdoutChunks = []
    const stderrChunks = []
    let timedOut = false

    const cleanup = () => {
      try {
        fs.unlinkSync(tmpFile)
      } catch {
        /* ignore */
      }
    }

    const proc = spawn(PYTHON, [tmpFile], {
      cwd: os.tmpdir(),
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' },
      windowsHide: true,
    })

    proc.stdout.on('data', (d) => stdoutChunks.push(d))
    proc.stderr.on('data', (d) => stderrChunks.push(d))

    const timer = setTimeout(() => {
      timedOut = true
      try {
        proc.kill('SIGKILL')
      } catch {
        /* ignore */
      }
    }, TIMEOUT_MS)

    proc.on('close', (exitCode) => {
      clearTimeout(timer)
      cleanup()
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
        exitCode,
        timedOut,
      })
    })

    proc.on('error', (err) => {
      clearTimeout(timer)
      cleanup()
      resolve({
        stdout: '',
        stderr:
          `无法启动 Python 解释器：${err.message}\n` +
          '请在 server/.env 配置 PYTHON_PATH，指向已安装 akshare/pandas 的 python.exe',
        exitCode: -1,
        timedOut: false,
      })
    })
  })
}

module.exports = { runCode, MAX_LEN, TIMEOUT_MS }
