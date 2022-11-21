const express = require('express');
const router = express.Router();
const PromoController = require('../controllers/PromoController');
const authRequired = require('../middleware/authMiddleware')
const ROLES = require('../utils/roles')

router.get('/',
    authRequired([
        ROLES.ADMIN,
        ROLES.FINANCE,
    ]),
    PromoController.index);

router.get('/my-invitations',
    authRequired([
        ROLES.DRIVER,
        ROLES.PASSENGER,
    ]),
    PromoController.myInvitations);

router.post('/invite',
    authRequired([
        ROLES.DRIVER,
        ROLES.PASSENGER,
    ]),
    PromoController.invite
);

// router.post('/enter-promo',
//     PromoController.enterPromo
// );

// router.get('/export',
//     authRequired([
//         ROLES.ADMIN,
//     ]),
//     PromoController.exportReport
// )

module.exports = router;