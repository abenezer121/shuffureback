const express = require('express')
const router = express.Router()
const WalletHistoryController = require('../controllers/WalletHistoryController')

const ROLES = require('../utils/roles')
const authRequired = require('../middleware/authMiddleware')

router.get('/',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.FINANCE,
        ROLES.OPERATION
    ]),
    WalletHistoryController.index
)
router.get('/export',
    authRequired([
        ROLES.ADMIN,
        ROLES.FINANCE,
        ROLES.OPERATION,
    ]),
    WalletHistoryController.exportReport
)
router.get('/:id',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.FINANCE,
        ROLES.OPERATION,
    ]),
    WalletHistoryController.bankDepositDetail
)

router.post('/:id/mark-paid',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.FINANCE,
        ROLES.OPERATION,
    ]),
    WalletHistoryController.markDepositAsPaid
)

module.exports = router
