import fs from 'fs';

let dash = fs.readFileSync('src/pages/ProfessionnelDashboard.tsx', 'utf8');

dash = dash.replace(
  '--primary: #8957FF;\n    --primary-dark: #6B3FD9;\n    --primary-tint: #F1ECFF;\n    --ink: #1B1730;\n    --ink-soft: #6B6580;\n    --paper: #F7F6FB;\n    --line: #E7E3F3;',
  '--primary: #7350E8;\n    --primary-light: #9B7CF2;\n    --primary-dark: #5A3CC2;\n    --primary-tint: #E9E3FF;\n    --primary-soft: #E9E3FF;\n    --ink: #2B2650;\n    --ink-soft: #777486;\n    --paper: #F7F6FA;\n    --line: #E5E2EE;\n    --card: #FFFFFF;'
);

dash = dash.replace(
  '.page { padding: 18px 30px 60px; display: none; max-width: 1680px; margin: 0 auto; width: 100%; }',
  '.page { padding: 24px 40px 80px; display: none; max-width: 1680px; margin: 0 auto; width: 100%; background: var(--paper); }'
);

dash = dash.replace(
  '.card { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); }',
  '.card { background: var(--card); border: 1px solid var(--line); border-radius: 18px; box-shadow: 0 2px 12px rgba(43, 38, 80, 0.04); }'
).replace(
  '.stat-card { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px 18px; }',
  '.stat-card { background: var(--card); border: 1px solid var(--line); border-radius: 18px; box-shadow: 0 2px 12px rgba(43, 38, 80, 0.04); padding: 20px 22px; }'
);

dash = dash.replace(
  '.st-reserve { background: #F1ECFF; color: var(--st-reserve); }',
  '.st-reserve { background: var(--primary-soft); color: var(--primary); }'
).replace(
  '.st-termine { background: #E9F7ED; color: var(--st-termine); }',
  '.st-termine { background: #DDF4E8; color: #15803D; }'
).replace(
  '.st-encours { background: #FDF1E2; color: var(--st-encours); }',
  '.st-encours { background: #FFF1D8; color: #B45309; }'
);

fs.writeFileSync('src/pages/ProfessionnelDashboard.tsx', dash);
console.log('Dashboard updated');
