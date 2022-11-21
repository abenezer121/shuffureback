const express = require('express')
const router = express.Router()
const LogController = require('../controllers/LogController')
const ROLES = require('../utils/roles')
const authRequired = require('../middleware/authMiddleware')

router.get('/',
  authRequired([
    ROLES.ADMIN,
  ]),
  LogController.index
)

module.exports = router
