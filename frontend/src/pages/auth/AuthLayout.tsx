import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../../components/ui/Button';
import { Input, Field } from '../../components/ui/Input';

type Role = 'PROFESSIONNEL' | 'RECEPTIONNISTE';
type Mode = 'login' | 'register';

const ROUTES = {
  login: '/connexion',
  register: '/inscription',
};

// Durée totale de l'animation de bascule (doit correspondre aux transitions CSS ci-dessous)
const TOGGLE_ANIMATION_MS = 1900;

/**
 * Shell partagé par les pages Login et Register : garde le design
 * "panneau coulissant" (couleurs et mouvement d'origine), affiche les
 * deux formulaires dans le même conteneur, et bascule vers l'autre
 * route une fois l'animation jouée — pour que Login.tsx et Register.tsx
 * restent deux fichiers/routes distincts sans rien changer ailleurs.
 */
export default function AuthLayout({ initialMode }: { initialMode: Mode }) {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [isActive, setIsActive] = useState(initialMode === 'register');

  function goTo(mode: Mode) {
    setIsActive(mode === 'register');
    window.setTimeout(() => navigate(ROUTES[mode]), TOGGLE_ANIMATION_MS);
  }

  // ---- Login state ----
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const { accessToken, user } = await authApi.login(loginEmail, loginPassword);
      setSession(accessToken, user);
      if (user.role === 'ADMIN') navigate('/admin');
      else if (user.role === 'PROFESSIONNEL') navigate('/professionnel');
      else navigate('/receptionniste');
    } catch (err: any) {
      setLoginError(err?.response?.data?.error || 'Identifiants invalides.');
    } finally {
      setLoginLoading(false);
    }
  }

  // ---- Register state ----
  const [role, setRole] = useState<Role | null>(null);
  const [nom, setNom] = useState('');
  const [specialite, setSpecialite] = useState('');
  const [telephone, setTelephone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegisterError('');
    if (!role) { setRegisterError('Merci de choisir un rôle.'); return; }
    if (!nom || !registerEmail || !registerPassword) { setRegisterError('Merci de renseigner les champs obligatoires.'); return; }
    if (registerPassword.length < 8) { setRegisterError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (registerPassword !== confirmPassword) { setRegisterError('Les mots de passe ne correspondent pas.'); return; }

    setRegisterLoading(true);
    try {
      await authApi.register({
        email: registerEmail,
        password: registerPassword,
        role,
        nom,
        specialite: role === 'PROFESSIONNEL' ? (specialite || undefined) : undefined,
        telephone: telephone || undefined,
      });
      setDone(true);
    } catch (err: any) {
      setRegisterError(err?.response?.data?.error || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setRegisterLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6 py-10">
      <style>{`
        .auth-container { transition: height 0.3s ease; }
        .auth-form-box {
          transition: right 0.6s ease-in-out 1.2s, visibility 0s 1s;
        }
        .auth-container.active .auth-form-box { right: 50%; }
        .auth-form-box.register { visibility: hidden; }
        .auth-container.active .auth-form-box.register { visibility: visible; }

        .auth-toggle-shape {
          position: absolute;
          left: -250%;
          width: 300%;
          height: 100%;
          border-radius: 150px;
          z-index: 2;
          transition: 1.8s ease-in-out;
        }
        .auth-container.active .auth-toggle-shape { left: 50%; }

        .auth-toggle-panel { transition: 0.6s ease-in-out; }
        .auth-toggle-panel.toggle-left { left: 0; transition-delay: 1.2s; }
        .auth-container.active .auth-toggle-panel.toggle-left { left: -50%; transition-delay: 0.6s; }
        .auth-toggle-panel.toggle-right { right: -50%; transition-delay: 0.6s; }
        .auth-container.active .auth-toggle-panel.toggle-right { right: 0; transition-delay: 1.2s; }

        @media screen and (max-width: 750px) {
          .auth-container { height: auto !important; }
          .auth-form-box {
            position: relative !important;
            width: 100% !important;
            right: 0 !important;
            visibility: visible !important;
          }
          .auth-container.active .auth-form-box.login { display: none; }
          .auth-form-box.register { display: none; }
          .auth-container.active .auth-form-box.register { display: flex; }
          .auth-toggle-box { display: none; }
        }
      `}</style>

      <div
        className={`auth-container relative w-full max-w-[900px] min-h-[620px] bg-white border border-line rounded-xl2 shadow-xl overflow-hidden ${
          isActive ? 'active' : ''
        }`}
      >
        {/* ---------- LOGIN ---------- */}
        <div className="auth-form-box login absolute right-0 w-1/2 h-full bg-white flex items-center z-[1] p-8 overflow-y-auto">
          <div className="w-full">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-primary transition mb-5"
            >
              ← Retour à l'accueil
            </Link>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white font-extrabold flex items-center justify-center ring-4 ring-primary-tint/60">R</div>
              <div className="font-extrabold text-lg">RendezVousApp</div>
            </div>
            <h1 className="text-xl font-extrabold mb-1">Connexion</h1>
            <p className="text-sm text-ink-soft mb-6">Accédez à votre espace Admin, Professionnel ou Réceptionniste.</p>
            <form onSubmit={submitLogin} className="space-y-3">
              <input
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                type="email"
                placeholder="Adresse e-mail"
                required
                className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-paper focus:outline-none focus:border-primary-light focus:ring-4 focus:ring-primary-tint transition"
              />
              <input
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                type="password"
                placeholder="Mot de passe"
                required
                className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-paper focus:outline-none focus:border-primary-light focus:ring-4 focus:ring-primary-tint transition"
              />
              {loginError && <div className="text-status-annule text-xs font-semibold">{loginError}</div>}
              <button
                disabled={loginLoading}
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-bold text-sm disabled:opacity-50 hover:from-primary-dark hover:to-primary transition"
              >
                {loginLoading ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
            <div className="text-center text-xs text-ink-soft mt-6 md:hidden">
              Vous êtes un professionnel ?{' '}
              <button type="button" onClick={() => goTo('register')} className="font-bold text-primary hover:underline">
                Créer votre espace
              </button>
            </div>
          </div>
        </div>

        {/* ---------- REGISTER ---------- */}
        <div className="auth-form-box register absolute right-0 w-1/2 h-full bg-white flex items-center z-[1] p-8 overflow-y-auto">
          <div className="w-full">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-primary transition mb-5"
            >
              ← Retour à l'accueil
            </Link>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white font-extrabold flex items-center justify-center ring-4 ring-primary-tint/60">R</div>
              <div className="font-extrabold text-lg">RendezVousApp</div>
            </div>

            {done ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-primary-tint text-primary flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
                <h1 className="text-lg font-extrabold mb-2">Compte créé</h1>
                <p className="text-sm text-ink-soft mb-1">Un e-mail de vérification vous a été envoyé.</p>
                <p className="text-sm text-ink-soft mb-6">
                  Votre compte doit ensuite être <b>validé par l'administrateur</b> avant de
                  pouvoir vous connecter — vous recevrez une notification dès que ce sera fait.
                </p>
                <Link to="/verification-email" state={{ email: registerEmail }}>
                  <Button className="w-full justify-center">Vérifier mon e-mail</Button>
                </Link>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-extrabold mb-1">Créer un compte</h1>
                <p className="text-sm text-ink-soft mb-6">
                  Votre compte sera examiné par l'administrateur avant activation.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  {(['PROFESSIONNEL', 'RECEPTIONNISTE'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`text-left px-4 py-3 rounded-xl border-2 transition ${
                        role === r ? 'border-primary bg-primary-tint' : 'border-line bg-white hover:border-primary/40'
                      }`}
                    >
                      <div className="font-bold text-sm">{r === 'PROFESSIONNEL' ? 'Professionnel' : 'Réceptionniste'}</div>
                      <div className="text-[11px] text-ink-soft mt-0.5">
                        {r === 'PROFESSIONNEL' ? 'Je gère mon propre espace' : "Je gère l'agenda d'un professionnel"}
                      </div>
                    </button>
                  ))}
                </div>

                {role && (
                  <form onSubmit={submitRegister} className="space-y-3">
                    <Field label="Nom complet *">
                      <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={role === 'PROFESSIONNEL' ? 'Dr. Ahmed Benali' : 'Imane B.'} />
                    </Field>
                    {role === 'PROFESSIONNEL' && (
                      <Field label="Spécialité / activité">
                        <Input value={specialite} onChange={(e) => setSpecialite(e.target.value)} placeholder="Médecin généraliste" />
                      </Field>
                    )}
                    <Field label="Téléphone">
                      <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="0555 10 20 30" />
                    </Field>
                    <Field label="Adresse e-mail *">
                      <Input type="email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} placeholder="vous@exemple.com" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Mot de passe *">
                        <Input type="password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} />
                      </Field>
                      <Field label="Confirmer *">
                        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                      </Field>
                    </div>

                    {registerError && <div className="text-status-annule text-xs font-semibold">{registerError}</div>}

                    <Button
                      type="submit"
                      disabled={registerLoading}
                      className="w-full justify-center mt-2 bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary"
                    >
                      {registerLoading ? 'Création…' : 'Créer mon compte'}
                    </Button>
                  </form>
                )}

                <div className="text-center text-xs text-ink-soft mt-6 md:hidden">
                  Déjà un compte ?{' '}
                  <button type="button" onClick={() => goTo('login')} className="font-bold text-primary hover:underline">
                    Se connecter
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ---------- PANNEAU DE BASCULE (desktop) ---------- */}
        <div className="auth-toggle-box hidden md:block absolute w-full h-full">
          <div className="auth-toggle-shape bg-gradient-to-br from-primary via-primary-light to-primary-dark" />

          <div className="auth-toggle-panel toggle-left absolute w-1/2 h-full text-white flex flex-col justify-center items-center z-[2] px-8 text-center">
            <h1 className="text-3xl font-extrabold mb-2">Bienvenue !</h1>
            <p className="mb-5 text-sm text-white/90">Vous n'avez pas encore de compte ?</p>
            <button
              onClick={() => goTo('register')}
              className="w-44 h-[46px] bg-transparent border-2 border-white rounded-lg text-sm text-white font-bold"
            >
              Créer un compte
            </button>
          </div>

          <div className="auth-toggle-panel toggle-right absolute w-1/2 h-full text-white flex flex-col justify-center items-center z-[2] px-8 text-center">
            <h1 className="text-3xl font-extrabold mb-2">Content de vous revoir !</h1>
            <p className="mb-5 text-sm text-white/90">Vous avez déjà un compte ?</p>
            <button
              onClick={() => goTo('login')}
              className="w-44 h-[46px] bg-transparent border-2 border-white rounded-lg text-sm text-white font-bold"
            >
              Se connecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}