-- Seed Phases with CORRECT slugs
-- Run in Supabase SQL Editor

-- ============================================
-- KODIACK STUDIOS (dev-studio-5400)
-- ============================================
INSERT INTO dev_project_phases (project_id, name, description, status, sort_order, completed_at)
SELECT id, 'Dev Dashboard base', 'Basic monitoring dashboard', 'complete', 1, NOW() - INTERVAL '30 days'
FROM dev_projects WHERE slug = 'dev-studio-5400';

INSERT INTO dev_project_phases (project_id, name, description, status, sort_order, completed_at)
SELECT id, 'Dev Studio + AI team', 'Claude, Chad, Susan, Clair integration', 'complete', 2, NOW() - INTERVAL '7 days'
FROM dev_projects WHERE slug = 'dev-studio-5400';

INSERT INTO dev_project_phases (project_id, name, description, status, sort_order, started_at)
SELECT id, 'Ryan project management', 'Strategic project oversight', 'in_progress', 3, NOW()
FROM dev_projects WHERE slug = 'dev-studio-5400';

INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'Tiffany & Mike testing', 'Puppeteer automated testing', 'pending', 4
FROM dev_projects WHERE slug = 'dev-studio-5400';

-- ============================================
-- NEXTBID ENGINE (engine)
-- ============================================
INSERT INTO dev_project_phases (project_id, name, description, status, sort_order, completed_at)
SELECT id, 'Stage 1: Single tradeline', 'Low Voltage live and working', 'complete', 1, NOW() - INTERVAL '14 days'
FROM dev_projects WHERE slug = 'engine';

INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'Stage 2: Multi-tradeline', 'Launch 5 tradelines, monitor 1 week', 'pending', 2
FROM dev_projects WHERE slug = 'engine';

INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'Stage 3: Canonizer', 'Duplicate detection across tradelines', 'pending', 3
FROM dev_projects WHERE slug = 'engine';

INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'Stage 4: AI proposals', 'AI-assisted proposal data extraction', 'pending', 4
FROM dev_projects WHERE slug = 'engine';

-- ============================================
-- DASHBOARD (dashboard)
-- ============================================
INSERT INTO dev_project_phases (project_id, name, description, status, sort_order, completed_at)
SELECT id, 'Core dashboard', 'Basic monitoring UI', 'complete', 1, NOW() - INTERVAL '45 days'
FROM dev_projects WHERE slug = 'dashboard';

INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'Server monitoring', 'All 4 droplets health', 'pending', 2
FROM dev_projects WHERE slug = 'dashboard';

INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'Deploy automation', 'Push/pull patches', 'pending', 3
FROM dev_projects WHERE slug = 'dashboard';

-- ============================================
-- NEXTBID PORTAL (portal)
-- ============================================
INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'Discovery filters UI', 'Filter by tradeline, location', 'pending', 1
FROM dev_projects WHERE slug = 'portal';

INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'Bid detail pages', 'Full bid info + pipeline view', 'pending', 2
FROM dev_projects WHERE slug = 'portal';

INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'Proposal workflow', 'Create and manage proposals', 'pending', 3
FROM dev_projects WHERE slug = 'portal';

INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'AI proposal writing', 'AI-powered proposals', 'pending', 4
FROM dev_projects WHERE slug = 'portal';

-- ============================================
-- NEXTSOURCE (nextsource)
-- ============================================
INSERT INTO dev_project_phases (project_id, name, description, status, sort_order, started_at)
SELECT id, 'Portal discovery', '350+ sources in CA being processed', 'in_progress', 1, NOW() - INTERVAL '21 days'
FROM dev_projects WHERE slug = 'nextsource';

INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'Bulk authentication', 'Validate sources at scale', 'pending', 2
FROM dev_projects WHERE slug = 'nextsource';

INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'Engine integration', 'Feed sources to tradelines', 'pending', 3
FROM dev_projects WHERE slug = 'nextsource';

-- ============================================
-- NEXTBIDDER (nextbidder)
-- ============================================
INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'GSA price scraping', 'Scrape GSA pricing', 'pending', 1
FROM dev_projects WHERE slug = 'nextbidder';

INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'Margin calculator', 'Calculate profit margins', 'pending', 2
FROM dev_projects WHERE slug = 'nextbidder';

INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'Deal flagging', 'Flag good deals automatically', 'pending', 3
FROM dev_projects WHERE slug = 'nextbidder';

-- ============================================
-- NEXTTECH (nexttech)
-- ============================================
INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'Job assignment', 'Assign jobs to field workers', 'pending', 1
FROM dev_projects WHERE slug = 'nexttech';

INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'SOP gathering', 'Capture procedures', 'pending', 2
FROM dev_projects WHERE slug = 'nexttech';

INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'Field tracking', 'Track worker locations', 'pending', 3
FROM dev_projects WHERE slug = 'nexttech';

-- ============================================
-- NEXTTASK (task)
-- ============================================
INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'Task definitions', 'Define task types', 'pending', 1
FROM dev_projects WHERE slug = 'task';

INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'MMO-style assignment', 'Gamified tasks to workers', 'pending', 2
FROM dev_projects WHERE slug = 'task';

INSERT INTO dev_project_phases (project_id, name, description, status, sort_order)
SELECT id, 'Data collection', 'Competitor prices, install times', 'pending', 3
FROM dev_projects WHERE slug = 'task';

-- ============================================
-- DEPENDENCIES
-- ============================================

-- Portal Discovery filters depends on Engine Stage 2
INSERT INTO dev_phase_dependencies (phase_id, depends_on_phase_id, dependency_type, notes)
SELECT p1.id, p2.id, 'blocks', 'Portal needs multi-tradeline data'
FROM dev_project_phases p1
JOIN dev_projects pr1 ON p1.project_id = pr1.id
CROSS JOIN dev_project_phases p2
JOIN dev_projects pr2 ON p2.project_id = pr2.id
WHERE pr1.slug = 'portal' AND p1.name = 'Discovery filters UI'
  AND pr2.slug = 'engine' AND p2.name = 'Stage 2: Multi-tradeline';

-- Sources Engine integration depends on Engine Stage 2
INSERT INTO dev_phase_dependencies (phase_id, depends_on_phase_id, dependency_type, notes)
SELECT p1.id, p2.id, 'blocks', 'Sources needs Engine multi-tradeline'
FROM dev_project_phases p1
JOIN dev_projects pr1 ON p1.project_id = pr1.id
CROSS JOIN dev_project_phases p2
JOIN dev_projects pr2 ON p2.project_id = pr2.id
WHERE pr1.slug = 'nextsource' AND p1.name = 'Engine integration'
  AND pr2.slug = 'engine' AND p2.name = 'Stage 2: Multi-tradeline';

-- NextTask depends on NextTech
INSERT INTO dev_phase_dependencies (phase_id, depends_on_phase_id, dependency_type, notes)
SELECT p1.id, p2.id, 'blocks', 'NextTask needs NextTech job system'
FROM dev_project_phases p1
JOIN dev_projects pr1 ON p1.project_id = pr1.id
CROSS JOIN dev_project_phases p2
JOIN dev_projects pr2 ON p2.project_id = pr2.id
WHERE pr1.slug = 'task' AND p1.name = 'Task definitions'
  AND pr2.slug = 'nexttech' AND p2.name = 'Job assignment';

-- ============================================
-- TRADELINE
-- ============================================
INSERT INTO dev_tradelines (name, slug, status, port_number, server_path, notes)
VALUES ('Low Voltage', 'low-voltage', 'live', 3090, '/var/www/NextBid_Dev/engine', 'First tradeline - working great')
ON CONFLICT (slug) DO UPDATE SET status = 'live', port_number = 3090;

-- ============================================
-- CURRENT FOCUS
-- ============================================
INSERT INTO dev_current_focus (project_id, phase_id, priority, rationale, set_by)
SELECT pr.id, p.id, 1, 'Building Ryan to manage all 8 projects', 'system'
FROM dev_project_phases p
JOIN dev_projects pr ON p.project_id = pr.id
WHERE pr.slug = 'dev-studio-5400' AND p.name = 'Ryan project management';

-- Done!
