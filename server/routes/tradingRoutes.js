const express = require('express')
const auth = require('../middleware/auth')
const ensureAccount = require('../middleware/ensureAccount')
const quoteController = require('../controllers/quoteController')
const tradingController = require('../controllers/tradingController')

const router = express.Router()

// 所有交易路由需登录 + 确保有资金账户
router.use(auth, ensureAccount)

// 行情类
router.get('/stocks', quoteController.getStocks)
router.get('/quotes/:symbol', quoteController.getQuote)
router.get('/klines/:symbol', quoteController.getKlines)

// 账户 / 持仓 / 委托 / 成交
router.get('/account', tradingController.getAccount)
router.get('/positions', tradingController.getPositions)
router.get('/orders', tradingController.getOrders)
router.post('/orders', tradingController.placeOrder)
router.get('/trades', tradingController.getTrades)

module.exports = router
