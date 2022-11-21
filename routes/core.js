const express = require('express')
const router = express.Router()
const CoreController = require('../controllers/CoreController')
const { sendNotificationById } = require('../services/notificationService')
const authRequired = require('../middleware/authMiddleware')
const ROLES = require('../utils/roles')

router.get('/getSettingsAndVehicleModels', CoreController.getSettingsAndVehicleModels)

router.get('/getPassengerSettings', CoreController.getPassengerSettings)
router.get('/getPassengerVehicleModels', CoreController.getPassengerVehicleModels)

router.get('/dashboard',
  authRequired([
    ROLES.ADMIN,
    ROLES.FINANCE,
    ROLES.OPERATION,
  ]),
  CoreController.dashboard
)

router.get('/godview',
  authRequired([
    ROLES.ADMIN,
    ROLES.DISPATCHER,
    ROLES.OPERATION
  ]),
  CoreController.godview
)

router.get('/date',
  // authRequired([
  //     ROLES.ADMIN,
  //     ROLES.DISPATCHER
  // ]),
  CoreController.date
)

router.get('/finance/export',
  authRequired([
    ROLES.ADMIN,
    ROLES.FINANCE
  ]),
  CoreController.exportFinancialReport
)

router.get('/finance',
  authRequired([
    ROLES.ADMIN,
    ROLES.FINANCE,
    ROLES.OPERATION,
  ]),
  CoreController.finance
)

router.post('/route', CoreController.route)

router.get('/notification', (req, res) => {
  // sendNotificationById('d_M4wZKnaNY:APA91bH3uC9hbHVlTvYLZYlbn2ZTIaeM1pBExOd6ZDOgAcCNzR5gBiDT-7wbovWXGQxUiUm1uXuzlcSMBY9VUAslK3aFP-Ow4jjF1ab0F94mSUepI-3BCQeNhWueCIh5U_GGHtSlBJ8e', { title: 'test title', body: 'test body' })
  res.send('done')
})

module.exports = router
