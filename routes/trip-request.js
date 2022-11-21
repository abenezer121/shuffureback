const express = require('express')
const router = express.Router()
const TripRequestController = require('../controllers/TripRequestController')

const ROLES = require('../utils/roles')
const authRequired = require('../middleware/authMiddleware')

router.get('/',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION,
    ]),
    TripRequestController.index
)

router.get('/export',
    authRequired([
        ROLES.ADMIN
    ]),
    TripRequestController.exportReport
)

router.get('/:id',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION,
    ]),
    TripRequestController.show
)

router.post('/',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION,
    ]),
    TripRequestController.store
)

router.post('/:id/cancel',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION,
    ]),
    TripRequestController.cancel
)

router.patch('/:id',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION,
    ]),
    TripRequestController.update
)

// router.delete('/:id',
//     authRequired([
//         ROLES.ADMIN,
//         ROLES.DISPATCHER,
//     ]),
//     TripRequestController.remove
// )

module.exports = router
