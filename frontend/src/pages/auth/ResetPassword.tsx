import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { Button } from '../../components/ui/Button';
import { Input, Field } from '../../components/ui/Input';

/**
 * Page indépendante — Définition du nouveau mot de passe à partir du code reçu
 * par e-mail (section 22 du CDC).
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState((location.state as any)?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirmation) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(email, code, password);
      setSuccess(true);
      setTimeout(() => navigate('/connexion'), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Code invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white border border-line rounded-xl2 shadow-xl p-8">
        <Link to="/connexion" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-primary transition mb-5">
          ← Retour à la connexion
        </Link>

        <h1 className="text-xl font-extrabold mb-1">Nouveau mot de passe</h1>
        <p className="text-sm text-ink-soft mb-6">
          Saisissez le code à 6 chiffres reçu par e-mail, puis choisissez votre nouveau mot de passe.
        </p>

        {success ? (
          <div role="status" className="text-status-termine text-sm font-bold text-center py-4">
            Mot de passe réinitialisé ✓ Redirection vers la connexion…
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3" noValidate>
            <Field label="Adresse e-mail">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </Field>
            <Field label="Code de réinitialisation">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                inputMode="numeric"
                placeholder="123456"
                required
              />
            </Field>
            <Field label="Nouveau mot de passe (8 caractères minimum)">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </Field>
            <Field label="Confirmer le mot de passe">
              <Input
                type="password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="new-password"
                required
              />
            </Field>

            {error && (
              <div role="alert" className="text-status-annule text-xs font-semibold">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full justify-center mt-2">
              {loading ? 'Réinitialisation…' : 'Réinitialiser mon mot de passe'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
