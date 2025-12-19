/**
 * Ryan Route Aggregator
 */
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/health', require('./health'));
app.use('/api/status', require('./status'));
app.use('/api/whats-next', require('./whatsNext'));
app.use('/api/complete', require('./whatsNext'));  // POST /api/complete
app.use('/api/focus', require('./whatsNext'));     // POST /api/focus
app.use('/api', require('./phases'));              // /api/project/:id/phases, /api/phase/:id
app.use('/api', require('./dependencies'));        // /api/dependency, /api/blocked
app.use('/api/tradelines', require('./tradelines'));
app.use('/api/briefing', require('./briefing'));
app.use('/api/todos', require('./todos'));
app.use('/api/roadmap', require('./roadmap'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Not found',
    available_endpoints: [
      'GET /health',
      'GET /api/status',
      'GET /api/whats-next',
      'POST /api/complete',
      'POST /api/focus',
      'GET /api/project/:id/phases',
      'POST /api/project/:id/phase',
      'PATCH /api/phase/:id',
      'GET /api/phase/:id/dependencies',
      'POST /api/dependency',
      'GET /api/blocked',
      'GET /api/tradelines',
      'POST /api/tradelines',
      'PATCH /api/tradelines/:id',
      'GET /api/briefing'
    ]
  });
});

module.exports = app;
