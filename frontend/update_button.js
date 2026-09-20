import fs from 'fs';
let content = fs.readFileSync('src/components/ui/Button.tsx', 'utf8');

content = content.replace(
  "type Variant = 'primary' | 'ghost' | 'danger';",
  "type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';"
).replace(
  "const variants: Record<Variant, string> = {\n    primary: 'bg-primary text-white hover:bg-primary-dark',\n    ghost: 'bg-white text-ink border border-line hover:bg-paper',\n    danger: 'bg-red-50 text-status-annule border border-red-200 hover:bg-red-100',\n  };",
  "const variants: Record<Variant, string> = {\n    primary: 'bg-primary text-white hover:bg-primary-dark',\n    secondary: 'bg-primary-soft text-primary hover:bg-primary/20',\n    ghost: 'bg-transparent text-ink hover:bg-paper',\n    danger: 'bg-red-50 text-status-annule border border-red-200 hover:bg-red-100',\n  };"
);

fs.writeFileSync('src/components/ui/Button.tsx', content);
console.log('Button updated');
