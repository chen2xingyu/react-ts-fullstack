const PositionModel = require('../models/positionModel')
const OrderModel = require('../models/orderModel')
const TradeModel = require('../models/tradeModel')

/**
 * 交易账户相关：资金 / 持仓 / 委托 / 成交查询
 * req.account 由 ensureAccount 中间件注入
 */
const tradingController = {
  // 资金账户
  async getAccount(req, res, next) {
    try {
      res.json({ code: 0, message: 'success', data: req.account })
    } catch (error) {
      next(error)
    }
  },

  // 持仓列表
  async getPositions(req, res, next) {
    try {
      const positions = await PositionModel.findByUserId(req.user.id)
      res.json({ code: 0, message: 'success', data: positions })
    } catch (error) {
      next(error)
    }
  },

  // 委托列表（可按 status 过滤）
  async getOrders(req, res, next) {
    try {
      const { status, page, pageSize } = req.query
      const orders = await OrderModel.findByUserId(req.user.id, {
        status: status !== undefined && status !== '' ? Number(status) : undefined,
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 50,
      })
      res.json({ code: 0, message: 'success', data: orders })
    } catch (error) {
      next(error)
    }
  },

  // 成交列表
  async getTrades(req, res, next) {
    try {
      const trades = await TradeModel.findByUserId(req.user.id)
      res.json({ code: 0, message: 'success', data: trades })
    } catch (error) {
      next(error)
    }
  },
}

module.exports = tradingController
