import fs from 'fs';

let indexCss = fs.readFileSync('src/index.css', 'utf8');
indexCss = indexCss.replace(
  'html, body, #root { height: 100%; }\r\nbody { @apply font-sans bg-paper text-ink; }',
  '@import url(\'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap\');\n\nhtml, body, #root { height: 100%; }\nbody { @apply bg-paper text-ink; font-family: \'Plus Jakarta Sans\', sans-serif; }'
).replace(
  'html, body, #root { height: 100%; }\nbody { @apply font-sans bg-paper text-ink; }',
  '@import url(\'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap\');\n\nhtml, body, #root { height: 100%; }\nbody { @apply bg-paper text-ink; font-family: \'Plus Jakarta Sans\', sans-serif; }'
);
fs.writeFileSync('src/index.css', indexCss);

let tailwind = fs.readFileSync('tailwind.config.js', 'utf8');
tailwind = tailwind.replace(
  'primary: { DEFAULT: \'#8957FF\', dark: \'#6B3FD9\', tint: \'#F1ECFF\' }',
  'primary: { DEFAULT: \'#7350E8\', light: \'#9B7CF2\', soft: \'#E9E3FF\', dark: \'#5A3CC2\' }'
).replace(
  'ink: { DEFAULT: \'#1B1730\', soft: \'#6B6580\' }',
  'ink: { DEFAULT: \'#2B2650\', soft: \'#777486\' }'
).replace(
  'paper: \'#F7F6FB\'',
  'paper: \'#F7F6FA\',\n        card: \'#FFFFFF\''
).replace(
  'line: \'#E7E3F3\'',
  'line: \'#E5E2EE\''
).replace(
  'fontFamily: { sans: [\'Poppins\', \'ui-sans-serif\', \'system-ui\'] }',
  'fontFamily: { sans: [\'"Plus Jakarta Sans"\', \'ui-sans-serif\', \'system-ui\'] },\n      boxShadow: { \'card\': \'0 2px 12px rgba(43, 38, 80, 0.04)\' }'
);
fs.writeFileSync('tailwind.config.js', tailwind);

console.log('Update done');
