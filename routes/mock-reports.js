const express = require('express');
const router = express.Router();
const MockReportController = require('../controllers/MockReportController');
const authRequired = require('../middleware/authMiddleware')
const ROLES = require('../utils/roles')

router.get('/',
    authRequired([
        ROLES.ADMIN,
        ROLES.DISPATCHER,
        ROLES.OPERATION,
    ]),
    MockReportController.index);

// router.get('/export',
//     authRequired([
//         ROLES.ADMIN
//     ]),
//     MockReportController.exportReport
// )

module.exports = router;