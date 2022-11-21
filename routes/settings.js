const express = require('express')
const router = express.Router()
const SettingController = require('../controllers/SettingController')

const ROLES = require('../utils/roles')
const authRequired = require('../middleware/authMiddleware')

router.get('/',
  authRequired([
    ROLES.ADMIN
  ]),
  SettingController.get
)

router.post('/',
  authRequired([
    ROLES.ADMIN
  ]),
  SettingController.add
)

module.exports = router
