const express = require('express');
const router = express.Router();
const RewardsInventoryController = require('../controllers/RewardsInventoryController');
const authRequired = require('../middleware/authMiddleware')
const ROLES = require('../utils/roles')

router.get('/',
    RewardsInventoryController.index);

router.get('/:id',

    authRequired([
        ROLES.ADMIN
    ]), RewardsInventoryController.show)

router.post('/',

    authRequired([
        ROLES.ADMIN
    ]), RewardsInventoryController.store)

router.patch('/:id',

    authRequired([
        ROLES.ADMIN
    ]), RewardsInventoryController.update)

// router.get('/export',
//     authRequired([
//         ROLES.ADMIN,
//     ]),
//     RewardsInventoryController.exportReport
// )

module.exports = router;