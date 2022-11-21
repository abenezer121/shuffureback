const express = require('express')
const router = express.Router()
const TripSearchController = require('../controllers/TripSearchController')

const ROLES = require('../utils/roles')
const authRequired = require('../middleware/authMiddleware')

router.get('/',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION,
    ]),
    TripSearchController.index
)

router.get('/export',
    authRequired([
        ROLES.ADMIN,
    ]),
    TripSearchController.exportReport
)

router.get('/:id',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION,
    ]),
    TripSearchController.show
)

router.post('/',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION,
    ]),
    TripSearchController.store
)

router.post('/:id/cancel',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION,
    ]),
    TripSearchController.cancel
)

router.post('/:id/restart',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION,
    ]),
    TripSearchController.restart
)

router.post('/:id/retry',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION,
    ]),
    TripSearchController.retry
)

router.patch('/:id',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER
    ]),
    TripSearchController.update
)

// router.delete('/:id',
//     authRequired([
//         ROLES.ADMIN,
//         ROLES.DISPATCHER
//     ]),
//     TripSearchController.remove
// )

module.exports = router
