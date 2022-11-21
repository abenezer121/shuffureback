const express = require('express')
const router = express.Router()
const TripController = require('../controllers/TripController')

const ROLES = require('../utils/roles')
const authRequired = require('../middleware/authMiddleware')

router.get('/',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION,
    ]),
    TripController.index
)

router.get('/latest',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION
    ]),
    TripController.latest
)

router.get('/export',
    authRequired([
        ROLES.ADMIN,
    ]),
    TripController.exportReport
)

router.get('/:id',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION
    ]),
    TripController.show
)

router.get('/:id/sos',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER
    ]),
    TripController.sos
)

router.post('/',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION
    ]),
    TripController.store
)

router.post('/:id/cancel',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION
    ]),
    TripController.cancel
)

router.post('/:id/end',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION
    ]),
    TripController.end
)

router.patch('/:id',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER
    ]),
    TripController.update
)

// router.delete('/:id',
//     authRequired([
//         ROLES.ADMIN,
//         ROLES.DISPATCHER
//     ]),
//     TripController.remove
// )

router.get('/:id/send-email',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER
    ]),
    TripController.resendEmail
)

module.exports = router
