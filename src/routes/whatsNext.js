/**
 * What's Next - Ryan's Priority Engine
 * UPGRADED: Cross-client dependency awareness
 */
const express = require('express');
const router = express.Router();
const { from } = require('../lib/db');

router.get('/', async (req, res) => {
  try {
    // 1. Get phases, projects, clients separately (no nested joins)
    const { data: phases, error: phaseErr } = await from('dev_project_phases').select('*');
    if (phaseErr) throw phaseErr;

    const { data: projects } = await from('dev_projects').select('*');
    const { data: clients } = await from('dev_clients').select('*');
    const { data: dependencies } = await from('dev_phase_dependencies').select('*');
    const { data: criticalBugs } = await from('dev_ai_bugs')
      .select('*')
      .eq('severity', 'critical')
      .in('status', ['open', 'investigating']);
    const { data: currentFocus } = await from('dev_current_focus')
      .select('*')
      .is('completed_at', null)
      .order('priority')
      .limit(1);

    // Build lookup maps
    const projectMap = {};
    const clientMap = {};
    (projects || []).forEach(p => { projectMap[p.id] = p; });
    (clients || []).forEach(c => { clientMap[c.id] = c; });

    // Enrich phases with project and client info
    phases.forEach(phase => {
      phase.project = projectMap[phase.project_id] || {};
      phase.project.client = clientMap[phase.project?.client_id] || {};
    });

    // Build phase map
    const phaseMap = {};
    phases.forEach(p => { phaseMap[p.id] = p; });

    // Mark phases as blocked
    phases.forEach(phase => {
      phase.blockedBy = [];
      phase.crossClientBlock = null;
      
      const phaseDeps = (dependencies || []).filter(d => d.phase_id === phase.id);
      phaseDeps.forEach(dep => {
        const blocker = phaseMap[dep.depends_on_phase_id];
        if (blocker && blocker.status !== 'complete') {
          phase.blockedBy.push({ phase: blocker, notes: dep.notes });
          
          if (blocker.project?.client_id !== phase.project?.client_id) {
            phase.crossClientBlock = {
              blockerPhase: blocker.name,
              blockerProject: blocker.project?.name,
              blockerClient: blocker.project?.client?.name || 'Unknown',
              myClient: phase.project?.client?.name || 'Unknown',
              notes: dep.notes
            };
          }
        }
      });
      phase.is_blocked = phase.blockedBy.length > 0;
    });

    // Find phases that unblock other clients
    phases.forEach(phase => {
      phase.unblocksCrossClient = [];
      const blocking = (dependencies || []).filter(d => d.depends_on_phase_id === phase.id);
      blocking.forEach(dep => {
        const blocked = phaseMap[dep.phase_id];
        if (blocked && blocked.project?.client_id !== phase.project?.client_id) {
          phase.unblocksCrossClient.push({
            phase: blocked.name,
            project: blocked.project?.name,
            client: blocked.project?.client?.name
          });
        }
      });
    });

    // Filter actionable
    const actionable = phases.filter(p => 
      ['pending', 'in_progress'].includes(p.status) && !p.is_blocked
    );

    // Score phases
    const scored = actionable.map(phase => {
      let score = 0;
      let reasons = [];

      if (phase.unblocksCrossClient.length > 0) {
        score += 200;
        const cls = [...new Set(phase.unblocksCrossClient.map(u => u.client))];
        reasons.push(`🔓 UNBLOCKS ${cls.join(', ')} work`);
      }

      if (phase.status === 'in_progress') {
        score += 100;
        reasons.push('Already in progress');
      }

      const sameClientUnblocks = phases.filter(p => 
        p.blockedBy.some(b => b.phase.id === phase.id) &&
        p.project?.client_id === phase.project?.client_id
      ).length;
      if (sameClientUnblocks > 0) {
        score += sameClientUnblocks * 20;
        reasons.push(`Unblocks ${sameClientUnblocks} phase(s)`);
      }

      if (phase.project?.slug === 'kodiack-dashboard-5500') {
        score += 50;
        reasons.push('🛠️ Studio tool needed');
      }

      score += Math.max(0, 10 - phase.sort_order);

      return { ...phase, score, reasons, client_name: phase.project?.client?.name };
    });

    scored.sort((a, b) => b.score - a.score);

    const crossClientBlocked = phases.filter(p => p.crossClientBlock);
    const topPick = scored[0];
    const alternatives = scored.slice(1, 4);

    const warnings = [];
    if (criticalBugs?.length > 0) {
      warnings.push({
        type: 'critical_bugs',
        message: `⚠️ ${criticalBugs.length} critical bug(s) need attention`,
        items: criticalBugs.map(b => ({ id: b.id, title: b.title }))
      });
    }

    if (crossClientBlocked.length > 0) {
      warnings.push({
        type: 'cross_client_blocked',
        message: `🚫 ${crossClientBlocked.length} phase(s) waiting on another client's tools`,
        items: crossClientBlocked.slice(0, 5).map(p => ({
          blocked: `${p.project?.client?.name}: ${p.name}`,
          waiting_on: `${p.crossClientBlock.blockerClient}: ${p.crossClientBlock.blockerPhase}`,
          reason: p.crossClientBlock.notes
        }))
      });
    }

    const recommendation = topPick ? {
      project: topPick.project?.name,
      project_slug: topPick.project?.slug,
      client: topPick.client_name,
      phase: topPick.name,
      phase_id: topPick.id,
      status: topPick.status,
      score: topPick.score,
      reasons: topPick.reasons,
      description: topPick.description,
      unblocks_clients: topPick.unblocksCrossClient
    } : null;

    let actionMessage = null;
    if (topPick?.unblocksCrossClient?.length > 0) {
      const unblocked = topPick.unblocksCrossClient[0];
      actionMessage = `Complete "${topPick.name}" (${topPick.client_name}) → Then work on "${unblocked.phase}" (${unblocked.client})`;
    }

    res.json({
      success: true,
      action_message: actionMessage,
      recommendation,
      alternatives: alternatives.map(a => ({
        project: a.project?.name,
        client: a.client_name,
        phase: a.name,
        phase_id: a.id,
        score: a.score,
        reasons: a.reasons
      })),
      current_focus: currentFocus?.[0] || null,
      warnings,
      cross_client_dependencies: crossClientBlocked.length,
      summary: {
        total_phases: phases.length,
        actionable: actionable.length,
        blocked: phases.filter(p => p.is_blocked).length,
        cross_client_blocked: crossClientBlocked.length,
        in_progress: phases.filter(p => p.status === 'in_progress').length,
        complete: phases.filter(p => p.status === 'complete').length
      }
    });
  } catch (error) {
    console.error('WhatsNext error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/complete', async (req, res) => {
  try {
    const { phase_id } = req.body;
    if (phase_id) {
      await from('dev_current_focus')
        .update({ completed_at: new Date().toISOString() })
        .eq('phase_id', phase_id)
        .is('completed_at', null);
      await from('dev_project_phases')
        .update({ status: 'complete', completed_at: new Date().toISOString() })
        .eq('id', phase_id);
    }
    res.redirect(307, '/api/whats-next');
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/focus', async (req, res) => {
  try {
    const { phase_id, rationale } = req.body;
    if (!phase_id) return res.status(400).json({ success: false, error: 'phase_id required' });

    const { data: phase } = await from('dev_project_phases').select('*').eq('id', phase_id).single();
    if (!phase) return res.status(404).json({ success: false, error: 'Phase not found' });

    await from('dev_project_phases')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', phase_id);

    const { data: focus, error } = await from('dev_current_focus')
      .insert({ project_id: phase.project_id, phase_id, priority: 1, rationale: rationale || `Focus on ${phase.name}`, set_by: 'user' })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, focus, phase });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
