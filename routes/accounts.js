const express = require('express')
const router = express.Router()
const accountController = require('../controllers/AccountController')
const authRequired = require('../middleware/authMiddleware')
const ROLES = require('../utils/roles')
const activityLogger = require('../services/activity-logger')
const url = require('url')

router.get('/search', accountController.search)

router.get('/',
  authRequired([
    ROLES.ADMIN
  ]),
  accountController.index
)

router.get('/:id',
  authRequired([
    ROLES.ADMIN
  ]),
  accountController.show
)
router.post('/auth', accountController.auth)
router.post('/:id/reset-password',
  authRequired([
    ROLES.ADMIN
  ]),
  accountController.resetPassword
)
router.get('/check/:token', accountController.check)
router.patch('/:id',
  authRequired([
    ROLES.ADMIN
  ]),
  accountController.update
)
router.post('/',
  authRequired([
    ROLES.ADMIN
  ]),
  async (req, res, next) => {
    await activityLogger.ADMIN_HAS_CREATED_RESOURCE({ account: res.locals.user, url: req.originalUrl, path: url.parse(req.originalUrl).pathname })
    next()
  },
  accountController.store
)

module.exports = router
