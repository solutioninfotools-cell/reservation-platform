import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { Button } from '../../components/ui/Button';
import { Input, Field } from '../../components/ui/Input';

/**
 * Page indépendante — Mot de passe oublié (section 22 du CDC).
 * Disponible pour tous les rôles depuis la page d'accès standard.
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Impossible d'envoyer le code pour le moment.");
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

        <h1 className="text-xl font-extrabold mb-1">Mot de passe oublié</h1>
        <p className="text-sm text-ink-soft mb-6">
          Saisissez votre adresse e-mail : un code de réinitialisation valable 30 minutes vous sera envoyé.
        </p>

        {sent ? (
          <div className="space-y-4">
            <div
              role="status"
              className="text-sm text-ink bg-primary-tint border border-line rounded-lg p-3"
            >
              Si un compte existe pour cette adresse, un code vient d'être envoyé.
            </div>
            <Button
              className="w-full justify-center"
              onClick={() => navigate('/reinitialiser-mot-de-passe', { state: { email } })}
            >
              J'ai reçu mon code
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3" noValidate>
            <Field label="Adresse e-mail">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                autoComplete="email"
                required
              />
            </Field>
            {error && (
              <div role="alert" className="text-status-annule text-xs font-semibold">
                {error}
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full justify-center mt-2">
              {loading ? 'Envoi…' : 'Envoyer le code'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
