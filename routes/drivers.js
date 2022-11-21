const express = require('express')
const router = express.Router()
const DriverController = require('../controllers/DriverController')

const ROLES = require('../utils/roles')
const authRequired = require('../middleware/authMiddleware')

router.get('/', DriverController.index)

router.get('/auth/:phone', DriverController.oldAuth)

router.post('/auth/', DriverController.auth)

router.get('/search', DriverController.search)

router.get('/admin-search',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION,
    ]),
    DriverController.adminSearch
)

router.get('/export',
    authRequired([
        ROLES.ADMIN
    ]),
    DriverController.exportReport
)


router.get('/my-vouchers',
    authRequired([
        ROLES.DRIVER
    ]),
    DriverController.myVouchers
)

router.post('/buy-airtime',
    authRequired([
        ROLES.DRIVER
    ]),
    DriverController.buyAirTime
)

router.get('/:id', DriverController.show)

router.get('/:id/bookings', DriverController.bookings)

router.get('/:id/income',
    authRequired([
        ROLES.DRIVER
    ]),
    DriverController.income
)

router.get('/:id/wallet-history', DriverController.walletHistory)

router.get('/:id/scheduled-trips',
    authRequired([
        ROLES.DRIVER
    ]),
    DriverController.scheduledTrips
)

router.post('/:id/rate', DriverController.rate)

router.post('/:id/top-up',
    authRequired([
        ROLES.ADMIN,
        ROLES.FINANCE,
        ROLES.OPERATION,
    ]),
    DriverController.topUp
)

router.post('/:id/wallet-transfer',
    // authRequired([
    //     ROLES.DRIVER
    // ]),
    DriverController.walletTransfer
)

router.post('/:id/wallet-lend',
    // authRequired([
    //     ROLES.DRIVER
    // ]),
    DriverController.lend
)

router.get('/:id/rents',
    authRequired([
        ROLES.DRIVER
    ]),
    DriverController.rents
)

router.post('/',
    // authRequired([
    //     ROLES.ADMIN,
    //     ROLES.DISPATCHER
    // ]),
    DriverController.store
)

router.patch('/:id',
    // authRequired([
    //     ROLES.ADMIN,
    //     ROLES.DISPATCHER
    // ]),
    DriverController.update
)

// router.delete('/:id',
//     authRequired([
//         ROLES.ADMIN,
//         ROLES.DISPATCHER,
//         ROLES.OPERATION,
//     ]),
//     DriverController.remove
// )

module.exports = router
