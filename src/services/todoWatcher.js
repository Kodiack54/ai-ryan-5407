/**
 * todoWatcher.js - Ryan's TODO Monitoring Service
 * 
 * Watches Susan's TODOs across all projects and:
 * - Detects new TODOs that might affect the roadmap
 * - Flags when completed phases get new TODOs (needs revisit)
 * - Alerts when work is "off in the weeds" (not aligned with roadmap)
 * - Suggests roadmap updates based on TODO changes
 */

const { Logger } = require('../lib/logger');
const { from } = require('../lib/db');

const logger = new Logger('Ryan:TodoWatcher');

class TodoWatcher {
  constructor() {
    this.lastCheck = null;
    this.knownTodos = new Map(); // id -> todo
    this.checkInterval = 5 * 60 * 1000; // 5 minutes
    this.intervalId = null;
  }

  async initialize() {
    logger.info('Initializing TODO watcher...');
    
    // Load current TODOs into memory
    await this.loadCurrentTodos();
    
    // Start watching
    this.startWatching();
    
    logger.info('TODO watcher initialized', { 
      knownTodos: this.knownTodos.size,
      checkInterval: '5 min'
    });
  }

  async loadCurrentTodos() {
    try {
      const { data, error } = await from('dev_ai_todos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      for (const todo of (data || [])) {
        this.knownTodos.set(todo.id, todo);
      }
    } catch (err) {
      logger.error('Failed to load TODOs', { error: err.message });
    }
  }

