const express = require('express');
const router = express.Router();
const ActivityLogController = require('../controllers/ActivityLogController');
const authRequired = require('../middleware/authMiddleware')
const ROLES = require('../utils/roles')

router.get('/',
    authRequired([
        ROLES.ADMIN
    ]),
    ActivityLogController.index
);

router.get('/types',
    authRequired([
        ROLES.ADMIN
    ]),
    ActivityLogController.activityTypes
);

// router.get('/export',
//     authRequired([
//         ROLES.ADMIN,
//     ]),
//     ActivityLogController.exportReport
// )

module.exports = router;