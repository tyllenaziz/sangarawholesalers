const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(checkRole('admin')); // Only admin can access/modify settings

// --- More Specific Routes FIRST ---

// Get all settings (generic list)
router.get('/', settingController.getAllSettings);

// Backup routes (Admin only) - These are more specific than :key_name
router.post('/backup', settingController.createBackup);
router.get('/backups', settingController.listBackups);      // <--- MOVED TO BE BEFORE /:key_name

// General setting by key_name (should come AFTER specific routes)
router.get('/:key_name', settingController.getSettingByKey); // <--- MOVED TO BE AFTER /backups
router.put('/:key_name', settingController.updateSetting);

module.exports = router;
