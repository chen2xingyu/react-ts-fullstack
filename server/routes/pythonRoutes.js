const express = require('express')
const auth = require('../middleware/auth')
const ctrl = require('../controllers/pythonController')

const router = express.Router()

// Python 运行器接口：需登录（防止未授权任意代码执行）
router.post('/run', auth, ctrl.run)

module.exports = router
