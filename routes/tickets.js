const express = require('express')
const router = express.Router()
const TicketController = require('../controllers/TicketController')
const authRequired = require('../middleware/authMiddleware')
const ROLES = require('../utils/roles')

router.get('/',
    authRequired([
        ROLES.CORPORATE
    ]),
    TicketController.index
)

router.get('/:id', 
    authRequired([
        ROLES.CORPORATE
    ]),
    TicketController.show
)

router.get('/validate/:code/:phone',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.CORPORATE,
        ROLES.PASSENGER
    ]),
    TicketController.validate
)

router.post('/generate/:id',
    authRequired([
        ROLES.CORPORATE
    ]),
    TicketController.generate
)

// router.patch('/:id',
// authRequired([
//     ROLES.CORPORATE
// ]),
// TicketController.update)

// router.delete('/:id',TicketController.remove)

module.exports = router
