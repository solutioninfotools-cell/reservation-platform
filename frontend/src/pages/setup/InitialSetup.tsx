import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { configApi } from '../../api/config.api';

/**
 * Page indépendante — Configuration initiale de la plateforme (section 6 du CDC).
 * Étape 1 : mode de supervision (Admin / Prestataire).
 * Étape 2 : domaine d'activité.
 * Étape 3 : création du premier compte superviseur.
 */
const DOMAINES = ['Médical', 'Juridique', 'Coiffure/Beauté', 'Prestataire de service général', 'Centre de formation', 'Salle de sport/Coach'];

export default function InitialSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<'ADMIN' | 'PRESTATAIRE' | null>(null);
  const [domaine, setDomaine] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');
    if (!mode || !domaine || !nom || !email || !password) {
      setError('Merci de renseigner tous les champs.');
      return;
    }
    setLoading(true);
    try {
      await configApi.initialSetup({ modeSupervision: mode, domaine, nom, email, password });
      navigate('/connexion');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg bg-white border border-line rounded-xl2 shadow-xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white font-extrabold flex items-center justify-center">R</div>
          <div className="font-extrabold text-lg">RendezVousApp</div>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-primary' : 'bg-line'}`} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h1 className="text-xl font-extrabold mb-1">Mode de supervision</h1>
            <p className="text-sm text-ink-soft mb-6">Comment souhaitez-vous superviser cette plateforme ?</p>
            <div className="grid grid-cols-1 gap-3 mb-8">
              {(['ADMIN', 'PRESTATAIRE'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`text-left px-5 py-4 rounded-xl border-2 transition ${mode === m ? 'border-primary bg-primary-tint' : 'border-line bg-white hover:border-primary/40'}`}
                >
                  <div className="font-bold text-sm mb-1">{m === 'ADMIN' ? 'Administrateur général' : 'Prestataire superviseur'}</div>
                  <div className="text-xs text-ink-soft">
                    {m === 'ADMIN'
                      ? 'Un compte Admin dédié supervise tous les professionnels et réceptionnistes.'
                      : "Un professionnel de la plateforme assure lui-même la supervision générale."}
                  </div>
                </button>
              ))}
            </div>
            <button
              disabled={!mode}
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-40 hover:bg-primary-dark transition"
            >
              Continuer
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-xl font-extrabold mb-1">Domaine d'activité</h1>
            <p className="text-sm text-ink-soft mb-6">Cet espace sera configuré pour ce domaine uniquement.</p>
            <div className="grid grid-cols-1 gap-2 mb-8">
              {DOMAINES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDomaine(d)}
                  className={`text-left px-4 py-3 rounded-xl border-2 text-sm font-semibold transition ${domaine === d ? 'border-primary bg-primary-tint text-primary' : 'border-line bg-white hover:border-primary/40'}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-line font-bold text-sm hover:bg-paper transition">Retour</button>
              <button disabled={!domaine} onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-40 hover:bg-primary-dark transition">Continuer</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-xl font-extrabold mb-1">Votre compte</h1>
            <p className="text-sm text-ink-soft mb-6">Créez le premier compte {mode === 'ADMIN' ? 'Administrateur' : 'Professionnel superviseur'}.</p>
            <div className="space-y-3 mb-6">
              <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom complet" className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-paper focus:outline-none focus:border-primary" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Adresse e-mail" className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-paper focus:outline-none focus:border-primary" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Mot de passe" className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-paper focus:outline-none focus:border-primary" />
            </div>
            {error && <div className="text-status-annule text-xs font-semibold mb-4">{error}</div>}
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl border border-line font-bold text-sm hover:bg-paper transition">Retour</button>
              <button disabled={loading} onClick={submit} className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-50 hover:bg-primary-dark transition">
                {loading ? 'Création…' : 'Terminer la configuration'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
