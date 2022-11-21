const express = require('express');
const router = express.Router();
const RewardPackageController = require('../controllers/RewardPackageController');
const authRequired = require('../middleware/authMiddleware')
const ROLES = require('../utils/roles')

router.get('/',
    RewardPackageController.index);

router.get('/:id',
    RewardPackageController.show)

router.post('/',
    authRequired([
        ROLES.ADMIN
    ]), RewardPackageController.store)

router.patch('/:id',
    authRequired([
        ROLES.ADMIN
    ]), RewardPackageController.update)

router.delete('/:id',
    authRequired([
        ROLES.ADMIN
    ]), RewardPackageController.deletePackage)

// router.get('/export',
//     authRequired([
//         ROLES.ADMIN,
//     ]),
//     RewardPackageController.exportReport
// )

module.exports = router;