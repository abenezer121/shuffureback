const express = require('express')
const router = express.Router()
const LeaderboardController = require('../controllers/PassengerLeaderboardController')

const ROLES = require('../utils/roles')
const authRequired = require('../middleware/authMiddleware')

router.get('/',
    authRequired([
        ROLES.ADMIN,
        ROLES.OPERATION,
    ]),
    LeaderboardController.index
)

module.exports = router
