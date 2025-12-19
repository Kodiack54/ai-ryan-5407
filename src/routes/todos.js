/**
 * /api/todos - TODO watcher endpoints
 */
const express = require('express');
const router = express.Router();
const todoWatcher = require('../services/todoWatcher');

// GET /api/todos/status - Get watcher status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    ...todoWatcher.getStatus()
  });
});

// POST /api/todos/check - Trigger immediate check
router.post('/check', async (req, res) => {
  try {
    const result = await todoWatcher.checkNow();
    res.json({
      success: true,
      message: 'TODO check completed',
      ...result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
