// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicApi } from '../api/public.api';
import { AssistantWidget } from '../components/ui/AssistantWidget';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ProfessionnelPublic {
  id: string;
  nom: string;
  specialite?: string | null;
  description?: string | null;
  adresse?: string | null;
  telephone?: string | null;
  photoUrl?: string | null;
}
interface EspaceData {
  platformName: string;
  slogan?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  conditionsReservation?: string | null;
  localisationUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  joursOuvrables: string[];
  horairesGeneraux?: string | null;
  professionnels: ProfessionnelPublic[];
}
type StatutService = 'DISPONIBLE' | 'COMPLET' | 'INDISPONIBLE';
type TypeChamp = 'TEXTE' | 'TEXTE_LONG' | 'NOMBRE' | 'DATE' | 'SELECTION' | 'RADIO' | 'CHECKBOX' | 'SWITCH' | 'FICHIER';
interface ChampPersonnalise {
  id: string;
  label: string;
  type: TypeChamp;
  options: string[];
  obligatoire: boolean;
  ordre: number;
}
interface ServicePublic {
  id: string;
  professionnelId: string;
  nom: string;
  description?: string | null;
  dureeMinutes: number;
  prix?: number | null;
  actif: boolean;
  imageUrl?: string | null;
  statut: StatutService;
  champsPersonnalises: ChampPersonnalise[];
}
interface ServiceGroup {
  nom: string;
  description?: string | null;
  dureeMinutes: number;
  prix?: number | null;
  imageUrl?: string | null;
  statut: StatutService;
  parPro: { proId: string; serviceId: string }[];
}

// ---------------------------------------------------------------------------
// Avatars par défaut + détection de genre
// ---------------------------------------------------------------------------
const FALLBACK_SERVICE_IMAGE = 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?fm=jpg&q=80&w=800&auto=format&fit=crop';
const FEMALE_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?fm=jpg&q=80&w=600&auto=format&fit=crop';
const MALE_AVATAR   = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?fm=jpg&q=80&w=600&auto=format&fit=crop';

function formatPrix(centimes?: number | null) {
  if (centimes === null || centimes === undefined) return 'Tarif sur demande';
  return (centimes / 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' DA';
}
const STATUT_INFO: Record<StatutService, { label: string; type: string }> = {
  DISPONIBLE: { label: 'Disponible', type: 'disponible' },
  COMPLET: { label: 'Complet', type: 'complet' },
  INDISPONIBLE: { label: 'Indisponible', type: 'indisponible' },
};
function getProFirstName(name: string) {
  return (name || '').replace(/^Dr\.?\s*/i, '').split(' ')[0];
}

const FEMALE_FIRST_NAMES = new Set([
  'amel', 'nawel', 'manel', 'meriem', 'meryem', 'souad', 'zineb', 'samira',
  'karima', 'fatima', 'aicha', 'khadija', 'yasmine', 'leila', 'nadia', 'amina',
  'sarah', 'linda', 'wassila', 'hayet', 'malika', 'naima', 'rachida', 'farida',
  'warda', 'hana', 'sana', 'rana', 'dounia', 'ines', 'innes', 'lina', 'nour',
  'salma', 'rania', 'sonia', 'mounia', 'sabrina', 'djamila', 'houria', 'ghania',
  'keltoum', 'loubna', 'salima', 'assia', 'hanane', 'ilham', 'imane', 'iman',
  'khadidja', 'lila', 'lilia', 'mouna', 'nabila', 'nassima', 'ouarda', 'rassia',
  'sadia', 'siham', 'souhila', 'wahiba', 'yamina', 'zohra', 'zoulikha',
]);
function isLikelyFemale(name: string): boolean {
  const first = (getProFirstName(name) || '').toLowerCase().trim();
  if (!first) return false;
  if (FEMALE_FIRST_NAMES.has(first)) return true;
  return /(a|ah|ia|ya|ine|iya|ette|elle|yne)$/.test(first);
}
function getProPhoto(pro: { nom: string; photoUrl?: string | null }): string {
  if (pro?.photoUrl) return pro.photoUrl;
  return isLikelyFemale(pro?.nom || '') ? FEMALE_AVATAR : MALE_AVATAR;
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function toDateKey(d: Date) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; }
function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
const DAY_NAMES_LONG = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const MONTHS_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
function fmtDateFull(date: Date) { return `${DAY_NAMES_LONG[date.getDay()]} ${date.getDate()} ${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`; }
function fmtMonthYear(date: Date) { return `${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`; }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }

