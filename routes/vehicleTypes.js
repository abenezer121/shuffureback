const express = require('express')
const router = express.Router()
const VehicleTypeController = require('../controllers/VehicleTypeController')

const ROLES = require('../utils/roles')
const authRequired = require('../middleware/authMiddleware')

router.get('/', VehicleTypeController.index)

router.get('/:id', VehicleTypeController.show)

router.post('/',
    authRequired([
        ROLES.ADMIN
    ]),
    VehicleTypeController.store
)

router.post('/adjust-order',
    authRequired([
        ROLES.ADMIN
    ]),
    VehicleTypeController.adjustOrder
)

router.patch('/:id',
    authRequired([
        ROLES.ADMIN
    ]),
    VehicleTypeController.update
)

router.delete('/:id',
    authRequired([
        ROLES.ADMIN
    ]),
    VehicleTypeController.remove
)

module.exports = router
