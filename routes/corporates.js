const express = require('express')
const router = express.Router()
const CorporateController = require('../controllers/CorporateController')
const authRequired = require('../middleware/authMiddleware')
const ROLES = require('../utils/roles')

router.get('/',
  authRequired([
    ROLES.ADMIN,
    ROLES.CORPORATE,
    ROLES.FINANCE,
  ]),
  CorporateController.index
)

router.get('/search',
  authRequired([
    ROLES.ADMIN,
    ROLES.CORPORATE
  ]), CorporateController.search
)

router.get('/:id',
  authRequired([
    ROLES.ADMIN,
    ROLES.CORPORATE
  ]),
  CorporateController.show
)

router.get('/:id/employees',
  authRequired([
    ROLES.ADMIN,
    ROLES.CORPORATE
  ]),
  CorporateController.employees
)

router.get('/:id/trips',
  authRequired([
    ROLES.ADMIN,
    ROLES.CORPORATE
  ]),
  CorporateController.trips
)

router.get('/:id/tickets',
  authRequired([
    ROLES.ADMIN,
    ROLES.CORPORATE
  ]),
  CorporateController.tickets
)

router.post('/:id/pay',
  authRequired([
    ROLES.ADMIN,
    ROLES.CORPORATE,
    ROLES.FINANCE
  ]),
  CorporateController.pay
)

router.get('/:id/dashboard',
  authRequired([
    ROLES.ADMIN,
    ROLES.CORPORATE
  ]),
  CorporateController.dashboard
)

router.post('/',
  authRequired([
    ROLES.ADMIN
  ]),
  CorporateController.store
)

router.patch('/:id',
  authRequired([
    ROLES.ADMIN,
    ROLES.CORPORATE
  ]),
  CorporateController.update
)

router.delete('/:id',
  authRequired([
    ROLES.ADMIN
  ]),
  CorporateController.remove
)

module.exports = router
