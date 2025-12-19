/**
 * roadmapManager.js - Ryan's Roadmap Modification Service
 * 
 * Handles dynamic roadmap changes:
 * - Insert new phases when TODOs reveal new work
 * - Reorder phases when priorities shift
 * - Update dependencies when blockers change
 * - Mark phases for revisit when completed work gets new TODOs
 */

const { Logger } = require('../lib/logger');
const { from } = require('../lib/db');

const logger = new Logger('Ryan:RoadmapManager');

class RoadmapManager {
  
  /**
   * Insert a new phase into a project's roadmap
   */
  async insertPhase(projectId, phase, options = {}) {
    try {
      const { afterPhaseId, beforePhaseId } = options;
      
      // Get current phases for this project
      const { data: phases } = await from('dev_project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');
      
      let newSortOrder = 1;
      
      if (afterPhaseId) {
        const afterPhase = phases.find(p => p.id === afterPhaseId);
        if (afterPhase) {
          newSortOrder = afterPhase.sort_order + 1;
          // Bump all phases after this one
          await this.bumpPhasesAfter(projectId, afterPhase.sort_order);
        }
      } else if (beforePhaseId) {
        const beforePhase = phases.find(p => p.id === beforePhaseId);
        if (beforePhase) {
          newSortOrder = beforePhase.sort_order;
          // Bump this phase and all after it
          await this.bumpPhasesAfter(projectId, beforePhase.sort_order - 1);
        }
      } else {
        // Add to end
        newSortOrder = (phases.length > 0 ? Math.max(...phases.map(p => p.sort_order)) : 0) + 1;
      }
      
      // Insert the new phase
      const { data, error } = await from('dev_project_phases')
        .insert({
          project_id: projectId,
          name: phase.name,
          description: phase.description,
          status: phase.status || 'pending',
          sort_order: newSortOrder
        })
        .select()
        .single();
      
      if (error) throw error;
      
      logger.info('Phase inserted', { 
        projectId, 
        phaseName: phase.name, 
        sortOrder: newSortOrder 
      });
      
      return data;
    } catch (err) {
      logger.error('Failed to insert phase', { error: err.message });
      throw err;
    }
  }

  /**
   * Bump sort_order for all phases after a given order
   */
  async bumpPhasesAfter(projectId, afterOrder) {
    const { error } = await from('dev_project_phases')
      .update({ sort_order: from.raw('sort_order + 1') })
      .eq('project_id', projectId)
      .gt('sort_order', afterOrder);
    
    if (error) {
      // Fallback: do it manually
      const { data: phases } = await from('dev_project_phases')
        .select('id, sort_order')
        .eq('project_id', projectId)
        .gt('sort_order', afterOrder);
      
      for (const phase of (phases || [])) {
        await from('dev_project_phases')
          .update({ sort_order: phase.sort_order + 1 })
          .eq('id', phase.id);
      }
    }
  }

  /**
   * Reorder a phase to a new position
   */
  async reorderPhase(phaseId, newOrder) {
    try {
      const { data: phase, error: fetchErr } = await from('dev_project_phases')
        .select('*')
        .eq('id', phaseId)
        .single();
      
      if (fetchErr) throw fetchErr;
      
      const oldOrder = phase.sort_order;
      
      if (newOrder > oldOrder) {
        // Moving down - decrement phases between old and new
        await from('dev_project_phases')
          .update({ sort_order: from.raw('sort_order - 1') })
          .eq('project_id', phase.project_id)
          .gt('sort_order', oldOrder)
          .lte('sort_order', newOrder);
      } else if (newOrder < oldOrder) {
        // Moving up - increment phases between new and old
        await from('dev_project_phases')
          .update({ sort_order: from.raw('sort_order + 1') })
          .eq('project_id', phase.project_id)
          .gte('sort_order', newOrder)
          .lt('sort_order', oldOrder);
      }
      
      // Update the phase itself
      const { error } = await from('dev_project_phases')
        .update({ sort_order: newOrder })
        .eq('id', phaseId);
      
      if (error) throw error;
      
      logger.info('Phase reordered', { phaseId, oldOrder, newOrder });
      
      return { success: true, oldOrder, newOrder };
    } catch (err) {
      logger.error('Failed to reorder phase', { error: err.message });
      throw err;
    }
  }

