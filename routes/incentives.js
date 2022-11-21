const express = require('express')
const router = express.Router()
const IncentiveController = require('../controllers/IncentiveController')

const ROLES = require('../utils/roles')
const authRequired = require('../middleware/authMiddleware')

router.get('/',
    authRequired([
        ROLES.ADMIN,
        ROLES.FINANCE,
        ROLES.OPERATION,
    ]),
    IncentiveController.index
)

router.get('/vouchers',
    authRequired([
        ROLES.PASSENGER,
        ROLES.DRIVER,
    ]),
    IncentiveController.availableVouchers
)

router.get('/my-vouchers',
    authRequired([
        ROLES.PASSENGER
    ]),
    IncentiveController.myVouchers
)

router.post('/cashout',
    authRequired([
        ROLES.PASSENGER
    ]),
    IncentiveController.cashoutIncentive
)
router.get('/export',
    authRequired([
        ROLES.ADMIN,
        ROLES.FINANCE
    ]),
    IncentiveController.exportReport
)

module.exports = router
