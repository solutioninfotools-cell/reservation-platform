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

const STEPS = [
  { n: 1, label: 'Supervision', hint: 'Qui supervise la plateforme' },
  { n: 2, label: "Domaine d'activité", hint: 'Le secteur configuré' },
  { n: 3, label: 'Votre compte', hint: 'Le premier accès superviseur' },
];

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
      <div className="w-full max-w-4xl bg-white border border-line rounded-xl2 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-[280px_1fr]">

        {/* ---------- PANNEAU LATÉRAL (desktop) ---------- */}
        <div className="hidden md:flex flex-col bg-gradient-to-br from-primary via-primary-light to-primary-dark text-white p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-lg bg-white/15 ring-1 ring-white/30 text-white font-extrabold flex items-center justify-center backdrop-blur-sm">R</div>
            <div className="font-extrabold text-lg">RendezVousApp</div>
          </div>

          <div className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-1">Configuration initiale</div>
          <p className="text-sm text-white/85 mb-8">Trois étapes pour préparer votre espace.</p>

          <div className="flex flex-col gap-1">
            {STEPS.map((s, i) => {
              const isDone = step > s.n;
              const isCurrent = step === s.n;
              return (
                <div key={s.n} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
                        isDone
                          ? 'bg-white text-primary-dark'
                          : isCurrent
                          ? 'bg-white/20 ring-2 ring-white text-white'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {isDone ? '✓' : s.n}
                    </div>
                    {i < STEPS.length - 1 && <div className={`w-px flex-1 my-1 ${isDone ? 'bg-white/70' : 'bg-white/20'}`} />}
                  </div>
                  <div className="pb-7">
                    <div className={`text-sm font-bold ${isCurrent ? 'text-white' : isDone ? 'text-white/90' : 'text-white/60'}`}>{s.label}</div>
                    <div className={`text-xs ${isCurrent ? 'text-white/80' : 'text-white/50'}`}>{s.hint}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------- CONTENU ---------- */}
        <div className="p-8">
          {/* En-tête + progression (mobile uniquement) */}
          <div className="md:hidden mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white font-extrabold flex items-center justify-center ring-4 ring-primary-tint/60">R</div>
              <div className="font-extrabold text-lg">RendezVousApp</div>
            </div>
            <div className="flex items-center gap-2 mb-1">
              {STEPS.map((s) => (
                <div key={s.n} className={`flex-1 h-1.5 rounded-full ${s.n <= step ? 'bg-gradient-to-r from-primary to-primary-light' : 'bg-line'}`} />
              ))}
            </div>
            <div className="text-xs font-semibold text-primary-dark">{STEPS[step - 1].label}</div>
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
                    className={`text-left px-5 py-4 rounded-xl border-2 transition ${
                      mode === m ? 'border-primary bg-primary-tint ring-4 ring-primary-tint/60' : 'border-line bg-white hover:border-primary-light'
                    }`}
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
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-bold text-sm disabled:opacity-40 hover:from-primary-dark hover:to-primary transition"
              >
                Continuer
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-xl font-extrabold mb-1">Domaine d'activité</h1>
              <p className="text-sm text-ink-soft mb-6">Cet espace sera configuré pour ce domaine uniquement.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-8">
                {DOMAINES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDomaine(d)}
                    className={`text-left px-4 py-3 rounded-xl border-2 text-sm font-semibold transition ${
                      domaine === d ? 'border-primary bg-primary-tint text-primary-dark ring-4 ring-primary-tint/60' : 'border-line bg-white hover:border-primary-light'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-line font-bold text-sm hover:bg-paper transition">Retour</button>
                <button
                  disabled={!domaine}
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-bold text-sm disabled:opacity-40 hover:from-primary-dark hover:to-primary transition"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="text-xl font-extrabold mb-1">Votre compte</h1>
              <p className="text-sm text-ink-soft mb-6">Créez le premier compte {mode === 'ADMIN' ? 'Administrateur' : 'Professionnel superviseur'}.</p>
              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Nom complet</label>
                  <input
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Dr. Ahmed Benali"
                    className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-paper focus:outline-none focus:border-primary-light focus:ring-4 focus:ring-primary-tint transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Adresse e-mail</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="vous@exemple.com"
                    className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-paper focus:outline-none focus:border-primary-light focus:ring-4 focus:ring-primary-tint transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">Mot de passe</label>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="8 caractères minimum"
                    className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-paper focus:outline-none focus:border-primary-light focus:ring-4 focus:ring-primary-tint transition"
                  />
                </div>
              </div>
              {error && <div className="text-status-annule text-xs font-semibold mb-4">{error}</div>}
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl border border-line font-bold text-sm hover:bg-paper transition">Retour</button>
                <button
                  disabled={loading}
                  onClick={submit}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-bold text-sm disabled:opacity-50 hover:from-primary-dark hover:to-primary transition"
                >
                  {loading ? 'Création…' : 'Terminer la configuration'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}