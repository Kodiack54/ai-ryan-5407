const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  user: 'kodiack_admin', 
  password: 'K0d1ack_Stud10_2024',
  database: 'kodiack_ai'
});

const phases = {
  'nextbid-core': [
    { name: 'Authenticator', description: 'User authentication system', status: 'complete', sort_order: 1 },
    { name: 'Gateway', description: 'API gateway and routing', status: 'complete', sort_order: 2 },
    { name: 'Patcher/Deployment', description: 'Patcher and deployment system', status: 'pending', sort_order: 3 },
    { name: 'Multi-droplet Orchestration', description: 'Orchestrate multiple droplets', status: 'pending', sort_order: 4 }
  ],
  'nextbid-engine': [
    { name: 'Single Tradeline Discovery', description: 'Low Voltage tradeline live', status: 'complete', sort_order: 1 },
    { name: 'Multi-tradeline Expansion', description: 'Expand to multiple tradelines', status: 'in_progress', sort_order: 2 },
    { name: 'Canonizer', description: 'Duplicate detection system', status: 'pending', sort_order: 3 },
    { name: 'AI Proposal Data Extraction', description: 'AI-assisted proposal data extraction', status: 'pending', sort_order: 4 }
  ],
  'nextbid-portal': [
    { name: 'Discovery Filters UI', description: 'UI for discovery filters', status: 'pending', sort_order: 1 },
    { name: 'Bid Detail Pages', description: 'Bid detail pages + pipeline view', status: 'pending', sort_order: 2 },
    { name: 'Proposal Writing Workflow', description: 'Workflow for writing proposals', status: 'pending', sort_order: 3 },
    { name: 'AI Proposal Integration', description: 'AI proposal integration', status: 'pending', sort_order: 4 }
  ],
  'nextbid-sources': [
    { name: 'Portal Discovery', description: 'Authenticated portals 50+, 350+ in CA', status: 'in_progress', sort_order: 1 },
    { name: 'Bulk Authentication', description: 'Bulk authentication/validation', status: 'pending', sort_order: 2 },
    { name: 'Engine Integration', description: 'Integration with Engine', status: 'pending', sort_order: 3 },
    { name: 'Auto-add Tradelines', description: 'Auto-add to live tradelines', status: 'pending', sort_order: 4 }
  ],
  'nextbidder': [
    { name: 'GSA Price Scraping', description: 'GSA price scraping system', status: 'pending', sort_order: 1 },
    { name: 'Distributor Price Comparison', description: 'Compare distributor prices', status: 'pending', sort_order: 2 },
    { name: 'Margin Calculator', description: 'Margin calculator + deal flagging', status: 'pending', sort_order: 3 },
    { name: 'Auto-bid Recommendations', description: 'Automatic bid recommendations', status: 'pending', sort_order: 4 }
  ],
  'nexttech': [
    { name: 'Job Assignment System', description: 'Job assignment system', status: 'pending', sort_order: 1 },
    { name: 'SOP Gathering Interface', description: 'SOP gathering interface', status: 'pending', sort_order: 2 },
    { name: 'Field Worker Tracking', description: 'Track field workers', status: 'pending', sort_order: 3 },
    { name: 'Job Completion Reporting', description: 'Job completion to NextTask', status: 'pending', sort_order: 4 }
  ],
  'nexttask': [
    { name: 'Task Definition System', description: 'Task definition system', status: 'pending', sort_order: 1 },
    { name: 'Worker Task Assignment', description: 'MMO-style task assignment', status: 'pending', sort_order: 2 },
    { name: 'Data Collection', description: 'Competitor prices, install times', status: 'pending', sort_order: 3 },
    { name: 'AI Training Pipeline', description: 'AI training data for proposals', status: 'pending', sort_order: 4 }
  ]
};

async function seed() {
  const client = await pool.connect();
  try {
    const { rows: projects } = await client.query(
      "SELECT id, slug FROM dev_projects WHERE slug IN ('nextbid-core','nextbid-engine','nextbid-portal','nextbid-sources','nextbidder','nexttech','nexttask')"
    );
    console.log('Found ' + projects.length + ' projects');
    
    for (const proj of projects) {
      const phs = phases[proj.slug];
      if (!phs) continue;
      
      const { rows: existing } = await client.query('SELECT name FROM dev_project_phases WHERE project_id = $1', [proj.id]);
      const existingNames = existing.map(function(e) { return e.name; });
      
      for (const ph of phs) {
        if (existingNames.indexOf(ph.name) >= 0) {
          console.log('  [SKIP] ' + proj.slug + ': ' + ph.name);
          continue;
        }
        await client.query(
          'INSERT INTO dev_project_phases (project_id, name, description, status, sort_order) VALUES ($1, $2, $3, $4, $5)',
          [proj.id, ph.name, ph.description, ph.status, ph.sort_order]
        );
        console.log('  [ADD] ' + proj.slug + ': ' + ph.name);
      }
    }
    console.log('Done!');
  } finally {
    client.release();
    pool.end();
  }
}
seed().catch(console.error);