  startWatching() {
    this.intervalId = setInterval(() => this.checkForChanges(), this.checkInterval);
    logger.info('TODO watch cycle started (5 min interval)');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('TODO watcher stopped');
    }
  }

  async checkForChanges() {
    try {
      logger.info('Checking for TODO changes...');
      
      const { data: todos, error } = await from('dev_ai_todos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const currentTodoIds = new Set((todos || []).map(t => t.id));
      const analysis = {
        newTodos: [],
        completedTodos: [],
        changedTodos: [],
        offTrackWarnings: [],
        revisitNeeded: []
      };

      // Check for new TODOs
      for (const todo of (todos || [])) {
        const known = this.knownTodos.get(todo.id);
        
        if (!known) {
          // New TODO
          analysis.newTodos.push(todo);
          this.knownTodos.set(todo.id, todo);
          
          // Check if this TODO relates to a completed phase
          await this.checkForRevisit(todo, analysis);
          
          // Check if this TODO is off-track
          await this.checkForOffTrack(todo, analysis);
        } else if (known.status !== todo.status) {
          // Status changed
          analysis.changedTodos.push({ old: known, new: todo });
          this.knownTodos.set(todo.id, todo);
        }
      }

      // Check for completed TODOs (removed from list)
      for (const [id, todo] of this.knownTodos) {
        if (!currentTodoIds.has(id)) {
          analysis.completedTodos.push(todo);
          this.knownTodos.delete(id);
        }
      }

      // Log analysis
      if (analysis.newTodos.length > 0) {
        logger.info('New TODOs detected', { 
          count: analysis.newTodos.length,
          titles: analysis.newTodos.map(t => t.title)
        });
      }

      if (analysis.revisitNeeded.length > 0) {
        logger.warn('Phases need revisit - new TODOs on completed work', {
          phases: analysis.revisitNeeded
        });
      }

      if (analysis.offTrackWarnings.length > 0) {
        logger.warn('Off-track work detected', {
          warnings: analysis.offTrackWarnings
        });
      }

      // Emit events or update database with findings
      await this.recordAnalysis(analysis);
      
      this.lastCheck = new Date();
      
    } catch (err) {
      logger.error('TODO check failed', { error: err.message });
    }
  }

  async checkForRevisit(todo, analysis) {
    try {
      // Get project from TODO's project_path
      const projectPath = todo.project_path;
      if (!projectPath) return;

      // Find project and check if related phases are complete
      const { data: phases } = await from('dev_project_phases')
        .select('*, project:dev_projects(name, slug, server_path)')
        .eq('status', 'complete');
      
      for (const phase of (phases || [])) {
        // Check if TODO might relate to this completed phase
        const todoLower = (todo.title + ' ' + (todo.description || '')).toLowerCase();
        const phaseLower = (phase.name + ' ' + (phase.description || '')).toLowerCase();
        
        // Simple keyword matching - could be enhanced with AI
        const keywords = phaseLower.split(' ').filter(w => w.length > 4);
        const matches = keywords.filter(k => todoLower.includes(k));
        
        if (matches.length >= 2 && phase.project?.server_path?.includes(projectPath.split('/').pop())) {
          analysis.revisitNeeded.push({
            phase: phase.name,
            project: phase.project?.name,
            todo: todo.title,
            reason: `New TODO "${todo.title}" may require revisiting completed phase "${phase.name}"`
          });
        }
      }
    } catch (err) {
      logger.error('Revisit check failed', { error: err.message });
    }
  }

  async checkForOffTrack(todo, analysis) {
    try {
      // Get current focus
      const { data: focus } = await from('dev_current_focus')
        .select('*, project:dev_projects(name, slug, server_path)')
        .is('completed_at', null)
        .order('priority')
        .limit(1);
      
      const currentFocus = focus?.[0];
      if (!currentFocus) return;

      const todoPath = todo.project_path || '';
      const focusPath = currentFocus.project?.server_path || '';
      
      // Check if TODO is for a different project than current focus
      if (todoPath && focusPath && !todoPath.includes(currentFocus.project?.slug)) {
        analysis.offTrackWarnings.push({
          todo: todo.title,
          todoProject: todoPath,
          currentFocus: currentFocus.project?.name,
          warning: `Working on "${todo.title}" but current focus is ${currentFocus.project?.name}`
        });
      }
    } catch (err) {
      logger.error('Off-track check failed', { error: err.message });
    }
  }

  async recordAnalysis(analysis) {
    try {
      // Only record if there's something notable
      const hasNotables = analysis.newTodos.length > 0 || 
                          analysis.revisitNeeded.length > 0 || 
                          analysis.offTrackWarnings.length > 0;
      
      if (!hasNotables) return;

      // Add to knowledge base via Susan
      const knowledge = {
        category: 'roadmap',
        title: `TODO Analysis - ${new Date().toISOString().split('T')[0]}`,
        summary: this.formatAnalysisSummary(analysis),
        details: JSON.stringify(analysis, null, 2),
        project_path: '/var/www/NextBid_Dev/ai-workers',
        source: 'Ryan:TodoWatcher'
      };

      // Could POST to Susan's /api/remember endpoint
      // For now, just log it
      logger.info('Analysis recorded', { summary: knowledge.summary });
      
    } catch (err) {
      logger.error('Failed to record analysis', { error: err.message });
    }
  }

  formatAnalysisSummary(analysis) {
    const parts = [];
    
    if (analysis.newTodos.length > 0) {
      parts.push(`${analysis.newTodos.length} new TODOs`);
    }
    if (analysis.completedTodos.length > 0) {
      parts.push(`${analysis.completedTodos.length} completed`);
    }
    if (analysis.revisitNeeded.length > 0) {
      parts.push(`${analysis.revisitNeeded.length} phases need revisit`);
    }
    if (analysis.offTrackWarnings.length > 0) {
      parts.push(`${analysis.offTrackWarnings.length} off-track warnings`);
    }
    
    return parts.join(', ') || 'No significant changes';
  }

  // Manual trigger for immediate check
  async checkNow() {
    await this.checkForChanges();
    return {
      lastCheck: this.lastCheck,
      knownTodos: this.knownTodos.size
    };
  }

  getStatus() {
    return {
      running: this.intervalId !== null,
      lastCheck: this.lastCheck,
      knownTodos: this.knownTodos.size,
      checkInterval: this.checkInterval
    };
  }
}

// Export singleton
module.exports = new TodoWatcher();
