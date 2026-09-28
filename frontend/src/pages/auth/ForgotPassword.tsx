import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { Button } from '../../components/ui/Button';
import { Input, Field } from '../../components/ui/Input';

/** Page indépendante — Mot de passe oublié : demande du code puis réinitialisation. */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [etape, setEtape] = useState<'demande' | 'reinitialisation'>('demande');

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeVerificationDev, setCodeVerificationDev] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submitDemande(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Le format de l'adresse e-mail est invalide."); return; }

    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      setCodeVerificationDev(res?.codeVerificationDev || '');
      if (res?.codeVerificationDev) setCode(res.codeVerificationDev);
      setEtape('reinitialisation');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  async function submitReinitialisation(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (nouveauMotDePasse.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (nouveauMotDePasse !== confirmation) { setError('Les mots de passe ne correspondent pas.'); return; }

    setLoading(true);
    try {
      await authApi.resetPassword(email, code, nouveauMotDePasse);
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
        <h1 className="text-xl font-extrabold mb-1">Mot de passe oublié</h1>

        {success ? (
          <div className="text-status-termine text-sm font-bold text-center py-4">
            Mot de passe réinitialisé ✓ Redirection vers la connexion…
          </div>
        ) : etape === 'demande' ? (
          <>
            <p className="text-sm text-ink-soft mb-6">
              Saisissez l'adresse e-mail de votre compte : un code de réinitialisation vous sera envoyé.
            </p>
            <form onSubmit={submitDemande} className="space-y-3">
              <Field label="Adresse e-mail">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" required />
              </Field>
              {error && <div className="text-status-annule text-xs font-semibold">{error}</div>}
              <Button type="submit" disabled={loading} className="w-full justify-center mt-2">
                {loading ? 'Envoi…' : 'Recevoir le code'}
              </Button>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-soft mb-2">Saisissez le code reçu et votre nouveau mot de passe.</p>
            {codeVerificationDev && (
              <p className="text-xs text-ink-soft mb-4 bg-primary-tint rounded-lg py-2 px-3">
                Mode démo (aucun fournisseur d'e-mail branché) — le code a été pré-rempli automatiquement.
              </p>
            )}
            <form onSubmit={submitReinitialisation} className="space-y-3">
              <Field label="Code de vérification">
                <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} placeholder="123456" required />
              </Field>
              <Field label="Nouveau mot de passe">
                <Input type="password" value={nouveauMotDePasse} onChange={(e) => setNouveauMotDePasse(e.target.value)} required />
              </Field>
              <Field label="Confirmer le mot de passe">
                <Input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required />
              </Field>
              {error && <div className="text-status-annule text-xs font-semibold">{error}</div>}
              <Button type="submit" disabled={loading} className="w-full justify-center mt-2">
                {loading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
              </Button>
            </form>
          </>
        )}

        {!success && (
          <div className="text-center text-xs text-ink-soft mt-6">
            <Link to="/connexion" className="font-bold text-primary hover:underline">
              Retour à la connexion
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}