const express = require('express')
const router = express.Router()
const LoanController = require('../controllers/LoanController')
const authRequired = require('../middleware/authMiddleware')
const ROLES = require('../utils/roles')

router.get('/',
  authRequired([
    ROLES.ADMIN, ROLES.DISPATCHER,
    ROLES.OPERATION,
  ]),
  LoanController.index
)

module.exports = router
