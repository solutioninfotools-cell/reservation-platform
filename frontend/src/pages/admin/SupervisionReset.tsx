import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { configApi } from '../../api/config.api';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../../components/ui/Button';
import { Input, Field } from '../../components/ui/Input';

type Pro = { userId: string; nom: string; specialite?: string | null; email: string };
type Etat = {
  mode: 'ADMIN' | 'PRESTATAIRE';
  domaine: string | null;
  adminExistant: { email: string } | null;
  superviseur: { userId: string; nom: string; email: string } | null;
  professionnels: Pro[];
};

const PHRASE = 'REINITIALISER';

const messageErreur = (e: any) => {
  const m = e?.response?.data?.message ?? e?.response?.data?.error ?? e?.message ?? 'Une erreur est survenue.';
  return Array.isArray(m) ? m.join(', ') : String(m);
};

/**
 * Réinitialisation du mode de supervision (CDC section 7) :
 *  - Admin indépendant  →  professionnel superviseur (mode Prestataire)
 *  - professionnel superviseur  →  Admin indépendant (création d'un compte Admin)
 *  - réinitialisation totale (retour à la configuration initiale) — action stricte.
 * Les deux premiers changements ne suppriment aucune donnée.
 */
export default function SupervisionReset() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [etat, setEtat] = useState<Etat | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState('');

  // Passage en mode Prestataire
  const [proChoisi, setProChoisi] = useState('');
  const [pwdPrestataire, setPwdPrestataire] = useState('');

  // Retour en mode Admin
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [pwdAdmin, setPwdAdmin] = useState('');
  const [pwdAdminConf, setPwdAdminConf] = useState('');
  const [pwdActuel, setPwdActuel] = useState('');

  // Réinitialisation totale
  const [etapeReset, setEtapeReset] = useState<0 | 1 | 2>(0);
  const [compris, setCompris] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [pwdReset, setPwdReset] = useState('');

  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [succes, setSucces] = useState<{ message: string; action: 'connexion' | 'pro' | 'configuration' | 'rester' } | null>(null);

  async function charger() {
    setChargement(true);
    try {
      setEtat(await configApi.getSupervision());
    } catch (e) {
      setErreurChargement(messageErreur(e));
    } finally {
      setChargement(false);
    }
  }
  useEffect(() => { charger(); }, []);

  async function lancer(action: () => Promise<any>, apres: (res: any) => { message: string; action: 'connexion' | 'pro' | 'configuration' | 'rester' }) {
    setErreur('');
    setEnCours(true);
    try {
      const res = await action();
      setSucces(apres(res));
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnCours(false);
    }
  }

  function validerPrestataire(e: React.FormEvent) {
    e.preventDefault();
    if (!proChoisi) { setErreur('Choisissez le professionnel qui deviendra superviseur.'); return; }
    if (!pwdPrestataire) { setErreur('Saisissez votre mot de passe pour confirmer.'); return; }
    const pro = etat?.professionnels.find((p) => p.userId === proChoisi);
    if (!window.confirm(`Confirmer : ${pro?.nom} deviendra le professionnel superviseur.\n\nVotre compte administrateur sera désactivé (aucune donnée supprimée).`)) return;
    lancer(
      () => configApi.versPrestataire({ professionnelUserId: proChoisi, password: pwdPrestataire }),
      (res) => ({ message: res.message, action: res.deconnexion ? 'connexion' : 'rester' }),
    );
  }

  function validerAdmin(e: React.FormEvent) {
    e.preventDefault();
    const existant = etat?.adminExistant ?? null;

    if (existant) {
      // Compte Admin existant : réactivé ; nouveau mot de passe facultatif.
      if (pwdAdmin || pwdAdminConf) {
        if (pwdAdmin.length < 8) { setErreur('Le nouveau mot de passe doit contenir au moins 8 caractères.'); return; }
        if (pwdAdmin !== pwdAdminConf) { setErreur('Les mots de passe ne correspondent pas.'); return; }
      }
    } else {
      if (nom.trim().length < 2) { setErreur('Saisissez le nom du futur administrateur.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErreur("Le format de l'adresse e-mail est invalide."); return; }
      if (pwdAdmin.length < 8) { setErreur('Le mot de passe du compte Admin doit contenir au moins 8 caractères.'); return; }
      if (pwdAdmin !== pwdAdminConf) { setErreur('Les mots de passe du compte Admin ne correspondent pas.'); return; }
    }
    if (!pwdActuel) { setErreur('Saisissez votre mot de passe actuel pour confirmer.'); return; }

    const question = existant
      ? `Confirmer : le compte administrateur ${existant.email} sera réactivé${pwdAdmin ? ' avec le nouveau mot de passe' : ''} et le bouton « Espace Administrateur » disparaîtra de votre compte professionnel.\n\nAucune donnée n'est supprimée.`
      : `Confirmer : un compte Admin (${email}) sera créé et le bouton « Espace Administrateur » disparaîtra de votre compte professionnel.\n\nAucune donnée n'est supprimée.`;
    if (!window.confirm(question)) return;

    lancer(
      () => configApi.versAdmin({
        ...(existant ? {} : { nom: nom.trim(), email: email.trim() }),
        motDePasseAdmin: pwdAdmin || undefined,
        password: pwdActuel,
      }),
      (res) => ({ message: res.message, action: 'pro' }),
    );
  }

  function validerReinitialisationTotale() {
    setErreur('');
    if (!compris) { setErreur('Cochez la case pour confirmer que vous avez compris.'); return; }
    if (phrase !== PHRASE) { setErreur(`Saisissez exactement « ${PHRASE} » (en majuscules).`); return; }
    if (!pwdReset) { setErreur('Saisissez votre mot de passe.'); return; }
    if (!window.confirm('DERNIÈRE CONFIRMATION\n\nToutes les données de la plateforme vont être définitivement supprimées, y compris votre propre compte.\n\nCette action est IRRÉVERSIBLE. Continuer ?')) return;
    lancer(
      () => configApi.reinitialisationTotale({ password: pwdReset, confirmation: phrase }),
      (res) => ({ message: res.message, action: 'configuration' }),
    );
  }

  function terminer() {
    if (!succes) return;
    if (succes.action === 'connexion') { logout(); navigate('/connexion'); }
    else if (succes.action === 'configuration') { logout(); navigate('/configuration'); }
    else if (succes.action === 'pro') navigate('/professionnel');
    else { setSucces(null); charger(); }
  }

  const retourParametres = () => navigate('/admin', { state: { page: 'params' } });
  const libelleTerminer = { connexion: 'Aller à la connexion', configuration: 'Lancer la configuration initiale', pro: "Retour à l'espace Professionnel", rester: 'Continuer' };

  if (succes) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-white border border-line rounded-xl2 shadow-xl p-8 text-center">
          <div className="text-status-termine text-3xl mb-2">✓</div>
          <p className="text-sm font-semibold mb-6">{succes.message}</p>
          <Button className="w-full justify-center" onClick={terminer}>{libelleTerminer[succes.action]}</Button>
        </div>
      </div>
    );
  }

  const carte = 'bg-white border border-line rounded-xl2 shadow-sm p-6 mb-5';

  return (
    <div className="min-h-screen bg-paper px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <button type="button" onClick={retourParametres} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-dark hover:text-primary transition">
          <span aria-hidden="true">←</span> Retour aux paramètres
        </button>
        <h1 className="text-2xl font-extrabold mb-1">Réinitialisation du mode de supervision</h1>
        <p className="text-sm text-ink-soft mb-6">Changez la personne qui supervise la plateforme, ou repartez d'une configuration vierge.</p>

        {chargement && <div className={carte}>Chargement…</div>}
        {erreurChargement && <div className={`${carte} text-status-annule text-sm font-semibold`}>{erreurChargement}</div>}

        {etat && (
          <>
            <div className={carte}>
              <div className="text-xs font-bold uppercase tracking-wide text-ink-soft mb-2">Mode de supervision actuel</div>
              {etat.mode === 'ADMIN' ? (
                <>
                  <div className="text-lg font-extrabold text-primary-dark">Administrateur indépendant</div>
                  <p className="text-sm text-ink-soft mt-1">Un compte Admin distinct supervise la plateforme{etat.domaine ? ` (domaine : ${etat.domaine})` : ''}.</p>
                </>
              ) : (
                <>
                  <div className="text-lg font-extrabold text-primary-dark">Professionnel superviseur (mode Prestataire)</div>
                  <p className="text-sm text-ink-soft mt-1">
                    Superviseur : <b>{etat.superviseur?.nom ?? '—'}</b>{etat.superviseur ? ` (${etat.superviseur.email})` : ''}.
                    Son compte bascule entre l'espace Professionnel et l'espace Administrateur{etat.domaine ? ` — domaine : ${etat.domaine}` : ''}.
                  </p>
                </>
              )}
            </div>

            {erreur && <div className="mb-5 text-status-annule text-sm font-semibold bg-red-50 border border-red-200 rounded-lg px-4 py-3">{erreur}</div>}

            {etat.mode === 'ADMIN' ? (
              <form onSubmit={validerPrestataire} className={carte}>
                <h2 className="text-base font-extrabold mb-1">Passer en mode Professionnel superviseur</h2>
                <p className="text-sm text-ink-soft mb-4">
                  Choisissez le professionnel qui supervisera la plateforme. Il disposera d'un bouton pour basculer entre son espace
                  Professionnel et l'espace Administrateur. <b>Aucune donnée n'est supprimée</b> ; les comptes Admin sont seulement désactivés (conservés).
                </p>
                <div className="space-y-3">
                  <Field label="Professionnel superviseur">
                    <select
                      value={proChoisi}
                      onChange={(e) => setProChoisi(e.target.value)}
                      className="w-full border-2 border-line rounded-lg px-3 py-2.5 text-sm bg-white"
                    >
                      <option value="">— Choisir un professionnel —</option>
                      {etat.professionnels.map((p) => (
                        <option key={p.userId} value={p.userId}>{p.nom}{p.specialite ? ` — ${p.specialite}` : ''} ({p.email})</option>
                      ))}
                    </select>
                  </Field>
                  {etat.professionnels.length === 0 && <p className="text-xs text-ink-soft">Aucun professionnel actif : validez d'abord un compte professionnel.</p>}
                  <Field label="Votre mot de passe (confirmation)">
                    <Input type="password" value={pwdPrestataire} onChange={(e) => setPwdPrestataire(e.target.value)} />
                  </Field>
                </div>
                <Button type="submit" disabled={enCours || etat.professionnels.length === 0} className="mt-4">Passer en mode Prestataire</Button>
              </form>
            ) : (
              <form onSubmit={validerAdmin} className={carte}>
                <h2 className="text-base font-extrabold mb-1">Revenir au mode Administrateur indépendant</h2>
                {etat.adminExistant ? (
                  <p className="text-sm text-ink-soft mb-4">
                    Le compte administrateur existant (<b>{etat.adminExistant.email}</b>) sera réactivé : il n'y a qu'un seul compte Admin.
                    Le bouton « Espace Administrateur » disparaîtra du compte professionnel{etat.superviseur ? ` de ${etat.superviseur.nom}` : ''},
                    qui garde tout le reste. <b>Aucune donnée n'est supprimée.</b>
                  </p>
                ) : (
                  <p className="text-sm text-ink-soft mb-4">
                    Aucun compte Admin n'existe encore : créez-le ici (une seule fois). Le bouton « Espace Administrateur » disparaîtra du compte
                    professionnel{etat.superviseur ? ` de ${etat.superviseur.nom}` : ''}. <b>Aucune donnée n'est supprimée.</b>
                  </p>
                )}
                <div className="space-y-3">
                  {!etat.adminExistant && (
                    <>
                      <Field label="Nom de l'administrateur"><Input value={nom} onChange={(e) => setNom(e.target.value)} /></Field>
                      <Field label="Adresse e-mail (jamais utilisée)"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
                    </>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={etat.adminExistant ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe du compte Admin'}>
                      <Input type="password" value={pwdAdmin} onChange={(e) => setPwdAdmin(e.target.value)} autoComplete="new-password" />
                    </Field>
                    <Field label="Confirmer le mot de passe">
                      <Input type="password" value={pwdAdminConf} onChange={(e) => setPwdAdminConf(e.target.value)} autoComplete="new-password" />
                    </Field>
                  </div>
                  {etat.adminExistant && <p className="text-xs text-ink-soft -mt-1">Laissez vide pour conserver le mot de passe actuel du compte Admin.</p>}
                  <Field label="Votre mot de passe actuel (confirmation)"><Input type="password" value={pwdActuel} onChange={(e) => setPwdActuel(e.target.value)} /></Field>
                </div>
                <Button type="submit" disabled={enCours} className="mt-4">
                  {etat.adminExistant ? 'Réactiver le compte Admin et basculer' : 'Créer le compte Admin et basculer'}
                </Button>
              </form>
            )}

            <div className="bg-red-50 border-2 border-red-300 rounded-xl2 p-6">
              <h2 className="text-base font-extrabold text-status-annule mb-1">Zone dangereuse — Réinitialisation totale</h2>
              <p className="text-sm text-ink-soft mb-4">
                Revient à l'état de la configuration initiale, comme si la plateforme était neuve. <b>Toutes les données sont supprimées définitivement.</b>
              </p>

              {etapeReset === 0 && (
                <Button variant="danger" onClick={() => { setErreur(''); setEtapeReset(1); }}>Réinitialiser toute la plateforme…</Button>
              )}

              {etapeReset === 1 && (
                <div>
                  <div className="text-sm font-bold text-status-annule mb-2">⚠ Attention — ceci va supprimer :</div>
                  <ul className="text-sm text-ink list-disc pl-5 space-y-1 mb-4">
                    <li>tous les comptes (professionnels, réceptionnistes, administrateurs — <b>le vôtre compris</b>)</li>
                    <li>tous les clients, rendez-vous, services et disponibilités</li>
                    <li>les domaines, les paramètres généraux, les notifications</li>
                    <li>le journal d'audit</li>
                  </ul>
                  <p className="text-sm text-ink-soft mb-4">
                    Cette action est <b>irréversible</b>. Avant de continuer, exportez vos données depuis les listes de l'espace Admin (Exporter → PDF / Excel).
                  </p>
                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => setEtapeReset(0)}>Annuler</Button>
                    <Button variant="danger" onClick={() => setEtapeReset(2)}>J'ai compris, continuer</Button>
                  </div>
                </div>
              )}

              {etapeReset === 2 && (
                <div className="space-y-3">
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={compris} onChange={(e) => setCompris(e.target.checked)} className="mt-1" />
                    <span>Je comprends que toutes les données seront <b>définitivement supprimées</b> et que je ne pourrai pas revenir en arrière.</span>
                  </label>
                  <Field label={`Pour confirmer, tapez ${PHRASE}`}>
                    <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder={PHRASE} autoComplete="off" />
                  </Field>
                  <Field label="Votre mot de passe">
                    <Input type="password" value={pwdReset} onChange={(e) => setPwdReset(e.target.value)} />
                  </Field>
                  <div className="flex gap-3 pt-1">
                    <Button variant="ghost" onClick={() => { setEtapeReset(0); setCompris(false); setPhrase(''); setPwdReset(''); }}>Annuler</Button>
                    <Button
                      variant="danger"
                      disabled={enCours || !compris || phrase !== PHRASE || !pwdReset}
                      onClick={validerReinitialisationTotale}
                    >
                      Supprimer définitivement et réinitialiser
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <p className="text-xs text-ink-soft mt-6">Connecté en tant que {user?.email}.</p>
      </div>
    </div>
  );
}