// ---------------------------------------------------------------------------
// Validation du formulaire de réservation — chaque règle reflète une
// contrainte métier réelle (pas juste "non vide") pour éviter les
// rendez-vous avec des coordonnées inexploitables.
// ---------------------------------------------------------------------------
function isValidNomPrenom(v: string) {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,50}$/.test((v || '').trim());
}
function isValidAdresse(v: string) {
  return (v || '').trim().length >= 5;
}
function isValidTelephone(v: string) {
  return /^\d{10}$/.test((v || '').replace(/\s+/g, ''));
}
function isValidEmailFormat(v: string) {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test((v || '').trim());
}
function isValidDateNaissance(v: string) {
  if (!v) return false;
  const d = new Date(v + 'T00:00:00');
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  if (d > today) return false; // pas de date de naissance dans le futur
  const ageAnnees = (today.getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  return ageAnnees >= 18 && ageAnnees <= 120; // âge obligatoirement entre 18 et 120 ans
}
const FIELD_ERROR_MESSAGES: Record<string, string> = {
  nom: 'Le nom doit contenir entre 2 et 50 lettres (sans chiffres ni symboles).',
  prenom: 'Le prénom doit contenir entre 2 et 50 lettres (sans chiffres ni symboles).',
  adresse: "L'adresse doit contenir au moins 5 caractères.",
  dateNaissance: "Merci de saisir une date de naissance valide (l'âge doit être compris entre 18 et 120 ans).",
  telephone: 'Le numéro de téléphone doit contenir exactement 10 chiffres.',
  email: 'Merci de saisir une adresse e-mail valide (ex. nom@exemple.com).',
};

type BookingStep = 1 | 2 | 3 | 4 | 5;
type BookingMode = 'new' | 'change';
interface PatientForm {
  nom: string; prenom: string; adresse: string; dateNaissance: string; telephone: string; email: string; note: string;
}
const EMPTY_PATIENT: PatientForm = { nom: '', prenom: '', adresse: '', dateNaissance: '', telephone: '', email: '', note: '' };

const RDV_STATUT_INFO: Record<string, { label: string; cls: string; icon: string }> = {
  RESERVE: { label: 'Confirmé', cls: 'rdv-statut-confirme', icon: 'check' },
  ANNULE: { label: 'Annulé', cls: 'rdv-statut-annule', icon: 'x' },
  HONORE: { label: 'Honoré', cls: 'rdv-statut-honore', icon: 'check' },
  ABSENT: { label: 'Absent', cls: 'rdv-statut-absent', icon: 'x' },
};

export default function CrenoPagePublique() {
  const navigate = useNavigate();

  const [espace, setEspace] = useState<EspaceData | null>(null);
  const [servicesByPro, setServicesByPro] = useState<Record<string, ServicePublic[]>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await publicApi.getEspace();
        if (cancelled) return;
        setEspace(data);
        const entries = await Promise.all(
          data.professionnels.map(async (p: ProfessionnelPublic) => [p.id, await publicApi.getServices(p.id)] as const),
        );
        if (cancelled) return;
        const map: Record<string, ServicePublic[]> = {};
        entries.forEach(([id, list]) => { map[id] = list; });
        setServicesByPro(map);
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.response?.data?.message || "Impossible de charger les informations du cabinet pour le moment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const serviceGroups: ServiceGroup[] = useMemo(() => {
    const groups = new Map<string, ServiceGroup>();
    Object.values(servicesByPro).flat().forEach((s) => {
      if (!s.actif) return;
      const existing = groups.get(s.nom);
      if (existing) { existing.parPro.push({ proId: s.professionnelId, serviceId: s.id }); return; }
      groups.set(s.nom, { nom: s.nom, description: s.description, dureeMinutes: s.dureeMinutes, prix: s.prix, imageUrl: s.imageUrl, statut: s.statut, parPro: [{ proId: s.professionnelId, serviceId: s.id }] });
    });
    return Array.from(groups.values());
  }, [servicesByPro]);

  const proById = useMemo(() => {
    const m = new Map<string, ProfessionnelPublic>();
    (espace?.professionnels || []).forEach((p) => m.set(p.id, p));
    return m;
  }, [espace]);

  const [showAllPros, setShowAllPros] = useState(false);
  const [openProId, setOpenProId] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [termsFromBooking, setTermsFromBooking] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showLookup, setShowLookup] = useState(false);
  const [pzToastShow, setPzToastShow] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
    const pulse = () => { setPzToastShow(true); setTimeout(() => setPzToastShow(false), 2200); };
    const firstTimeout = setTimeout(pulse, 1200);
    const interval = setInterval(pulse, 5000);
    return () => { clearTimeout(firstTimeout); clearInterval(interval); };
  }, []);

  const [showBooking, setShowBooking] = useState(false);
  const [bookingMode, setBookingMode] = useState<BookingMode>('new');
  const [manageToken, setManageToken] = useState<string | null>(null);
  const [step, setStep] = useState<BookingStep>(1);
  const [proId, setProId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfDay(new Date()));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientForm>(EMPTY_PATIENT);
  const [champReponses, setChampReponses] = useState<Record<string, string>>({});
  const [emailSent, setEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [codeError, setCodeError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedRdv, setConfirmedRdv] = useState<any>(null);

  // Jours du mois en cours pour lesquels aucun créneau n'est disponible
  const [unavailableDays, setUnavailableDays] = useState<Set<string>>(new Set());
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const currentPro = proId ? proById.get(proId) : null;
  const currentProServices = proId ? (servicesByPro[proId] || []) : [];
  const currentService = currentProServices.find((s) => s.id === serviceId) || null;

  function resetBookingState() {
    setBookingMode('new'); setManageToken(null); setStep(1);
    setProId(null); setServiceId(null);
    setCalendarMonth(startOfDay(new Date())); setMonthPickerOpen(false); setPickerYear(new Date().getFullYear());
    setSelectedDay(null); setSlots([]); setSelectedSlotIso(null);
    setPatient(EMPTY_PATIENT); setChampReponses({}); setEmailSent(false); setEmailVerified(false); setDevCode(null); setEnteredCode('');
    setFormError(null); setCodeError(false); setConfirmedRdv(null); setTermsAccepted(false);
    setFieldErrors({});
    setUnavailableDays(new Set());
  }

  function openBooking(preselectServiceName?: string, preselectProId?: string) {
    resetBookingState();
    const pId = preselectProId || espace?.professionnels?.[0]?.id || null;
    setProId(pId);

    let sId: string | null = null;
    if (pId) {
      const list = servicesByPro[pId] || [];
      const match = preselectServiceName ? list.find((s) => s.nom === preselectServiceName) : list[0];
      sId = (match || list[0])?.id || null;
      setServiceId(sId);
    }

    setShowBooking(true);

    // ⚡ Si le service ET le pro sont déjà connus → on saute l'étape 1
    if (preselectServiceName && pId && sId) {
      setStep(2);
    }
  }
  function closeBooking() { setShowBooking(false); }

  useEffect(() => {
    if (!selectedDay || !proId || !serviceId) { setSlots([]); return; }
    let cancelled = false;
    setSlotsLoading(true); setSelectedSlotIso(null);
    publicApi.getSlots(proId, serviceId, toDateKey(selectedDay))
      .then((res) => { if (!cancelled) setSlots(res.creneaux || []); })
      .catch(() => { if (!cancelled) setSlots([]); })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDay, proId, serviceId]);

  // Vérifie en parallèle les créneaux de tous les jours du mois affiché
  // pour verrouiller les jours sans disponibilité.
  useEffect(() => {
    const calendarVisible =
      showBooking && proId && serviceId &&
      ((bookingMode === 'new' && step === 2) || (bookingMode === 'change' && step === 1));
    if (!calendarVisible) { setUnavailableDays(new Set()); return; }

    let cancelled = false;
    setAvailabilityLoading(true);

    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const today = startOfDay(new Date());

    const checks: Promise<[string, boolean]>[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d);
      if (date < today) continue;
      const key = toDateKey(date);
      checks.push(
        publicApi.getSlots(proId, serviceId, key)
          .then((res) => [key, (res.creneaux || []).length > 0] as [string, boolean])
          .catch(() => [key, false] as [string, boolean]),
      );
    }

    Promise.all(checks)
      .then((results) => {
        if (cancelled) return;
        const empty = new Set<string>();
        results.forEach(([key, hasSlots]) => { if (!hasSlots) empty.add(key); });
        setUnavailableDays(empty);
      })
      .finally(() => { if (!cancelled) setAvailabilityLoading(false); });

    return () => { cancelled = true; };
  }, [showBooking, proId, serviceId, calendarMonth, step, bookingMode]);

  function sendVerificationCode() {
    if (!isValidEmailFormat(patient.email)) {
      setFieldErrors((prev) => ({ ...prev, email: FIELD_ERROR_MESSAGES.email }));
      setFormError('Merci de renseigner une adresse e-mail valide (ex. nom@exemple.com).');
      return;
    }
    setFieldErrors((prev) => { const next = { ...prev }; delete next.email; return next; });
    setFormError(null);
    setDevCode(String(Math.floor(1000 + Math.random() * 9000)));
    setEmailSent(true);
  }
  function verifyEmailCode() {
    if (enteredCode !== devCode) { setCodeError(true); return; }
    setCodeError(false); setEmailVerified(true);
  }

  const FIELD_VALIDATORS: Record<string, (v: string) => boolean> = {
    nom: isValidNomPrenom,
    prenom: isValidNomPrenom,
    adresse: isValidAdresse,
    dateNaissance: isValidDateNaissance,
    telephone: isValidTelephone,
  };
  function validateField(key: string, value: string) {
    const validator = FIELD_VALIDATORS[key];
    if (!validator) return;
    setFieldErrors((prev) => {
      const next = { ...prev };
      // Champ vide → pas de message d'erreur affiché (l'utilisateur n'a pas encore saisi)
      if (!value.trim()) {
        delete next[key];
      } else if (!validator(value)) {
        next[key] = FIELD_ERROR_MESSAGES[key];
      } else {
        delete next[key];
      }
      return next;
    });
  }
  function validateAllFields(): boolean {
    const errors: Record<string, string> = {};

    if (!isValidNomPrenom(patient.nom)) errors.nom = FIELD_ERROR_MESSAGES.nom;
    if (!isValidNomPrenom(patient.prenom)) errors.prenom = FIELD_ERROR_MESSAGES.prenom;
    if (!isValidAdresse(patient.adresse)) errors.adresse = FIELD_ERROR_MESSAGES.adresse;

    // ⚠️ Date de naissance : on n'affiche le message "18 à 120 ans" que
    // si l'utilisateur a réellement saisi une date ET qu'elle est invalide.
    // Si le champ est vide, aucun message d'erreur n'est affiché dessus.
    if (patient.dateNaissance && !isValidDateNaissance(patient.dateNaissance)) {
      errors.dateNaissance = FIELD_ERROR_MESSAGES.dateNaissance;
    }

    if (!isValidTelephone(patient.telephone)) errors.telephone = FIELD_ERROR_MESSAGES.telephone;
    if (!isValidEmailFormat(patient.email)) errors.email = FIELD_ERROR_MESSAGES.email;

    setFieldErrors(errors);

    // On bloque quand même la soumission si la date de naissance n'est pas remplie,
    // mais SANS afficher le message "18-120" sur le champ (juste un message global).
    if (!patient.dateNaissance) {
      setFormError('Merci de renseigner votre date de naissance.');
      return false;
    }

    return Object.keys(errors).length === 0;
  }

  async function submitBooking(accepted: boolean) {
    if (!accepted) { setFormError("Merci d'accepter les conditions de réservation pour continuer."); return; }
    if (!proId || !serviceId || !selectedSlotIso) return;
    setSubmitting(true); setFormError(null);
    try {
      const rdv = await publicApi.createRdv({
        professionnelId: proId,
        serviceId,
        dateDebut: selectedSlotIso,
        nom: patient.nom,
        prenom: patient.prenom,
        telephone: patient.telephone,
        email: patient.email,
        dateNaissance: patient.dateNaissance,
        adresse: patient.adresse,
        remarque: patient.note,
        reponsesChamps: champReponses,
      });
      setConfirmedRdv(rdv);
      setStep(5);
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Une erreur est survenue, merci de réessayer.';
      setFormError(Array.isArray(msg) ? msg.join(' ') : msg);
      if (e?.response?.status === 409 && selectedDay) {
        publicApi.getSlots(proId, serviceId, toDateKey(selectedDay)).then((res) => setSlots(res.creneaux || []));
        setSelectedSlotIso(null);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const [lookupCode, setLookupCode] = useState('');
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  function openLookup() {
    setLookupCode(''); setLookupEmail(''); setLookupError(null);
    setLookupResult(null); setCancelConfirmOpen(false);
    setShowLookup(true);
  }
  function closeLookup() { setShowLookup(false); setCancelConfirmOpen(false); }

  async function doLookup() {
    if (!lookupCode.trim() || !lookupEmail.trim()) { setLookupError('Merci de renseigner votre e-mail et votre code de gestion.'); return; }
    setLookupLoading(true); setLookupError(null);
    try {
      const rdv = await publicApi.getByToken(lookupCode.trim(), lookupEmail.trim());
      setLookupResult(rdv);
    } catch {
      setLookupError('Aucun rendez-vous trouvé pour cet e-mail et ce code.');
      setLookupResult(null);
    } finally {
      setLookupLoading(false);
    }
  }
  async function doCancel() {
    if (!lookupResult) return;
    setCancelSubmitting(true);
    try {
      const updated = await publicApi.cancelByToken(lookupResult.manageToken);
      setLookupResult(updated);
      setCancelConfirmOpen(false);
    } catch (e: any) {
      setLookupError(e?.response?.data?.message || 'Annulation impossible.');
    } finally {
      setCancelSubmitting(false);
    }
  }
  function startChange() {
    if (!lookupResult) return;
    resetBookingState();
    setBookingMode('change'); setManageToken(lookupResult.manageToken);
    setProId(lookupResult.professionnelId); setServiceId(lookupResult.serviceId);
    setShowLookup(false); setShowBooking(true); setStep(1);
  }
  async function confirmChange() {
    if (!manageToken || !selectedSlotIso) return;
    setSubmitting(true); setFormError(null);
    try {
      const updated = await publicApi.rescheduleByToken(manageToken, selectedSlotIso);
      setLookupResult(updated); setShowBooking(false); setShowLookup(true);
    } catch (e: any) {
      setFormError(e?.response?.data?.message || 'Changement impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#5B5670' }}>Chargement du cabinet…</div>;
  }
  if (loadError || !espace) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#B5473A', textAlign: 'center', padding: 24 }}>{loadError || "Cet espace n'est pas encore configuré."}</div>;
  }

  const openedPro = openProId ? proById.get(openProId) : null;

  return (
    <>
      <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@500;600;700&display=swap');
  :root {
    --ink: #1B1730;
    --ink-soft: #5B5670;
    --primary: #7350E8;
    --primary-light: #9B7CF2;
    --primary-soft: #E9E3FF;
    --primary-dark: #5B3ECF;
    --primary-tint: #E9E3FF;
    --paper: #F7F6FB;
    --card: #FFFFFF;
    --line: #E6E2F2;
    --radius: 16px;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif; background: var(--paper); color: var(--ink); }
  .display { font-family: 'Poppins', sans-serif; font-weight: 700; }
  a { text-decoration: none; }
  button { font-family: inherit; }
  svg { display: block; }

  .cr-header { position: absolute; top: 0; left: 0; right: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 20px 4vw; gap: 20px; flex-wrap: wrap; color: #fff; }
  .cr-brand { display: flex; align-items: center; gap: 10px; }
  .cr-logo { width: 40px; height: 40px; border-radius: 11px; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
  .cr-brand-name { font-size: 16px; font-weight: 700; line-height: 1.1; color: #fff; }
  .cr-nav { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
  .cr-nav-link { font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,0.9); background: none; border: none; padding: 8px 14px; border-radius: 999px; cursor: pointer; transition: background .15s ease; }
  .cr-nav-link:hover { background: rgba(255,255,255,0.16); color: #fff; }
  .cr-header-cta { background: var(--primary); color: #fff; border: none; cursor: pointer; font-family: inherit; font-size: 13.5px; font-weight: 600; padding: 10px 22px; border-radius: 999px; white-space: nowrap; box-shadow: 0 8px 18px -8px rgba(115,80,232,0.7); transition: transform .12s ease, background .15s ease; }
  .cr-header-cta:hover { transform: translateY(-1px); background: var(--primary-dark); }
  @media (max-width: 880px) { .cr-nav { order: 3; width: 100%; justify-content: flex-start; overflow-x: auto; } }

  .cr-hero { position: relative; min-height: 100vh; overflow: hidden; isolation: isolate; display: flex; flex-direction: column; justify-content: flex-end; }
  .cr-hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 30%; z-index: 0; }
  .cr-hero-overlay { position: absolute; inset: 0; z-index: 1; background: linear-gradient(180deg, rgba(11,18,26,0.35) 0%, rgba(11,18,26,0.25) 45%, rgba(11,18,26,0.78) 100%); }
  .cr-hero-bottom { position: relative; z-index: 2; padding: 140px 32px 64px; display: flex; flex-direction: column; align-items: center; text-align: center; color: #fff; max-width: 1200px; margin: 0 auto; width: 100%; }
  .cr-hero-title-main { font-family: 'Cormorant Garamond', serif; font-weight: 600; font-size: clamp(22px, 2.8vw, 34px); line-height: 1.15; margin: 0 0 28px; letter-spacing: 0.01em; color: #fff; max-width: 900px; width: 100%; }
  .cr-hero-title-main .accent { font-style: italic; color: #D9CCFF; }
  .cr-hero-cta { display: inline-flex; align-items: center; gap: 10px; font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 600; letter-spacing: 0.02em; border-radius: 999px; padding: 15px 30px; border: none; cursor: pointer; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: #fff; box-shadow: 0 14px 30px -10px rgba(115,80,232,0.7); transition: transform .12s ease, box-shadow .15s ease; }
  .cr-hero-cta:hover { transform: translateY(-2px); box-shadow: 0 18px 36px -10px rgba(115,80,232,0.85); }

  .cr-section { padding: 72px 6vw; }
  .cr-section-eyebrow { display: inline-block; font-size: 11.5px; font-weight: 700; color: var(--primary-dark); text-transform: uppercase; letter-spacing: .12em; background: linear-gradient(135deg, var(--primary-soft) 0%, #F3EEFF 100%); padding: 6px 14px; border-radius: 999px; margin: 0 0 16px; }
  .cr-section-title { font-size: clamp(24px, 2.4vw, 32px); line-height: 1.25; margin: 0 0 10px; }
  .cr-section-title .accent { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; font-style: italic; }
  .cr-section-sub { font-size: 14.5px; color: var(--ink-soft); line-height: 1.6; margin: 0; }
  .cr-section-split { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 36px; flex-wrap: wrap; }
  .cr-section-split .left { max-width: 620px; }

  .contact-strip { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: #fff; padding: 32px 6vw; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  @media (max-width: 880px) { .contact-strip { grid-template-columns: 1fr; gap: 20px; } }
  .contact-strip-item { display: flex; align-items: center; gap: 16px; }
  .contact-strip-icon { width: 46px; height: 46px; border-radius: 50%; background: rgba(255,255,255,0.18); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .contact-strip-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: .1em; opacity: 0.85; margin: 0 0 3px; }
  .contact-strip-value { font-size: 14.5px; font-weight: 600; margin: 0; }

  .location-section { padding: 56px 6vw; background: var(--paper); }
  .location-card { max-width: 1100px; margin: 0 auto; background: var(--card); border: 1px solid var(--primary-light); border-radius: 24px; overflow: hidden; box-shadow: 0 24px 50px -30px rgba(18,10,40,0.35); display: grid; grid-template-columns: 1fr 1.4fr; }
  @media (max-width: 780px) { .location-card { grid-template-columns: 1fr; } }
  .location-card-info { padding: 32px; display: flex; flex-direction: column; justify-content: center; gap: 14px; }
  .location-card-icon { width: 46px; height: 46px; border-radius: 14px; background: linear-gradient(135deg, var(--primary-soft) 0%, #F3EEFF 100%); color: var(--primary); display: flex; align-items: center; justify-content: center; }
  .location-card-title { font-size: 19px; font-weight: 700; margin: 0; }
  .location-card-address { font-size: 13.5px; color: var(--ink-soft); line-height: 1.6; margin: 0; }
  .location-card-map { min-height: 280px; background: linear-gradient(135deg, var(--primary-soft) 0%, #F3EEFF 100%); }
  .location-card-map iframe { width: 100%; height: 100%; min-height: 280px; border: none; display: block; }

  .why-section { background: linear-gradient(135deg, #2A1B5E 0%, #1B1238 100%); color: #fff; padding: 72px 6vw; position: relative; overflow: hidden; }
  .why-section::before { content: ""; position: absolute; top: -50%; right: -10%; width: 60%; height: 200%; border-radius: 50%; background: radial-gradient(circle, rgba(115,80,232,0.18) 0%, transparent 60%); pointer-events: none; }
  .why-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 64px; align-items: center; position: relative; z-index: 1; }
  @media (max-width: 880px) { .why-grid { grid-template-columns: 1fr; gap: 40px; } }
  .why-eyebrow { display: inline-block; font-size: 11.5px; font-weight: 700; color: #C9BAFF; text-transform: uppercase; letter-spacing: .12em; background: rgba(115,80,232,0.25); padding: 6px 14px; border-radius: 999px; margin: 0 0 16px; }
  .why-title { font-size: clamp(24px, 2.6vw, 34px); line-height: 1.25; margin: 0 0 8px; color: #fff; }
  .why-title .accent { font-style: italic; color: #D9CCFF; }
  .why-sub { font-size: 14px; color: rgba(255,255,255,0.7); margin: 0 0 32px; line-height: 1.7; white-space: pre-line; }
  .why-benefits { display: flex; flex-direction: column; gap: 22px; }
  .benefit-item { display: flex; align-items: flex-start; gap: 16px; }
  .benefit-icon { width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; background: linear-gradient(135deg, rgba(115,80,232,0.45) 0%, rgba(155,124,242,0.3) 100%); color: #D9CCFF; display: flex; align-items: center; justify-content: center; }
  .benefit-title { font-size: 14.5px; font-weight: 700; margin: 0 0 4px; color: #fff; }
  .benefit-desc { font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.6; margin: 0; }

  .cr-services-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  @media (max-width: 980px) { .cr-services-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 640px) { .cr-services-grid { grid-template-columns: 1fr; } }
  .service-card { background: linear-gradient(160deg, #FFFFFF 0%, var(--primary-soft) 100%); border: 1px solid var(--primary-light); border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; transition: border-color .2s ease, box-shadow .3s ease, transform .3s ease; }
  .service-card:hover { border-color: var(--primary); box-shadow: 0 24px 48px -22px rgba(115,80,232,0.45); transform: translateY(-4px); }
  .service-image-wrap { position: relative; height: 180px; overflow: hidden; }
  .service-image { width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
  .service-card:hover .service-image { transform: scale(1.08); }
  .service-status-tag { position: absolute; top: 12px; left: 12px; z-index: 3; display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; padding: 5px 12px 5px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: .05em; color: #fff; box-shadow: 0 6px 14px -6px rgba(18,10,40,0.35); }
  .service-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #fff; flex-shrink: 0; }
  .service-status-tag.disponible { background: linear-gradient(135deg, #34C6B4, #1EA99A); }
  .service-status-tag.complet { background: linear-gradient(135deg, #EF5D6B, #C93A4A); }
  .service-status-tag.indisponible { background: linear-gradient(135deg, #A0A0B0, #767688); }
  .service-image-badge { position: absolute; bottom: 10px; right: 10px; background: rgba(27,23,48,0.75); color: #fff; backdrop-filter: blur(4px); font-size: 11.5px; font-weight: 600; padding: 5px 10px; border-radius: 999px; display: flex; align-items: center; gap: 5px; }
  .service-body { padding: 20px 22px 22px; display: flex; flex-direction: column; gap: 14px; flex: 1; }
  .service-top { display: flex; justify-content: space-between; gap: 12px; }
  .service-name { font-weight: 700; font-size: 15.5px; margin: 0 0 4px; color: var(--ink); }
  .service-note { font-size: 12.5px; color: var(--ink-soft); margin: 0; line-height: 1.4; }
  .service-price { font-weight: 700; font-size: 18px; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; white-space: nowrap; }
  .service-pros { display: flex; flex-direction: column; gap: 10px; padding: 14px 14px 12px; background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(233,227,255,0.6) 100%); border: 1px dashed var(--primary-light); border-radius: 14px; }
  .service-pros-label { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; text-transform: uppercase; letter-spacing: .09em; color: var(--primary); font-weight: 700; }
  .service-pros-list { display: flex; flex-direction: column; gap: 8px; }
  .pro-chip { display: flex; align-items: center; gap: 10px; background: linear-gradient(135deg, var(--primary-soft) 0%, #F3EEFF 100%); border: 1px solid var(--primary-light); padding: 8px 10px 8px 8px; border-radius: 12px; cursor: pointer; font-family: inherit; text-align: left; width: 100%; transition: border-color .18s ease, background .18s ease, transform .12s ease, box-shadow .18s ease; }
  .pro-chip:hover { border-color: var(--primary); background: #fff; transform: translateY(-1px); box-shadow: 0 6px 16px -8px rgba(115,80,232,0.5); }
  .pro-chip-avatar { position: relative; width: 38px; height: 38px; border-radius: 50%; overflow: visible; flex-shrink: 0; }
  .pro-chip-avatar img { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-light); display: block; }
  .pro-chip-online { position: absolute; bottom: 0; right: 0; width: 10px; height: 10px; border-radius: 50%; background: #4ECDC4; border: 2px solid var(--card); }
  .pro-chip-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .pro-chip-name { font-size: 12.5px; font-weight: 700; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pro-chip-role { font-size: 10.5px; color: var(--ink-soft); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pro-chip-arrow { display: flex; align-items: center; justify-content: center; color: var(--ink-soft); flex-shrink: 0; }
  .service-bottom { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--primary-light); padding-top: 14px; margin-top: auto; }
  .service-duration { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-soft); }
  .service-cta { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: var(--primary); background: none; border: none; cursor: pointer; }

  .hours-card { background: linear-gradient(160deg, #FFFFFF 0%, var(--primary-soft) 100%); border: 1px solid var(--primary-light); border-radius: 22px; padding: 32px; color: var(--ink); box-shadow: 0 30px 60px -20px rgba(115,80,232,0.35); }
  .hours-card-title { font-size: 20px; font-weight: 700; margin: 0 0 6px; }
  .hours-card-sub { font-size: 13px; color: var(--ink-soft); margin: 0 0 22px; }
  .hours-row { display: flex; justify-content: space-between; font-size: 13.5px; padding: 12px 0; border-bottom: 1px solid var(--primary-light); }
  .hours-row:last-child { border-bottom: none; }
  .hours-value { font-weight: 600; color: var(--ink); }
  .hours-cta { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: #fff; border: none; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 700; padding: 14px; border-radius: 12px; margin-top: 20px; box-shadow: 0 12px 26px -10px rgba(115,80,232,0.7); }

  .final-cta { padding: 88px 6vw 96px; position: relative; background: linear-gradient(180deg, transparent 0%, rgba(115,80,232,0.06) 100%); overflow: hidden; }
  .final-cta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; max-width: 1200px; margin: 0 auto; }
  @media (max-width: 980px) { .final-cta-grid { grid-template-columns: 1fr; gap: 48px; text-align: center; } .final-cta-grid .final-cta-col { order: 1; } .final-cta-grid .final-photo-col { order: -1; } }
  .final-cta-col { text-align: left; }
  @media (max-width: 980px) { .final-cta-col { text-align: center; } }
  .final-cta-title { font-size: clamp(28px, 3.2vw, 40px); line-height: 1.2; margin: 0 0 16px; }
  .final-cta-title .accent { font-style: italic; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .final-cta-sub { font-size: 15px; color: var(--ink-soft); line-height: 1.6; max-width: 540px; margin: 0 0 32px; }
  @media (max-width: 980px) { .final-cta-sub { margin-left: auto; margin-right: auto; } }
  .final-cta-row { display: flex; gap: 14px; flex-wrap: wrap; }
  @media (max-width: 980px) { .final-cta-row { justify-content: center; } }
  .final-btn { display: inline-flex; align-items: center; gap: 8px; font-size: 14.5px; font-weight: 600; border-radius: 999px; padding: 15px 30px; border: none; cursor: pointer; font-family: inherit; transition: transform .12s ease, background .15s ease, border-color .15s ease; }
  .final-btn-primary { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: #fff; box-shadow: 0 12px 26px -10px rgba(115,80,232,0.7); }
  .final-btn-primary:hover { transform: translateY(-2px); }
  .final-btn-ghost { background: transparent; color: var(--ink); border: 1px solid var(--primary-light); }
  .final-btn-ghost:hover { border-color: var(--primary); background: linear-gradient(135deg, var(--primary-soft) 0%, #F3EEFF 100%); color: var(--primary-dark); }
  .final-cta-footnote { font-size: 12.5px; color: var(--ink-soft); margin: 28px 0 0; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  @media (max-width: 980px) { .final-cta-footnote { justify-content: center; } }
  .final-cta-footnote span { display: flex; align-items: center; gap: 6px; }
  .final-cta-footnote svg { color: var(--primary); }

  .final-photo-col { position: relative; display: flex; justify-content: center; align-items: center; min-height: 420px; }
  .pz-halo { position: absolute; width: min(440px, 96%); aspect-ratio: 1/1; border-radius: 50%; background: radial-gradient(circle, var(--primary-soft) 0%, rgba(115,80,232,0.06) 65%, transparent 75%); z-index: 0; }
  .pz-circle { position: relative; width: min(340px, 78%); aspect-ratio: 1/1; border-radius: 50%; overflow: hidden; box-shadow: 0 34px 64px -22px rgba(115,80,232,0.45); z-index: 1; border: 6px solid var(--card); }
  .pz-circle img { width: 100%; height: 100%; object-fit: cover; }
  .pz-badge { position: absolute; z-index: 2; background: var(--card); border-radius: 999px; padding: 10px 16px 10px 10px; display: flex; align-items: center; gap: 8px; box-shadow: 0 16px 30px -14px rgba(18,36,47,0.32); font-size: 12.5px; font-weight: 700; color: var(--ink); animation: cr-cal-float 5.5s ease-in-out infinite; }
  @keyframes cr-cal-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
  .pz-badge-icon { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .pz-badge-1 { top: 4%; left: -2%; animation-delay: -1s; }
  .pz-badge-1 .pz-badge-icon { background: linear-gradient(135deg, #4ECDC4, #2CB1A6); color: #fff; }
  .pz-badge-2 { bottom: 6%; right: -4%; animation-duration: 6.5s; animation-delay: -3s; }
  .pz-badge-2 .pz-badge-icon { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; }
  .pz-toast { position: absolute; z-index: 3; top: 10%; right: -2%; background: var(--card); border-radius: 14px; padding: 10px 14px; display: flex; align-items: center; gap: 9px; box-shadow: 0 18px 36px -14px rgba(18,36,47,0.34); font-size: 11.5px; font-weight: 700; color: var(--ink); opacity: 0; transform: translateY(-8px) scale(0.92); transition: opacity .5s ease, transform .5s ease; pointer-events: none; }
  .pz-toast.pz-toast-show { opacity: 1; transform: translateY(0) scale(1); }
  .pz-toast-icon { width: 22px; height: 22px; border-radius: 50%; background: linear-gradient(135deg, #FFB86B, #F59A3E); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  @media (max-width: 480px) { .pz-badge-1, .pz-badge-2, .pz-toast { font-size: 10.5px; padding: 7px 11px 7px 8px; } }
  @media (prefers-reduced-motion: reduce) { .pz-badge { animation: none; } }

  .cr-footer { border-top: 1px solid var(--primary-light); padding: 28px 6vw; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; font-size: 12.5px; color: var(--ink-soft); }
  .cr-footer-links { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .cr-footer-btn { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 999px; cursor: pointer; font-family: inherit; }
  .cr-footer-btn-ghost { background: linear-gradient(135deg, var(--primary-soft) 0%, #F3EEFF 100%); color: var(--primary-dark); border: 1px solid var(--primary-light); }
  .cr-footer-btn-primary { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: #fff; border: 1px solid var(--primary); }

  .assistant-fab { position: fixed; bottom: 24px; left: 24px; height: 56px; padding: 0 22px 0 14px; border-radius: 999px; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; border: none; cursor: pointer; display: flex; align-items: center; gap: 12px; box-shadow: 0 16px 34px -12px rgba(115,80,232,0.55); z-index: 40; font-family: inherit; transition: transform .15s ease; }
  .assistant-fab:hover { transform: translateY(-2px); }
  .assistant-fab-avatar { position: relative; width: 38px; height: 38px; border-radius: 50%; background: rgba(255,255,255,0.22); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .assistant-fab-avatar svg { width: 18px; height: 18px; }
  .assistant-fab-label { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.15; text-align: left; }
  .assistant-fab-label-top { font-size: 13.5px; font-weight: 700; color: #fff; }
  .assistant-fab-label-sub { font-size: 10.5px; font-weight: 500; color: rgba(255,255,255,0.85); }
  .assistant-panel { position: fixed; bottom: 92px; left: 24px; width: 360px; background: var(--card); border-radius: 24px; box-shadow: 0 30px 70px -20px rgba(18,36,47,0.35); z-index: 40; overflow: hidden; border: none; }
  .assistant-panel-header { padding: 18px 20px; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: #fff; display: flex; align-items: center; gap: 12px; }
  .assistant-panel-avatar { width: 42px; height: 42px; border-radius: 50%; background: rgba(255,255,255,0.22); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .assistant-panel-avatar svg { width: 20px; height: 20px; }
  .assistant-panel-title { font-size: 14.5px; font-weight: 700; color: #fff; margin: 0; }
  .assistant-panel-subtitle { font-size: 11.5px; color: rgba(255,255,255,0.8); margin: 2px 0 0; }
  .assistant-panel-close { margin-left: auto; background: rgba(255,255,255,0.16); color: #fff; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 16px; flex-shrink: 0; }
  .assistant-panel-body { padding: 18px; max-height: 340px; overflow-y: auto; background: var(--paper); display: flex; flex-direction: column; gap: 14px; }
  .assistant-msg-row { display: flex; align-items: flex-end; gap: 8px; max-width: 88%; }
  .assistant-msg-row-user { align-self: flex-end; flex-direction: row-reverse; }
  .assistant-msg-avatar { width: 26px; height: 26px; border-radius: 50%; background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .assistant-msg-avatar svg { width: 14px; height: 14px; }
  .assistant-msg-bubble { background: #fff; padding: 12px 15px; border-radius: 16px 16px 16px 4px; font-size: 13px; line-height: 1.6; color: var(--ink); box-shadow: 0 4px 14px -8px rgba(18,10,40,0.15); }
  .assistant-msg-user { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; border-radius: 16px 16px 4px 16px; }
  .assistant-msg-para { margin: 0 0 8px; }
  .assistant-msg-para:last-child { margin-bottom: 0; }
  .assistant-msg-list { margin: 2px 0 8px 18px; padding: 0; }
  .assistant-msg-list:last-child { margin-bottom: 0; }
  .assistant-msg-list li { margin-bottom: 4px; }
  .assistant-panel-input { display: flex; gap: 8px; padding: 14px 18px; border-top: 1px solid var(--primary-soft); background: #fff; }
  .assistant-panel-input input { flex: 1; border: 1px solid var(--primary-soft); border-radius: 999px; padding: 10px 16px; font-size: 13px; background: var(--paper); }
  .assistant-panel-input button { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; border: none; border-radius: 50%; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
  .fullpage-overlay { position: fixed; inset: 0; z-index: 1000; background: var(--paper); overflow-y: auto; }
  .fullpage-header { padding: 24px 6vw; display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, #FFFFFF 0%, var(--primary-soft) 100%); border-bottom: 1px solid var(--primary-light); position: sticky; top: 0; z-index: 10; }
  .fullpage-content { flex: 1; padding: 40px 6vw; max-width: 1200px; margin: 0 auto; width: 100%; }

  .all-pros-hero { text-align: center; max-width: 640px; margin: 0 auto 56px; }
  .all-pros-title { font-size: clamp(28px, 3.4vw, 42px); line-height: 1.2; margin: 0 0 12px; }
  .all-pros-title .accent { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; font-style: italic; }
  .all-pros-sub { font-size: 15px; color: var(--ink-soft); line-height: 1.6; margin: 0; }
  .all-pros-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; max-width: 1200px; margin: 0 auto; width: 100%; }
  @media (max-width: 980px) { .all-pros-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 640px) { .all-pros-grid { grid-template-columns: 1fr; } }
  .all-pro-card { background: linear-gradient(160deg, #FFFFFF 0%, var(--primary-soft) 100%); border: 1px solid var(--primary-light); border-radius: 22px; overflow: hidden; display: flex; flex-direction: column; transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
  .all-pro-card:hover { transform: translateY(-4px); border-color: var(--primary); box-shadow: 0 30px 60px -22px rgba(115,80,232,0.5); }
  .all-pro-photo { position: relative; height: 260px; overflow: hidden; background: linear-gradient(135deg, var(--primary-soft) 0%, var(--primary-light) 100%); }
  .all-pro-photo img { width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block; }
  .all-pro-photo::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 55%, rgba(115,80,232,0.15) 100%); pointer-events: none; }
  .all-pro-body { padding: 24px 24px 26px; display: flex; flex-direction: column; gap: 14px; flex: 1; }
  .all-pro-name { font-size: 17px; font-weight: 700; margin: 0 0 3px; }
  .all-pro-role { font-size: 13px; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; margin: 0; font-weight: 700; }
  .all-pro-bio { font-size: 13px; color: var(--ink-soft); line-height: 1.6; margin: 0; }
  .all-pro-actions { display: flex; gap: 10px; margin-top: auto; padding-top: 16px; border-top: 1px solid var(--primary-light); }
  .all-pro-cta-view { display: inline-flex; align-items: center; justify-content: center; gap: 6px; flex: 1; font-size: 13px; font-weight: 600; color: var(--primary-dark); background: linear-gradient(135deg, var(--primary-soft) 0%, #F3EEFF 100%); border: 1px solid var(--primary-light); border-radius: 10px; padding: 11px 14px; cursor: pointer; transition: transform .12s ease, background .15s ease; }
  .all-pro-cta-view:hover { background: #fff; transform: translateY(-1px); }
  .all-pro-cta-book { display: inline-flex; align-items: center; justify-content: center; flex: 1; font-size: 13px; font-weight: 600; color: #fff; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); border: none; border-radius: 10px; padding: 11px 14px; cursor: pointer; box-shadow: 0 8px 18px -8px rgba(115,80,232,0.7); transition: transform .12s ease; }
  .all-pro-cta-book:hover { transform: translateY(-1px); }

  /* ---------- Fiche Pro plein écran ---------- */
  .pro-detail-hero { position: relative; padding: 80px 6vw 70px; background: linear-gradient(135deg, #2A1B5E 0%, #4B2FBF 45%, #7350E8 100%); color: #fff; overflow: hidden; }
  .pro-detail-hero::before { content: ""; position: absolute; top: -40%; right: -10%; width: 70%; height: 220%; background: radial-gradient(circle, rgba(155,124,242,0.55) 0%, transparent 60%); pointer-events: none; }
  .pro-detail-hero::after { content: ""; position: absolute; bottom: -50%; left: -10%; width: 50%; height: 180%; background: radial-gradient(circle, rgba(233,227,255,0.18) 0%, transparent 65%); pointer-events: none; }
  .pro-detail-hero-inner { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 44px; flex-wrap: wrap; }
  .pro-detail-avatar { width: 190px; height: 190px; border-radius: 50%; border: 5px solid rgba(255,255,255,0.35); overflow: hidden; box-shadow: 0 24px 60px -14px rgba(0,0,0,0.5); flex-shrink: 0; background: linear-gradient(135deg, var(--primary-soft), var(--primary-light)); }
  .pro-detail-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pro-detail-info { flex: 1; min-width: 260px; }
  .pro-detail-name { font-size: clamp(28px, 3.2vw, 42px); font-weight: 800; margin: 0 0 10px; color: #fff; letter-spacing: -0.01em; }
  .pro-detail-specialty { display: inline-block; font-size: 13px; font-weight: 700; letter-spacing: 0.03em; background: rgba(255,255,255,0.18); color: #E9E3FF; padding: 7px 18px; border-radius: 999px; margin: 0 0 22px; backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.22); }
  .pro-detail-meta { display: flex; flex-wrap: wrap; gap: 18px; margin-bottom: 26px; font-size: 13.5px; color: rgba(255,255,255,0.88); }
  .pro-detail-meta-item { display: inline-flex; align-items: center; gap: 7px; }
  .pro-detail-meta-item svg { color: #D9CCFF; }
  .pro-detail-actions { display: flex; gap: 12px; flex-wrap: wrap; }
  .pro-detail-btn-primary { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: var(--primary-dark); border: none; padding: 14px 28px; border-radius: 999px; font-size: 14.5px; font-weight: 700; cursor: pointer; box-shadow: 0 14px 34px -12px rgba(0,0,0,0.5); transition: transform .12s ease, box-shadow .15s ease; }
  .pro-detail-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 20px 40px -12px rgba(0,0,0,0.55); }
  .pro-detail-btn-ghost { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.35); padding: 14px 28px; border-radius: 999px; font-size: 14.5px; font-weight: 600; cursor: pointer; backdrop-filter: blur(8px); transition: background .15s ease; }
  .pro-detail-btn-ghost:hover { background: rgba(255,255,255,0.22); }

  .pro-detail-body { max-width: 1200px; margin: 0 auto; padding: 64px 6vw 96px; }
  .pro-detail-section { margin-bottom: 60px; }
  .pro-detail-section-title { font-size: 22px; font-weight: 800; margin: 0 0 26px; display: flex; align-items: center; gap: 14px; color: var(--ink); }
  .pro-detail-section-title::before { content: ""; display: block; width: 5px; height: 26px; border-radius: 5px; background: linear-gradient(180deg, var(--primary-light) 0%, var(--primary) 50%, var(--primary-dark) 100%); }

  .pro-detail-about-card { position: relative; background: linear-gradient(160deg, #FFFFFF 0%, var(--primary-soft) 100%); border: 1px solid var(--primary-light); border-radius: 24px; padding: 34px 38px; font-size: 15px; line-height: 1.8; color: var(--ink-soft); box-shadow: 0 28px 60px -34px rgba(115,80,232,0.45); overflow: hidden; }
  .pro-detail-about-card::before { content: ""; position: absolute; top: -50%; right: -15%; width: 55%; height: 200%; background: radial-gradient(circle, rgba(155,124,242,0.18) 0%, transparent 70%); pointer-events: none; }

  .pro-detail-services-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
  .pro-detail-service-card { display: flex; flex-direction: column; background: linear-gradient(160deg, #FFFFFF 0%, var(--primary-soft) 100%); border: 1px solid var(--primary-light); border-radius: 20px; overflow: hidden; transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
  .pro-detail-service-card:hover { transform: translateY(-4px); border-color: var(--primary); box-shadow: 0 30px 60px -24px rgba(115,80,232,0.5); }
  .pro-detail-service-img { position: relative; height: 165px; overflow: hidden; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); }
  .pro-detail-service-img img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .5s ease; }
  .pro-detail-service-card:hover .pro-detail-service-img img { transform: scale(1.06); }
  .pro-detail-service-status { position: absolute; top: 12px; left: 12px; font-size: 10.5px; font-weight: 700; padding: 5px 12px; border-radius: 999px; text-transform: uppercase; letter-spacing: .05em; color: #fff; box-shadow: 0 8px 18px -8px rgba(18,10,40,0.45); }
  .pro-detail-service-status.disponible { background: linear-gradient(135deg, #34C6B4, #1EA99A); }
  .pro-detail-service-status.complet { background: linear-gradient(135deg, #EF5D6B, #C93A4A); }
  .pro-detail-service-status.indisponible { background: linear-gradient(135deg, #A0A0B0, #767688); }
  .pro-detail-service-body { padding: 20px 22px 22px; display: flex; flex-direction: column; gap: 14px; flex: 1; }
  .pro-detail-service-name { font-size: 16px; font-weight: 700; margin: 0 0 6px; color: var(--ink); }
  .pro-detail-service-desc { font-size: 13px; color: var(--ink-soft); line-height: 1.6; margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .pro-detail-service-meta { display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px solid var(--primary-light); margin-top: auto; }
  .pro-detail-service-duration { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--ink-soft); }
  .pro-detail-service-price { font-size: 15px; font-weight: 700; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .pro-detail-service-cta { display: inline-flex; align-items: center; justify-content: center; gap: 6px; width: 100%; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: #fff; border: none; padding: 12px 18px; border-radius: 10px; font-size: 13.5px; font-weight: 700; cursor: pointer; box-shadow: 0 10px 22px -10px rgba(115,80,232,0.7); transition: transform .12s ease, box-shadow .15s ease; margin-top: 6px; }
  .pro-detail-service-cta:hover { transform: translateY(-1px); box-shadow: 0 14px 30px -10px rgba(115,80,232,0.85); }
  .pro-detail-service-cta:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

  /* ---------- Gérer mon RDV : refonte complète ---------- */
  .rdv-shell { max-width: 620px; margin: 0 auto; padding: 8px 0 40px; }

  .rdv-search-card { position: relative; background: linear-gradient(160deg, #FFFFFF 0%, var(--primary-soft) 100%); border: 1px solid var(--primary-light); border-radius: 28px; padding: 44px 40px 38px; box-shadow: 0 40px 80px -40px rgba(115,80,232,0.45); overflow: hidden; }
  .rdv-search-card::before { content: ""; position: absolute; top: -50%; right: -20%; width: 70%; height: 200%; background: radial-gradient(circle, rgba(155,124,242,0.20) 0%, transparent 65%); pointer-events: none; }
  .rdv-search-head { position: relative; text-align: center; margin-bottom: 32px; }
  .rdv-search-badge { display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 22px; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: #fff; box-shadow: 0 18px 40px -14px rgba(115,80,232,0.75); margin-bottom: 20px; }
  .rdv-search-title { font-size: 26px; font-weight: 800; margin: 0 0 10px; color: var(--ink); letter-spacing: -0.01em; }
  .rdv-search-sub { font-size: 14px; color: var(--ink-soft); line-height: 1.6; margin: 0 auto; max-width: 420px; }
  .rdv-search-form { position: relative; display: flex; flex-direction: column; gap: 16px; }
  .rdv-search-field label { display: block; font-size: 11.5px; font-weight: 700; color: var(--primary-dark); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; }
  .rdv-search-input-wrap { position: relative; }
  .rdv-search-input-wrap svg { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--primary-light); pointer-events: none; }
  .rdv-search-input-wrap input { width: 100%; background: #fff; border: 1.5px solid var(--primary-light); border-radius: 14px; padding: 15px 16px 15px 46px; font-family: inherit; font-size: 14.5px; color: var(--ink); transition: border-color .15s ease, box-shadow .15s ease; }
  .rdv-search-input-wrap input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-soft); }
  .rdv-search-error { display: flex; align-items: center; gap: 10px; background: #FFF1F2; border: 1px solid #FECDD3; color: #B5473A; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 500; }
  .rdv-search-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; width: 100%; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: #fff; border: none; padding: 16px; border-radius: 14px; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 16px 34px -14px rgba(115,80,232,0.8); transition: transform .12s ease, box-shadow .15s ease; margin-top: 6px; }
  .rdv-search-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 22px 40px -14px rgba(115,80,232,0.9); }
  .rdv-search-btn:disabled { opacity: 0.65; cursor: not-allowed; }

  .rdv-result { display: flex; flex-direction: column; gap: 20px; }

  .rdv-hero { position: relative; background: linear-gradient(135deg, #2A1B5E 0%, #4B2FBF 55%, #7350E8 100%); color: #fff; border-radius: 26px; padding: 30px 30px 26px; overflow: hidden; box-shadow: 0 30px 70px -30px rgba(43,28,110,0.6); }
  .rdv-hero::before { content: ""; position: absolute; top: -60%; right: -25%; width: 80%; height: 240%; background: radial-gradient(circle, rgba(155,124,242,0.55) 0%, transparent 60%); pointer-events: none; }
  .rdv-hero::after { content: ""; position: absolute; bottom: -60%; left: -20%; width: 55%; height: 200%; background: radial-gradient(circle, rgba(233,227,255,0.16) 0%, transparent 65%); pointer-events: none; }
  .rdv-hero-inner { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
  .rdv-hero-left { display: flex; align-items: center; gap: 16px; min-width: 0; }
  .rdv-hero-avatar { width: 64px; height: 64px; border-radius: 50%; overflow: hidden; border: 3px solid rgba(255,255,255,0.35); flex-shrink: 0; background: linear-gradient(135deg, var(--primary-soft), var(--primary-light)); }
  .rdv-hero-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .rdv-hero-pro { font-size: 11px; text-transform: uppercase; letter-spacing: .1em; opacity: 0.85; margin: 0 0 3px; }
  .rdv-hero-name { font-size: 18px; font-weight: 800; margin: 0; color: #fff; }
  .rdv-hero-specialty { font-size: 12.5px; color: #D9CCFF; margin: 2px 0 0; font-weight: 500; }
  .rdv-hero-right { text-align: right; }
  .rdv-hero-date-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: .1em; opacity: 0.85; margin: 0 0 4px; }
  .rdv-hero-date-value { font-size: 16px; font-weight: 800; margin: 0; }
  .rdv-hero-time { font-size: 12.5px; color: #D9CCFF; margin: 2px 0 0; font-weight: 500; }

  .rdv-statut-badge { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px 8px 12px; border-radius: 999px; font-size: 12.5px; font-weight: 700; letter-spacing: .02em; border: 1px solid; }
  .rdv-statut-badge svg { flex-shrink: 0; }
  .rdv-statut-confirme { background: linear-gradient(135deg, #E6FBF5, #D3F5EC); color: #1B7A67; border-color: #A7E8D5; }
  .rdv-statut-annule { background: linear-gradient(135deg, #FFF1F2, #FFE2E5); color: #B5473A; border-color: #FECDD3; }
  .rdv-statut-honore { background: linear-gradient(135deg, var(--primary-soft), #F3EEFF); color: var(--primary-dark); border-color: var(--primary-light); }
  .rdv-statut-absent { background: linear-gradient(135deg, #F4F4F7, #EDEDF2); color: #5B5670; border-color: #E2E2EA; }

  .rdv-card { background: linear-gradient(160deg, #FFFFFF 0%, var(--primary-soft) 100%); border: 1px solid var(--primary-light); border-radius: 22px; padding: 26px 28px; box-shadow: 0 24px 55px -34px rgba(115,80,232,0.45); }
  .rdv-card-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: var(--primary-dark); margin: 0 0 18px; display: flex; align-items: center; gap: 10px; }
  .rdv-card-title::before { content: ""; width: 4px; height: 16px; border-radius: 4px; background: linear-gradient(180deg, var(--primary-light), var(--primary)); }

  .rdv-info-rows { display: flex; flex-direction: column; gap: 14px; }
  .rdv-info-row { display: flex; align-items: center; gap: 14px; padding: 12px 14px; background: rgba(255,255,255,0.7); border: 1px solid var(--primary-light); border-radius: 14px; }
  .rdv-info-row-icon { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, var(--primary-soft), #F3EEFF); color: var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--primary-light); }
  .rdv-info-row-text { flex: 1; min-width: 0; }
  .rdv-info-row-label { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-soft); font-weight: 700; margin: 0 0 2px; }
  .rdv-info-row-value { font-size: 14.5px; font-weight: 700; color: var(--ink); margin: 0; }

  .rdv-actions { display: flex; gap: 12px; flex-wrap: wrap; }
  .rdv-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; flex: 1; min-width: 180px; padding: 15px 22px; border-radius: 14px; font-family: inherit; font-size: 14.5px; font-weight: 700; cursor: pointer; border: none; transition: transform .12s ease, box-shadow .15s ease, background .15s ease; }
  .rdv-btn-primary { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: #fff; box-shadow: 0 14px 30px -12px rgba(115,80,232,0.75); }
  .rdv-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 20px 36px -12px rgba(115,80,232,0.9); }
  .rdv-btn-danger { background: #fff; color: #B5473A; border: 1.5px solid #FECDD3; }
  .rdv-btn-danger:hover { background: #FFF1F2; border-color: #F4A0AC; }
  .rdv-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

  .rdv-notice { display: flex; align-items: flex-start; gap: 12px; background: linear-gradient(135deg, #FFF8EC, #FFEED6); border: 1px solid #FBE0B0; color: #8A5B14; padding: 14px 16px; border-radius: 14px; font-size: 13px; line-height: 1.55; }
  .rdv-notice svg { flex-shrink: 0; margin-top: 1px; color: #D68A20; }
  .rdv-notice-canceled { background: linear-gradient(135deg, #FFF1F2, #FFE2E5); border-color: #FECDD3; color: #B5473A; }
  .rdv-notice-canceled svg { color: #B5473A; }

  .rdv-code-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 16px; background: rgba(255,255,255,0.85); border: 1px dashed var(--primary-light); border-radius: 14px; }
  .rdv-code-label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; color: var(--primary-dark); margin: 0 0 4px; }
  .rdv-code-value { font-family: 'Courier New', monospace; font-size: 14px; font-weight: 700; color: var(--ink); word-break: break-all; margin: 0; }
  .rdv-code-copy { background: linear-gradient(135deg, var(--primary-soft), #F3EEFF); border: 1px solid var(--primary-light); color: var(--primary-dark); padding: 9px 14px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px; transition: background .15s ease; }
  .rdv-code-copy:hover { background: #fff; }

  .rdv-confirm-overlay { position: fixed; inset: 0; z-index: 3000; background: rgba(27,23,48,0.55); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 24px; }
  .rdv-confirm-modal { width: 100%; max-width: 440px; background: #fff; border-radius: 24px; padding: 32px 28px 26px; box-shadow: 0 40px 80px -20px rgba(10,10,26,0.6); text-align: center; position: relative; overflow: hidden; }
  .rdv-confirm-modal::before { content: ""; position: absolute; top: -60%; left: -20%; width: 90%; height: 200%; background: radial-gradient(circle, rgba(239,93,107,0.08) 0%, transparent 65%); pointer-events: none; }
  .rdv-confirm-icon { position: relative; width: 64px; height: 64px; border-radius: 20px; background: linear-gradient(135deg, #FFF1F2, #FFE2E5); color: #C93A4A; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; border: 1px solid #FECDD3; }
  .rdv-confirm-title { position: relative; font-size: 20px; font-weight: 800; margin: 0 0 10px; color: var(--ink); }
  .rdv-confirm-text { position: relative; font-size: 14px; color: var(--ink-soft); line-height: 1.6; margin: 0 0 26px; }
  .rdv-confirm-actions { position: relative; display: flex; gap: 10px; }
  .rdv-confirm-actions .rdv-btn { min-width: 0; }

  .stepper { display: flex; align-items: center; justify-content: center; margin-bottom: 48px; gap: 16px; }
  .stepper-step { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .stepper-circle { width: 36px; height: 36px; border-radius: 50%; background: var(--card); border: 2px solid var(--primary-light); display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--ink-soft); font-size: 14px; }
  .stepper-step.active .stepper-circle { border-color: var(--primary); background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; }
  .stepper-step.done .stepper-circle { border-color: var(--primary); background: linear-gradient(135deg, var(--primary-soft), #F3EEFF); color: var(--primary-dark); }
  .stepper-label { font-size: 11px; font-weight: 600; color: var(--ink-soft); text-transform: uppercase; letter-spacing: .05em; }
  .stepper-step.active .stepper-label { color: var(--primary); }
  .stepper-line { flex: 1; max-width: 100px; height: 2px; background: var(--primary-soft); margin-top: -24px; }
  .stepper-line.done { background: linear-gradient(90deg, var(--primary), var(--primary-dark)); }
  .booking-step-intro { font-size: 14px; color: var(--ink-soft); text-align: center; max-width: 640px; margin: 0 auto 24px; line-height: 1.6; }

  .booking-pros-row { display: flex; gap: 32px; justify-content: center; align-items: flex-start; padding: 8px 12px 24px; margin-bottom: 24px; border-bottom: 1px solid var(--primary-light); overflow-x: auto; }
  .booking-pro-item { background: none; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 0; flex-shrink: 0; }
  .booking-pro-avatar { width: 76px; height: 76px; border-radius: 50%; overflow: hidden; border: 3px solid transparent; background: linear-gradient(135deg, var(--primary-soft), var(--primary-light)); display: block; position: relative; }
  .booking-pro-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .booking-pro-item.selected .booking-pro-avatar { border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-soft); }
  .booking-pro-name { font-size: 13px; font-weight: 600; color: var(--ink); text-align: center; white-space: nowrap; }
  .booking-pro-item.selected .booking-pro-name { color: var(--primary); font-weight: 700; }

  .booking-calendar-layout { display: grid; grid-template-columns: minmax(340px, 420px) 1fr; gap: 32px; align-items: start; max-width: 1100px; margin: 0 auto 8px; width: 100%; }
  @media (max-width: 900px) { .booking-calendar-layout { grid-template-columns: 1fr; gap: 24px; } }
  .booking-calendar-side { background: linear-gradient(160deg, #FFFFFF 0%, var(--primary-soft) 100%); border: 1px solid var(--primary-light); border-radius: 20px; padding: 20px; position: relative; }
  .booking-cal-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 18px; padding: 10px 8px 14px; border-bottom: 1px solid var(--primary-light); }
  .booking-cal-nav-btn { width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--primary-light); background: linear-gradient(135deg, var(--primary-soft), #F3EEFF); color: var(--primary-dark); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
  .booking-cal-nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .booking-cal-month-btn { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; padding: 6px 10px; border-radius: 10px; position: relative; }
  .booking-cal-month { display: block; font-size: 17px; font-weight: 700; color: var(--ink); }
  .booking-cal-today-hint { display: block; font-size: 11px; font-weight: 500; color: var(--ink-soft); margin-top: 2px; }
  .booking-cal-month-picker { position: absolute; top: 68px; left: 20px; right: 20px; background: #fff; border: 1px solid var(--primary-light); border-radius: 16px; box-shadow: 0 20px 40px -14px rgba(18,10,40,0.35); padding: 14px; z-index: 20; }
  .booking-cal-year-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--primary-light); }
  .booking-cal-year-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--primary-light); background: linear-gradient(135deg, var(--primary-soft), #F3EEFF); color: var(--primary-dark); cursor: pointer; }
  .booking-cal-year-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .booking-cal-year-label { font-size: 15px; font-weight: 700; color: var(--primary-dark); }
  .booking-cal-months-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .booking-cal-month-option { padding: 10px 4px; border-radius: 10px; border: 1px solid var(--primary-light); background: linear-gradient(135deg, var(--primary-soft), #F3EEFF); color: var(--primary-dark); font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; position: relative; }
  .booking-cal-month-option.selected { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); border-color: var(--primary); color: #fff; }
  .booking-cal-month-option.disabled { opacity: 0.3; cursor: not-allowed; }
  .booking-cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-bottom: 8px; padding: 0 2px; }
  .booking-cal-weekday { text-align: center; font-size: 11px; font-weight: 700; color: var(--primary-dark); text-transform: uppercase; padding: 4px 0; }
  .booking-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
  .booking-day { position: relative; border: 1px solid var(--primary-light); border-radius: 10px; background: linear-gradient(160deg, #FFFFFF, var(--primary-soft)); aspect-ratio: 1 / 1; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; font-weight: 600; color: var(--ink); }
  .booking-day.empty { background: transparent; border-color: transparent; cursor: default; }
  .booking-day .today-tag { position: absolute; top: 3px; right: 3px; font-size: 8px; font-weight: 700; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; padding: 1px 5px; border-radius: 999px; }
  .booking-day.today { border-color: var(--primary); border-width: 2px; }
  .booking-day.selected { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); border-color: var(--primary); color: #fff; }
  .booking-day.selected .today-tag { background: #fff; color: var(--primary); }
  .booking-day.disabled { opacity: 0.3; cursor: not-allowed; }
  .booking-day.no-slots {
    opacity: 0.45;
    cursor: not-allowed;
    background: repeating-linear-gradient(
      45deg,
      rgba(160,160,176,0.08) 0 6px,
      rgba(160,160,176,0.16) 6px 12px
    );
    color: var(--ink-soft);
    text-decoration: line-through;
    text-decoration-color: rgba(160,160,176,0.7);
    text-decoration-thickness: 1.5px;
  }

  .booking-slots-side { background: linear-gradient(160deg, #FFFFFF 0%, var(--primary-soft) 100%); border: 1px solid var(--primary-light); border-radius: 20px; padding: 22px; min-height: 380px; display: flex; flex-direction: column; }
  .booking-slots-date-header { display: flex; align-items: center; gap: 12px; padding-bottom: 16px; margin-bottom: 18px; border-bottom: 1px solid var(--primary-light); }
  .booking-slots-date-icon { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, var(--primary-soft), #F3EEFF); color: var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--primary-light); }
  .booking-slots-date-title { margin: 0; font-size: 15px; font-weight: 700; color: var(--primary-dark); }
  .booking-slots-date-sub { margin: 3px 0 0; font-size: 12.5px; color: var(--ink-soft); }
  .booking-slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(86px, 1fr)); gap: 10px; align-content: start; }
  .booking-slot { border: 1px solid var(--primary-light); border-radius: 10px; background: linear-gradient(135deg, #FFFFFF, var(--primary-soft)); padding: 12px 6px; text-align: center; font-size: 13.5px; font-weight: 600; cursor: pointer; color: var(--primary-dark); }
  .booking-slot.selected { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); border-color: var(--primary); color: #fff; }
  .booking-slots-summary { display: flex; align-items: center; gap: 8px; margin-top: 20px; padding: 12px 16px; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); border-radius: 12px; font-size: 13px; color: #fff; }
  .booking-slots-summary-dot { width: 8px; height: 8px; border-radius: 50%; background: #fff; flex-shrink: 0; }
  .booking-slots-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 20px; }
  .booking-slots-empty-icon { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-soft), #F3EEFF); color: var(--primary); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid var(--primary-light); }
  .booking-slots-empty-title { margin: 0 0 6px; font-size: 15px; font-weight: 700; color: var(--ink); }
  .booking-slots-empty-sub { margin: 0; font-size: 13px; color: var(--ink-soft); max-width: 280px; line-height: 1.55; }

  .booking-service-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; max-width: 900px; margin: 0 auto 40px; width: 100%; }
  @media (max-width: 680px) { .booking-service-grid { grid-template-columns: 1fr; } }
  .booking-service-card { background: linear-gradient(160deg, #FFFFFF, var(--primary-soft)); border: 2px solid var(--primary-light); border-radius: 16px; overflow: hidden; cursor: pointer; transition: transform .15s ease, box-shadow .2s ease; }
  .booking-service-card.selected { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); }
  .booking-service-img-wrap { height: 140px; width: 100%; overflow: hidden; position: relative; }
  .booking-service-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
  .booking-service-status { position: absolute; top: 10px; left: 10px; z-index: 2; font-size: 10.5px; font-weight: 700; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: .04em; color: #fff; box-shadow: 0 4px 10px -4px rgba(18,10,40,0.4); }
  .booking-service-status.disponible { background: linear-gradient(135deg, #34C6B4, #1EA99A); }
  .booking-service-status.complet { background: linear-gradient(135deg, #EF5D6B, #C93A4A); }
  .booking-service-status.indisponible { background: linear-gradient(135deg, #A0A0B0, #767688); }
  .booking-service-body { padding: 16px; background: #fff; }
  .booking-service-title { font-size: 15px; font-weight: 700; margin: 0 0 4px; color: var(--primary-dark); }
  .booking-service-desc { font-size: 12.5px; color: var(--ink-soft); margin: 0; }

  .booking-form-layout { display: grid; grid-template-columns: 1fr 340px; gap: 32px; align-items: start; }
  @media (max-width: 880px) { .booking-form-layout { grid-template-columns: 1fr; } }
  .booking-form-box { background: linear-gradient(160deg, #FFFFFF 0%, var(--primary-soft) 100%); border: 1px solid var(--primary-light); border-radius: 16px; padding: 24px; }
  .booking-recap-side { position: sticky; top: 24px; }
  .booking-recap-side .recap-block { background: linear-gradient(135deg, var(--primary-soft), #F3EEFF); border-color: var(--primary-light); }
  .booking-confirm-head { text-align: center; padding: 20px 0 30px; }
  .booking-check { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-soft), #F3EEFF); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; border: 2px solid var(--primary-light); }
  .booking-confirm-title { font-size: 24px; margin: 0 0 8px; }
  .booking-confirm-sub { font-size: 14px; color: var(--ink-soft); max-width: 500px; margin: 0 auto; }

  .booking-overlay { position: fixed; inset: 0; z-index: 2000; background: rgba(27,23,48,0.5); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 24px; }
  .booking-modal { width: 100%; max-width: 560px; max-height: 88vh; overflow-y: auto; background: var(--card); border-radius: 20px; box-shadow: 0 40px 80px -20px rgba(10,10,26,0.5); padding: 26px; position: relative; }
  .booking-close { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; border-radius: 50%; border: none; background: linear-gradient(135deg, var(--primary-soft), #F3EEFF); color: var(--primary); font-size: 18px; cursor: pointer; z-index: 5; }
  .booking-header { margin-bottom: 18px; padding-right: 34px; }
  .booking-eyebrow { font-size: 11.5px; font-weight: 600; color: var(--primary); text-transform: uppercase; margin: 0 0 4px; }
  .booking-title { font-size: 19px; margin: 0; }
  .booking-field { margin-bottom: 16px; }
  .booking-field label { display: block; font-size: 12.5px; font-weight: 600; color: var(--ink-soft); margin-bottom: 6px; }
  .booking-field input, .booking-field textarea { width: 100%; border: 1px solid var(--primary-light); border-radius: 10px; padding: 12px 14px; font-family: inherit; font-size: 14px; color: var(--ink); background: #fff; }
  .booking-field input.field-invalid, .booking-field textarea.field-invalid { border-color: #B5473A; background: #FFF8F7; }
  .booking-field input.field-invalid:focus, .booking-field textarea.field-invalid:focus { outline: none; box-shadow: 0 0 0 3px rgba(181,71,58,0.15); }
  .booking-field textarea { resize: vertical; min-height: 80px; }
  .booking-error { color: #B5473A; font-size: 12px; margin: -6px 0 10px; }
  .verify-row { display: flex; gap: 8px; align-items: stretch; }
  .verify-row input { flex: 1; }
  .verify-sent { color: var(--primary); font-size: 12.5px; font-weight: 600; margin: 0 0 10px; }
  .dev-hint { font-size: 11.5px; color: var(--ink-soft); font-style: italic; margin: 4px 0 10px; }
  .recap-block { background: linear-gradient(135deg, var(--primary-soft), #F3EEFF); border: 1px solid var(--primary-light); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
  .recap-row { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; color: var(--ink-soft); }
  .recap-row b { color: var(--primary-dark); text-align: right; }
  .recap-consent { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; color: var(--ink-soft); margin: 14px 0 6px; line-height: 1.5; cursor: pointer; }
  .recap-consent a { color: var(--primary); font-weight: 600; }
  .booking-nav { display: flex; justify-content: space-between; gap: 10px; margin-top: 32px; max-width: 1100px; margin-left: auto; margin-right: auto; width: 100%; }
  .booking-btn { font-size: 14px; font-weight: 600; border-radius: 10px; padding: 12px 24px; border: none; cursor: pointer; }
  .booking-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .booking-btn-ghost { background: linear-gradient(135deg, var(--primary-soft), #F3EEFF); color: var(--primary-dark); border: 1px solid var(--primary-light); }
  .booking-btn-primary { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; box-shadow: 0 10px 22px -10px rgba(115,80,232,0.7); }

  .terms-body { font-size: 13.5px; color: var(--ink-soft); line-height: 1.7; }
  .terms-body h4 { font-size: 14px; color: var(--ink); margin: 18px 0 6px; }
  .terms-body ul { margin: 0 0 6px; padding-left: 20px; }

  .ticket { position: relative; width: 100%; max-width: 380px; background: var(--card); border-radius: 20px; box-shadow: 0 24px 60px -24px rgba(18,36,47,0.35); overflow: hidden; border: 1px solid var(--primary-light); margin: 0 auto; }
  .ticket-top { background: linear-gradient(135deg, var(--primary-dark), var(--primary)); color: white; padding: 22px 24px 26px; }
  .ticket-top-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .ticket-label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85; }
  .ticket-value { font-size: 15px; font-weight: 700; margin-top: 4px; }
  .ticket-dashes { border-top: 2px dashed var(--primary-light); margin: 0 22px; }
  .ticket-bottom { padding: 22px 24px 26px; }
  .ticket-service { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
  .ticket-icon { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, var(--primary-soft), #F3EEFF); display: flex; align-items: center; justify-content: center; color: var(--primary); flex-shrink: 0; }
  .ticket-service-name { font-weight: 700; font-size: 14.5px; }
  .ticket-service-sub { font-size: 12.5px; color: var(--ink-soft); }
  .ticket-meta { display: flex; justify-content: space-between; align-items: center; }
  .ticket-meta-block .ticket-label { color: var(--ink-soft); }
  .ticket-meta-block .ticket-value { color: var(--ink); font-weight: 700; font-size: 17px; }

  .cr-btn-primary { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; box-shadow: 0 10px 22px -10px rgba(115,80,232,0.7); }
      `}</style>

      <header className="cr-header">
        <div className="cr-brand">
          <div className="cr-logo">
            {espace.logoUrl ? (
              <img src={espace.logoUrl} alt={espace.platformName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 11 }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="m9 16 2 2 4-4" /></svg>
            )}
          </div>
          <div className="cr-brand-name">{espace.platformName}</div>
        </div>
        <nav className="cr-nav">
          <button type="button" className="cr-nav-link" onClick={() => document.getElementById('services-anchor')?.scrollIntoView({ behavior: 'smooth' })}>Nos Services</button>
          <button type="button" className="cr-nav-link" onClick={() => setShowAllPros(true)}>Nos Professionnels</button>
          <button type="button" className="cr-nav-link" onClick={() => document.getElementById('contact-anchor')?.scrollIntoView({ behavior: 'smooth' })}>Contact</button>
          <button type="button" className="cr-nav-link" onClick={openLookup}>Gérer mon rendez-vous</button>
        </nav>
      </header>

      <section className="cr-hero">
        <img className="cr-hero-bg" src={espace.heroImageUrl || '/images/pz-circle-photo.png'} alt="Prise de rendez-vous en ligne" />
        <div className="cr-hero-overlay"></div>
        <div className="cr-hero-bottom">
          <h1 className="cr-hero-title-main">{espace.slogan || 'Réservez votre rendez-vous en ligne en quelques secondes,'} <span className="accent">sans appel ni attente.</span></h1>
          <button type="button" className="cr-hero-cta" onClick={() => openBooking()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            Réserver un rendez-vous
          </button>
        </div>
      </section>

      <div id="contact-anchor" style={{ scrollMarginTop: '80px' }}></div>
      <section className="contact-strip">
        <div className="contact-strip-item">
          <div className="contact-strip-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg></div>
          <div><p className="contact-strip-label">Urgence & Contact</p><p className="contact-strip-value">{espace.phone || '—'}</p></div>
        </div>
        <div className="contact-strip-item">
          <div className="contact-strip-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg></div>
          <div><p className="contact-strip-label">Notre Adresse</p><p className="contact-strip-value">{espace.address || '—'}</p></div>
        </div>
        <div className="contact-strip-item">
          <div className="contact-strip-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 6c0-1.1-.9-2-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V6z" /><path d="m22 6-10 7L2 6" /></svg></div>
          <div><p className="contact-strip-label">Notre Email</p><p className="contact-strip-value">{espace.email || '—'}</p></div>
        </div>
      </section>

      {espace.localisationUrl && (
        <section className="location-section">
          <div className="location-card">
            <div className="location-card-info">
              <div className="location-card-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              </div>
              <h3 className="location-card-title">Nous trouver</h3>
              <p className="location-card-address">{espace.address || 'Retrouvez-nous à l\'adresse indiquée ci-dessus.'}</p>
            </div>
            <div className="location-card-map">
              <iframe src={espace.localisationUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Localisation du cabinet" />
            </div>
          </div>
        </section>
      )}

      <div id="services-anchor" style={{ scrollMarginTop: '80px' }}></div>
      <section className="cr-section">
        <div className="cr-section-split">
          <div className="left">
            <span className="cr-section-eyebrow">Nos Prestations</span>
            <h2 className="cr-section-title display">Une réservation <span className="accent">simple et rapide.</span></h2>
            <p className="cr-section-sub">Choisissez la prestation qui vous convient et réservez votre créneau en quelques clics, disponible 24h/24.</p>
          </div>
        </div>
        <div className="cr-services-grid">
          {serviceGroups.map((group) => (
            <div className="service-card" key={group.nom}>
              <div className="service-image-wrap">
                <img className="service-image" src={group.imageUrl || FALLBACK_SERVICE_IMAGE} alt={group.nom} loading="lazy" />
                <span className={`service-status-tag ${STATUT_INFO[group.statut].type}`}><span className="service-status-dot"></span>{STATUT_INFO[group.statut].label}</span>
                <span className="service-image-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  {group.dureeMinutes} min
                </span>
              </div>
              <div className="service-body">
                <div className="service-top">
                  <div><p className="service-name">{group.nom}</p><p className="service-note">{group.description || ''}</p></div>
                  <div className="service-price">{formatPrix(group.prix)}</div>
                </div>
                {group.parPro.length > 0 && (
                  <div className="service-pros">
                    <span className="service-pros-label">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                      Assuré par
                    </span>
                    <div className="service-pros-list">
                      {group.parPro.map(({ proId: pid }) => {
                        const pro = proById.get(pid);
                        if (!pro) return null;
                        return (
                          <button key={pid} type="button" className="pro-chip" onClick={() => setOpenProId(pid)} title={`Voir la fiche de ${pro.nom}`}>
                            <span className="pro-chip-avatar"><img src={getProPhoto(pro)} alt={pro.nom} loading="lazy" /><span className="pro-chip-online"></span></span>
                            <span className="pro-chip-info"><span className="pro-chip-name">{pro.nom}</span><span className="pro-chip-role">{pro.specialite || ''}</span></span>
                            <span className="pro-chip-arrow"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg></span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="service-bottom">
                  <span className="service-duration">Consultation · {group.dureeMinutes} min</span>
                  <button className="service-cta" onClick={() => openBooking(group.nom, group.parPro[0]?.proId)}>
                    Réserver<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {serviceGroups.length === 0 && (
            <p className="cr-section-sub">Aucune prestation n'est configurée pour le moment.</p>
          )}
        </div>
      </section>

      <section className="why-section">
        <div className="why-grid">
          <div>
            <span className="why-eyebrow">À propos de nous</span>
            <h2 className="why-title display">Un cabinet <span className="accent">à votre écoute</span></h2>
            <p className="why-sub">{espace.description || "Notre équipe pluridisciplinaire accompagne ses patients avec exigence, bienveillance et proximité."}</p>
            <div className="why-benefits">
              <div className="benefit-item">
                <div className="benefit-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
                </div>
                <div>
                  <p className="benefit-title">Une équipe expérimentée</p>
                  <p className="benefit-desc">Des praticiens diplômés et reconnus dans leurs spécialités, réunis pour vous offrir une prise en charge complète et coordonnée.</p>
                </div>
              </div>
              <div className="benefit-item">
                <div className="benefit-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                </div>
                <div>
                  <p className="benefit-title">Un accompagnement humain</p>
                  <p className="benefit-desc">Nous prenons le temps d'écouter chaque patient et de construire avec lui un parcours de soin personnalisé et rassurant.</p>
                </div>
              </div>
              <div className="benefit-item">
                <div className="benefit-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /><polyline points="21 3 12 12 8 8" /></svg>
                </div>
                <div>
                  <p className="benefit-title">Une réservation moderne</p>
                  <p className="benefit-desc">Réservez votre créneau en quelques clics, 24h/24 et 7j/7, recevez une confirmation immédiate et gérez vos rendez-vous en toute autonomie.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="hours-card">
            <h3 className="hours-card-title">Horaires d'ouverture</h3>
            <p className="hours-card-sub">Réservez en ligne à tout moment, 24h/24.</p>
            {(espace.joursOuvrables || []).map((jour) => (
              <div className="hours-row" key={jour}><span>{jour}</span><span className="hours-value">{espace.horairesGeneraux || '—'}</span></div>
            ))}
            <button type="button" className="hours-cta" onClick={() => openBooking()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              Prendre RDV en ligne
            </button>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="final-cta-grid">
          <div className="final-cta-col">
            <h2 className="final-cta-title display">Prêt à réserver votre <span className="accent">rendez-vous ?</span></h2>
            <p className="final-cta-sub">Rejoignez les utilisateurs qui réservent leurs rendez-vous en ligne en quelques secondes, sans appel ni attente.</p>
            <div className="final-cta-row">
              <button type="button" className="final-btn final-btn-primary" onClick={() => openBooking()}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>Réserver maintenant
              </button>
              <button type="button" className="final-btn final-btn-ghost" onClick={openLookup}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>Gérer mon rendez-vous
              </button>
            </div>
            <div className="final-cta-footnote">
              <span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Sans attente téléphonique</span>
              <span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Confirmation instantanée</span>
              <span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Annulation gratuite</span>
            </div>
          </div>

          <div className="final-photo-col">
            <div className="pz-halo"></div>
            <div className="pz-circle"><img src="/images/hero-booking.png" alt="Personne réservant un rendez-vous" /></div>
            <span className="pz-badge pz-badge-1"><span className="pz-badge-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></span>Créneau réservé</span>
            <span className="pz-badge pz-badge-2"><span className="pz-badge-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>Rendez-vous confirmé</span>
            <span className={`pz-toast${pzToastShow ? ' pz-toast-show' : ''}`}><span className="pz-toast-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg></span>E-mail de rappel envoyé</span>
          </div>
        </div>
      </section>

      <footer className="cr-footer">
        <span>© {new Date().getFullYear()} {espace.platformName} — Tous droits réservés.</span>
        <div className="cr-footer-links">
          <button type="button" className="cr-footer-btn cr-footer-btn-ghost" onClick={() => { setTermsFromBooking(false); setShowTerms(true); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            Conditions de réservation
          </button>
          <button type="button" className="cr-footer-btn cr-footer-btn-primary" onClick={() => navigate('/connexion')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            Espace Pro
          </button>
        </div>
      </footer>

      {showAllPros && (
        <div className="fullpage-overlay">
          <div className="fullpage-header">
            <div className="cr-brand"><div className="cr-brand-name" style={{ color: 'var(--ink)' }}>Nos Professionnels</div></div>
            <button className="booking-btn booking-btn-ghost" onClick={() => setShowAllPros(false)}>Fermer</button>
          </div>
          <div className="fullpage-content">
            <div className="all-pros-hero">
              <span className="cr-section-eyebrow">Notre Équipe</span>
              <h1 className="all-pros-title display">Rencontrez nos <span className="accent">professionnels</span></h1>
              <p className="all-pros-sub">Découvrez les fiches complètes de chaque professionnel et réservez directement avec la personne de votre choix.</p>
            </div>
            <div className="all-pros-grid">
              {espace.professionnels.map((p) => (
                <div className="all-pro-card" key={p.id}>
                  <div className="all-pro-photo"><img src={getProPhoto(p)} alt={p.nom} loading="lazy" /></div>
                  <div className="all-pro-body">
                    <div><p className="all-pro-name">{p.nom}</p><p className="all-pro-role">{p.specialite || ''}</p></div>
                    <p className="all-pro-bio">{p.description || ''}</p>
                    <div className="all-pro-actions">
                      <button className="all-pro-cta-view" type="button" onClick={() => setOpenProId(p.id)}>Voir la fiche complète</button>
                      <button className="all-pro-cta-book" type="button" onClick={() => { setShowAllPros(false); openBooking(undefined, p.id); }}>Réserver</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -------- Fiche Pro : plein écran -------- */}
      {openedPro && (
        <div className="fullpage-overlay" style={{ zIndex: 1100 }}>
          <div className="fullpage-header">
            <div className="cr-brand"><div className="cr-brand-name" style={{ color: 'var(--ink)' }}>Fiche professionnel</div></div>
            <button className="booking-btn booking-btn-ghost" onClick={() => setOpenProId(null)}>Fermer</button>
          </div>

          <div className="pro-detail-hero">
            <div className="pro-detail-hero-inner">
              <div className="pro-detail-avatar">
                <img src={getProPhoto(openedPro)} alt={openedPro.nom} />
              </div>
              <div className="pro-detail-info">
                <h1 className="pro-detail-name">{openedPro.nom}</h1>
                {openedPro.specialite && <span className="pro-detail-specialty">{openedPro.specialite}</span>}
                <div className="pro-detail-meta">
                  {openedPro.adresse && (
                    <span className="pro-detail-meta-item">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                      {openedPro.adresse}
                    </span>
                  )}
                  {openedPro.telephone && (
                    <span className="pro-detail-meta-item">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                      {openedPro.telephone}
                    </span>
                  )}
                </div>
                <div className="pro-detail-actions">
                  <button className="pro-detail-btn-primary" onClick={() => { const pid = openedPro.id; setOpenProId(null); openBooking(undefined, pid); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    Prendre rendez-vous
                  </button>
                  <button className="pro-detail-btn-ghost" onClick={() => setOpenProId(null)}>
                    Retour
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pro-detail-body">
            {openedPro.description && (
              <section className="pro-detail-section">
                <h2 className="pro-detail-section-title">À propos</h2>
                <div className="pro-detail-about-card">{openedPro.description}</div>
              </section>
            )}

            <section className="pro-detail-section">
              <h2 className="pro-detail-section-title">Services proposés</h2>
              {(servicesByPro[openedPro.id] || []).length === 0 ? (
                <p className="cr-section-sub">Aucun service actif pour ce professionnel.</p>
              ) : (
                <div className="pro-detail-services-grid">
                  {(servicesByPro[openedPro.id] || []).map((s) => {
                    const disabled = s.statut !== 'DISPONIBLE';
                    return (
                      <div className="pro-detail-service-card" key={s.id}>
                        <div className="pro-detail-service-img">
                          <span className={`pro-detail-service-status ${STATUT_INFO[s.statut].type}`}>{STATUT_INFO[s.statut].label}</span>
                          <img src={s.imageUrl || FALLBACK_SERVICE_IMAGE} alt={s.nom} loading="lazy" />
                        </div>
                        <div className="pro-detail-service-body">
                          <div>
                            <h3 className="pro-detail-service-name">{s.nom}</h3>
                            <p className="pro-detail-service-desc">{s.description || 'Service proposé par ce professionnel.'}</p>
                          </div>
                          <div className="pro-detail-service-meta">
                            <span className="pro-detail-service-duration">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                              {s.dureeMinutes} min
                            </span>
                            <span className="pro-detail-service-price">{formatPrix(s.prix)}</span>
                          </div>
                          <button
                            className="pro-detail-service-cta"
                            disabled={disabled}
                            onClick={() => { const pid = openedPro.id; const nom = s.nom; setOpenProId(null); openBooking(nom, pid); }}
                          >
                            {disabled ? 'Indisponible' : 'Réserver ce service'}
                            {!disabled && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* -------- Gérer mon RDV : refonte complète -------- */}
      {showLookup && (
        <div className="fullpage-overlay" style={{ zIndex: 1050 }}>
          <div className="fullpage-header">
            <div className="cr-brand">
              <div className="cr-logo" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              </div>
              <div className="cr-brand-name" style={{ color: 'var(--ink)' }}>Gérer mon rendez-vous</div>
            </div>
            <button className="booking-btn booking-btn-ghost" onClick={closeLookup}>Fermer</button>
          </div>

          <div className="fullpage-content">
            <div className="rdv-shell">
              {!lookupResult && (
                <div className="rdv-search-card">
                  <div className="rdv-search-head">
                    <div className="rdv-search-badge">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
                    </div>
                    <h2 className="rdv-search-title">Retrouvez votre rendez-vous</h2>
                    <p className="rdv-search-sub">
                      Saisissez le <b>code de gestion</b> reçu lors de votre confirmation et l'adresse e-mail utilisée pour le réserver.
                    </p>
                  </div>

                  <div className="rdv-search-form">
                    <div className="rdv-search-field">
                      <label>Code de gestion</label>
                      <div className="rdv-search-input-wrap">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        <input type="text" value={lookupCode} onChange={(e) => setLookupCode(e.target.value)} placeholder="Collez votre code ici" />
                      </div>
                    </div>
                    <div className="rdv-search-field">
                      <label>Adresse e-mail</label>
                      <div className="rdv-search-input-wrap">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 6c0-1.1-.9-2-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V6z" /><path d="m22 6-10 7L2 6" /></svg>
                        <input type="email" value={lookupEmail} onChange={(e) => setLookupEmail(e.target.value)} placeholder="votre@email.com" />
                      </div>
                    </div>
                    {lookupError && (
                      <div className="rdv-search-error">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        {lookupError}
                      </div>
                    )}
                    <button className="rdv-search-btn" disabled={lookupLoading} onClick={doLookup}>
                      {lookupLoading ? 'Recherche en cours…' : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                          Accéder à mon rendez-vous
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {lookupResult && (
                <div className="rdv-result">
                  <div className="rdv-hero">
                    <div className="rdv-hero-inner">
                      <div className="rdv-hero-left">
                        <div className="rdv-hero-avatar">
                          <img
                            src={getProPhoto({
                              nom: lookupResult.professionnel?.nom || '',
                              photoUrl: lookupResult.professionnel?.photoUrl,
                            })}
                            alt={lookupResult.professionnel?.nom || 'Professionnel'}
                          />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p className="rdv-hero-pro">Professionnel</p>
                          <p className="rdv-hero-name">{lookupResult.professionnel?.nom || '—'}</p>
                          {lookupResult.professionnel?.specialite && (
                            <p className="rdv-hero-specialty">{lookupResult.professionnel.specialite}</p>
                          )}
                        </div>
                      </div>
                      <div className="rdv-hero-right">
                        <p className="rdv-hero-date-label">Rendez-vous</p>
                        <p className="rdv-hero-date-value">{fmtDateFull(new Date(lookupResult.dateDebut))}</p>
                        <p className="rdv-hero-time">à {fmtTime(lookupResult.dateDebut)}</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {(() => {
                      const info = RDV_STATUT_INFO[lookupResult.statut] || { label: lookupResult.statut, cls: 'rdv-statut-absent', icon: 'check' };
                      return (
                        <span className={`rdv-statut-badge ${info.cls}`}>
                          {info.icon === 'check' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          )}
                          Rendez-vous {info.label.toLowerCase()}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="rdv-card">
                    <h3 className="rdv-card-title">Détails du rendez-vous</h3>
                    <div className="rdv-info-rows">
                      <div className="rdv-info-row">
                        <span className="rdv-info-row-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2v2" /><path d="M5 2v2" /><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" /><path d="M8 15a6 6 0 0 0 12 0v-3" /><circle cx="20" cy="10" r="2" /></svg>
                        </span>
                        <div className="rdv-info-row-text">
                          <p className="rdv-info-row-label">Service</p>
                          <p className="rdv-info-row-value">{lookupResult.service?.nom || '—'}</p>
                        </div>
                      </div>
                      <div className="rdv-info-row">
                        <span className="rdv-info-row-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        </span>
                        <div className="rdv-info-row-text">
                          <p className="rdv-info-row-label">Durée</p>
                          <p className="rdv-info-row-value">{lookupResult.service?.dureeMinutes ? `${lookupResult.service.dureeMinutes} min` : '—'}</p>
                        </div>
                      </div>
                      {lookupResult.service?.prix !== undefined && lookupResult.service?.prix !== null && (
                        <div className="rdv-info-row">
                          <span className="rdv-info-row-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                          </span>
                          <div className="rdv-info-row-text">
                            <p className="rdv-info-row-label">Tarif</p>
                            <p className="rdv-info-row-value">{formatPrix(lookupResult.service.prix)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {lookupResult.statut !== 'ANNULE' && lookupResult.manageToken && (
                    <div className="rdv-card">
                      <h3 className="rdv-card-title">Code de gestion</h3>
                      <div className="rdv-code-row">
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p className="rdv-code-label">À conserver</p>
                          <p className="rdv-code-value">{lookupResult.manageToken}</p>
                        </div>
                        <button
                          type="button"
                          className="rdv-code-copy"
                          onClick={() => {
                            try { navigator.clipboard.writeText(lookupResult.manageToken); } catch { /* noop */ }
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                          Copier
                        </button>
                      </div>
                    </div>
                  )}

                  {lookupResult.statut === 'ANNULE' && (
                    <div className="rdv-notice rdv-notice-canceled">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      <span>Ce rendez-vous a été annulé. Vous pouvez en reprendre un nouveau à tout moment.</span>
                    </div>
                  )}
                  {lookupResult.statut === 'RESERVE' && (
                    <div className="rdv-notice">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      <span>Vous pouvez annuler ou déplacer ce rendez-vous jusqu'à la veille. Un e-mail de confirmation vous sera envoyé après chaque modification.</span>
                    </div>
                  )}

                  {lookupResult.statut === 'RESERVE' && (
                    <div className="rdv-actions">
                      <button className="rdv-btn rdv-btn-danger" onClick={() => setCancelConfirmOpen(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        Annuler
                      </button>
                      <button className="rdv-btn rdv-btn-primary" onClick={startChange}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                        Changer le créneau
                      </button>
                    </div>
                  )}
                  {lookupResult.statut === 'ANNULE' && (
                    <div className="rdv-actions">
                      <button className="rdv-btn rdv-btn-primary" onClick={() => { setShowLookup(false); openBooking(); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                        Prendre un nouveau rendez-vous
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {cancelConfirmOpen && lookupResult && (
        <div className="rdv-confirm-overlay" onClick={() => !cancelSubmitting && setCancelConfirmOpen(false)}>
          <div className="rdv-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rdv-confirm-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            </div>
            <h3 className="rdv-confirm-title">Annuler ce rendez-vous ?</h3>
            <p className="rdv-confirm-text">
              Votre rendez-vous du <b>{fmtDateFull(new Date(lookupResult.dateDebut))}</b> à <b>{fmtTime(lookupResult.dateDebut)}</b> sera annulé. Cette action est définitive.
            </p>
            <div className="rdv-confirm-actions">
              <button
                className="rdv-btn booking-btn-ghost"
                onClick={() => setCancelConfirmOpen(false)}
                disabled={cancelSubmitting}
              >
                Garder le RDV
              </button>
              <button
                className="rdv-btn rdv-btn-danger"
                onClick={doCancel}
                disabled={cancelSubmitting}
              >
                {cancelSubmitting ? 'Annulation…' : 'Confirmer l\'annulation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBooking && (
        <div className="fullpage-overlay" style={{ zIndex: 1200 }}>
          <div className="fullpage-header">
            <div className="cr-brand"><div className="cr-brand-name" style={{ color: 'var(--ink)' }}>Réservation</div></div>
            <button className="booking-btn booking-btn-ghost" onClick={closeBooking}>Fermer</button>
          </div>
          <div className="fullpage-content">
            <div className="stepper">
              {(bookingMode === 'change' ? [1, 2] : [1, 2, 3, 4]).map((n, idx, arr) => (
                <div key={n} style={{ display: 'contents' }}>
                  <div className={`stepper-step${step === n ? ' active' : ''}${step > n ? ' done' : ''}`}>
                    <div className="stepper-circle">{n}</div>
                    <div className="stepper-label">
                      {(bookingMode === 'change'
                        ? ['Date & Heure', 'Confirmation']
                        : ['Pro & Service', 'Date & Heure', 'Vos infos', 'Confirmation'])[n - 1]}
                    </div>
                  </div>
                  {idx < arr.length - 1 && <div className={`stepper-line${step > n ? ' done' : ''}`}></div>}
                </div>
              ))}
            </div>
            <div className="booking-header" style={{ textAlign: 'center', marginBottom: 32 }}>
              <h3 className="booking-title display" style={{ fontSize: 28 }}>
                {bookingMode === 'change'
                  ? (step === 1 ? 'Choisir un nouveau créneau' : 'Confirmer le changement')
                  : ['Choisissez un professionnel & un service', '', 'Vos coordonnées', 'Récapitulatif', "C'est confirmé"][step - 1]}
              </h3>
            </div>

            {bookingMode === 'new' && step === 1 && (
              <div className="booking-panel">
                <p className="booking-step-intro">Sélectionnez le professionnel avec qui vous souhaitez prendre rendez-vous.</p>
                <div className="booking-pros-row">
                  {espace.professionnels.map((p) => (
                    <button key={p.id} type="button" className={`booking-pro-item${proId === p.id ? ' selected' : ''}`}
                      onClick={() => { setProId(p.id); const list = servicesByPro[p.id] || []; setServiceId(list[0]?.id || null); }}>
                      <span className="booking-pro-avatar"><img src={getProPhoto(p)} alt={p.nom} /></span>
                      <span className="booking-pro-name">{getProFirstName(p.nom)}</span>
                    </button>
                  ))}
                </div>
                <p className="booking-step-intro" style={{ marginTop: 8 }}>{currentPro ? `Services proposés par ${currentPro.nom} :` : "Choisissez un professionnel ci-dessus."}</p>
                <div className="booking-service-grid">
                  {currentProServices.map((s) => (
                    <div key={s.id} className={`booking-service-card${serviceId === s.id ? ' selected' : ''}`} onClick={() => setServiceId(s.id)}>
                      <div className="booking-service-img-wrap">
                        <span className={`booking-service-status ${STATUT_INFO[s.statut].type}`}>{STATUT_INFO[s.statut].label}</span>
                        <img src={s.imageUrl || FALLBACK_SERVICE_IMAGE} alt={s.nom} />
                      </div>
                      <div className="booking-service-body"><p className="booking-service-title">{s.nom}</p><p className="booking-service-desc">{s.description || ''}</p></div>
                    </div>
                  ))}
                </div>
                <div className="booking-nav">
                  <span></span>
                  <button className="booking-btn booking-btn-primary" disabled={!serviceId} onClick={() => setStep(2)}>Continuer</button>
                </div>
              </div>
            )}

            {((bookingMode === 'new' && step === 2) || (bookingMode === 'change' && step === 1)) && (
              <div className="booking-panel">
                <div className="booking-calendar-layout">
                  <div className="booking-calendar-side">
                    <div className="booking-cal-header">
                      <button type="button" className="booking-cal-nav-btn"
                        disabled={calendarMonth.getFullYear() === new Date().getFullYear() && calendarMonth.getMonth() === new Date().getMonth()}
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                      </button>
                      <button type="button" className="booking-cal-month-btn" onClick={() => { setMonthPickerOpen(!monthPickerOpen); setPickerYear(calendarMonth.getFullYear()); }}>
                        <span className="booking-cal-month">{fmtMonthYear(calendarMonth)}</span>
                        <span className="booking-cal-today-hint">Aujourd'hui : {fmtDateFull(new Date())}</span>
                      </button>
                      <button type="button" className="booking-cal-nav-btn" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                      </button>
                    </div>
                    {monthPickerOpen && (
                      <div className="booking-cal-month-picker">
                        <div className="booking-cal-year-row">
                          <button className="booking-cal-year-btn" disabled={pickerYear <= new Date().getFullYear()} onClick={() => setPickerYear(pickerYear - 1)}>‹</button>
                          <span className="booking-cal-year-label">{pickerYear}</span>
                          <button className="booking-cal-year-btn" onClick={() => setPickerYear(pickerYear + 1)}>›</button>
                        </div>
                        <div className="booking-cal-months-grid">
                          {MONTHS_SHORT.map((m, mIdx) => {
                            const mDate = new Date(pickerYear, mIdx, 1);
                            const minDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                            const disabled = mDate < minDate;
                            const selected = calendarMonth.getFullYear() === pickerYear && calendarMonth.getMonth() === mIdx;
                            return (
                              <button key={m} disabled={disabled} className={`booking-cal-month-option${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
                                onClick={() => { setCalendarMonth(new Date(pickerYear, mIdx, 1)); setMonthPickerOpen(false); }}>{m}</button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="booking-cal-weekdays">{['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => <span className="booking-cal-weekday" key={d}>{d}</span>)}</div>
                    <div className="booking-cal-grid">
                      {buildMonthGrid(calendarMonth.getFullYear(), calendarMonth.getMonth()).map((d, i) => {
                        if (!d) return <div className="booking-day empty" key={i}></div>;
                        const today = startOfDay(new Date());
                        const isPast = d < today;
                        const isToday = d.toDateString() === today.toDateString();
                        const isSelected = selectedDay && d.toDateString() === selectedDay.toDateString();
                        const noSlots = !isPast && unavailableDays.has(toDateKey(d));
                        const isDisabled = isPast || noSlots;
                        return (
                          <div
                            key={i}
                            className={`booking-day${isDisabled ? ' disabled' : ''}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}${noSlots ? ' no-slots' : ''}`}
                            onClick={() => { if (!isDisabled) setSelectedDay(d); }}
                            title={noSlots ? 'Aucun créneau disponible' : undefined}
                          >
                            <span className="num">{d.getDate()}</span>
                            {isToday && <span className="today-tag">Auj.</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="booking-slots-side">
                    {selectedDay ? (
                      <>
                        <div className="booking-slots-date-header">
                          <span className="booking-slots-date-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></span>
                          <div><p className="booking-slots-date-title">{fmtDateFull(selectedDay)}</p><p className="booking-slots-date-sub">Sélectionnez un créneau horaire</p></div>
                        </div>
                        {slotsLoading ? (
                          <p className="cr-section-sub">Chargement des créneaux…</p>
                        ) : slots.length ? (
                          <div className="booking-slots">
                            {slots.map((iso) => (
                              <div key={iso} className={`booking-slot${selectedSlotIso === iso ? ' selected' : ''}`} onClick={() => setSelectedSlotIso(iso)}>{fmtTime(iso)}</div>
                            ))}
                          </div>
                        ) : (
                          <p className="cr-section-sub">Aucun créneau disponible ce jour-là.</p>
                        )}
                        {selectedSlotIso && (
                          <div className="booking-slots-summary"><span className="booking-slots-summary-dot"></span>Créneau choisi : <b>{fmtTime(selectedSlotIso)}</b></div>
                        )}
                      </>
                    ) : (
                      <div className="booking-slots-empty">
                        <div className="booking-slots-empty-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></div>
                        <p className="booking-slots-empty-title">Sélectionnez une date</p>
                        <p className="booking-slots-empty-sub">Choisissez un jour dans le calendrier pour voir les créneaux horaires disponibles.</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="booking-nav">
                  <button className="booking-btn booking-btn-ghost" onClick={() => { if (bookingMode === 'change') { setShowBooking(false); setShowLookup(true); } else setStep(1); }}>
                    {bookingMode === 'change' ? 'Retour' : 'Annuler'}
                  </button>
                  <button className="booking-btn booking-btn-primary" disabled={!selectedSlotIso} onClick={() => setStep(bookingMode === 'change' ? 2 : 3)}>
                    Continuer
                  </button>
                </div>
              </div>
            )}

            {bookingMode === 'change' && step === 2 && (
              <div className="booking-panel">
                <div className="recap-block">
                  <div className="recap-row"><span>Service</span><b>{currentService?.nom}</b></div>
                  <div className="recap-row"><span>Nouveau créneau</span><b>{selectedDay && fmtDateFull(selectedDay)} à {selectedSlotIso && fmtTime(selectedSlotIso)}</b></div>
                </div>
                {formError && <div className="booking-error" style={{ marginTop: 14 }}>{formError}</div>}
                <div className="booking-nav">
                  <button className="booking-btn booking-btn-ghost" onClick={() => setStep(1)}>Retour</button>
                  <button className="booking-btn booking-btn-primary" disabled={submitting} onClick={confirmChange}>{submitting ? 'Validation…' : 'Valider le changement'}</button>
                </div>
              </div>
            )}

            {bookingMode === 'new' && step === 3 && (
              <div className="booking-panel">
                <p className="booking-step-intro">Renseignez vos informations pour finaliser la réservation.</p>
                <div className="booking-form-layout">
                  <div className="booking-form-box">
                    <div className="booking-field">
                      <label>Nom <span style={{ color: '#B5473A' }}>*</span></label>
                      <input
                        value={patient.nom}
                        onChange={(e) => { setPatient({ ...patient, nom: e.target.value }); }}
                        onBlur={(e) => validateField('nom', e.target.value)}
                        placeholder="Ex. Bensalem"
                        className={fieldErrors.nom ? 'field-invalid' : ''}
                      />
                      {fieldErrors.nom && <div className="booking-error">{fieldErrors.nom}</div>}
                    </div>
                    <div className="booking-field">
                      <label>Prénom <span style={{ color: '#B5473A' }}>*</span></label>
                      <input
                        value={patient.prenom}
                        onChange={(e) => { setPatient({ ...patient, prenom: e.target.value }); }}
                        onBlur={(e) => validateField('prenom', e.target.value)}
                        placeholder="Ex. Karim"
                        className={fieldErrors.prenom ? 'field-invalid' : ''}
                      />
                      {fieldErrors.prenom && <div className="booking-error">{fieldErrors.prenom}</div>}
                    </div>
                    <div className="booking-field">
                      <label>Adresse <span style={{ color: '#B5473A' }}>*</span></label>
                      <input
                        value={patient.adresse}
                        onChange={(e) => { setPatient({ ...patient, adresse: e.target.value }); }}
                        onBlur={(e) => validateField('adresse', e.target.value)}
                        placeholder="Ex. 14 rue des Frères Bougara, Sétif"
                        className={fieldErrors.adresse ? 'field-invalid' : ''}
                      />
                      {fieldErrors.adresse && <div className="booking-error">{fieldErrors.adresse}</div>}
                    </div>
                    <div className="booking-field">
                      <label>Date de naissance <span style={{ color: '#B5473A' }}>*</span></label>
                      <input
                        type="date"
                        value={patient.dateNaissance}
                        max={toDateKey(new Date())}
                        onChange={(e) => {
                          const v = e.target.value;
                          setPatient({ ...patient, dateNaissance: v });
                          validateField('dateNaissance', v);
                        }}
                        onBlur={(e) => validateField('dateNaissance', e.target.value)}
                        className={fieldErrors.dateNaissance ? 'field-invalid' : ''}
                      />
                      {fieldErrors.dateNaissance && <div className="booking-error">{fieldErrors.dateNaissance}</div>}
                    </div>
                    <div className="booking-field">
                      <label>Téléphone <span style={{ color: '#B5473A' }}>*</span></label>
                      <input
                        value={patient.telephone}
                        inputMode="numeric"
                        maxLength={10}
                        onChange={(e) => { const digits = e.target.value.replace(/\D/g, '').slice(0, 10); setPatient({ ...patient, telephone: digits }); }}
                        onBlur={(e) => validateField('telephone', e.target.value)}
                        placeholder="0612345678 (10 chiffres)"
                        className={fieldErrors.telephone ? 'field-invalid' : ''}
                      />
                      {fieldErrors.telephone && <div className="booking-error">{fieldErrors.telephone}</div>}
                    </div>
                    <div className="booking-field">
                      <label>Adresse e-mail <span style={{ color: '#B5473A' }}>*</span></label>
                      <div className="verify-row">
                        <input
                          type="email"
                          value={patient.email}
                          disabled={emailSent}
                          onChange={(e) => setPatient({ ...patient, email: e.target.value })}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (!v.trim()) {
                              setFieldErrors((prev) => { const next = { ...prev }; delete next.email; return next; });
                            } else if (!isValidEmailFormat(v)) {
                              setFieldErrors((prev) => ({ ...prev, email: FIELD_ERROR_MESSAGES.email }));
                            } else {
                              setFieldErrors((prev) => { const next = { ...prev }; delete next.email; return next; });
                            }
                          }}
                          placeholder="vous@exemple.com"
                          className={fieldErrors.email ? 'field-invalid' : ''}
                        />
                        {!emailSent ? <button type="button" className="booking-btn booking-btn-ghost" onClick={sendVerificationCode}>Envoyer le code</button> : <span className="verify-sent">Code envoyé ✓</span>}
                      </div>
                      {fieldErrors.email && <div className="booking-error">{fieldErrors.email}</div>}
                    </div>
                    {emailSent && !emailVerified && (
                      <div className="booking-field">
                        <label>Code de vérification</label>
                        <div className="verify-row">
                          <input value={enteredCode} onChange={(e) => setEnteredCode(e.target.value)} placeholder="4 chiffres" maxLength={4} />
                          <button type="button" className="booking-btn booking-btn-primary" onClick={verifyEmailCode}>Vérifier</button>
                        </div>
                        {codeError && <div className="booking-error">Code incorrect, veuillez réessayer.</div>}
                        <p className="dev-hint">Démo (envoi réel à brancher plus tard) — code : {devCode}</p>
                      </div>
                    )}
                    {emailVerified && <p className="verify-sent">Adresse e-mail vérifiée ✓</p>}
                    {(currentService?.champsPersonnalises || []).slice().sort((a, b) => a.ordre - b.ordre).map((champ) => (
                      <div className="booking-field" key={champ.id}>
                        <label>{champ.label}{champ.obligatoire ? ' *' : ' (optionnel)'}</label>
                        {champ.type === 'TEXTE_LONG' ? (
                          <textarea value={champReponses[champ.id] || ''} onChange={(e) => setChampReponses({ ...champReponses, [champ.id]: e.target.value })} />
                        ) : champ.type === 'SELECTION' ? (
                          <select value={champReponses[champ.id] || ''} onChange={(e) => setChampReponses({ ...champReponses, [champ.id]: e.target.value })} style={{ width: '100%', border: '1px solid var(--primary-light)', borderRadius: 10, padding: '12px 14px', fontFamily: 'inherit', fontSize: 14, background: '#fff' }}>
                            <option value="">— Choisir —</option>
                            {champ.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : champ.type === 'RADIO' ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                            {champ.options.map((opt) => (
                              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink)' }}>
                                <input type="radio" name={champ.id} checked={champReponses[champ.id] === opt} onChange={() => setChampReponses({ ...champReponses, [champ.id]: opt })} />{opt}
                              </label>
                            ))}
                          </div>
                        ) : champ.type === 'CHECKBOX' || champ.type === 'SWITCH' ? (
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink)' }}>
                            <input type="checkbox" checked={champReponses[champ.id] === 'true'} onChange={(e) => setChampReponses({ ...champReponses, [champ.id]: e.target.checked ? 'true' : 'false' })} /> Oui
                          </label>
                        ) : champ.type === 'DATE' ? (
                          <input type="date" value={champReponses[champ.id] || ''} onChange={(e) => setChampReponses({ ...champReponses, [champ.id]: e.target.value })} />
                        ) : champ.type === 'NOMBRE' ? (
                          <input type="number" value={champReponses[champ.id] || ''} onChange={(e) => setChampReponses({ ...champReponses, [champ.id]: e.target.value })} />
                        ) : champ.type === 'FICHIER' ? (
                          <input type="text" value={champReponses[champ.id] || ''} onChange={(e) => setChampReponses({ ...champReponses, [champ.id]: e.target.value })} placeholder="Lien ou référence du document (l'envoi de fichier n'est pas encore disponible)" />
                        ) : (
                          <input type="text" value={champReponses[champ.id] || ''} onChange={(e) => setChampReponses({ ...champReponses, [champ.id]: e.target.value })} />
                        )}
                      </div>
                    ))}
                    <div className="booking-field"><label>Motif / note (optionnel)</label><textarea value={patient.note} onChange={(e) => setPatient({ ...patient, note: e.target.value })} placeholder="Précisez si besoin..." /></div>
                    {formError && <div className="booking-error">{formError}</div>}
                  </div>
                  <div className="booking-recap-side">
                    <div className="recap-block">
                      <div className="recap-row"><span>Professionnel</span><b>{currentPro?.nom || '—'}</b></div>
                      <div className="recap-row"><span>Service</span><b>{currentService?.nom || '—'}</b></div>
                      <div className="recap-row"><span>Durée</span><b>{currentService?.dureeMinutes} min</b></div>
                      <div className="recap-row"><span>Date</span><b>{selectedDay && fmtDateFull(selectedDay)}</b></div>
                      <div className="recap-row"><span>Heure</span><b>{selectedSlotIso && fmtTime(selectedSlotIso)}</b></div>
                    </div>
                  </div>
                </div>
                <div className="booking-nav">
                  <button className="booking-btn booking-btn-ghost" onClick={() => setStep(2)}>Retour</button>
                  <button className="booking-btn booking-btn-primary" onClick={() => {
                    if (!validateAllFields()) { setFormError('Merci de corriger les champs signalés en rouge ci-dessus.'); return; }
                    if (!emailVerified) { setFormError("Merci de vérifier votre adresse e-mail avant de continuer."); return; }
                    const champsManquants = (currentService?.champsPersonnalises || []).filter((c) => c.obligatoire && !champReponses[c.id]?.trim());
                    if (champsManquants.length) { setFormError(`Merci de renseigner : ${champsManquants.map((c) => c.label).join(', ')}.`); return; }
                    setFormError(null); setStep(4);
                  }}>Voir le récapitulatif</button>
                </div>
              </div>
            )}

            {bookingMode === 'new' && step === 4 && (
              <BookingRecapStep
                currentPro={currentPro} currentService={currentService} selectedDay={selectedDay} selectedSlotIso={selectedSlotIso}
                patient={patient} formError={formError} submitting={submitting} onBack={() => setStep(3)}
                onOpenTerms={() => { setTermsFromBooking(true); setShowTerms(true); }} onSubmit={submitBooking}
                accepted={termsAccepted} setAccepted={setTermsAccepted}
              />
            )}

            {bookingMode === 'new' && step === 5 && confirmedRdv && (
              <div className="booking-panel">
                <div className="booking-confirm-head">
                  <div className="booking-check"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#8957FF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></div>
                  <h4 className="booking-confirm-title display">Rendez-vous confirmé</h4>
                  <p className="booking-confirm-sub">Une confirmation a été envoyée à {confirmedRdv.client?.email || patient.email}. Un rappel vous sera envoyé la veille.</p>
                </div>
                <div className="ticket">
                  <div className="ticket-top">
                    <div className="ticket-top-row">
                      <div><div className="ticket-label">Patient</div><div className="ticket-value">{confirmedRdv.client?.prenom} {confirmedRdv.client?.nom}</div></div>
                      <div><div className="ticket-label">Professionnel</div><div className="ticket-value">{getProFirstName(confirmedRdv.professionnel?.nom || currentPro?.nom || '')}</div></div>
                    </div>
                  </div>
                  <div className="ticket-dashes"></div>
                  <div className="ticket-bottom">
                    <div className="ticket-service">
                      <div className="ticket-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2v2" /><path d="M5 2v2" /><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" /><path d="M8 15a6 6 0 0 0 12 0v-3" /><circle cx="20" cy="10" r="2" /></svg></div>
                      <div><div className="ticket-service-name">{confirmedRdv.service?.nom}</div><div className="ticket-service-sub">{confirmedRdv.service?.dureeMinutes} min · {formatPrix(confirmedRdv.service?.prix)}</div></div>
                    </div>
                    <div className="ticket-meta">
                      <div className="ticket-meta-block"><div className="ticket-label">Créneau</div><div className="ticket-value">{fmtDateFull(new Date(confirmedRdv.dateDebut))}</div></div>
                    </div>
                  </div>
                </div>
                <div className="recap-block" style={{ marginTop: 14 }}>
                  <div className="recap-row"><span>Code de gestion</span><b style={{ wordBreak: 'break-all' }}>{confirmedRdv.manageToken}</b></div>
                  <p className="dev-hint" style={{ marginTop: 8 }}>Conservez ce code : il vous permettra d'annuler ou de modifier ce rendez-vous depuis « Gérer mon rendez-vous ».</p>
                </div>
                <div className="booking-nav"><span></span><button className="booking-btn booking-btn-primary" onClick={closeBooking}>Terminer</button></div>
              </div>
            )}
          </div>
        </div>
      )}

      {showTerms && (
        <div className="booking-overlay">
          <div className="booking-modal" role="dialog" aria-modal="true">
            <button className="booking-close" onClick={() => setShowTerms(false)} aria-label="Fermer">×</button>
            <div className="booking-header">
              <p className="booking-eyebrow">À lire avant de réserver</p>
              <h3 className="booking-title display">Conditions de réservation</h3>
            </div>
            <div className="terms-body">
              {espace.conditionsReservation ? (
                <p style={{ whiteSpace: 'pre-line' }}>{espace.conditionsReservation}</p>
              ) : (
                <p>
                  La réservation se fait sans création de compte. Après confirmation, vous recevez un code de gestion unique
                  qui vous permet d'annuler ou de modifier votre rendez-vous à tout moment. Un délai minimum avant le
                  rendez-vous peut s'appliquer pour toute annulation ou modification ; le cas échéant, un message vous
                  l'indiquera au moment de votre demande. Les informations transmises servent uniquement à la gestion
                  de votre rendez-vous.
                </p>
              )}
            </div>
            <div className="booking-nav">
              <span></span>
              {termsFromBooking ? (
                <button className="booking-btn booking-btn-primary" onClick={() => { setTermsAccepted(true); setShowTerms(false); }}>J'accepte les conditions</button>
              ) : (
                <button className="booking-btn booking-btn-primary" onClick={() => setShowTerms(false)}>J'ai compris</button>
              )}
            </div>
          </div>
        </div>
      )}

      <AssistantWidget mode="public" />
    </>
  );
}

function BookingRecapStep({ currentPro, currentService, selectedDay, selectedSlotIso, patient, formError, submitting, onBack, onOpenTerms, onSubmit, accepted, setAccepted }: any) {
  return (
    <div className="booking-panel">
      <div className="recap-block">
        <div className="recap-row"><span>Professionnel</span><b>{currentPro?.nom}</b></div>
        <div className="recap-row"><span>Service</span><b>{currentService?.nom}</b></div>
        <div className="recap-row"><span>Durée</span><b>{currentService?.dureeMinutes} min</b></div>
        <div className="recap-row"><span>Date</span><b>{selectedDay && fmtDateFull(selectedDay)}</b></div>
        <div className="recap-row"><span>Heure</span><b>{selectedSlotIso && fmtTime(selectedSlotIso)}</b></div>
        <div className="recap-row"><span>Nom</span><b>{patient.prenom} {patient.nom}</b></div>
        <div className="recap-row"><span>Téléphone</span><b>{patient.telephone}</b></div>
        <div className="recap-row"><span>E-mail</span><b>{patient.email}</b></div>
        {patient.note && <div className="recap-row"><span>Note</span><b>{patient.note}</b></div>}
      </div>
      <label className="recap-consent">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        J'ai lu et j'accepte les <a href="#" onClick={(e) => { e.preventDefault(); onOpenTerms(); }}>conditions de réservation</a>.
      </label>
      {formError && <div className="booking-error">{formError}</div>}
      <div className="booking-nav">
        <button className="booking-btn booking-btn-ghost" onClick={onBack}>Retour</button>
        <button className="booking-btn booking-btn-primary" disabled={submitting} onClick={() => onSubmit(accepted)}>{submitting ? 'Confirmation…' : 'Confirmer le rendez-vous'}</button>
      </div>
    </div>
  );
}