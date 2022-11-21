const express = require('express')
const router = express.Router()
const UserController = require('../controllers/UserController')

const ROLES = require('../utils/roles')
const authRequired = require('../middleware/authMiddleware')

router.get('/', UserController.index)

router.get('/admin-search',
authRequired([
    ROLES.ADMIN,
    ROLES.DISPATCHER,
    ROLES.OPERATION
]),
UserController.adminSearch
)

router.get('/auth/:phone', UserController.oldAuth)

router.post('/auth', UserController.auth)

router.get('/search', UserController.search)

router.get('/export',
    authRequired([
        ROLES.ADMIN,
    ]),
    UserController.exportReport
)

router.get('/:id', UserController.show)

router.post('/:id/rate', UserController.rate)

router.get('/:id/rents',
    authRequired([
        ROLES.PASSENGER,
    ]),
    UserController.rents
)

router.get('/:id/bookings',
    authRequired([
        ROLES.PASSENGER
    ]),
    UserController.bookings
)

router.get('/:id/scheduled-trips',
    authRequired([
        ROLES.PASSENGER
    ]),
    UserController.scheduledTrips
)

router.post('/',
    // authRequired([
    //     ROLES.ADMIN,
    //     ROLES.DISPATCHER,
    //     ROLES.OPERATION
    // ]),
    UserController.store
)

router.patch('/:id',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION,
        ROLES.PASSENGER,
    ]),
    UserController.update
)



// router.delete('/:id',
//     authRequired([
//         ROLES.ADMIN,
//         ROLES.DISPATCHER
//     ]),
//     UserController.remove
// )

module.exports = router
