const express = require('express')
const userRoutes = require('./userRoutes')
const authRoutes = require('./authRoutes')

const router = express.Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

router.use('/auth', authRoutes)
router.use('/users', userRoutes)

module.exports = router
