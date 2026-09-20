import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { Button } from '../../components/ui/Button';
import { Input, Field } from '../../components/ui/Input';

/** Page indépendante — Vérification du code e-mail après inscription. */
export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState((location.state as any)?.email || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.verifyEmail(email, code);
      setSuccess(true);
      setTimeout(() => navigate('/connexion'), 2000);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Code invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white border border-line rounded-xl2 shadow-xl p-8">
        <h1 className="text-xl font-extrabold mb-1">Vérifiez votre e-mail</h1>
        <p className="text-sm text-ink-soft mb-6">Saisissez le code à 6 chiffres envoyé à votre adresse e-mail.</p>

        {success ? (
          <div className="text-status-termine text-sm font-bold text-center py-4">E-mail vérifié ✓ Redirection vers la connexion…</div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Field label="Adresse e-mail"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
            <Field label="Code de vérification"><Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} placeholder="123456" required /></Field>
            {error && <div className="text-status-annule text-xs font-semibold">{error}</div>}
            <Button type="submit" disabled={loading} className="w-full justify-center mt-2">{loading ? 'Vérification…' : 'Vérifier'}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