  /**
   * Add a dependency between phases
   */
  async addDependency(phaseId, dependsOnPhaseId, notes = '') {
    try {
      const { data, error } = await from('dev_phase_dependencies')
        .insert({
          phase_id: phaseId,
          depends_on_phase_id: dependsOnPhaseId,
          dependency_type: 'blocks',
          notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      logger.info('Dependency added', { phaseId, dependsOnPhaseId });
      
      return data;
    } catch (err) {
      logger.error('Failed to add dependency', { error: err.message });
      throw err;
    }
  }

  /**
   * Remove a dependency
   */
  async removeDependency(phaseId, dependsOnPhaseId) {
    try {
      const { error } = await from('dev_phase_dependencies')
        .delete()
        .eq('phase_id', phaseId)
        .eq('depends_on_phase_id', dependsOnPhaseId);
      
      if (error) throw error;
      
      logger.info('Dependency removed', { phaseId, dependsOnPhaseId });
      
      return { success: true };
    } catch (err) {
      logger.error('Failed to remove dependency', { error: err.message });
      throw err;
    }
  }

  /**
   * Mark a phase for revisit (creates a note/flag)
   */
  async markForRevisit(phaseId, reason) {
    try {
      const { data: phase } = await from('dev_project_phases')
        .select('*, project:dev_projects(name)')
        .eq('id', phaseId)
        .single();
      
      // Update phase description to note revisit needed
      const revisitNote = `\n\n⚠️ REVISIT NEEDED (${new Date().toISOString().split('T')[0]}): ${reason}`;
      
      const { error } = await from('dev_project_phases')
        .update({ 
          description: (phase.description || '') + revisitNote,
          status: phase.status === 'complete' ? 'in_progress' : phase.status
        })
        .eq('id', phaseId);
      
      if (error) throw error;
      
      logger.warn('Phase marked for revisit', { 
        phaseId, 
        phaseName: phase.name,
        project: phase.project?.name,
        reason 
      });
      
      return { success: true, phase: phase.name, reason };
    } catch (err) {
      logger.error('Failed to mark for revisit', { error: err.message });
      throw err;
    }
  }

  /**
   * Update phase status
   */
  async updatePhaseStatus(phaseId, status, notes = null) {
    try {
      const updateData = { status };
      
      if (status === 'complete') {
        updateData.completed_at = new Date().toISOString();
      } else if (status === 'in_progress') {
        updateData.started_at = updateData.started_at || new Date().toISOString();
      }
      
      const { data, error } = await from('dev_project_phases')
        .update(updateData)
        .eq('id', phaseId)
        .select()
        .single();
      
      if (error) throw error;
      
      logger.info('Phase status updated', { phaseId, status });
      
      return data;
    } catch (err) {
      logger.error('Failed to update phase status', { error: err.message });
      throw err;
    }
  }

  /**
   * Auto-create phase from TODO
   */
  async createPhaseFromTodo(todo, projectId) {
    try {
      // Determine where to insert based on priority
      const { data: phases } = await from('dev_project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');
      
      // Find first pending phase to insert before
      const firstPending = phases.find(p => p.status === 'pending');
      
      const newPhase = await this.insertPhase(projectId, {
        name: todo.title,
        description: `Auto-created from TODO: ${todo.description || todo.title}\n\nPriority: ${todo.priority || 'normal'}`,
        status: 'pending'
      }, firstPending ? { beforePhaseId: firstPending.id } : {});
      
      logger.info('Phase created from TODO', { 
        todoTitle: todo.title, 
        phaseId: newPhase.id 
      });
      
      return newPhase;
    } catch (err) {
      logger.error('Failed to create phase from TODO', { error: err.message });
      throw err;
    }
  }
}

module.exports = new RoadmapManager();
