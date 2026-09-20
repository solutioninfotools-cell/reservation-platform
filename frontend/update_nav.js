import fs from 'fs';

let dash = fs.readFileSync('src/pages/ProfessionnelDashboard.tsx', 'utf8');

dash = dash.replace(
  '.pro-nav-link.active, .pro-nav-link.open { background: var(--primary-tint); color: var(--primary-dark); }',
  '.pro-nav-link.active, .pro-nav-link.open { background: var(--primary-soft); color: var(--primary); }'
);

dash = dash.replace(
  '.pro-menu-item.active { background: var(--primary-tint); color: var(--primary-dark); }',
  '.pro-menu-item.active { background: var(--primary-soft); color: var(--primary); }'
);

fs.writeFileSync('src/pages/ProfessionnelDashboard.tsx', dash);
console.log('Nav styles updated');
