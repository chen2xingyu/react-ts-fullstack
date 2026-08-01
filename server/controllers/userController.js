const Joi = require('joi')
const UserModel = require('../models/userModel')

const userSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().max(100).required(),
  phone: Joi.string().max(20).allow(''),
  website: Joi.string().max(100).allow(''),
  company: Joi.string().max(100).allow(''),
})

const userUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  email: Joi.string().email().max(100),
  phone: Joi.string().max(20).allow(''),
  website: Joi.string().max(100).allow(''),
  company: Joi.string().max(100).allow(''),
})

const userController = {
  async getAll(req, res, next) {
    try {
      const users = await UserModel.findAll()
      res.json({
        code: 0,
        message: 'success',
        data: users,
      })
    } catch (error) {
      next(error)
    }
  },

  async getById(req, res, next) {
    try {
      const user = await UserModel.findById(req.params.id)
      if (!user) {
        return res.status(404).json({
          code: 404,
          message: '用户不存在',
        })
      }
      res.json({
        code: 0,
        message: 'success',
        data: user,
      })
    } catch (error) {
      next(error)
    }
  },

  async create(req, res, next) {
    try {
      const { error, value } = userSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          code: 400,
          message: error.details[0].message,
        })
      }
      const user = await UserModel.create(value)
      res.status(201).json({
        code: 0,
        message: '创建成功',
        data: user,
      })
    } catch (error) {
      next(error)
    }
  },

  async update(req, res, next) {
    try {
      const { error, value } = userUpdateSchema.validate(req.body)
      if (error) {
        return res.status(400).json({
          code: 400,
          message: error.details[0].message,
        })
      }
      const user = await UserModel.update(req.params.id, value)
      if (!user) {
        return res.status(404).json({
          code: 404,
          message: '用户不存在',
        })
      }
      res.json({
        code: 0,
        message: '更新成功',
        data: user,
      })
    } catch (error) {
      next(error)
    }
  },

  async delete(req, res, next) {
    try {
      const deleted = await UserModel.delete(req.params.id)
      if (!deleted) {
        return res.status(404).json({
          code: 404,
          message: '用户不存在',
        })
      }
      res.json({
        code: 0,
        message: '删除成功',
      })
    } catch (error) {
      next(error)
    }
  },
}

module.exports = userController
