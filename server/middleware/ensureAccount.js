const AccountModel = require('../models/accountModel')
const config = require('../config')

/**
 * 确保当前用户已有资金账户，无则自动开户（初始资金 + 费率取自配置）
 * 将账户挂载到 req.account，后续 controller 直接复用
 */
const ensureAccount = async (req, res, next) => {
  try {
    let account = await AccountModel.findByUserId(req.user.id)
    if (!account) {
      account = await AccountModel.create(
        req.user.id,
        config.trading.defaultCash,
        config.trading.feeRate
      )
      console.log(`✅ 用户 ${req.user.id} 自动开户，初始资金 ${config.trading.defaultCash}`)
    }
    req.account = account
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = ensureAccount
