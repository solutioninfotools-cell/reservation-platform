import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

/**
 * Bouton générique réutilisable par toutes les interfaces (Admin, Professionnel,
 * Réceptionniste, Client). Modifier ce fichier met à jour le style des boutons
 * partout, sans toucher au code propre à chaque espace.
 */
export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base = 'inline-flex items-center gap-2 text-sm font-bold rounded-lg px-4 py-2.5 transition disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<Variant, string> = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    ghost: 'bg-white text-ink border border-line hover:bg-paper',
    danger: 'bg-red-50 text-status-annule border border-red-200 hover:bg-red-100',
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
