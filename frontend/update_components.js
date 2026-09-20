import fs from 'fs';

// Update StatusBadge
let badge = fs.readFileSync('src/components/ui/StatusBadge.tsx', 'utf8');
badge = badge.replace(
  "RESERVE: { label: 'RǸservǸ', cls: 'bg-primary-tint text-primary' }",
  "RESERVE: { label: 'RǸservǸ', cls: 'bg-primary-soft text-primary' }"
).replace(
  "TERMINE: { label: 'TerminǸ', cls: 'bg-green-50 text-status-termine' }",
  "TERMINE: { label: 'TerminǸ', cls: 'bg-success text-success-text' }"
).replace(
  "EN_COURS: { label: 'En cours', cls: 'bg-orange-50 text-status-encours' }",
  "EN_COURS: { label: 'En cours', cls: 'bg-warning text-warning-text' }"
);
fs.writeFileSync('src/components/ui/StatusBadge.tsx', badge);

// Update StatCard
let card = fs.readFileSync('src/components/ui/StatCard.tsx', 'utf8');
card = card.replace(
  "className=\"bg-white border border-line rounded-xl2 p-4\"",
  "className=\"bg-card border border-line rounded-[18px] p-5 shadow-card\""
);
fs.writeFileSync('src/components/ui/StatCard.tsx', card);

console.log('Components updated');
