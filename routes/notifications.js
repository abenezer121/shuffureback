const express = require('express')
const router = express.Router()
const NotificationController = require('../controllers/NotificationController')

const ROLES = require('../utils/roles')
const authRequired = require('../middleware/authMiddleware')

router.post('/topic/:topic',
  authRequired([
    ROLES.ADMIN,
    ROLES.OPERATION,
  ]),
  NotificationController.sendByTopic
)

router.post('/user/:token', NotificationController.sendByToken)

router.get('/',
  authRequired([
    ROLES.ADMIN,
    ROLES.OPERATION,
    ROLES.DRIVER,
    ROLES.PASSENGER
  ]),
  NotificationController.index
)

router.get('/search',
  authRequired([
    ROLES.ADMIN,
    ROLES.OPERATION,
  ]),
  NotificationController.search
)

module.exports = router
