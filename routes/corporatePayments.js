const express = require('express')
const router = express.Router()
const CorporatePaymentController = require('../controllers/CorporatePaymentController')
const authRequired = require('../middleware/authMiddleware')
const ROLES = require('../utils/roles')

router.get('/',
    authRequired([
        ROLES.ADMIN,
        ROLES.FINANCE,
        ROLES.CORPORATE,
        ROLES.OPERATION,
    ]),
    CorporatePaymentController.index
)

module.exports = router
