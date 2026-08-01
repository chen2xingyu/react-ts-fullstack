const { runCode, MAX_LEN } = require('../services/pythonRunnerService')

/**
 * 运行用户提交的 Python 代码
 * POST /api/python/run  body: { code }
 */
exports.run = async (req, res) => {
  const { code } = req.body || {}
  if (!code || typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ code: 400, message: '代码不能为空' })
  }
  if (code.length > MAX_LEN) {
    return res.status(400).json({ code: 400, message: `代码过长（上限 ${MAX_LEN} 字符）` })
  }
  try {
    const result = await runCode(code)
    res.json({ code: 0, message: 'ok', data: result })
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message || '执行失败' })
  }
}
