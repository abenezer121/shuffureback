const express = require('express');
const router = express.Router();
const DeviceBanController = require('../controllers/DeviceBanController');
const authRequired = require('../middleware/authMiddleware')
const ROLES = require('../utils/roles')

router.get('/', DeviceBanController.index);

// router.get('/export',
//     authRequired([
//         ROLES.ADMIN,
//         ROLES.DISPATCHER,
//     ]),
//     DeviceBanController.exportReport
// )

// router.get('/:id', DeviceBanController.show);

router.post('/ban-model',
    authRequired([
        ROLES.ADMIN,
        ROLES.OPERATION,
    ]),
    DeviceBanController.banModel
);

router.post('/ban-device',
    authRequired([
        ROLES.ADMIN,
        ROLES.OPERATION,
    ]),
    DeviceBanController.banDevice
);

router.patch('/:id',
    authRequired([
        ROLES.ADMIN,
        ROLES.OPERATION,
    ]),
    DeviceBanController.update
);

router.delete('/:id',
    authRequired([
        ROLES.ADMIN,
        ROLES.OPERATION,
    ]),
    DeviceBanController.remove
);

module.exports = router;