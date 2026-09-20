import AuthLayout from './AuthLayout';

/** Page indépendante — Connexion (Admin / Professionnel / Réceptionniste). */
export default function Login() {
  return <AuthLayout initialMode="login" />;
}