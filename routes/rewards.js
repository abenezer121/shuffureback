const express = require('express');
const router = express.Router();
const RewardsController = require('../controllers/RewardController');
const authRequired = require('../middleware/authMiddleware')
const ROLES = require('../utils/roles')

router.get('/',
    authRequired([
        ROLES.ADMIN,
        ROLES.FINANCE,
        ROLES.OPERATION,
    ]),
    RewardsController.index);

router.get('/my-rewards',
    authRequired([
        ROLES.PASSENGER,
    ]),
    RewardsController.myRewards);

router.post('/claim-reward',
    authRequired([
        ROLES.PASSENGER,
    ]),
    RewardsController.claimReward
);

router.post('/:id/change-status',
    authRequired([
        ROLES.ADMIN
    ]),
    RewardsController.changeStatus
);

// router.get('/export',
//     authRequired([
//         ROLES.ADMIN,
//     ]),
//     RewardsController.exportReport
// )

module.exports = router;