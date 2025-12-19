/**
 * /api/roadmap - Roadmap management endpoints
 */
const express = require('express');
const router = express.Router();
const roadmapManager = require('../services/roadmapManager');

// POST /api/roadmap/phase - Insert new phase
router.post('/phase', async (req, res) => {
  try {
    const { projectId, name, description, afterPhaseId, beforePhaseId } = req.body;
    const result = await roadmapManager.insertPhase(projectId, 
      { name, description }, 
      { afterPhaseId, beforePhaseId }
    );
    res.json({ success: true, phase: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/roadmap/phase/:id/reorder - Reorder phase
router.patch('/phase/:id/reorder', async (req, res) => {
  try {
    const { newOrder } = req.body;
    const result = await roadmapManager.reorderPhase(req.params.id, newOrder);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/roadmap/phase/:id/status - Update phase status
router.patch('/phase/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await roadmapManager.updatePhaseStatus(req.params.id, status);
    res.json({ success: true, phase: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/roadmap/phase/:id/revisit - Mark for revisit
router.post('/phase/:id/revisit', async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await roadmapManager.markForRevisit(req.params.id, reason);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/roadmap/dependency - Add dependency
router.post('/dependency', async (req, res) => {
  try {
    const { phaseId, dependsOnPhaseId, notes } = req.body;
    const result = await roadmapManager.addDependency(phaseId, dependsOnPhaseId, notes);
    res.json({ success: true, dependency: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/roadmap/dependency - Remove dependency
router.delete('/dependency', async (req, res) => {
  try {
    const { phaseId, dependsOnPhaseId } = req.body;
    const result = await roadmapManager.removeDependency(phaseId, dependsOnPhaseId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/roadmap/from-todo - Create phase from TODO
router.post('/from-todo', async (req, res) => {
  try {
    const { todo, projectId } = req.body;
    const result = await roadmapManager.createPhaseFromTodo(todo, projectId);
    res.json({ success: true, phase: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
