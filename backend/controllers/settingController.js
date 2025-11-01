const Setting = require('../models/Setting');
const db = require('../config/database'); // For activity logging
const { exec } = require('child_process'); // <-- ADD THIS
const path = require('path');             // <-- ADD THIS
const fs = require('fs').promises;        // <-- ADD THIS
const moment = require('moment'); // <-- ADD THIS LINE!
// Helper to log user activity (reusing the one from authController)
const logActivity = async (userId, action, description, ipAddress) => {
  try {
    await db.query(
      'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
      [userId, action, description, ipAddress]
    );
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

// Get all settings
const getAllSettings = async (req, res) => {
  try {
    const settings = await Setting.findAll();
    res.json({
      success: true,
      data: settings,
      count: settings.length
    });
  } catch (error) {
    console.error('Get all settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
};

// Get a single setting by key_name
const getSettingByKey = async (req, res) => {
  try {
    const { key_name } = req.params;
    const setting = await Setting.findByKey(key_name);

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    console.error('Get setting by key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch setting',
      error: error.message
    });
  }
};

// Update a setting by key_name (admin only)
const updateSetting = async (req, res) => {
  try {
    const { key_name } = req.params;
    const { key_value } = req.body;

    if (key_value === undefined || key_value === null) {
      return res.status(400).json({
        success: false,
        message: 'New key_value is required'
      });
    }

    const existingSetting = await Setting.findByKey(key_name);
    if (!existingSetting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    const updated = await Setting.updateByKey(key_name, key_value);

    if (updated) {
      await logActivity(req.user.id, 'SETTING_UPDATED', `Admin updated setting: ${key_name} to ${key_value}`, req.ip);
      res.json({
        success: true,
        message: 'Setting updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to update setting'
      });
    }
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update setting',
      error: error.message
    });
  }
};
const createBackup = async (req, res) => {
  try {
    const backupScriptPath = path.join(__dirname, '..', 'scripts', 'backup.bat');
    const backupDir = path.join(__dirname, '..', 'backups');

    // Pass DB environment variables to the script
    const envVars = {
      DB_HOST: process.env.DB_HOST,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD,
      DB_NAME: process.env.DB_NAME,
      DB_PORT: process.env.DB_PORT,
      // Inherit other environment variables from the parent Node.js process
      ...process.env
    };

    exec(`cmd.exe /c ""${backupScriptPath}""`, { env: envVars }, async (error, stdout, stderr) => { // <-- CHANGED: Explicitly use cmd.exe
      if (error) {
        console.error(`Backup script failed: ${error.message}`);
        await logActivity(req.user.id, 'BACKUP_FAILED', `Database backup failed. Error: ${error.message}`, req.ip);
        return res.status(500).json({ success: false, message: `Database backup failed: ${stderr || error.message}` });
      }
      if (stderr) {
        console.warn(`Backup script warning: ${stderr}`);
        // Still log success, but mention warning
      }
      console.log(`Backup script output: ${stdout}`);
      await logActivity(req.user.id, 'BACKUP_CREATED', `Database backup created. Output: ${stdout.trim().split('\n').pop()}`, req.ip);
      res.json({ success: true, message: 'Database backup completed successfully!', output: stdout });
    });

  } catch (error) {
    console.error('Error creating backup:', error);
    await logActivity(req.user.id, 'BACKUP_FAILED', `Error triggering backup: ${error.message}`, req.ip);
    res.status(500).json({ success: false, message: `Error creating backup: ${error.message}` });
  }
};

// Add function to list available backups
const listBackups = async (req, res) => {
    try {
        const backupDir = path.join(__dirname, '..', 'backups');
        await fs.mkdir(backupDir, { recursive: true }); // Ensure directory exists

        const files = await fs.readdir(backupDir);
        const backupFiles = files
            .filter(file => file.endsWith('.sql'))
            .map(file => ({
                name: file,
                date: moment(file.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/)?.[1], 'YYYY-MM-DD_HH-mm-ss').toISOString(),
                size: fs.stat(path.join(backupDir, file)).then(stats => stats.size)
            }));
        
        // Resolve all file sizes concurrently
        const resolvedBackupFiles = await Promise.all(backupFiles.map(async file => ({
            ...file,
            size: await file.size // Await the promise for file size
        })));

        res.json({ success: true, data: resolvedBackupFiles.sort((a,b) => new Date(b.date) - new Date(a.date)) }); // Sort by newest first
    } catch (error) {
        console.error('Error listing backups:', error);
        await logActivity(req.user.id, 'BACKUP_LIST_FAILED', `Failed to list backups: ${error.message}`, req.ip);
        res.status(500).json({ success: false, message: `Failed to list backups: ${error.message}` });
    }
};


module.exports = {
  getAllSettings,
  getSettingByKey,
  updateSetting,
  createBackup,   // <-- ADD THIS
  listBackups,    // <-- ADD THIS
};