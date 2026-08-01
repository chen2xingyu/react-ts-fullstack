const PositionModel = require('../models/positionModel')
const OrderModel = require('../models/orderModel')
const TradeModel = require('../models/tradeModel')
const RiskLogModel = require('../models/riskLogModel')
const orderService = require('../services/orderService')

/**
 * 交易账户相关：资金 / 持仓 / 委托 / 成交查询 + 下单
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

  // 下单（限价/市价 + 买入/卖出）：风控 → 冻结 → 落库 → 投递撮合
  async placeOrder(req, res, next) {
    try {
      const { symbol, side, order_type, price, quantity, client_order_id } = req.body
      if (!symbol || side == null || order_type == null || !quantity) {
        return res.json({ code: 1, message: '参数缺失：symbol/side/order_type/quantity' })
      }
      const order = await orderService.placeOrder(req.user.id, req.account, {
        symbol,
        side: Number(side),
        order_type: Number(order_type),
        price: price != null && price !== '' ? Number(price) : null,
        quantity: Number(quantity),
        client_order_id,
      })
      res.json({ code: 0, message: '委托已提交', data: order })
    } catch (error) {
      // 风控拒绝：业务错误，返回 code=1，前端拦截器 reject(message)
      if (error.isRisk) {
        return res.json({ code: 1, message: `风控拒绝：${error.message}` })
      }
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

  // 风控日志（阶段 6）：查询当前用户的风控拒绝记录，可按 action/rule 过滤
  async getRiskLogs(req, res, next) {
    try {
      const { action, rule, page, pageSize } = req.query
      const logs = await RiskLogModel.findByUserId(req.user.id, {
        action: action || undefined,
        rule: rule || undefined,
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 50,
      })
      res.json({ code: 0, message: 'success', data: logs })
    } catch (error) {
      next(error)
    }
  },

  // 风控日志按 rule 聚合统计（阶段 6 概览）
  async getRiskLogsSummary(req, res, next) {
    try {
      const summary = await RiskLogModel.countByRule(req.user.id)
      res.json({ code: 0, message: 'success', data: summary })
    } catch (error) {
      next(error)
    }
  },

  // 撤单（阶段 5）：校验 → 投递撤单指令到撮合引擎 → 引擎权威产出 status 事件
  async cancelOrder(req, res, next) {
    try {
      const orderId = Number(req.params.id)
      if (!orderId) {
        return res.json({ code: 1, message: '参数缺失：id' })
      }
      const result = await orderService.cancelOrder(req.user.id, orderId)
      res.json({ code: 0, message: '撤单请求已提交，等待撮合引擎处理', data: result })
    } catch (error) {
      if (error.isRisk) {
        return res.json({ code: 1, message: `撤单失败：${error.message}` })
      }
      next(error)
    }
  },
}

module.exports = tradingController
