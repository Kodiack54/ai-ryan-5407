/**
 * Ryan - AI Project Manager
 * Port 5402
 * 
 * Tracks 8 projects, understands dependencies, answers "what's next?"
 */

require('dotenv').config();

const { Logger } = require('./src/lib/logger');
const config = require('./src/lib/config');

const logger = new Logger('Ryan');

async function start() {
  logger.info('Starting Ryan - AI Project Manager...');
  
  // Validate config
  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_KEY) {
    logger.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  // Initialize TODO watcher service
  const todoWatcher = require('./src/services/todoWatcher');
  await todoWatcher.initialize();
  logger.info('TODO watcher service started');

  // Load Express app
  const app = require('./src/routes');

  // Start server
  const server = app.listen(config.PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🏃 RYAN - AI Project Manager                            ║
║                                                           ║
║   Port: ${config.PORT}                                         ║
║   Role: Strategic project oversight                       ║
║                                                           ║
║   Endpoints:                                              ║
║   • GET  /health           - Health check                 ║
║   • GET  /api/status       - All projects & phases        ║
║   • GET  /api/whats-next   - What to work on next         ║
║   • POST /api/complete     - Mark phase done, get next    ║
║   • POST /api/focus        - Set current focus            ║
║   • GET  /api/tradelines   - Tradeline status             ║
║   • GET  /api/briefing     - Claude briefing              ║
║                                                           ║
║   Projects: 8 | Tracking phases & dependencies            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
    logger.info(`Ryan listening on port ${config.PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down...');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down...');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  // Catch uncaught errors
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason });
  });
}

start().catch(err => {
  logger.error('Startup failed', { error: err.message });
  process.exit(1);
});
