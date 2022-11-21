const express = require('express')
const router = express.Router()
const RentController = require('../controllers/RentController')

const ROLES = require('../utils/roles')
const authRequired = require('../middleware/authMiddleware')

router.get('/',
    authRequired([
        ROLES.ADMIN,
        ROLES.OPERATOR,
        ROLES.DISPATCHER
    ]),
    RentController.index
)

router.get('/export',
    authRequired([
        ROLES.ADMIN
    ]),
    RentController.exportReport
)

router.get('/:id',
    authRequired([
        ROLES.ADMIN,
        ROLES.OPERATOR,
        ROLES.DISPATCHER
    ]),
    RentController.show
)

// router.post('/', RentController.store)

// router.patch('/:id', RentController.update)

// router.delete('/:id', RentController.remove)

module.exports = router
