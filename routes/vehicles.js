const express = require('express')
const router = express.Router()
const VehicleController = require('../controllers/VehicleController')
const { getNearbyDrivers } = require('../sockets/core')

const ROLES = require('../utils/roles')
const authRequired = require('../middleware/authMiddleware')

router.get('/',
  authRequired([
    ROLES.ADMIN,
    ROLES.DISPATCHER,
    ROLES.OPERATION
  ]),
  VehicleController.index
)

router.get('/activeVehicles',
  authRequired([
    ROLES.ADMIN,
    ROLES.DISPATCHER,
    ROLES.OPERATION
  ]),
  VehicleController.activeVehicles
)

router.get('/search',
  authRequired([
    ROLES.ADMIN,
    ROLES.DISPATCHER,
    ROLES.OPERATION
  ]),
  VehicleController.search
)

router.get('/drivers', async (req, res) => {
  try {
    const drivers = await getNearbyDrivers({ location: { lat: 8.9996048, long: 38.78399910000002 }, distance: 1000000 })
    res.send(drivers)
  } catch (error) {
    console.log(error)
    res.status(500).send(error)
  }
})

router.get('/is-taken',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION
    ]),
    VehicleController.isTaken
);

router.get('/:id', VehicleController.show)

router.post('/',
  authRequired([
    ROLES.ADMIN,
    ROLES.DISPATCHER,
    ROLES.OPERATION
  ]),
  VehicleController.store
)

router.patch('/:id',
  authRequired([
    ROLES.ADMIN,
    ROLES.DISPATCHER,
    ROLES.OPERATION
  ]),
  VehicleController.update
)

router.delete('/:id',
  authRequired([
    ROLES.ADMIN,
    ROLES.DISPATCHER
  ]),
  VehicleController.remove
)

module.exports = router
