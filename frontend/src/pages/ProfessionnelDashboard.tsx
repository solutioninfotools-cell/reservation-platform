// @ts-nocheck -- vue portée depuis un script JS existant, branchée sur l'API réelle (/api/professionnel, /api/appointments)
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { professionnelApi, appointmentsApi } from '../api/professionnel.api';
import { notificationsApi } from '../api/notifications.api';
import { publicApi, assistantApi } from '../api/public.api';

export default function ProfessionnelDashboard() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    const ac = new AbortController();
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      logout();
      navigate('/connexion');
    }, { signal: ac.signal });

  /* =========================================================
     DONNÉES — toutes issues de l'API (aucune donnée simulée).
     Le backend est la seule autorité : il possède le moteur de
     créneaux, les transitions de statut et les règles de réservation.
     ========================================================= */
  const STATUS = {
    RESERVE:       { label: "Réservé",       cls: "st-reserve",  color: "#8957FF" },
    CLIENT_ARRIVE: { label: "Client arrivé", cls: "st-arrive",   color: "#2FA79D" },
    EN_COURS:      { label: "En cours",      cls: "st-encours",  color: "#E2954A" },
    TERMINE:       { label: "Terminé",       cls: "st-termine",  color: "#3FA65C" },
    ABSENT:        { label: "Absent",        cls: "st-absent",   color: "#8A8496" },
    ANNULE:        { label: "Annulé",        cls: "st-annule",   color: "#D9483C" },
  };
  // Miroir des transitions acceptées par le backend.
  const TRANSITIONS = {
    RESERVE: ["CLIENT_ARRIVE", "EN_COURS", "TERMINE", "ABSENT", "ANNULE"],
    CLIENT_ARRIVE: ["EN_COURS", "TERMINE", "ANNULE"],
    EN_COURS: ["TERMINE", "ANNULE"],
    TERMINE: [], ABSENT: [], ANNULE: [],
  };
  const ORIGINE_LABELS = { EN_LIGNE: "En ligne", RECEPTIONNISTE: "Réceptionniste", PROFESSIONNEL: "Professionnel" };
  const STATUT_SERVICE = {
    DISPONIBLE: { label: "Disponible", cls: "st-termine" },
    COMPLET: { label: "Complet", cls: "st-encours" },
    INDISPONIBLE: { label: "Indisponible", cls: "st-absent" },
  };
  // Types de champs personnalisés — valeurs de l'enum TypeChamp du backend.
  const FIELD_TYPES = [
    { value: "TEXTE",      label: "Texte court" },
    { value: "TEXTE_LONG", label: "Texte long" },
    { value: "NOMBRE",     label: "Nombre" },
    { value: "SELECTION",  label: "Liste déroulante" },
    { value: "RADIO",      label: "Boutons radio" },
    { value: "CHECKBOX",   label: "Cases à cocher" },
    { value: "SWITCH",     label: "Oui / Non" },
    { value: "DATE",       label: "Date" },
    { value: "FICHIER",    label: "Upload fichier / photo" },
  ];
  const HAS_OPTIONS_TYPES = ["SELECTION", "RADIO", "CHECKBOX"];
  const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const TYPES_INDISPO = { CRENEAU: "Créneau", JOURNEE: "Journée", PERIODE: "Période" };
  const NOTIF_STYLE = {
    NOUVELLE_RESERVATION:    { bg: "#F1ECFF", color: "#8957FF", svg: '<path d="M12 5v14M5 12h14"/>' },
    ANNULATION:              { bg: "#FDEDEC", color: "#D9483C", svg: '<circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' },
    MODIFICATION:            { bg: "#FDF1E2", color: "#E2954A", svg: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>' },
    CHANGEMENT_STATUT:       { bg: "#FDF1E2", color: "#E2954A", svg: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
    CONFLIT_PLANNING:        { bg: "#FDF1E2", color: "#E2954A", svg: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
    RAPPEL:                  { bg: "#E6F7F5", color: "#2FA79D", svg: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>' },
    AFFECTATION:             { bg: "#E6F7F5", color: "#2FA79D", svg: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>' },
    AUTORISATIONS_MODIFIEES: { bg: "#F1ECFF", color: "#8957FF", svg: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>' },
    PROFESSIONNEL_ABSENT:    { bg: "#EEEDF2", color: "#8A8496", svg: '<circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>' },
    COMPTE_VALIDE:           { bg: "#E9F7ED", color: "#3FA65C", svg: '<polyline points="20 6 9 17 4 12"/>' },
    COMPTE_REFUSE:           { bg: "#FDEDEC", color: "#D9483C", svg: '<circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' },
  };
  const NOTIF_FALLBACK = { bg: "#EEEDF2", color: "#8A8496", svg: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' };

  let ME = { id: "", name: "", role: "", email: "", color: "#8957FF", initials: "" };
  let PROFILE = { nom: "", specialite: "", description: "", adresse: "", telephone: "", email: "", photoUrl: "" };
  let SERVICES = [];
  let CHAMPS = [];         // champs personnalisés, tous services confondus
  let APPTS = [];
  let CLIENTS = [];        // fiches clients réelles renvoyées par l'API
  let NOTES = [];          // notes internes réelles
  let RECEPTIONNISTES = [];
  let DISPOS = [];         // disponibilités hebdomadaires (lignes de la base)
  let INDISPOS = [];
  let PARAMS = null;
  let STATS = null;
  let NOTIFS = [];

  window.todayISO = function todayISO() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  window.isoPlusDays = function isoPlusDays(iso, n) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + n);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  const TODAY = todayISO();

  let state = {
    page: "dashboard", agendaView: "day", agendaDate: TODAY, monthCursor: TODAY.slice(0, 7),
    rdvFilters: { status: "", search: "" },
    clientsView: "list", clientsFilters: { search: "", upcoming: "" },
    servicesView: "grid", servicesFilters: { search: "", actif: "" },
    receptionnistesView: "list", receptionnistesFilters: { search: "", status: "" },
    dispoIndispoOpen: false,
    newRdv: { serviceId: "", date: "", start: "", dateDebut: "", creneaux: [] },
  };

  // Brouillon du constructeur de champs personnalisés
  let CF_SERVICE_ID = null;
  let CF_EDIT_DRAFT = null;

  /* =========================================================
     UTILITAIRES
     ========================================================= */
  window.esc = function esc(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  window.escArg = function escArg(value) {
    const str = value === null || value === undefined ? "" : String(value);
    return esc(str.replace(/\\/g, "\\\\").replace(/'/g, "\\'"));
  }
  window.toDay = function toDay(value) {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "" : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  window.toHM = function toHM(value) {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "" : String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  window.fmtDateLong = function fmtDateLong(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  window.fmtDateShort = function fmtDateShort(value) {
    if (!value) return "—";
    const d = String(value).length === 10 ? new Date(value + "T00:00:00") : new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  window.fmtRelative = function fmtRelative(value) {
    if (!value) return "—";
    const min = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
    if (min < 1) return "À l'instant";
    if (min < 60) return `Il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `Il y a ${h} h`;
    const j = Math.floor(h / 24);
    if (j === 1) return "Hier";
    if (j < 31) return `Il y a ${j} j`;
    return fmtDateShort(value);
  }
  window.capitalize = function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  window.calcAge = function calcAge(dob) {
    if (!dob) return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
    return age;
  }
  window.initials = function initials(name) {
    return (name || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  }
  // Le prix est stocké en centimes côté base.
  window.fmtPrix = function fmtPrix(centimes) {
    return centimes === null || centimes === undefined ? "—" : (centimes / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DA";
  }
  window.val = function val(id) { return (document.getElementById(id)?.value || "").trim(); }
  window.setText = function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
  window.showToast = function showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.innerHTML = msg;
    t.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }
  window.showError = function showError(err) {
    const msg = (err?.response?.data?.error ?? err?.response?.data?.message) || err?.message || "Une erreur est survenue.";
    showToast(esc(Array.isArray(msg) ? msg.join(", ") : msg));
  }

  /* =========================================================
     CHARGEMENT DES DONNÉES
     ========================================================= */
  const mapAppt = (r) => ({
    id: r.id,
    date: toDay(r.dateDebut),
    start: toHM(r.dateDebut),
    end: toHM(r.dateFin),
    dateDebut: r.dateDebut,
    clientId: r.clientId,
    client: `${r.client?.prenom || ""} ${r.client?.nom || ""}`.trim() || "—",
    phone: r.client?.telephone || "—",
    email: r.client?.email || "",
    dob: r.client?.dateNaissance ? toDay(r.client.dateNaissance) : "",
    service: r.service?.nom || "—",
    serviceId: r.serviceId,
    status: r.statut,
    remark: r.remarque || "",
    motif: r.motifAnnulation || "",
    source: ORIGINE_LABELS[r.origine] || r.origine,
    createdAt: r.createdAt,
  });
  const mapClient = (c) => ({
    id: c.id,
    name: `${c.prenom || ""} ${c.nom || ""}`.trim() || "—",
    phone: c.telephone || "—",
    email: c.email || "",
    dob: c.dateNaissance ? toDay(c.dateNaissance) : "",
  });
  const mapNotif = (n) => ({ id: n.id, type: n.type, text: esc(n.message), time: fmtRelative(n.createdAt), unread: !n.lu });

  window.loadAll = async function loadAll() {
    try {
      const [moi, services, champs, clients, notes, dispos, indispos, params, receptionnistes, stats, notifs] = await Promise.all([
        professionnelApi.moi(),
        professionnelApi.listServices(),
        professionnelApi.listChamps(),
        professionnelApi.listClients(),
        professionnelApi.listNotes(),
        professionnelApi.listDisponibilites(),
        professionnelApi.listIndisponibilites(),
        professionnelApi.getParametres(),
        professionnelApi.listReceptionnistes(),
        professionnelApi.stats(),
        notificationsApi.list(),
      ]);
      ME = { id: moi.id, name: moi.nom, role: moi.specialite || "—", email: moi.email, color: "#8957FF", initials: initials(moi.nom) };
      // Barre du haut : identité du compte connecté, jamais une valeur en dur.
      setText("tbAvatar", ME.initials);
      setText("tbUserName", ME.name);
      setText("tbUserRole", moi.specialite ? `Professionnel · ${moi.specialite}` : "Professionnel");
      PROFILE = {
        nom: moi.nom || "", specialite: moi.specialite || "", description: moi.description || "",
        adresse: moi.adresse || "", telephone: moi.telephone || "", email: moi.email || "", photoUrl: moi.photoUrl || "",
      };
      SERVICES = services;
      CHAMPS = champs;
      CLIENTS = clients.map(mapClient);
      NOTES = notes;
      DISPOS = dispos;
      INDISPOS = indispos;
      PARAMS = params;
      RECEPTIONNISTES = receptionnistes.map((a) => ({
        affectationId: a.id,
        id: a.receptionniste.id,
        name: a.receptionniste.nom,
        email: a.receptionniste.user?.email || "—",
        phone: a.receptionniste.telephone || "—",
        active: a.actif,
        perms: {
          peutConsulterAgenda: a.peutConsulterAgenda,
          peutGererRdv: a.peutGererRdv,
          peutGererPlanning: a.peutGererPlanning,
          peutGererParametres: a.peutGererParametres,
        },
      }));
      STATS = stats;
      NOTIFS = notifs.map(mapNotif);
      // Les rendez-vous ne peuvent être demandés qu'une fois l'identifiant du
      // professionnel connu : le backend scope la liste à ce professionnel.
      APPTS = (await appointmentsApi.list({ professionnelId: ME.id })).map(mapAppt);
      return true;
    } catch (e) { showError(e); return false; }
  }
  window.refreshAll = async function refreshAll(silencieux) {
    const ok = await loadAll();
    renderPage(state.page);
    if (ok && !silencieux) showToast("Données actualisées");
  }
  window.champsDuService = function champsDuService(serviceId) {
    return CHAMPS.filter((c) => c.serviceId === serviceId).sort((a, b) => (a.ordre - b.ordre) || String(a.createdAt).localeCompare(String(b.createdAt)));
  }

  /* =========================================================
     NAVIGATION
     ========================================================= */
  window.goToPage = function goToPage(page) {
    state.page = page;
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.page === page));
    document.querySelectorAll(".page").forEach((p) => p.classList.toggle("active", p.id === "page-" + page));
    renderPage(page);
  }
  document.querySelectorAll(".nav-item").forEach((item) => item.addEventListener("click", () => goToPage(item.dataset.page), { signal: ac.signal }));
  document.getElementById("collapseBtn")?.addEventListener("click", () => {
    const sb = document.getElementById("sidebar");
    if (!sb) return;
    sb.classList.toggle("collapsed");
    const icon = document.getElementById("collapseIcon");
    if (icon) icon.style.transform = sb.classList.contains("collapsed") ? "rotate(180deg)" : "rotate(0deg)";
  }, { signal: ac.signal });
  document.getElementById("notifBellBtn")?.addEventListener("click", () => goToPage("notifs"), { signal: ac.signal });

  window.renderPage = function renderPage(page) {
    try {
      renderPageHead(page);
      if (page === "dashboard") renderDashboard();
      else if (page === "agenda") renderAgenda();
      else if (page === "rdv") renderRdvPage();
      else if (page === "clients") renderClientsPage();
      else if (page === "services") renderServicesPage();
      else if (page === "dispo") renderDispoPage();
      else if (page === "receptionnistes") renderReceptionnistesPage();
      else if (page === "stats") renderStatsPage();
      else if (page === "assistant") renderAssistantPage();
      else if (page === "notifs") renderNotifsPage();
      else if (page === "profil") renderProfilPage();
    } catch (err) {
      console.error("[RendezVousApp] Erreur d'affichage de la page", page, err);
      showToast("Une erreur est survenue lors de l'affichage de cette page");
    }
    updateNotifBadges();
  }
  window.updateNotifBadges = function updateNotifBadges() {
    const n = NOTIFS.filter((x) => x.unread).length;
    const set = (id, display) => { const el = document.getElementById(id); if (!el) return; el.textContent = n; el.style.display = n ? display : "none"; };
    set("navNotifBadge", "inline-block");
    set("tbNotifDot", "flex");
  }

  /* =========================================================
     ICONES
     ========================================================= */
  window.svg = function svg(inner, w) { w = w || 15; return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`; }
  window.iconPlus = function iconPlus() { return svg('<path d="M12 5v14M5 12h14"/>'); }
  window.iconCal = function iconCal() { return svg('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'); }
  window.iconCheck = function iconCheck() { return svg('<polyline points="20 6 9 17 4 12"/>'); }
  window.iconCheckCircle = function iconCheckCircle() { return svg('<circle cx="12" cy="12" r="9"/><polyline points="8 12 11 15 16 9"/>'); }
  window.iconClock = function iconClock() { return svg('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>'); }
  window.iconX = function iconX() { return svg('<circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'); }
  window.iconUsers = function iconUsers() { return svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'); }
  window.iconChevronLeft = function iconChevronLeft() { return svg('<polyline points="15 18 9 12 15 6"/>', 14); }
  window.iconChevronRight = function iconChevronRight() { return svg('<polyline points="9 18 15 12 9 6"/>', 14); }
  window.iconPrinter = function iconPrinter() { return svg('<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'); }
  window.iconEdit = function iconEdit() { return svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>', 14); }
  window.iconEye = function iconEye() { return svg('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>', 14); }
  window.iconTrash = function iconTrash() { return svg('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', 14); }
  window.iconAlert = function iconAlert() { return svg('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', 12); }
  window.iconSend = function iconSend() { return svg('<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'); }
  window.iconBot = function iconBot() { return svg('<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="8.5" cy="16" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.5" cy="16" r="1.2" fill="currentColor" stroke="none"/><path d="M12 11V7"/><circle cx="12" cy="5" r="2"/>'); }
  window.iconGrid = function iconGrid() { return svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>', 14); }
  window.iconList = function iconList() { return svg('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>', 14); }
  window.iconRefresh = function iconRefresh() { return svg('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>', 14); }

  /* =========================================================
     EN-TÊTE DE PAGE UNIQUE
     ========================================================= */
  const PAGE_META = {
    dashboard: { title: () => ME.name ? `Bonjour, ${ME.name.replace(/^Dr\.\s*/, "")}` : "Tableau de bord", sub: () => `Voici un résumé de votre activité aujourd'hui — ${fmtDateLong(TODAY)}`, action: { label: "Nouveau rendez-vous", onClick: "openNewRdv()", icon: true } },
    agenda: { title: "Agenda", sub: "Vues par jour, semaine ou mois — cliquez un rendez-vous pour le consulter", action: { label: "Nouveau rendez-vous", onClick: "openNewRdv()", icon: true } },
    rdv: { title: "Réservations", sub: "Toutes vos réservations, filtrables par état", action: { label: "Nouveau rendez-vous", onClick: "openNewRdv()", icon: true } },
    clients: { title: "Clients", sub: "Clients associés à votre activité" },
    services: { title: "Services", sub: "Gérez les services proposés à vos clients", action: { label: "Ajouter un service", onClick: "openServiceForm()", icon: true } },
    dispo: { title: "Disponibilités", sub: "Jours, horaires et périodes fermées — utilisés par le moteur de créneaux" },
    receptionnistes: { title: "Réceptionnistes", sub: "Gérez les réceptionnistes qui vous sont affectées et leurs autorisations" },
    stats: { title: "Statistiques", sub: "Activité réelle, calculée par le serveur" },
    assistant: { title: "Assistant", sub: "Réponses fondées sur les données de votre espace" },
    notifs: { title: "Notifications", sub: "Nouvelles réservations, annulations, modifications d'agenda…", action: { label: "Tout marquer comme lu", onClick: "markAllRead()", ghost: true } },
    profil: { title: "Profil professionnel", sub: "Ces informations apparaissent sur votre page publique de réservation" },
  };
  window.renderPageHead = function renderPageHead(page) {
    const meta = PAGE_META[page];
    const titleEl = document.getElementById("pageTitleMain");
    const subEl = document.getElementById("pageSubMain");
    const actionsEl = document.getElementById("pageActionsMain");
    if (!meta || !titleEl || !subEl || !actionsEl) return;
    titleEl.textContent = typeof meta.title === "function" ? meta.title() : meta.title;
    subEl.textContent = typeof meta.sub === "function" ? meta.sub() : meta.sub;
    if (meta.action) {
      const a = meta.action;
      actionsEl.innerHTML = `<button class="btn ${a.ghost ? 'btn-ghost btn-sm' : 'btn-primary'}" onclick="${a.onClick}">${a.icon ? iconPlus() : ''}${a.label}</button>`;
    } else {
      actionsEl.innerHTML = "";
    }
  }

  /* =========================================================
     PAGE : TABLEAU DE BORD
     ========================================================= */
  window.renderDashboard = function renderDashboard() {
    const todays = APPTS.filter((a) => a.date === TODAY && a.status !== "ANNULE");
    const upcoming = APPTS.filter((a) => a.date > TODAY && a.status === "RESERVE");
    const s = STATS || {};

    const statCards = [
      { label: "Rendez-vous aujourd'hui", value: todays.length, icon: iconCal(), bg: "#F1ECFF", color: "#8957FF" },
      { label: "Prochains rendez-vous", value: upcoming.length, icon: iconClock(), bg: "#FDF1E2", color: "#E2954A" },
      { label: "Rendez-vous terminés", value: s.termines ?? 0, icon: iconCheckCircle(), bg: "#E9F7ED", color: "#3FA65C" },
      { label: "Clients", value: s.nbClients ?? 0, icon: iconUsers(), bg: "#E6F7F5", color: "#2FA79D" },
      { label: "Services publiés", value: s.servicesActifs ?? 0, icon: iconCheck(), bg: "#EEEDF2", color: "#8A8496" },
    ];
    const quickLinks = [
      ["agenda", "Agenda", iconCal()], ["rdv", "Réservations", iconCheck()], ["clients", "Clients", iconUsers()],
      ["services", "Services", iconCheck()], ["dispo", "Disponibilités", iconClock()], ["receptionnistes", "Réceptionnistes", iconUsers()], ["stats", "Statistiques", iconCheckCircle()],
    ];
    const planning = todays.slice().sort((a, b) => a.start.localeCompare(b.start));

    document.getElementById("page-dashboard").innerHTML = `
      ${DISPOS.length ? "" : `<div class="card" style="background:#FDF1E2;border-color:#F3D9AE;padding:14px 18px;display:flex;align-items:center;gap:10px;margin-bottom:18px;font-size:12.5px;color:#8A5A1E;">
        ${iconAlert()} Aucune disponibilité définie : vos clients ne peuvent pas encore réserver.
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="goToPage('dispo')">Définir mes horaires</button>
      </div>`}
      <div class="stat-grid">
        ${statCards.map((c) => `<div class="stat-card"><div class="stat-icon" style="background:${c.bg};color:${c.color}">${c.icon}</div><div class="stat-value">${c.value}</div><div class="stat-label">${c.label}</div></div>`).join("")}
      </div>
      <div class="dash-grid">
        <div class="card">
          <div class="card-head"><h3>Planning du jour</h3><button class="btn btn-ghost btn-sm" onclick="goToPage('agenda')">Voir l'agenda</button></div>
          ${planning.length ? planning.map((a) => `
            <div class="dash-list-row">
              <span class="dash-list-time">${esc(a.start)}</span>
              <div style="flex:1"><div class="dash-list-name">${esc(a.client)}</div><div class="dash-list-sub">${esc(a.service)}</div></div>
              <span class="status-pill ${STATUS[a.status].cls}">${STATUS[a.status].label}</span>
            </div>`).join("") : `<div class="table-empty">Aucun rendez-vous aujourd'hui</div>`}
        </div>
        <div>
          <div class="card" style="margin-bottom:14px;">
            <div class="card-head"><h3>Accès rapide</h3><button class="btn btn-ghost btn-sm" onclick="refreshAll()">${iconRefresh()} Actualiser</button></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:16px;">
              ${quickLinks.map((q) => `<button class="btn btn-ghost btn-sm" style="justify-content:flex-start;" onclick="goToPage('${q[0]}')">${q[2]} ${q[1]}</button>`).join("")}
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Notifications récentes</h3><button class="btn btn-ghost btn-sm" onclick="goToPage('notifs')">Tout voir</button></div>
            ${NOTIFS.length ? NOTIFS.slice(0, 3).map((n) => notifRowHtml(n)).join("") : `<div class="table-empty">Aucune notification</div>`}
          </div>
        </div>
      </div>
    `;
  }

  /* =========================================================
     PAGE : AGENDA (mono-professionnel)
     ========================================================= */
  window.renderAgenda = function renderAgenda() {
    document.getElementById("page-agenda").innerHTML = `
      <div class="agenda-toolbar">
        <div class="date-nav"><button onclick="agendaShift(-1)">${iconChevronLeft()}</button><span class="date-nav-label">${agendaDateLabel()}</span><button onclick="agendaShift(1)">${iconChevronRight()}</button></div>
        <button class="btn btn-ghost btn-sm" onclick="agendaToday()">Aujourd'hui</button>
        <div class="view-toggle" style="margin-left:auto">
          <button class="${state.agendaView === 'day' ? 'active' : ''}" onclick="setAgendaView('day')">Jour</button>
          <button class="${state.agendaView === 'week' ? 'active' : ''}" onclick="setAgendaView('week')">Semaine</button>
          <button class="${state.agendaView === 'month' ? 'active' : ''}" onclick="setAgendaView('month')">Mois</button>
        </div>
      </div>
      <div class="agenda-body">
        <div id="agendaMain"></div>
        <div>
          ${miniCalHtml()}
          <div class="card" style="margin-top:14px;padding:14px 16px;">
            <div style="font-size:12px;font-weight:700;margin-bottom:10px;">Légende</div>
            <div class="legend-row">${Object.entries(STATUS).map(([, v]) => `<span class="legend-item"><span class="legend-dot" style="background:${v.color}"></span>${v.label}</span>`).join("")}</div>
          </div>
        </div>
      </div>
    `;
    renderAgendaMain();
  }
  window.agendaDateLabel = function agendaDateLabel() {
    if (state.agendaView === "day") return capitalize(fmtDateLong(state.agendaDate));
    if (state.agendaView === "week") { const start = weekStart(state.agendaDate); return fmtDateShort(start) + " – " + fmtDateShort(isoPlusDays(start, 6)); }
    const d = new Date(state.monthCursor + "-01T00:00:00");
    return capitalize(d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));
  }
  window.weekStart = function weekStart(iso) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  window.agendaShift = function agendaShift(dir) {
    if (state.agendaView === "day") state.agendaDate = isoPlusDays(state.agendaDate, dir);
    else if (state.agendaView === "week") state.agendaDate = isoPlusDays(state.agendaDate, dir * 7);
    else {
      const d = new Date(state.monthCursor + "-01T00:00:00");
      d.setMonth(d.getMonth() + dir);
      state.monthCursor = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 7);
    }
    renderAgenda();
  }
  window.agendaToday = function agendaToday() { state.agendaDate = TODAY; state.monthCursor = TODAY.slice(0, 7); renderAgenda(); }
  window.setAgendaView = function setAgendaView(v) { state.agendaView = v; renderAgenda(); }

  const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i);
  window.renderAgendaMain = function renderAgendaMain() {
    const el = document.getElementById("agendaMain");
    if (!el) return;
    if (state.agendaView === "day") { el.innerHTML = dayViewHtml(); placeDayAppts(); }
    else if (state.agendaView === "week") el.innerHTML = weekViewHtml();
    else el.innerHTML = monthViewHtml();
  }
  window.dayViewHtml = function dayViewHtml() {
    const head = `<div class="day-grid-head" style="grid-template-columns:44px 1fr"><div></div><div class="day-col-head"><div class="avatar-sm" style="background:${ME.color};margin:0 auto 4px;">${esc(ME.initials)}</div><div class="day-col-head-name">${esc(ME.name)}</div><div class="day-col-head-role">${esc(ME.role)}</div></div></div>`;
    let body = `<div class="day-grid-body" style="grid-template-columns:44px 1fr">`;
    HOURS.forEach((h) => { body += `<div class="hour-label">${h}:00</div><div class="day-col" data-hour="${h}" onclick="handleDayColClick(event,${h})"></div>`; });
    body += `</div>`;
    return `<div class="day-grid">${head}${body}</div>`;
  }
  window.placeDayAppts = function placeDayAppts() {
    const grid = document.querySelector(".day-grid-body");
    if (!grid) return;
    const col = grid.querySelectorAll(".day-col")[0];
    if (!col) return;
    const rowH = col.offsetHeight || 46;
    const jour = APPTS.filter((a) => a.date === state.agendaDate && a.status !== "ANNULE");
    col.style.position = "relative";
    jour.forEach((a) => {
      const [sh, sm] = a.start.split(":").map(Number);
      const [eh, em] = a.end.split(":").map(Number);
      const startMin = (sh - HOURS[0]) * 60 + sm;
      const durMin = Math.max(20, (eh * 60 + em) - (sh * 60 + sm));
      const block = document.createElement("div");
      block.className = "appt-block";
      block.style.top = (startMin / 60) * rowH + "px";
      block.style.height = Math.max(24, (durMin / 60) * rowH - 4) + "px";
      block.style.background = STATUS[a.status].color + "22";
      block.style.borderLeftColor = STATUS[a.status].color;
      block.style.color = "#1B1730";
      block.innerHTML = `<b>${esc(a.client)}</b><span>${esc(a.start)} · ${esc(a.service)}</span>`;
      block.onclick = (e) => { e.stopPropagation(); openRdvDetail(a.id); };
      col.appendChild(block);
    });
  }
  window.handleDayColClick = function handleDayColClick(e, hour) {
    if (e.target.closest(".appt-block")) return;
    openNewRdv({ date: state.agendaDate, start: String(hour).padStart(2, "0") + ":00" });
  }
  window.weekViewHtml = function weekViewHtml() {
    const start = weekStart(state.agendaDate);
    const days = Array.from({ length: 7 }, (_, i) => isoPlusDays(start, i));
    return `<div class="week-grid">` + days.map((d) => {
      const jour = APPTS.filter((a) => a.date === d && a.status !== "ANNULE").sort((a, b) => a.start.localeCompare(b.start));
      const dow = new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
      return `<div class="week-day-col"><div class="week-day-head ${d === TODAY ? 'today' : ''}">${capitalize(dow)}</div>
        ${jour.length ? jour.map((a) => `<div class="week-appt-chip" style="background:${STATUS[a.status].color}18;border-color:${STATUS[a.status].color}" onclick="openRdvDetail('${escArg(a.id)}')"><b>${esc(a.start)}</b> ${esc(a.client)}</div>`).join("") : `<div style="font-size:10.5px;color:var(--ink-soft);text-align:center;padding-top:10px;">—</div>`}
      </div>`;
    }).join("") + `</div>`;
  }
  window.monthCells = function monthCells() {
    const first = new Date(state.monthCursor + "-01T00:00:00");
    const gridStart = new Date(first); gridStart.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); });
  }
  window.monthViewHtml = function monthViewHtml() {
    const dows = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    let html = `<div class="month-grid">` + dows.map((d) => `<div class="month-dow">${d}</div>`).join("");
    monthCells().forEach((iso) => {
      const inMonth = iso.slice(0, 7) === state.monthCursor;
      const count = APPTS.filter((a) => a.date === iso && a.status !== "ANNULE").length;
      html += `<div class="month-cell ${inMonth ? '' : 'muted'} ${iso === TODAY ? 'today' : ''}" onclick="jumpToDay('${iso}')"><div class="month-cell-num">${parseInt(iso.slice(8, 10), 10)}</div>${count ? `<span class="month-cell-count">${count} RDV</span>` : ""}</div>`;
    });
    return html + `</div>`;
  }
  window.jumpToDay = function jumpToDay(iso) { state.agendaDate = iso; state.monthCursor = iso.slice(0, 7); state.agendaView = "day"; renderAgenda(); }
  window.miniCalHtml = function miniCalHtml() {
    const first = new Date(state.monthCursor + "-01T00:00:00");
    const dows = ["L", "M", "M", "J", "V", "S", "D"];
    let html = `<div class="mini-cal"><div class="mini-cal-head"><button onclick="miniCalShift(-1)">${iconChevronLeft()}</button><span>${capitalize(first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }))}</span><button onclick="miniCalShift(1)">${iconChevronRight()}</button></div><div class="mini-cal-grid">`;
    dows.forEach((d) => html += `<div class="mini-cal-dow">${d}</div>`);
    monthCells().forEach((iso) => {
      const inMonth = iso.slice(0, 7) === state.monthCursor;
      const hasAppt = APPTS.some((a) => a.date === iso && a.status !== "ANNULE");
      html += `<div class="mini-cal-day ${inMonth ? '' : 'muted'} ${iso === TODAY ? 'today' : ''} ${iso === state.agendaDate ? 'selected' : ''} ${hasAppt ? 'has-appt' : ''}" onclick="jumpToDay('${iso}')">${parseInt(iso.slice(8, 10), 10)}</div>`;
    });
    return html + `</div></div>`;
  }
  window.miniCalShift = function miniCalShift(dir) {
    const d = new Date(state.monthCursor + "-01T00:00:00");
    d.setMonth(d.getMonth() + dir);
    state.monthCursor = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 7);
    renderAgenda();
  }

  /* =========================================================
     PAGE : RÉSERVATIONS
     ========================================================= */
  window.renderRdvPage = function renderRdvPage() {
    document.getElementById("page-rdv").innerHTML = `
      <div class="filter-row">
        <input type="text" placeholder="Rechercher un client…" value="${esc(state.rdvFilters.search)}" oninput="updateRdvFilter('search', this.value)" style="min-width:220px" />
        <select onchange="updateRdvFilter('status', this.value)">
          <option value="">Tous les états</option>
          ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${state.rdvFilters.status === k ? 'selected' : ''}>${v.label}</option>`).join("")}
        </select>
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="exportRdvCsv()">${iconPrinter()} Exporter CSV</button>
      </div>
      <div class="card"><table class="data-table"><thead><tr><th>Client</th><th>Service</th><th>Date</th><th>Heure</th><th>Origine</th><th>Statut</th><th></th></tr></thead><tbody id="rdvTableBody"></tbody></table></div>
    `;
    renderRdvTable();
  }
  window.updateRdvFilter = function updateRdvFilter(key, v) { state.rdvFilters[key] = v; renderRdvTable(); }
  window.filteredRdv = function filteredRdv() {
    const f = state.rdvFilters;
    return APPTS
      .filter((a) => (!f.status || a.status === f.status) && (!f.search || a.client.toLowerCase().includes(f.search.toLowerCase()) || a.phone.includes(f.search)))
      .sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  }
  window.renderRdvTable = function renderRdvTable() {
    const rows = filteredRdv();
    const body = document.getElementById("rdvTableBody");
    if (!body) return;
    if (!rows.length) { body.innerHTML = `<tr><td colspan="7"><div class="table-empty">Aucune réservation ne correspond à ces filtres</div></td></tr>`; return; }
    body.innerHTML = rows.map((a) => `<tr class="row-clickable" onclick="openRdvDetail('${escArg(a.id)}')">
      <td><div class="cell-client"><div class="avatar-sm" style="background:${ME.color}">${esc(initials(a.client))}</div><div><div class="cell-client-name">${esc(a.client)}</div><div class="cell-client-sub">${esc(a.phone)}</div></div></div></td>
      <td>${esc(a.service)}</td><td>${fmtDateShort(a.date)}</td><td>${esc(a.start)}</td>
      <td style="font-size:11.5px;color:var(--ink-soft);">${esc(a.source)}</td>
      <td><span class="status-pill ${STATUS[a.status].cls}">${STATUS[a.status].label}</span></td>
      <td><div class="row-actions" onclick="event.stopPropagation()"><button class="icon-btn" title="Consulter" onclick="openRdvDetail('${escArg(a.id)}')">${iconEye()}</button></div></td>
    </tr>`).join("");
  }
  // Export local des lignes réellement affichées (aucune donnée inventée).
  window.exportCsv = function exportCsv(filename, headers, rows) {
    const cell = (v) => `"${String(v === null || v === undefined ? "" : v).replace(/"/g, '""')}"`;
    const csv = [headers.map(cell).join(";"), ...rows.map((r) => r.map(cell).join(";"))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showToast(`Export « ${esc(filename)} » téléchargé`);
  }
  window.exportRdvCsv = function exportRdvCsv() {
    const rows = filteredRdv().map((a) => [a.client, a.phone, a.service, a.date, a.start, a.end, a.source, STATUS[a.status].label]);
    exportCsv("reservations.csv", ["Client", "Téléphone", "Service", "Date", "Début", "Fin", "Origine", "Statut"], rows);
  }

  /* =========================================================
     PAGE : CLIENTS (+ fiche + notes internes)
     ========================================================= */
  window.apptsDuClient = function apptsDuClient(clientId) {
    return APPTS.filter((a) => a.clientId === clientId).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  }
  window.renderClientsPage = function renderClientsPage() {
    document.getElementById("page-clients").innerHTML = `
      <div class="filter-row">
        <input type="text" placeholder="Rechercher un client…" value="${esc(state.clientsFilters.search)}" oninput="updateClientsFilter('search', this.value)" style="min-width:220px" />
        <select onchange="updateClientsFilter('upcoming', this.value)">
          <option value="">Tous les clients</option>
          <option value="oui" ${state.clientsFilters.upcoming === 'oui' ? 'selected' : ''}>Avec RDV à venir</option>
          <option value="non" ${state.clientsFilters.upcoming === 'non' ? 'selected' : ''}>Sans RDV à venir</option>
        </select>
        <div class="view-toggle" id="clientsViewToggle" style="margin-left:auto">
          <button class="${state.clientsView === 'list' ? 'active' : ''}" onclick="setClientsView('list')" title="Vue liste">${iconList()}</button>
          <button class="${state.clientsView === 'grid' ? 'active' : ''}" onclick="setClientsView('grid')" title="Vue grille">${iconGrid()}</button>
        </div>
      </div>
      <div id="clientsContainer"></div>
    `;
    renderClientsContainer();
  }
  window.updateClientsFilter = function updateClientsFilter(key, v) { state.clientsFilters[key] = v; renderClientsContainer(); }
  window.setClientsView = function setClientsView(v) {
    state.clientsView = v;
    const toggle = document.getElementById("clientsViewToggle");
    if (toggle) toggle.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", (i === 0 && v === "list") || (i === 1 && v === "grid")));
    renderClientsContainer();
  }
  window.filteredClients = function filteredClients() {
    const f = state.clientsFilters;
    return CLIENTS.filter((c) => {
      if (f.search) {
        const q = f.search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !(c.phone || "").includes(f.search)) return false;
      }
      const hasUpcoming = apptsDuClient(c.id).some((a) => a.date >= TODAY && a.status === "RESERVE");
      if (f.upcoming === "oui" && !hasUpcoming) return false;
      if (f.upcoming === "non" && hasUpcoming) return false;
      return true;
    });
  }
  window.renderClientsContainer = function renderClientsContainer() {
    const wrap = document.getElementById("clientsContainer");
    if (!wrap) return;
    const clients = filteredClients();
    if (state.clientsView === "grid") {
      wrap.innerHTML = `<div class="stat-grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))" id="clientsGrid"></div>`;
      renderClientsGrid(clients);
    } else {
      wrap.innerHTML = `<div class="card"><table class="data-table"><thead><tr><th>Client</th><th>Téléphone</th><th>E-mail</th><th>RDV à venir</th><th>RDV passés</th><th></th></tr></thead><tbody id="clientsTableBody"></tbody></table></div>`;
      renderClientsTable(clients);
    }
  }
  window.clientCounts = function clientCounts(clientId) {
    const list = apptsDuClient(clientId);
    return {
      upcoming: list.filter((a) => a.date >= TODAY && a.status === "RESERVE").length,
      past: list.filter((a) => a.status === "TERMINE").length,
    };
  }
  window.renderClientsTable = function renderClientsTable(clients) {
    const body = document.getElementById("clientsTableBody");
    if (!body) return;
    if (!clients.length) { body.innerHTML = `<tr><td colspan="6"><div class="table-empty">Aucun client ne correspond à ces filtres</div></td></tr>`; return; }
    body.innerHTML = clients.map((c) => {
      const n = clientCounts(c.id);
      const age = calcAge(c.dob);
      return `<tr class="row-clickable" onclick="openClientFiche('${escArg(c.id)}')">
        <td><div class="cell-client"><div class="avatar-sm" style="background:var(--primary)">${esc(initials(c.name))}</div><div><div class="cell-client-name">${esc(c.name)}</div><div class="cell-client-sub">${age === null ? "Âge non renseigné" : age + " ans"}</div></div></div></td>
        <td>${esc(c.phone)}</td><td>${esc(c.email || "—")}</td><td>${n.upcoming}</td><td>${n.past}</td>
        <td><div class="row-actions" onclick="event.stopPropagation()"><button class="icon-btn" onclick="openClientFiche('${escArg(c.id)}')">${iconEye()}</button></div></td>
      </tr>`;
    }).join("");
  }
  window.renderClientsGrid = function renderClientsGrid(clients) {
    const grid = document.getElementById("clientsGrid");
    if (!grid) return;
    if (!clients.length) { grid.innerHTML = `<div class="table-empty">Aucun client ne correspond à ces filtres</div>`; return; }
    grid.innerHTML = clients.map((c) => {
      const n = clientCounts(c.id);
      const age = calcAge(c.dob);
      return `<div class="card" style="padding:16px;cursor:pointer;" onclick="openClientFiche('${escArg(c.id)}')">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;"><div class="avatar-sm" style="width:40px;height:40px;font-size:14px;background:var(--primary)">${esc(initials(c.name))}</div><div><div style="font-weight:700;font-size:13.5px;">${esc(c.name)}</div><div style="font-size:11px;color:var(--ink-soft)">${age === null ? "Âge non renseigné" : age + " ans"}</div></div></div>
        <div style="font-size:12px;color:var(--ink-soft);margin-bottom:3px;">${esc(c.phone)}</div>
        <div style="font-size:12px;color:var(--ink-soft);margin-bottom:10px;">${esc(c.email || "—")}</div>
        <div style="display:flex;justify-content:space-between;font-size:11.5px;"><span>${n.upcoming} à venir</span><span>${n.past} passés</span></div>
      </div>`;
    }).join("");
  }
  window.openClientFiche = function openClientFiche(clientId) {
    const c = CLIENTS.find((x) => x.id === clientId);
    if (!c) return;
    const history = apptsDuClient(c.id);
    const upcoming = history.filter((a) => a.date >= TODAY && a.status === "RESERVE");
    const past = history.filter((a) => a.status === "TERMINE");
    const cancelled = history.filter((a) => a.status === "ANNULE");
    const absent = history.filter((a) => a.status === "ABSENT").length;
    const seuil = PARAMS?.seuilAbsences ?? 2;
    const age = calcAge(c.dob);
    openModal(`
      <div class="modal-head">
        <div style="display:flex;align-items:center;gap:12px;"><div class="avatar-sm" style="width:42px;height:42px;font-size:15px;background:var(--primary)">${esc(initials(c.name))}</div><div><p class="modal-title">${esc(c.name)}</p><p class="modal-sub">${age === null ? "Âge non renseigné" : age + " ans"} · ${esc(c.phone)}</p></div></div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      ${absent >= seuil ? `<div class="repeat-warning" style="margin-bottom:12px;">${iconAlert()} ${absent} absences enregistrées — seuil d'alerte (${seuil}) atteint</div>` : ""}
      <div class="modal-tabs">
        <button class="active" onclick="switchClientTab(this,'rdv')">Rendez-vous</button>
        <button onclick="switchClientTab(this,'notes')">Notes internes</button>
      </div>
      <div id="clientTabRdv">
        <div class="detail-item-label" style="margin-bottom:6px;">À venir (${upcoming.length})</div>
        ${upcoming.length ? upcoming.map(rdvMiniRow).join("") : `<div class="table-empty" style="padding:14px;">Aucun</div>`}
        <div class="detail-item-label" style="margin:14px 0 6px;">Passés (${past.length})</div>
        ${past.length ? past.map(rdvMiniRow).join("") : `<div class="table-empty" style="padding:14px;">Aucun</div>`}
        <div class="detail-item-label" style="margin:14px 0 6px;">Annulés (${cancelled.length})</div>
        ${cancelled.length ? cancelled.map(rdvMiniRow).join("") : `<div class="table-empty" style="padding:14px;">Aucun</div>`}
      </div>
      <div id="clientTabNotes" style="display:none">
        <div class="field-row"><textarea id="newNoteText" rows="2" placeholder="Ajouter une note interne (visible uniquement par vous)…"></textarea></div>
        <button class="btn btn-primary btn-sm" onclick="addClientNote('${escArg(c.id)}')">${iconPlus()} Ajouter la note</button>
        <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px;" id="notesList">${notesListHtml(c.id)}</div>
      </div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Fermer</button></div>
    `, true);
  }
  window.rdvMiniRow = function rdvMiniRow(a) {
    return `<div class="dash-list-row" style="padding:8px 4px;"><span class="dash-list-time" style="width:auto;">${fmtDateShort(a.date)}</span><div style="flex:1"><div class="dash-list-name" style="font-size:12.5px;">${esc(a.service)}</div><div class="dash-list-sub">${esc(a.start)}</div></div><span class="status-pill ${STATUS[a.status].cls}">${STATUS[a.status].label}</span></div>`;
  }
  window.switchClientTab = function switchClientTab(btn, tab) {
    btn.parentElement.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("clientTabRdv").style.display = tab === "rdv" ? "block" : "none";
    document.getElementById("clientTabNotes").style.display = tab === "notes" ? "block" : "none";
  }
  window.notesDuClient = function notesDuClient(clientId) { return NOTES.filter((n) => n.clientId === clientId); }
  window.notesListHtml = function notesListHtml(clientId) {
    const list = notesDuClient(clientId);
    if (!list.length) return `<div class="table-empty">Aucune note pour ce client</div>`;
    return list.map((n) => `<div class="card" style="padding:10px 14px;">
      <div style="font-size:12.5px;white-space:pre-wrap;">${esc(n.texte)}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
        <span style="font-size:10.5px;color:var(--ink-soft)">${fmtRelative(n.createdAt)}</span>
        <div class="row-actions"><button class="icon-btn" onclick="deleteClientNote('${escArg(clientId)}','${escArg(n.id)}')">${iconTrash()}</button></div>
      </div>
    </div>`).join("");
  }
  window.addClientNote = async function addClientNote(clientId) {
    const texte = val("newNoteText");
    if (!texte) return;
    try {
      const note = await professionnelApi.createNote(clientId, texte);
      NOTES = [note, ...NOTES];
      document.getElementById("notesList").innerHTML = notesListHtml(clientId);
      document.getElementById("newNoteText").value = "";
      showToast("Note interne ajoutée");
    } catch (e) { showError(e); }
  }
  window.deleteClientNote = async function deleteClientNote(clientId, noteId) {
    if (!confirm("Supprimer cette note ?")) return;
    try {
      await professionnelApi.deleteNote(noteId);
      NOTES = NOTES.filter((n) => n.id !== noteId);
      document.getElementById("notesList").innerHTML = notesListHtml(clientId);
    } catch (e) { showError(e); }
  }

  /* =========================================================
     PAGE : SERVICES
     ========================================================= */
  window.renderServicesPage = function renderServicesPage() {
    document.getElementById("page-services").innerHTML = `
      <div class="filter-row">
        <input type="text" placeholder="Rechercher un service…" value="${esc(state.servicesFilters.search)}" oninput="updateServicesFilter('search', this.value)" style="min-width:220px" />
        <select onchange="updateServicesFilter('actif', this.value)">
          <option value="">Tous les services</option>
          <option value="oui" ${state.servicesFilters.actif === 'oui' ? 'selected' : ''}>Publiés</option>
          <option value="non" ${state.servicesFilters.actif === 'non' ? 'selected' : ''}>Non publiés</option>
        </select>
        <div class="view-toggle" id="servicesViewToggle" style="margin-left:auto">
          <button class="${state.servicesView === 'grid' ? 'active' : ''}" onclick="setServicesView('grid')" title="Vue grille">${iconGrid()}</button>
          <button class="${state.servicesView === 'list' ? 'active' : ''}" onclick="setServicesView('list')" title="Vue liste">${iconList()}</button>
        </div>
      </div>
      <div id="servicesContainer"></div>
    `;
    renderServicesContainer();
  }
  window.updateServicesFilter = function updateServicesFilter(key, v) { state.servicesFilters[key] = v; renderServicesContainer(); }
  window.setServicesView = function setServicesView(v) {
    state.servicesView = v;
    const toggle = document.getElementById("servicesViewToggle");
    if (toggle) toggle.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", (i === 0 && v === "grid") || (i === 1 && v === "list")));
    renderServicesContainer();
  }
  window.filteredServices = function filteredServices() {
    const f = state.servicesFilters;
    return SERVICES.filter((s) => {
      if (f.actif === "oui" && !s.actif) return false;
      if (f.actif === "non" && s.actif) return false;
      if (f.search && !s.nom.toLowerCase().includes(f.search.toLowerCase())) return false;
      return true;
    });
  }
  window.renderServicesContainer = function renderServicesContainer() {
    const wrap = document.getElementById("servicesContainer");
    if (!wrap) return;
    const items = filteredServices();
    if (state.servicesView === "list") {
      wrap.innerHTML = `<div class="card"><table class="data-table"><thead><tr><th>Service</th><th>Durée</th><th>Prix</th><th>Champs perso.</th><th>Publication</th><th>Disponibilité</th><th></th></tr></thead><tbody id="servicesListBody"></tbody></table></div>`;
      renderServicesListBody(items);
    } else {
      wrap.innerHTML = `<div class="stat-grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))" id="servicesGrid"></div>`;
      renderServicesGrid(items);
    }
  }
  window.renderServicesGrid = function renderServicesGrid(list) {
    const grid = document.getElementById("servicesGrid");
    if (!grid) return;
    if (!list.length) { grid.innerHTML = `<div class="table-empty">Aucun service ne correspond à ces filtres</div>`; return; }
    grid.innerHTML = list.map((s) => {
      const nbChamps = champsDuService(s.id).length;
      return `<div class="card" style="padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
          <div style="font-weight:800;font-size:14px;">${esc(s.nom)}</div>
          <span class="status-pill ${s.actif ? 'st-termine' : 'st-absent'}">${s.actif ? 'Publié' : 'Non publié'}</span>
        </div>
        <div style="font-size:12px;color:var(--ink-soft);margin-bottom:10px;min-height:32px;">${esc(s.description || "Aucune description")}</div>
        <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:8px;"><span>${s.dureeMinutes} min</span><b>${fmtPrix(s.prix)}</b></div>
        <div style="margin-bottom:10px;display:flex;gap:6px;flex-wrap:wrap;">
          <span class="status-pill ${STATUT_SERVICE[s.statut]?.cls || 'st-absent'}" style="font-size:10.5px;">${STATUT_SERVICE[s.statut]?.label || s.statut}</span>
          ${nbChamps ? `<span style="font-size:11px;color:var(--primary-dark);background:var(--primary-tint);padding:2px 8px;border-radius:999px;">${nbChamps} champ${nbChamps > 1 ? 's' : ''} personnalisé${nbChamps > 1 ? 's' : ''}</span>` : ""}
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" style="flex:1;justify-content:center;" onclick="openServiceForm('${escArg(s.id)}')">${iconEdit()} Modifier</button>
          <button class="icon-btn" title="${s.actif ? 'Dépublier' : 'Publier'}" onclick="toggleServiceActif('${escArg(s.id)}')">${s.actif ? iconX() : iconCheck()}</button>
          <button class="icon-btn" title="Supprimer" onclick="deleteServiceApi('${escArg(s.id)}')">${iconTrash()}</button>
        </div>
      </div>`;
    }).join("");
  }
  window.renderServicesListBody = function renderServicesListBody(list) {
    const body = document.getElementById("servicesListBody");
    if (!body) return;
    if (!list.length) { body.innerHTML = `<tr><td colspan="7"><div class="table-empty">Aucun service ne correspond à ces filtres</div></td></tr>`; return; }
    body.innerHTML = list.map((s) => {
      const nbChamps = champsDuService(s.id).length;
      return `<tr>
        <td><div class="cell-client-name">${esc(s.nom)}</div><div class="cell-client-sub">${esc(s.description || "—")}</div></td>
        <td>${s.dureeMinutes} min</td>
        <td>${fmtPrix(s.prix)}</td>
        <td>${nbChamps || "—"}</td>
        <td><span class="status-pill ${s.actif ? 'st-termine' : 'st-absent'}">${s.actif ? 'Publié' : 'Non publié'}</span></td>
        <td><span class="status-pill ${STATUT_SERVICE[s.statut]?.cls || 'st-absent'}">${STATUT_SERVICE[s.statut]?.label || s.statut}</span></td>
        <td><div class="row-actions">
          <button class="icon-btn" title="Modifier" onclick="openServiceForm('${escArg(s.id)}')">${iconEdit()}</button>
          <button class="icon-btn" title="${s.actif ? 'Dépublier' : 'Publier'}" onclick="toggleServiceActif('${escArg(s.id)}')">${s.actif ? iconX() : iconCheck()}</button>
          <button class="icon-btn" title="Supprimer" onclick="deleteServiceApi('${escArg(s.id)}')">${iconTrash()}</button>
        </div></td>
      </tr>`;
    }).join("");
  }
  window.toggleServiceActif = async function toggleServiceActif(id) {
    const s = SERVICES.find((x) => x.id === id);
    if (!s) return;
    try {
      await professionnelApi.updateService(id, { actif: !s.actif });
      showToast(`Service « ${esc(s.nom)} » ${s.actif ? 'dépublié' : 'publié'}`);
      await refreshAll(true);
    } catch (e) { showError(e); }
  }
  window.deleteServiceApi = async function deleteServiceApi(id) {
    const s = SERVICES.find((x) => x.id === id);
    if (!s) return;
    if (!confirm(`Supprimer le service « ${s.nom} » ? Ses rendez-vous seront supprimés avec lui.`)) return;
    try {
      await professionnelApi.deleteService(id);
      showToast("Service supprimé");
      await refreshAll(true);
    } catch (e) { showError(e); }
  }

  /* ---- Formulaire de service (Détails + Champs personnalisés) ---- */
  window.openServiceForm = function openServiceForm(id, initialTab) {
    const s = id ? SERVICES.find((x) => x.id === id) : null;
    CF_SERVICE_ID = id || null;
    const champs = id ? champsDuService(id) : [];
    const tab = initialTab === "champs" && id ? "champs" : "details";
    openModal(`
      <div class="modal-head"><div><p class="modal-title">${s ? 'Modifier le service' : 'Ajouter un service'}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="modal-tabs">
        <button class="${tab === 'details' ? 'active' : ''}" onclick="switchServiceTab(this,'details')">Détails</button>
        <button class="${tab === 'champs' ? 'active' : ''}" onclick="switchServiceTab(this,'champs')">Champs personnalisés${champs.length ? ` (${champs.length})` : ""}</button>
      </div>
      <div id="svTabDetails" style="display:${tab === 'details' ? 'block' : 'none'}">
        <div class="field-row"><label>Nom du service *</label><input type="text" id="svName" value="${esc(s ? s.nom : "")}" /></div>
        <div class="field-row"><label>Description</label><textarea id="svDesc" rows="2">${esc(s ? (s.description || "") : "")}</textarea></div>
        <div class="field-2col">
          <div class="field-row"><label>Durée (minutes) *</label><input type="number" id="svDuration" min="5" step="5" value="${s ? s.dureeMinutes : 30}" /></div>
          <div class="field-row"><label>Prix (DA)</label><input type="number" id="svPrice" min="0" step="0.01" value="${s && s.prix !== null && s.prix !== undefined ? (s.prix / 100) : ""}" /></div>
        </div>
        ${s ? `<div class="field-2col">
          <div class="field-row"><label>Publication</label><select id="svActif"><option value="oui" ${s.actif ? 'selected' : ''}>Publié</option><option value="non" ${!s.actif ? 'selected' : ''}>Non publié</option></select></div>
          <div class="field-row"><label>Disponibilité affichée</label><select id="svStatut">${Object.entries(STATUT_SERVICE).map(([k, v]) => `<option value="${k}" ${s.statut === k ? 'selected' : ''}>${v.label}</option>`).join("")}</select></div>
        </div>` : `<div class="field-hint">Le service sera publié dès sa création ; vous pourrez le dépublier ensuite.</div>`}
      </div>
      <div id="svTabChamps" style="display:${tab === 'champs' ? 'block' : 'none'}">
        ${id ? `<div class="field-hint" style="margin-bottom:12px;">Ces champs apparaissent dans le formulaire de réservation du client, à l'étape « Options spécifiques ». Chaque modification est enregistrée immédiatement.</div>
        <div id="cfList"></div>
        <button class="btn btn-ghost btn-sm" style="margin-top:4px;" onclick="openFieldEditor()">${iconPlus()} Ajouter un champ</button>`
          : `<div class="field-hint">Enregistrez d'abord le service : ses champs personnalisés pourront ensuite lui être rattachés.</div>`}
      </div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveService('${escArg(id || "")}')">${iconCheck()} Enregistrer</button></div>
    `, true);
    if (id) renderCFList();
  }
  window.switchServiceTab = function switchServiceTab(btn, tab) {
    btn.parentElement.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("svTabDetails").style.display = tab === "details" ? "block" : "none";
    document.getElementById("svTabChamps").style.display = tab === "champs" ? "block" : "none";
  }
  window.saveService = async function saveService(id) {
    const nom = val("svName");
    if (!nom) {
      showToast("Le nom du service est requis");
      const tabBtn = document.querySelector(".modal-tabs button");
      if (tabBtn) switchServiceTab(tabBtn, "details");
      return;
    }
    const dureeMinutes = parseInt(val("svDuration"), 10);
    if (!dureeMinutes || dureeMinutes < 5) { showToast("La durée doit être d'au moins 5 minutes"); return; }
    const prixSaisi = val("svPrice");
    const data = {
      nom,
      description: val("svDesc") || undefined,
      dureeMinutes,
      // Le prix est transmis en centimes, comme il est stocké.
      prix: prixSaisi === "" ? undefined : Math.round(parseFloat(prixSaisi.replace(",", ".")) * 100),
    };
    try {
      if (id) {
        await professionnelApi.updateService(id, {
          ...data,
          actif: val("svActif") === "oui",
          statut: val("svStatut") || undefined,
        });
        showToast(`Service « ${esc(nom)} » modifié`);
      } else {
        await professionnelApi.createService(data);
        showToast(`Service « ${esc(nom)} » ajouté`);
      }
      CF_SERVICE_ID = null;
      closeModal();
      await refreshAll(true);
    } catch (e) { showError(e); }
  }

  /* ---- Champs personnalisés du service en cours d'édition ---- */
  window.cfFieldLabel = function cfFieldLabel(f) { return (f && f.label) ? f.label : "(Sans nom)"; }
  window.cfTypeLabel = function cfTypeLabel(t) { const ft = FIELD_TYPES.find((x) => x.value === t); return ft ? ft.label : t; }
  window.renderCFList = function renderCFList() {
    const el = document.getElementById("cfList");
    if (!el) return;
    const champs = champsDuService(CF_SERVICE_ID);
    if (!champs.length) { el.innerHTML = `<div class="table-empty">Aucun champ personnalisé — le client ne voit que le formulaire standard.</div>`; return; }
    el.innerHTML = champs.map((f) => {
      const condCount = (f.conditions || []).length;
      return `<div class="card" style="padding:12px 14px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div>
            <div style="font-weight:700;font-size:13px;">${esc(cfFieldLabel(f))} ${f.obligatoire ? '<span class="status-pill st-annule" style="margin-left:6px;">Obligatoire</span>' : ''}</div>
            <div style="font-size:11.5px;color:var(--ink-soft);margin-top:3px;">${esc(cfTypeLabel(f.type))}${condCount ? ` · Condition${condCount > 1 ? 's' : ''} (${esc(f.conditionLogique || 'ET')})` : ' · Toujours visible'}</div>
          </div>
          <div class="row-actions">
            <button class="icon-btn" title="Modifier" onclick="openFieldEditor('${escArg(f.id)}')">${iconEdit()}</button>
            <button class="icon-btn" title="Supprimer" onclick="deleteCFField('${escArg(f.id)}')">${iconTrash()}</button>
          </div>
        </div>
      </div>`;
    }).join("");
  }
  window.deleteCFField = async function deleteCFField(fieldId) {
    if (!confirm("Supprimer ce champ personnalisé ?")) return;
    try {
      await professionnelApi.deleteChamp(fieldId);
      // Les conditions qui référençaient ce champ deviennent caduques : on les retire.
      const orphelins = champsDuService(CF_SERVICE_ID).filter((f) => (f.conditions || []).some((c) => c.champId === fieldId));
      for (const f of orphelins) {
        await professionnelApi.updateChamp(f.id, { conditions: (f.conditions || []).filter((c) => c.champId !== fieldId) });
      }
      CHAMPS = await professionnelApi.listChamps();
      renderCFList();
      showToast("Champ supprimé");
    } catch (e) { showError(e); }
  }
  window.returnToServiceForm = function returnToServiceForm() { openServiceForm(CF_SERVICE_ID, "champs"); }

  window.openFieldEditor = function openFieldEditor(fieldId) {
    const existing = fieldId ? champsDuService(CF_SERVICE_ID).find((x) => x.id === fieldId) : null;
    CF_EDIT_DRAFT = existing
      ? JSON.parse(JSON.stringify({ ...existing, conditions: existing.conditions || [] }))
      : { id: null, label: "", type: "TEXTE", obligatoire: false, options: [], valeurParDefaut: "", texteAide: "", conditions: [], conditionLogique: "ET" };
    renderFieldEditorModal();
  }
  window.renderFieldEditorModal = function renderFieldEditorModal() {
    const f = CF_EDIT_DRAFT;
    const autres = champsDuService(CF_SERVICE_ID).filter((x) => x.id !== f.id);
    const conditions = f.conditions || [];
    openModal(`
      <div class="modal-head"><div><p class="modal-title">${f.id ? 'Modifier le champ' : 'Nouveau champ'}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-row"><label>Label (nom affiché au client) *</label><input type="text" id="cfLabel" value="${esc(f.label)}" oninput="updateCFDraft('label', this.value)" /></div>
      <div class="field-2col">
        <div class="field-row"><label>Type de champ</label><select id="cfType" onchange="onCFTypeChange(this.value)">${FIELD_TYPES.map((t) => `<option value="${t.value}" ${f.type === t.value ? 'selected' : ''}>${t.label}</option>`).join("")}</select></div>
        <div class="field-row"><label>Obligatoire</label><select onchange="updateCFDraft('obligatoire', this.value==='oui')"><option value="non" ${!f.obligatoire ? 'selected' : ''}>Facultatif</option><option value="oui" ${f.obligatoire ? 'selected' : ''}>Obligatoire</option></select></div>
      </div>
      <div id="cfOptionsWrap" style="display:${HAS_OPTIONS_TYPES.includes(f.type) ? 'block' : 'none'}">
        <div class="field-row"><label>Options (une par ligne)</label><textarea id="cfOptions" rows="3" oninput="updateCFDraft('options', this.value.split('\\n').map(s=>s.trim()).filter(Boolean))">${esc((f.options || []).join("\n"))}</textarea></div>
      </div>
      <div class="field-row"><label>Valeur par défaut (optionnel)</label><input type="text" value="${esc(f.valeurParDefaut || "")}" oninput="updateCFDraft('valeurParDefaut', this.value)" /></div>
      <div class="field-row"><label>Texte d'aide (optionnel)</label><input type="text" value="${esc(f.texteAide || "")}" oninput="updateCFDraft('texteAide', this.value)" /></div>
      <div class="card" style="padding:14px;margin-top:6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${conditions.length ? '10px' : '0'};">
          <div style="font-weight:700;font-size:12.5px;">Condition d'affichage (facultatif)</div>
          <button class="btn btn-ghost btn-sm" onclick="addCFCondition()" ${!autres.length ? 'disabled title="Créez d\'abord un autre champ pour ce service"' : ''}>${iconPlus()} Ajouter une condition</button>
        </div>
        ${conditions.length > 1 ? `<div class="field-row" style="margin:8px 0;"><label>Logique entre les conditions</label><select onchange="updateCFDraft('conditionLogique', this.value)"><option value="ET" ${f.conditionLogique !== 'OU' ? 'selected' : ''}>ET — toutes les conditions</option><option value="OU" ${f.conditionLogique === 'OU' ? 'selected' : ''}>OU — au moins une condition</option></select></div>` : ""}
        <div id="cfConditionsList">${conditions.length ? conditions.map((c, i) => cfConditionRowHtml(c, i, autres)).join("") : `<div class="field-hint">Sans condition, ce champ est toujours visible côté client.</div>`}</div>
      </div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="returnToServiceForm()">Retour</button><button class="btn btn-primary" onclick="saveCFField()">${iconCheck()} Enregistrer le champ</button></div>
    `, true);
  }
  window.onCFTypeChange = function onCFTypeChange(v) {
    updateCFDraft("type", v);
    const wrap = document.getElementById("cfOptionsWrap");
    if (wrap) wrap.style.display = HAS_OPTIONS_TYPES.includes(v) ? "block" : "none";
  }
  window.updateCFDraft = function updateCFDraft(key, v) { CF_EDIT_DRAFT[key] = v; }
  window.cfConditionRowHtml = function cfConditionRowHtml(c, i, autres) {
    const ref = autres.find((x) => x.id === c.champId) || autres[0];
    let valueInput;
    if (ref && ref.type === "SWITCH") {
      valueInput = `<select onchange="updateCFCondition(${i},'valeur',this.value)"><option value="oui" ${c.valeur === 'oui' ? 'selected' : ''}>Oui</option><option value="non" ${c.valeur === 'non' ? 'selected' : ''}>Non</option></select>`;
    } else if (ref && HAS_OPTIONS_TYPES.includes(ref.type)) {
      valueInput = `<select onchange="updateCFCondition(${i},'valeur',this.value)">${(ref.options || []).map((o) => `<option value="${esc(o)}" ${c.valeur === o ? 'selected' : ''}>${esc(o)}</option>`).join("")}</select>`;
    } else {
      valueInput = `<input type="text" value="${esc(c.valeur || "")}" oninput="updateCFCondition(${i},'valeur',this.value)" placeholder="Valeur" />`;
    }
    return `<div class="field-2col" style="margin-bottom:8px;align-items:end;">
      <div class="field-row" style="margin-bottom:0"><label>Si</label><select onchange="updateCFCondition(${i},'champId',this.value)">${autres.map((o) => `<option value="${esc(o.id)}" ${c.champId === o.id ? 'selected' : ''}>${esc(cfFieldLabel(o))}</option>`).join("")}</select></div>
      <div class="field-row" style="margin-bottom:0;display:flex;gap:6px;">
        <div style="flex:1"><label>Vaut</label>${valueInput}</div>
        <button class="icon-btn" style="margin-top:22px;flex-shrink:0;" title="Retirer" onclick="removeCFCondition(${i})">${iconTrash()}</button>
      </div>
    </div>`;
  }
  window.addCFCondition = function addCFCondition() {
    const autres = champsDuService(CF_SERVICE_ID).filter((x) => x.id !== CF_EDIT_DRAFT.id);
    if (!autres.length) return;
    if (!CF_EDIT_DRAFT.conditions) CF_EDIT_DRAFT.conditions = [];
    const ref = autres[0];
    CF_EDIT_DRAFT.conditions.push({ champId: ref.id, valeur: ref.type === "SWITCH" ? "oui" : ((ref.options || [])[0] || "") });
    renderFieldEditorModal();
  }
  window.removeCFCondition = function removeCFCondition(i) { CF_EDIT_DRAFT.conditions.splice(i, 1); renderFieldEditorModal(); }
  window.updateCFCondition = function updateCFCondition(i, key, v) {
    CF_EDIT_DRAFT.conditions[i][key] = v;
    if (key === "champId") {
      const autres = champsDuService(CF_SERVICE_ID).filter((x) => x.id !== CF_EDIT_DRAFT.id);
      const ref = autres.find((x) => x.id === v);
      CF_EDIT_DRAFT.conditions[i].valeur = ref && ref.type === "SWITCH" ? "oui" : ((ref && ref.options && ref.options[0]) || "");
      renderFieldEditorModal();
    }
  }
  window.saveCFField = async function saveCFField() {
    const f = CF_EDIT_DRAFT;
    if (!f.label || !f.label.trim()) { showToast("Le label du champ est requis"); return; }
    if (HAS_OPTIONS_TYPES.includes(f.type) && !(f.options || []).length) { showToast("Ajoutez au moins une option pour ce type de champ"); return; }
    const payload = {
      serviceId: CF_SERVICE_ID,
      label: f.label.trim(),
      type: f.type,
      options: f.options || [],
      obligatoire: !!f.obligatoire,
      texteAide: f.texteAide || undefined,
      valeurParDefaut: f.valeurParDefaut || undefined,
      conditions: f.conditions || [],
      conditionLogique: f.conditionLogique || "ET",
    };
    try {
      if (f.id) await professionnelApi.updateChamp(f.id, payload);
      else await professionnelApi.createChamp(payload);
      CHAMPS = await professionnelApi.listChamps();
      showToast(`Champ « ${esc(payload.label)} » enregistré`);
      returnToServiceForm();
    } catch (e) { showError(e); }
  }

  /* =========================================================
     PAGE : DISPONIBILITÉS
     Une ligne de disponibilité = une plage horaire pour un jour.
     ========================================================= */
  window.disposDuJour = function disposDuJour(jourIndex) {
    return DISPOS.filter((d) => d.jourSemaine === jourIndex).sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));
  }
  window.renderDispoPage = function renderDispoPage() {
    document.getElementById("page-dispo").innerHTML = `
      <div class="card" style="padding:20px;margin-bottom:18px;">
        <div class="card-head" style="padding:0 0 14px;border:none;"><h3>Jours et horaires disponibles</h3></div>
        <div class="field-hint" style="margin-bottom:6px;">Ces plages alimentent directement le moteur de créneaux : un jour sans plage est fermé à la réservation.</div>
        ${JOURS.map((label, index) => {
          const plages = disposDuJour(index);
          return `<div style="display:flex;align-items:center;gap:16px;padding:12px 0;border-top:1px solid var(--line);">
            <div style="width:130px;font-size:13px;font-weight:700;">${label}</div>
            <div style="flex:1;font-size:12.5px;color:var(--ink-soft);display:flex;flex-wrap:wrap;gap:8px;">
              ${plages.length ? plages.map((p) => `<span class="status-pill st-termine" style="font-size:11px;">${esc(p.heureDebut)} – ${esc(p.heureFin)}
                <button class="icon-btn" style="margin-left:6px;" title="Retirer cette plage" onclick="removeDispo('${escArg(p.id)}')">${iconTrash()}</button></span>`).join("") : "Fermé"}
            </div>
            <button class="btn btn-ghost btn-sm" onclick="openAddDispo(${index})">${iconPlus()} Ajouter une plage</button>
          </div>`;
        }).join("")}
      </div>
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:18px;">
        <button class="accordion-toggle" onclick="toggleIndispoAccordion()">
          <h3 style="margin:0;font-size:14.5px;">Absences et fermetures</h3>
          <span class="accordion-chevron ${state.dispoIndispoOpen ? 'open' : ''}">${iconChevronRight()}</span>
        </button>
        <div class="accordion-body" style="display:${state.dispoIndispoOpen ? 'block' : 'none'};padding:0 20px 20px;">
          <button class="btn btn-primary btn-sm" style="margin-bottom:14px;" onclick="openIndispoForm()">${iconPlus()} Fermer une période</button>
          <table class="data-table"><thead><tr><th>Type</th><th>Du</th><th>Au</th><th>Motif</th><th></th></tr></thead>
          <tbody>${INDISPOS.length ? INDISPOS.map((i) => `<tr>
            <td>${TYPES_INDISPO[i.type] || esc(i.type)}</td>
            <td>${fmtDateShort(i.dateDebut)}</td>
            <td>${fmtDateShort(i.dateFin)}</td>
            <td>${esc(i.motif || "—")}</td>
            <td><button class="icon-btn" title="Rouvrir la période" onclick="removeIndispo('${escArg(i.id)}')">${iconTrash()}</button></td>
          </tr>`).join("") : `<tr><td colspan="5"><div class="table-empty">Aucune période fermée</div></td></tr>`}</tbody></table>
        </div>
      </div>
      ${renderParamsCard()}
    `;
  }
  window.toggleIndispoAccordion = function toggleIndispoAccordion() { state.dispoIndispoOpen = !state.dispoIndispoOpen; renderDispoPage(); }
  window.openAddDispo = function openAddDispo(jourIndex) {
    openModal(`
      <div class="modal-head"><div><p class="modal-title">Ajouter une plage — ${JOURS[jourIndex]}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-2col">
        <div class="field-row"><label>De</label><input type="time" id="dispoStart" value="09:00" /></div>
        <div class="field-row"><label>À</label><input type="time" id="dispoEnd" value="17:00" /></div>
      </div>
      <div class="field-error" id="dispoError"></div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveDispo(${jourIndex})">${iconCheck()} Ajouter</button></div>
    `);
  }
  window.saveDispo = async function saveDispo(jourIndex) {
    const err = document.getElementById("dispoError");
    const heureDebut = val("dispoStart"), heureFin = val("dispoEnd");
    if (!heureDebut || !heureFin || heureFin <= heureDebut) {
      err.textContent = "L'heure de fin doit être postérieure à l'heure de début.";
      err.classList.add("show");
      return;
    }
    try {
      await professionnelApi.addDisponibilite({ jourSemaine: jourIndex, heureDebut, heureFin });
      closeModal();
      showToast(`Plage ajoutée — ${JOURS[jourIndex]} ${heureDebut} – ${heureFin}`);
      await refreshAll(true);
    } catch (e) {
      const msg = (e?.response?.data?.error ?? e?.response?.data?.message) || "L'ajout a échoué.";
      err.textContent = Array.isArray(msg) ? msg.join(", ") : msg;
      err.classList.add("show");
    }
  }
  window.removeDispo = async function removeDispo(id) {
    try {
      await professionnelApi.removeDisponibilite(id);
      showToast("Plage retirée");
      await refreshAll(true);
    } catch (e) { showError(e); }
  }
  window.openIndispoForm = function openIndispoForm() {
    openModal(`
      <div class="modal-head"><div><p class="modal-title">Fermer une période</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-row"><label>Type</label><select id="inType">${Object.entries(TYPES_INDISPO).map(([k, v]) => `<option value="${k}" ${k === 'PERIODE' ? 'selected' : ''}>${v}</option>`).join("")}</select></div>
      <div class="field-2col">
        <div class="field-row"><label>Du</label><input type="datetime-local" id="inStart" value="${TODAY}T08:00" /></div>
        <div class="field-row"><label>Au</label><input type="datetime-local" id="inEnd" value="${TODAY}T19:00" /></div>
      </div>
      <div class="field-row"><label>Motif</label><select id="inMotif"><option>Congé</option><option>Absence</option><option>Réunion</option><option>Fermeture exceptionnelle</option><option>Indisponibilité personnelle</option><option>Autre</option></select></div>
      <div class="field-hint">Les rendez-vous déjà réservés sur cette période seront automatiquement annulés par le serveur.</div>
      <div class="field-error" id="inError"></div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveIndispo()">${iconCheck()} Fermer la période</button></div>
    `);
  }
  window.saveIndispo = async function saveIndispo() {
    const err = document.getElementById("inError");
    const dateDebut = val("inStart"), dateFin = val("inEnd");
    if (!dateDebut || !dateFin || dateFin <= dateDebut) {
      err.textContent = "La fin doit être postérieure au début.";
      err.classList.add("show");
      return;
    }
    try {
      const res = await professionnelApi.addIndisponibilite({
        type: val("inType"),
        dateDebut: new Date(dateDebut).toISOString(),
        dateFin: new Date(dateFin).toISOString(),
        motif: val("inMotif") || undefined,
      });
      state.dispoIndispoOpen = true;
      closeModal();
      // Le nombre de rendez-vous annulés est celui compté par le serveur.
      showToast(`Période fermée${res.rendezVousAnnules ? ` — ${res.rendezVousAnnules} rendez-vous annulé(s)` : ""}`);
      await refreshAll(true);
    } catch (e) {
      const msg = (e?.response?.data?.error ?? e?.response?.data?.message) || "La fermeture a échoué.";
      err.textContent = Array.isArray(msg) ? msg.join(", ") : msg;
      err.classList.add("show");
    }
  }
  window.removeIndispo = async function removeIndispo(id) {
    if (!confirm("Rouvrir cette période ? Les rendez-vous déjà annulés ne seront pas rétablis.")) return;
    try {
      await professionnelApi.removeIndisponibilite(id);
      state.dispoIndispoOpen = true;
      showToast("Période rouverte");
      await refreshAll(true);
    } catch (e) { showError(e); }
  }

  /* ---- Règles de réservation appliquées par le backend ---- */
  window.renderParamsCard = function renderParamsCard() {
    const p = PARAMS || {};
    return `<div class="card" style="padding:20px;">
      <div class="card-head" style="padding:0 0 14px;border:none;"><h3>Règles de réservation</h3></div>
      <div class="field-hint" style="margin-bottom:12px;">Ces règles sont appliquées par le serveur lors du calcul des créneaux et de la création d'un rendez-vous.</div>
      <div class="field-2col">
        <div class="field-row"><label>Intervalle minimum entre deux rendez-vous (min)</label><input type="number" id="prmIntervalle" min="0" max="240" value="${p.intervalleMinutes ?? 10}" /></div>
        <div class="field-row"><label>Délai minimum avant réservation (h)</label><input type="number" id="prmDelaiMin" min="0" max="720" value="${p.delaiMinHeures ?? 2}" /></div>
      </div>
      <div class="field-2col">
        <div class="field-row"><label>Horizon maximum de réservation (jours)</label><input type="number" id="prmDelaiMax" min="1" max="730" value="${p.delaiMaxJours ?? 90}" /></div>
        <div class="field-row"><label>Seuil d'alerte d'absences répétées</label><input type="number" id="prmSeuil" min="1" max="50" value="${p.seuilAbsences ?? 2}" /></div>
      </div>
      <div class="field-row"><label>Rendez-vous maximum par client et par jour</label><input type="number" id="prmMaxJour" min="1" max="20" value="${p.maxRdvParClientParJour ?? 1}" /></div>
      <div class="field-error" id="prmError"></div>
      <button class="btn btn-primary" onclick="saveParams()">${iconCheck()} Enregistrer les règles</button>
    </div>`;
  }
  window.saveParams = async function saveParams() {
    const err = document.getElementById("prmError");
    const data = {
      intervalleMinutes: parseInt(val("prmIntervalle"), 10),
      delaiMinHeures: parseInt(val("prmDelaiMin"), 10),
      delaiMaxJours: parseInt(val("prmDelaiMax"), 10),
      seuilAbsences: parseInt(val("prmSeuil"), 10),
      maxRdvParClientParJour: parseInt(val("prmMaxJour"), 10),
    };
    if (Object.values(data).some((v) => Number.isNaN(v))) {
      err.textContent = "Toutes les règles doivent être des nombres.";
      err.classList.add("show");
      return;
    }
    err.classList.remove("show");
    try {
      PARAMS = await professionnelApi.updateParametres(data);
      showToast("Règles de réservation enregistrées");
    } catch (e) {
      const msg = (e?.response?.data?.error ?? e?.response?.data?.message) || "L'enregistrement a échoué.";
      err.textContent = Array.isArray(msg) ? msg.join(", ") : msg;
      err.classList.add("show");
    }
  }

  /* =========================================================
     PAGE : RÉCEPTIONNISTES
     ========================================================= */
  const PERM_KEYS = ["peutConsulterAgenda", "peutGererRdv", "peutGererPlanning", "peutGererParametres"];
  window.permLabel = function permLabel(k) {
    return {
      peutConsulterAgenda: "Consulter l'agenda",
      peutGererRdv: "Gérer les rendez-vous",
      peutGererPlanning: "Gérer le planning détaillé",
      peutGererParametres: "Gérer les paramètres",
    }[k] || k;
  }
  window.renderReceptionnistesPage = function renderReceptionnistesPage() {
    document.getElementById("page-receptionnistes").innerHTML = `
      <div class="filter-row">
        <input type="text" placeholder="Rechercher une réceptionniste…" value="${esc(state.receptionnistesFilters.search)}" oninput="updateReceptionnistesFilter('search', this.value)" style="min-width:220px" />
        <select onchange="updateReceptionnistesFilter('status', this.value)">
          <option value="">Tous les statuts</option>
          <option value="active" ${state.receptionnistesFilters.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="inactive" ${state.receptionnistesFilters.status === 'inactive' ? 'selected' : ''}>Désactivée</option>
        </select>
        <div class="view-toggle" id="receptionnistesViewToggle" style="margin-left:auto">
          <button class="${state.receptionnistesView === 'list' ? 'active' : ''}" onclick="setReceptionnistesView('list')" title="Vue liste">${iconList()}</button>
          <button class="${state.receptionnistesView === 'grid' ? 'active' : ''}" onclick="setReceptionnistesView('grid')" title="Vue grille">${iconGrid()}</button>
        </div>
      </div>
      <div id="receptionnistesContainer"></div>
      <div class="field-hint" style="margin-top:10px;">L'affectation d'une réceptionniste à votre compte est effectuée par l'Admin général ; vous gérez ici son activation sur votre espace et ses autorisations.</div>
    `;
    renderReceptionnistesContainer();
  }
  window.updateReceptionnistesFilter = function updateReceptionnistesFilter(key, v) { state.receptionnistesFilters[key] = v; renderReceptionnistesContainer(); }
  window.setReceptionnistesView = function setReceptionnistesView(v) {
    state.receptionnistesView = v;
    const toggle = document.getElementById("receptionnistesViewToggle");
    if (toggle) toggle.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", (i === 0 && v === "list") || (i === 1 && v === "grid")));
    renderReceptionnistesContainer();
  }
  window.filteredReceptionnistes = function filteredReceptionnistes() {
    const f = state.receptionnistesFilters;
    return RECEPTIONNISTES.filter((r) => (!f.search || r.name.toLowerCase().includes(f.search.toLowerCase())) && (!f.status || (f.status === 'active') === r.active));
  }
  window.renderReceptionnistesContainer = function renderReceptionnistesContainer() {
    const wrap = document.getElementById("receptionnistesContainer");
    if (!wrap) return;
    const list = filteredReceptionnistes();
    if (state.receptionnistesView === "grid") {
      wrap.innerHTML = `<div class="stat-grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${list.length ? list.map((r) => `
        <div class="card" style="padding:16px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;"><div class="avatar-sm" style="width:40px;height:40px;font-size:14px;background:#E2478A">${esc(initials(r.name))}</div><div><div style="font-weight:700;font-size:13.5px;">${esc(r.name)}</div><span class="status-pill ${r.active ? 'st-termine' : 'st-absent'}">${r.active ? 'Active' : 'Désactivée'}</span></div></div>
          <div style="font-size:12px;color:var(--ink-soft);margin-bottom:3px;">${esc(r.email)}</div>
          <div style="font-size:12px;color:var(--ink-soft);margin-bottom:10px;">${esc(r.phone)}</div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm" style="flex:1;justify-content:center;" onclick="openPermsForm('${escArg(r.affectationId)}')">${iconEdit()} Autorisations</button>
            <button class="icon-btn" title="${r.active ? 'Désactiver' : 'Activer'}" onclick="toggleReceptionniste('${escArg(r.affectationId)}')">${r.active ? iconX() : iconCheck()}</button>
          </div>
        </div>`).join("") : `<div class="table-empty">Aucune réceptionniste ne correspond à ces filtres</div>`}</div>`;
    } else {
      wrap.innerHTML = `<div class="card"><table class="data-table">
        <thead><tr><th>Réceptionniste</th><th>E-mail</th><th>Téléphone</th><th>Statut</th><th>Autorisations</th><th></th></tr></thead>
        <tbody>${list.length ? list.map((r) => `<tr>
          <td><div class="cell-client"><div class="avatar-sm" style="background:#E2478A">${esc(initials(r.name))}</div><div class="cell-client-name">${esc(r.name)}</div></div></td>
          <td>${esc(r.email)}</td><td>${esc(r.phone)}</td>
          <td><span class="status-pill ${r.active ? 'st-termine' : 'st-absent'}">${r.active ? 'Active' : 'Désactivée'}</span></td>
          <td style="font-size:11px;color:var(--ink-soft);">${PERM_KEYS.filter((k) => r.perms[k]).map(permLabel).join(", ") || "Aucune"}</td>
          <td><div class="row-actions">
            <button class="btn btn-ghost btn-sm" onclick="openPermsForm('${escArg(r.affectationId)}')">${iconEdit()} Autorisations</button>
            <button class="icon-btn" title="${r.active ? 'Désactiver' : 'Activer'}" onclick="toggleReceptionniste('${escArg(r.affectationId)}')">${r.active ? iconX() : iconCheck()}</button>
          </div></td>
        </tr>`).join("") : `<tr><td colspan="6"><div class="table-empty">Aucune réceptionniste ne correspond à ces filtres</div></td></tr>`}</tbody>
      </table></div>`;
    }
  }
  window.toggleReceptionniste = async function toggleReceptionniste(affectationId) {
    const r = RECEPTIONNISTES.find((x) => x.affectationId === affectationId);
    if (!r) return;
    try {
      await professionnelApi.updatePermissions(affectationId, { actif: !r.active });
      showToast(`${esc(r.name)} ${r.active ? 'désactivée' : 'activée'} sur votre espace`);
      await refreshAll(true);
    } catch (e) { showError(e); }
  }
  window.openPermsForm = function openPermsForm(affectationId) {
    const r = RECEPTIONNISTES.find((x) => x.affectationId === affectationId);
    if (!r) return;
    openModal(`
      <div class="modal-head"><div><p class="modal-title">Autorisations — ${esc(r.name)}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      ${PERM_KEYS.map((k) => `<label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);font-size:13px;"><input type="checkbox" id="perm_${k}" ${r.perms[k] ? 'checked' : ''} /> ${permLabel(k)}</label>`).join("")}
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="savePerms('${escArg(affectationId)}')">${iconCheck()} Enregistrer</button></div>
    `);
  }
  window.savePerms = async function savePerms(affectationId) {
    const data = {};
    PERM_KEYS.forEach((k) => { data[k] = document.getElementById("perm_" + k).checked; });
    try {
      await professionnelApi.updatePermissions(affectationId, data);
      closeModal();
      showToast("Autorisations mises à jour");
      await refreshAll(true);
    } catch (e) { showError(e); }
  }

  /* =========================================================
     PAGE : STATISTIQUES — chiffres calculés par le serveur
     ========================================================= */
  window.renderStatsPage = function renderStatsPage() {
    const s = STATS || {};
    const total = s.total ?? 0;
    const nomService = (id) => SERVICES.find((x) => x.id === id)?.nom || "Service supprimé";
    const parService = (s.parService || [])
      .map((x) => ({ nom: nomService(x.serviceId), total: x._count?._all ?? 0 }))
      .sort((a, b) => b.total - a.total);
    const maxCount = parService.length ? parService[0].total : 1;
    document.getElementById("page-stats").innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Rendez-vous</div></div>
        <div class="stat-card"><div class="stat-value">${s.termines ?? 0}</div><div class="stat-label">Terminés</div></div>
        <div class="stat-card"><div class="stat-value">${s.annules ?? 0}</div><div class="stat-label">Annulés</div></div>
        <div class="stat-card"><div class="stat-value">${s.nbClients ?? 0}</div><div class="stat-label">Clients total</div></div>
        <div class="stat-card"><div class="stat-value">${total ? Math.round(((s.termines ?? 0) / total) * 100) : 0}%</div><div class="stat-label">Part de rendez-vous honorés</div></div>
      </div>
      <div class="card" style="padding:20px;">
        <h3 style="margin:0 0 16px;font-size:14.5px;">Services les plus réservés</h3>
        ${parService.length ? parService.map((x) => `<div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;"><span>${esc(x.nom)}</span><b>${x.total}</b></div>
          <div style="background:var(--paper);border-radius:999px;height:8px;overflow:hidden;"><div style="width:${(x.total / maxCount) * 100}%;background:var(--primary);height:100%;"></div></div>
        </div>`).join("") : `<div class="table-empty">Aucune réservation enregistrée</div>`}
      </div>
    `;
  }

  /* =========================================================
     PAGE : ASSISTANT — les réponses viennent du backend
     ========================================================= */
  let CHAT = [];
  window.renderAssistantPage = function renderAssistantPage() {
    if (!CHAT.length) {
      CHAT = [{ role: "bot", text: "Posez-moi une question sur vos horaires, vos services, la prise de rendez-vous ou votre adresse." }];
    }
    document.getElementById("page-assistant").innerHTML = `
      <div class="card" style="display:flex;flex-direction:column;height:520px;">
        <div id="chatLog" style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:14px;"></div>
        <div style="border-top:1px solid var(--line);padding:14px 16px;display:flex;gap:10px;">
          <input type="text" id="chatInput" placeholder="Ex. « Quels services proposez-vous ? »" style="flex:1;border:1px solid var(--line);border-radius:10px;padding:10px 14px;font-size:13px;" onkeydown="if(event.key==='Enter')sendChat()" />
          <button class="btn btn-primary" id="chatSend" onclick="sendChat()">${iconSend()}</button>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
        ${["Quels sont vos horaires ?", "Quels services proposez-vous ?", "Comment prendre rendez-vous ?", "Où êtes-vous situé ?"].map((q) => `<button class="btn btn-ghost btn-sm" onclick="quickChat('${escArg(q)}')">${esc(q)}</button>`).join("")}
      </div>
    `;
    renderChatLog();
  }
  window.renderChatLog = function renderChatLog() {
    const log = document.getElementById("chatLog");
    if (!log) return;
    log.innerHTML = CHAT.map((m) => `
      <div style="display:flex;gap:10px;${m.role === 'user' ? 'flex-direction:row-reverse;' : ''}">
        <div class="avatar-sm" style="background:${m.role === 'bot' ? 'var(--primary)' : '#E2954A'};flex-shrink:0;">${m.role === 'bot' ? iconBot() : esc(ME.initials)}</div>
        <div style="background:${m.role === 'bot' ? 'var(--paper)' : 'var(--primary-tint)'};border-radius:12px;padding:10px 14px;font-size:12.5px;line-height:1.5;max-width:75%;">${esc(m.text)}</div>
      </div>`).join("");
    log.scrollTop = log.scrollHeight;
  }
  window.quickChat = function quickChat(q) { const el = document.getElementById("chatInput"); if (el) el.value = q; sendChat(); }
  window.sendChat = async function sendChat() {
    const input = document.getElementById("chatInput");
    if (!input) return;
    const q = input.value.trim();
    if (!q) return;
    CHAT.push({ role: "user", text: q });
    input.value = "";
    renderChatLog();
    const btn = document.getElementById("chatSend");
    if (btn) btn.disabled = true;
    try {
      const res = await assistantApi.ask(q, ME.id);
      CHAT.push({ role: "bot", text: res.answer });
    } catch (e) {
      CHAT.push({ role: "bot", text: "La réponse n'a pas pu être obtenue. Réessayez dans un instant." });
    }
    if (btn) btn.disabled = false;
    renderChatLog();
  }

  /* =========================================================
     PAGE : NOTIFICATIONS
     ========================================================= */
  window.notifRowHtml = function notifRowHtml(n) {
    const ic = NOTIF_STYLE[n.type] || NOTIF_FALLBACK;
    return `<div class="notif-row ${n.unread ? 'unread' : ''}"><div class="notif-icon" style="background:${ic.bg};color:${ic.color}">${svg(ic.svg, 16)}</div><div class="notif-text"><span>${n.text}</span><div class="notif-time">${n.time}</div></div>${n.unread ? `<span class="notif-dot-unread"></span>` : ""}</div>`;
  }
  window.renderNotifsPage = function renderNotifsPage() {
    document.getElementById("page-notifs").innerHTML = `
      <div class="card">${NOTIFS.length ? NOTIFS.map((n) => notifRowHtml(n)).join("") : `<div class="table-empty">Aucune notification</div>`}</div>
    `;
  }
  window.markAllRead = async function markAllRead() {
    try {
      await notificationsApi.markAllRead();
      NOTIFS = NOTIFS.map((n) => ({ ...n, unread: false }));
      renderNotifsPage();
      updateNotifBadges();
    } catch (e) { showError(e); }
  }

  /* =========================================================
     PAGE : PROFIL
     ========================================================= */
  window.renderProfilPage = function renderProfilPage() {
    document.getElementById("page-profil").innerHTML = `
      <div class="card" style="padding:22px;max-width:560px;">
        <div class="field-row"><label>Nom du professionnel / bureau *</label><input type="text" id="prName" value="${esc(PROFILE.nom)}" /></div>
        <div class="field-row"><label>Fonction / spécialité</label><input type="text" id="prSpecialite" value="${esc(PROFILE.specialite)}" /></div>
        <div class="field-row"><label>Description</label><textarea id="prDesc" rows="3">${esc(PROFILE.description)}</textarea></div>
        <div class="field-row"><label>Adresse</label><input type="text" id="prAddress" value="${esc(PROFILE.adresse)}" /></div>
        <div class="field-2col">
          <div class="field-row"><label>Téléphone</label><input type="text" id="prPhone" value="${esc(PROFILE.telephone)}" /></div>
          <div class="field-row"><label>E-mail du compte</label><input type="email" value="${esc(PROFILE.email)}" disabled /></div>
        </div>
        <div class="field-row"><label>URL de la photo du bureau</label><input type="text" id="prPhoto" value="${esc(PROFILE.photoUrl)}" placeholder="https://…" /></div>
        <div class="field-hint" style="margin-bottom:12px;">L'e-mail du compte est modifié par l'administrateur.</div>
        <div class="field-error" id="prError"></div>
        <button class="btn btn-primary" onclick="saveProfile()">${iconCheck()} Enregistrer les modifications</button>
      </div>
    `;
  }
  window.saveProfile = async function saveProfile() {
    const err = document.getElementById("prError");
    const nom = val("prName");
    if (!nom) { err.textContent = "Le nom est requis."; err.classList.add("show"); return; }
    err.classList.remove("show");
    try {
      await professionnelApi.updateProfil({
        nom,
        specialite: val("prSpecialite"),
        description: val("prDesc"),
        adresse: val("prAddress"),
        telephone: val("prPhone"),
        photoUrl: val("prPhoto"),
      });
      showToast("Profil mis à jour");
      await refreshAll(true);
    } catch (e) {
      const msg = (e?.response?.data?.error ?? e?.response?.data?.message) || "L'enregistrement a échoué.";
      err.textContent = Array.isArray(msg) ? msg.join(", ") : msg;
      err.classList.add("show");
    }
  }

  /* =========================================================
     MODALS génériques
     ========================================================= */
  window.closeModal = function closeModal() {
    const root = document.getElementById("modalRoot");
    if (!root) return;
    const ov = root.querySelector(".modal-overlay");
    if (ov) { ov.classList.remove("open"); setTimeout(() => root.innerHTML = "", 200); }
  }
  window.openModal = function openModal(innerHtml, wide) {
    const root = document.getElementById("modalRoot");
    if (!root) return;
    root.innerHTML = `<div class="modal-overlay" id="activeOverlay"><div class="modal-box ${wide ? 'wide' : ''}">${innerHtml}</div></div>`;
    const ov = document.getElementById("activeOverlay");
    requestAnimationFrame(() => ov.classList.add("open"));
    ov.addEventListener("click", (e) => { if (e.target === ov) closeModal(); });
  }

  /* ---- Nouveau rendez-vous : créneaux réellement libres ---- */
  window.openNewRdv = function openNewRdv(prefill) {
    prefill = prefill || {};
    const publies = SERVICES.filter((s) => s.actif);
    if (!publies.length) { showToast("Publiez d'abord un service pour pouvoir créer un rendez-vous."); return; }
    state.newRdv = { serviceId: publies[0].id, date: prefill.date || state.agendaDate, start: prefill.start || "", dateDebut: "", creneaux: [] };
    openModal(`
      <div class="modal-head"><div><p class="modal-title">Nouveau rendez-vous</p><p class="modal-sub">Sélectionnez le service, la date et un créneau libre</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-2col">
        <div class="field-row"><label>Nom du client *</label><input type="text" id="nrNom" /></div>
        <div class="field-row"><label>Prénom du client *</label><input type="text" id="nrPrenom" /></div>
      </div>
      <div class="field-2col">
        <div class="field-row"><label>Téléphone *</label><input type="tel" id="nrTel" /></div>
        <div class="field-row"><label>E-mail</label><input type="email" id="nrEmail" /></div>
      </div>
      <div class="field-row"><label>Date de naissance</label><input type="date" id="nrDob" /></div>
      <div class="field-row"><label>Service *</label><select id="nrService" onchange="onNewRdvServiceChange(this.value)">${publies.map((s) => `<option value="${esc(s.id)}">${esc(s.nom)} — ${s.dureeMinutes} min</option>`).join("")}</select></div>
      <div class="field-row"><label>Date *</label><input type="date" id="nrDate" value="${esc(state.newRdv.date)}" onchange="onNewRdvDateChange(this.value)" /></div>
      <div class="field-row"><label>Créneau disponible *</label><div id="nrSlots"><div class="table-empty">Chargement…</div></div></div>
      <div class="field-row"><label>Remarque</label><textarea id="nrRemarque" rows="2"></textarea></div>
      <div class="field-error" id="nrError"></div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" id="nrSubmit" onclick="submitNewRdv()">${iconCheck()} Confirmer le rendez-vous</button></div>
    `, true);
    loadNewRdvSlots();
  }
  window.onNewRdvServiceChange = function onNewRdvServiceChange(id) { state.newRdv.serviceId = id; loadNewRdvSlots(); }
  window.onNewRdvDateChange = function onNewRdvDateChange(d) { state.newRdv.date = d; loadNewRdvSlots(); }
  // Les créneaux proposés sont ceux calculés par le backend (disponibilités,
  // fermetures et rendez-vous déjà pris) : aucune grille horaire inventée.
  window.loadNewRdvSlots = async function loadNewRdvSlots() {
    const { serviceId, date } = state.newRdv;
    state.newRdv.dateDebut = "";
    if (!serviceId || !date) { renderNewRdvSlots([], "Choisissez un service et une date."); return; }
    renderNewRdvSlots([], "Chargement des créneaux…");
    try {
      const res = await publicApi.getSlots(ME.id, serviceId, date);
      state.newRdv.creneaux = res.creneaux || [];
      renderNewRdvSlots(state.newRdv.creneaux, "Aucun créneau disponible ce jour-là.");
    } catch (e) {
      state.newRdv.creneaux = [];
      renderNewRdvSlots([], "Créneaux indisponibles pour cette date.");
    }
  }
  window.renderNewRdvSlots = function renderNewRdvSlots(creneaux, emptyMsg) {
    const box = document.getElementById("nrSlots");
    if (!box) return;
    if (!creneaux.length) { box.innerHTML = `<div class="table-empty">${esc(emptyMsg)}</div>`; return; }
    const prefer = creneaux.find((c) => toHM(c) === state.newRdv.start) || creneaux[0];
    box.innerHTML = `<div class="slot-menu" id="nrSlotMenu">${creneaux.map((c) => `<button type="button" data-iso="${esc(c)}" class="${c === prefer ? 'current' : ''}" onclick="pickSlot('${escArg(c)}')">${toHM(c)}</button>`).join("")}</div>`;
    state.newRdv.dateDebut = prefer;
  }
  window.pickSlot = function pickSlot(iso) {
    state.newRdv.dateDebut = iso;
    document.querySelectorAll("#nrSlotMenu button").forEach((b) => b.classList.toggle("current", b.dataset.iso === iso));
  }
  window.submitNewRdv = async function submitNewRdv() {
    const err = document.getElementById("nrError");
    const nom = val("nrNom"), prenom = val("nrPrenom"), tel = val("nrTel").replace(/\s/g, "");
    const { serviceId, dateDebut } = state.newRdv;
    if (!nom || !prenom || !tel || !serviceId || !dateDebut) {
      err.textContent = "Renseignez le nom, le prénom, le téléphone, le service et un créneau disponible.";
      err.classList.add("show");
      return;
    }
    err.classList.remove("show");
    const btn = document.getElementById("nrSubmit");
    btn.disabled = true;
    try {
      // La création publique est la seule route de création : le backend y
      // applique le même contrôle de disponibilité que pour un client.
      await publicApi.createRdv({
        professionnelId: ME.id,
        serviceId,
        dateDebut,
        nom, prenom,
        telephone: tel,
        email: val("nrEmail") || undefined,
        dateNaissance: val("nrDob") || undefined,
        remarque: val("nrRemarque") || undefined,
      });
      closeModal();
      showToast(`Rendez-vous créé pour <b>${esc(prenom + " " + nom)}</b> le ${fmtDateShort(state.newRdv.date)} à ${toHM(dateDebut)}`);
      await refreshAll(true);
    } catch (e) {
      btn.disabled = false;
      const msg = (e?.response?.data?.error ?? e?.response?.data?.message) || "La création du rendez-vous a échoué.";
      err.textContent = Array.isArray(msg) ? msg.join(", ") : msg;
      err.classList.add("show");
      if (e?.response?.status === 409) loadNewRdvSlots();
    }
  }

  /* ---- Consulter / faire évoluer un rendez-vous ---- */
  window.openRdvDetail = function openRdvDetail(id) {
    const a = APPTS.find((x) => x.id === id);
    if (!a) return;
    const suivants = TRANSITIONS[a.status] || [];
    openModal(`
      <div class="modal-head"><div><p class="modal-title">${esc(a.client)}</p><p class="modal-sub">${esc(a.service)}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="detail-grid">
        <div><div class="detail-item-label">Téléphone</div><div class="detail-item-value">${esc(a.phone)}</div></div>
        <div><div class="detail-item-label">E-mail</div><div class="detail-item-value">${esc(a.email || "—")}</div></div>
        <div><div class="detail-item-label">Date</div><div class="detail-item-value">${fmtDateShort(a.date)}</div></div>
        <div><div class="detail-item-label">Heure</div><div class="detail-item-value">${esc(a.start)} – ${esc(a.end)}</div></div>
        <div><div class="detail-item-label">Origine</div><div class="detail-item-value">${esc(a.source)}</div></div>
        <div><div class="detail-item-label">Statut</div><div class="detail-item-value"><span class="status-pill ${STATUS[a.status].cls}">${STATUS[a.status].label}</span></div></div>
      </div>
      ${a.remark ? `<div class="field-row"><label>Remarque du client</label><div style="font-size:12.5px;color:var(--ink-soft)">${esc(a.remark)}</div></div>` : ""}
      ${a.motif ? `<div class="field-row"><label>Motif d'annulation</label><div style="font-size:12.5px;color:var(--ink-soft)">${esc(a.motif)}</div></div>` : ""}
      ${suivants.length ? `
        <div class="detail-item-label" style="margin:14px 0 8px;">Changer le statut</div>
        <div class="slot-menu">${suivants.filter((k) => k !== "ANNULE").map((k) => `<button type="button" onclick="changeStatus('${escArg(a.id)}','${k}')">${STATUS[k].label}</button>`).join("")}</div>`
        : `<div class="detail-item-label" style="margin:14px 0 8px;">Ce rendez-vous est clos : plus aucun changement de statut n'est possible.</div>`}
      <div class="modal-actions" style="justify-content:space-between;">
        <div style="display:flex;gap:8px;">
          ${a.status === "RESERVE" ? `<button class="btn btn-ghost btn-sm" onclick="openMoveRdv('${escArg(a.id)}')">${iconEdit()} Déplacer</button>` : ""}
        </div>
        ${suivants.includes("ANNULE") ? `<button class="btn btn-danger-ghost btn-sm" onclick="openCancelForm('${escArg(a.id)}')">${iconX()} Annuler</button>` : ""}
      </div>
    `);
  }
  window.changeStatus = async function changeStatus(id, statut) {
    try {
      await appointmentsApi.updateStatus(id, statut);
      showToast(`Statut mis à jour : <b>${STATUS[statut].label}</b>`);
      await loadAll();
      renderPage(state.page);
      openRdvDetail(id);
    } catch (e) { showError(e); }
  }
  window.openCancelForm = function openCancelForm(id) {
    const a = APPTS.find((x) => x.id === id);
    if (!a) return;
    openModal(`
      <div class="modal-head"><div><p class="modal-title">Annuler le rendez-vous</p><p class="modal-sub">${esc(a.client)} — ${fmtDateShort(a.date)} à ${esc(a.start)}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-row"><label>Motif (obligatoire)</label><select id="cancelMotif"><option>Indisponibilité exceptionnelle</option><option>Fermeture du bureau</option><option>Problème professionnel</option><option>Modification du planning</option><option>Erreur de réservation</option><option>Autre motif</option></select></div>
      <div class="field-hint">Le client est informé de l'annulation avec le motif.</div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="openRdvDetail('${escArg(id)}')">Retour</button><button class="btn btn-danger-ghost" onclick="confirmCancel('${escArg(id)}')">${iconCheck()} Confirmer l'annulation</button></div>
    `);
  }
  window.confirmCancel = async function confirmCancel(id) {
    try {
      await appointmentsApi.updateStatus(id, "ANNULE", val("cancelMotif") || undefined);
      closeModal();
      showToast("Rendez-vous annulé");
      await refreshAll(true);
    } catch (e) { showError(e); }
  }
  window.openMoveRdv = function openMoveRdv(id) {
    const a = APPTS.find((x) => x.id === id);
    if (!a) return;
    state.newRdv = { serviceId: a.serviceId, date: a.date, start: a.start, dateDebut: "", creneaux: [] };
    openModal(`
      <div class="modal-head"><div><p class="modal-title">Déplacer le rendez-vous</p><p class="modal-sub">${esc(a.client)} · ${esc(a.service)}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:12px;">Le client et le service restent inchangés : seul le créneau change, parmi ceux réellement libres.</p>
      <div class="field-row"><label>Date</label><input type="date" id="mvDate" value="${esc(a.date)}" onchange="onNewRdvDateChange(this.value)" /></div>
      <div class="field-row"><label>Créneau disponible</label><div id="nrSlots"><div class="table-empty">Chargement…</div></div></div>
      <div class="field-error" id="mvError"></div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="openRdvDetail('${escArg(id)}')">Retour</button><button class="btn btn-primary" onclick="saveMoveRdv('${escArg(id)}')">${iconCheck()} Enregistrer</button></div>
    `);
    loadNewRdvSlots();
  }
  window.saveMoveRdv = async function saveMoveRdv(id) {
    const err = document.getElementById("mvError");
    if (!state.newRdv.dateDebut) { err.textContent = "Choisissez un créneau disponible."; err.classList.add("show"); return; }
    try {
      await appointmentsApi.reschedule(id, state.newRdv.dateDebut);
      closeModal();
      showToast("Rendez-vous déplacé");
      await refreshAll(true);
    } catch (e) {
      const msg = (e?.response?.data?.error ?? e?.response?.data?.message) || "Le déplacement a échoué.";
      err.textContent = Array.isArray(msg) ? msg.join(", ") : msg;
      err.classList.add("show");
      loadNewRdvSlots();
    }
  }

  /* =========================================================
     RECHERCHE GLOBALE + INIT
     ========================================================= */
  document.getElementById("globalSearch")?.addEventListener("input", function () {
    const q = this.value.trim();
    if (q.length < 2) return;
    state.clientsFilters.search = q;
    goToPage("clients");
  }, { signal: ac.signal });

  // Rien n'est affiché avant la réponse du backend.
  (async () => {
    await loadAll();
    if (ac.signal.aborted) return;
    renderPage("dashboard");
  })();

    // ---- end ported script ----

    return () => {
      ac.abort();

      [
        "todayISO", "isoPlusDays", "esc", "escArg", "toDay", "toHM", "fmtDateLong", "fmtDateShort",
        "fmtRelative", "capitalize", "calcAge", "initials", "fmtPrix", "val", "setText", "showToast", "showError",
        "loadAll", "refreshAll", "champsDuService", "goToPage", "renderPage", "updateNotifBadges",
        "svg", "iconPlus", "iconCal", "iconCheck", "iconCheckCircle", "iconClock", "iconX", "iconUsers",
        "iconChevronLeft", "iconChevronRight", "iconPrinter", "iconEdit", "iconEye", "iconTrash",
        "iconAlert", "iconSend", "iconBot", "iconGrid", "iconList", "iconRefresh",
        "renderPageHead", "renderDashboard", "renderAgenda", "agendaDateLabel", "weekStart",
        "agendaShift", "agendaToday", "setAgendaView", "renderAgendaMain", "dayViewHtml",
        "placeDayAppts", "handleDayColClick", "weekViewHtml", "monthCells", "monthViewHtml",
        "jumpToDay", "miniCalHtml", "miniCalShift", "renderRdvPage", "updateRdvFilter", "filteredRdv",
        "renderRdvTable", "exportCsv", "exportRdvCsv", "apptsDuClient", "renderClientsPage",
        "updateClientsFilter", "setClientsView", "filteredClients", "renderClientsContainer",
        "clientCounts", "renderClientsTable", "renderClientsGrid", "openClientFiche", "rdvMiniRow",
        "switchClientTab", "notesDuClient", "notesListHtml", "addClientNote", "deleteClientNote",
        "renderServicesPage", "updateServicesFilter", "setServicesView", "filteredServices",
        "renderServicesContainer", "renderServicesGrid", "renderServicesListBody", "toggleServiceActif",
        "deleteServiceApi", "openServiceForm", "switchServiceTab", "saveService", "cfFieldLabel",
        "cfTypeLabel", "renderCFList", "deleteCFField", "returnToServiceForm", "openFieldEditor",
        "renderFieldEditorModal", "onCFTypeChange", "updateCFDraft", "cfConditionRowHtml",
        "addCFCondition", "removeCFCondition", "updateCFCondition", "saveCFField", "disposDuJour",
        "renderDispoPage", "toggleIndispoAccordion", "openAddDispo", "saveDispo", "removeDispo",
        "openIndispoForm", "saveIndispo", "removeIndispo", "renderParamsCard", "saveParams",
        "permLabel", "renderReceptionnistesPage", "updateReceptionnistesFilter",
        "setReceptionnistesView", "filteredReceptionnistes", "renderReceptionnistesContainer",
        "toggleReceptionniste", "openPermsForm", "savePerms", "renderStatsPage", "renderAssistantPage",
        "renderChatLog", "quickChat", "sendChat", "notifRowHtml", "renderNotifsPage", "markAllRead",
        "renderProfilPage", "saveProfile", "closeModal", "openModal", "openNewRdv",
        "onNewRdvServiceChange", "onNewRdvDateChange", "loadNewRdvSlots", "renderNewRdvSlots",
        "pickSlot", "submitNewRdv", "openRdvDetail", "changeStatus", "openCancelForm", "confirmCancel",
        "openMoveRdv", "saveMoveRdv",
      ].forEach((k) => { delete (window as any)[k]; });
    };
  }, []);

  return (
    <>
      <style>{`
  :root {
    --primary: #8957FF;
    --primary-dark: #6B3FD9;
    --primary-tint: #F1ECFF;
    --ink: #1B1730;
    --ink-soft: #6B6580;
    --paper: #F7F6FB;
    --card: #FFFFFF;
    --line: #E7E3F3;
    --radius: 14px;
    --st-reserve: #8957FF;
    --st-arrive: #2FA79D;
    --st-encours: #E2954A;
    --st-termine: #3FA65C;
    --st-absent: #8A8496;
    --st-annule: #D9483C;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif; background: var(--paper); color: var(--ink); }
  button, input, select, textarea { font-family: inherit; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: var(--line); border-radius: 999px; }

  #collapseIcon { transition: transform .2s ease; }

  .app { display: flex; min-height: 100vh; }

  /* ---------- Sidebar ---------- */
  .sidebar {
    width: 240px; flex-shrink: 0; background: var(--card); border-right: 1px solid var(--line);
    display: flex; flex-direction: column; padding: 20px 14px; position: sticky; top: 0; height: 100vh;
    transition: width .25s ease, padding .25s ease;
  }
  .sidebar.collapsed { width: 76px; }
  .sb-brand { display: flex; align-items: center; gap: 10px; padding: 4px 8px 22px; }
  .sb-logo { width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; flex-shrink: 0; }
  .sb-brand-text { font-weight: 800; font-size: 16px; white-space: nowrap; overflow: hidden; }
  .sidebar.collapsed .sb-brand-text, .sidebar.collapsed .nav-label, .sidebar.collapsed .sb-section-title { display: none; }

  .sb-section-title { font-size: 10.5px; font-weight: 700; color: var(--ink-soft); text-transform: uppercase; letter-spacing: .07em; margin: 14px 10px 8px; }
  .nav-item {
    display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 11px;
    color: var(--ink-soft); font-size: 13.5px; font-weight: 600; cursor: pointer; margin-bottom: 3px;
    transition: background .15s ease, color .15s ease; position: relative; white-space: nowrap;
  }
  .nav-item:hover { background: var(--paper); color: var(--ink); }
  .nav-item.active { background: var(--primary-tint); color: var(--primary-dark); }
  .nav-item svg { flex-shrink: 0; }
  .nav-badge { margin-left: auto; background: var(--primary); color: #fff; font-size: 10.5px; font-weight: 700; border-radius: 999px; padding: 1px 7px; }
  .sidebar.collapsed .nav-badge { position: absolute; top: 4px; right: 4px; margin-left: 0; padding: 1px 5px; }

  .sb-collapse-btn {
    margin-top: auto; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 11px;
    color: var(--ink-soft); font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid var(--line); background: none;
  }
  .sb-collapse-btn:hover { background: var(--paper); }

  /* ---------- Main / Topbar ---------- */
  .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .topbar {
    height: 68px; flex-shrink: 0; background: var(--card); border-bottom: 1px solid var(--line);
    display: flex; align-items: center; gap: 16px; padding: 0 26px; position: sticky; top: 0; z-index: 20;
  }
  .tb-search { flex: 1; max-width: 460px; position: relative; }
  .tb-search input {
    width: 100%; border: 1px solid var(--line); border-radius: 10px; padding: 9px 14px 9px 38px;
    font-size: 13px; background: var(--paper); color: var(--ink); outline: none; transition: border-color .15s ease;
  }
  .tb-search input:focus { border-color: var(--primary); }
  .tb-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--ink-soft); }
  .tb-right { margin-left: auto; display: flex; align-items: center; gap: 18px; }
  .tb-icon-btn { position: relative; width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--line); background: var(--card); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--ink-soft); transition: background .15s ease; }
  .tb-icon-btn:hover { background: var(--paper); }
  .tb-icon-dot { position: absolute; top: -5px; right: -5px; background: var(--st-annule); color: #fff; font-size: 10px; font-weight: 700; border-radius: 999px; min-width: 17px; height: 17px; display: flex; align-items: center; justify-content: center; padding: 0 3px; border: 2px solid var(--card); }
  .tb-user { display: flex; align-items: center; gap: 10px; cursor: pointer; }
  .tb-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #FFB86B, #FF6BAE); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 14px; }
  .tb-user-text { line-height: 1.3; }
  .tb-user-name { font-size: 13px; font-weight: 700; }
  .tb-user-role { font-size: 11px; color: var(--ink-soft); }

  /* En-tête de page unique — remplace le titre répété en haut de chaque écran */
  .page-head-global { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 26px 30px 4px; flex-wrap: wrap; }
  .page-title { font-size: 23px; font-weight: 800; margin: 0 0 4px; }
  .page-sub { font-size: 13px; color: var(--ink-soft); margin: 0; }

  .page { padding: 18px 30px 60px; display: none; }
  .page.active { display: block; }

  .btn {
    display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; border: none;
    border-radius: 10px; padding: 10px 16px; cursor: pointer; transition: transform .1s ease, opacity .15s ease, background .15s ease;
  }
  .btn:hover { transform: translateY(-1px); }
  .btn-primary { background: var(--primary); color: #fff; }
  .btn-primary:hover { background: var(--primary-dark); }
  .btn-ghost { background: var(--card); color: var(--ink); border: 1px solid var(--line); }
  .btn-ghost:hover { background: var(--paper); }
  .btn-ghost[disabled] { opacity: .45; cursor: not-allowed; transform: none; }
  .btn-sm { padding: 7px 12px; font-size: 12px; }
  .btn-danger-ghost { background: #FDEDEC; color: var(--st-annule); border: 1px solid #F7D3D0; }

  /* ---------- Cards / stats ---------- */
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px; margin-bottom: 24px; }
  .stat-card { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px 18px; }
  .stat-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
  .stat-value { font-size: 22px; font-weight: 800; line-height: 1; margin-bottom: 4px; }
  .stat-label { font-size: 11.5px; color: var(--ink-soft); font-weight: 600; }

  .card { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); }
  .card-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--line); }
  .card-head h3 { font-size: 14.5px; margin: 0; }

  /* ---------- Accordéons (sections secondaires/facultatives) ---------- */
  .accordion-toggle { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: none; border: none; cursor: pointer; font: inherit; text-align: left; }
  .accordion-toggle:hover { background: var(--paper); }
  .accordion-chevron { display: inline-flex; color: var(--ink-soft); transition: transform .2s ease; transform: rotate(90deg); }
  .accordion-chevron.open { transform: rotate(-90deg); }

  .status-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
  .status-pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .st-reserve { background: #F1ECFF; color: var(--st-reserve); }
  .st-arrive { background: #E6F7F5; color: var(--st-arrive); }
  .st-encours { background: #FDF1E2; color: var(--st-encours); }
  .st-termine { background: #E9F7ED; color: var(--st-termine); }
  .st-absent { background: #EEEDF2; color: var(--st-absent); }
  .st-annule { background: #FDEDEC; color: var(--st-annule); }

  .avatar-sm { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 12px; flex-shrink: 0; }

  /* ---------- Dashboard: prochain RDV + mini agenda ---------- */
  .dash-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 18px; align-items: start; }
  @media (max-width: 980px) { .dash-grid { grid-template-columns: 1fr; } }
  .next-rdv-card { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); border-radius: var(--radius); padding: 20px 22px; color: #fff; margin-bottom: 18px; }
  .next-rdv-eyebrow { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; opacity: .8; margin: 0 0 8px; }
  .next-rdv-name { font-size: 18px; font-weight: 800; margin: 0 0 2px; }
  .next-rdv-meta { font-size: 12.5px; opacity: .9; }
  .next-rdv-time { font-size: 26px; font-weight: 800; margin-top: 10px; }
  .dash-list-row { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid var(--line); font-size: 13px; }
  .dash-list-row:last-child { border-bottom: none; }
  .dash-list-time { font-weight: 700; width: 52px; flex-shrink: 0; color: var(--ink-soft); font-size: 12px; }
  .dash-list-name { font-weight: 700; flex: 1; }
  .dash-list-sub { font-size: 11.5px; color: var(--ink-soft); }

  /* ---------- Agenda ---------- */
  .agenda-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
  .view-toggle { display: flex; background: var(--paper); border-radius: 10px; padding: 3px; gap: 2px; }
  .view-toggle button { border: none; background: none; padding: 7px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 700; color: var(--ink-soft); cursor: pointer; display: inline-flex; align-items: center; }
  .view-toggle button.active { background: var(--card); color: var(--primary-dark); box-shadow: 0 1px 3px rgba(18,36,47,0.12); }
  .date-nav { display: flex; align-items: center; gap: 6px; }
  .date-nav button { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--line); background: var(--card); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--ink-soft); }
  .date-nav-label { font-size: 13.5px; font-weight: 700; padding: 0 4px; min-width: 150px; text-align: center; }

  .pro-filter-row { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 18px; }
  .pro-chip { display: flex; align-items: center; gap: 9px; background: var(--card); border: 1.5px solid var(--line); border-radius: 12px; padding: 8px 14px 8px 8px; cursor: pointer; flex-shrink: 0; transition: border-color .15s ease, background .15s ease; }
  .pro-chip.active { border-color: var(--primary); background: var(--primary-tint); }
  .pro-chip-name { font-size: 12.5px; font-weight: 700; line-height: 1.3; }
  .pro-chip-role { font-size: 10.5px; color: var(--ink-soft); }
  .pro-chip-dot { width: 8px; height: 8px; border-radius: 50%; margin-left: 4px; }

  .agenda-body { display: grid; grid-template-columns: 1fr 300px; gap: 18px; align-items: start; }
  @media (max-width: 1100px) { .agenda-body { grid-template-columns: 1fr; } }

  .day-grid { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
  .day-grid-head { display: grid; border-bottom: 1px solid var(--line); }
  .day-col-head { padding: 12px 10px; text-align: center; border-left: 1px solid var(--line); }
  .day-col-head:first-child { border-left: none; }
  .day-col-head-name { font-size: 12.5px; font-weight: 700; }
  .day-col-head-role { font-size: 10.5px; color: var(--ink-soft); }
  .day-grid-body { display: grid; position: relative; }
  .day-hour-row { display: contents; }
  .hour-label { font-size: 10.5px; color: var(--ink-soft); padding: 2px 8px 0 0; text-align: right; border-top: 1px solid var(--line); position: relative; top: -6px; }
  .day-col { border-left: 1px solid var(--line); border-top: 1px solid var(--line); min-height: 46px; position: relative; cursor: pointer; }
  .day-col:hover { background: var(--paper); }
  .appt-block {
    position: absolute; left: 4px; right: 4px; border-radius: 8px; padding: 5px 7px; overflow: hidden;
    font-size: 11px; cursor: pointer; border-left: 3px solid; box-shadow: 0 2px 6px rgba(18,36,47,0.08);
    transition: transform .1s ease, box-shadow .1s ease; z-index: 2;
  }
  .appt-block:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(18,36,47,0.18); z-index: 3; }
  .appt-block b { display: block; font-size: 11.5px; line-height: 1.3; }
  .appt-block span { display: block; opacity: .85; font-size: 10px; }
  .appt-dragging { opacity: .5; }
  .day-col.drop-hover { background: var(--primary-tint); }

  .mini-cal { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px; }
  .mini-cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 13px; font-weight: 700; }
  .mini-cal-head button { border: none; background: var(--paper); width: 26px; height: 26px; border-radius: 7px; cursor: pointer; color: var(--ink-soft); }
  .mini-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; text-align: center; }
  .mini-cal-dow { font-size: 10px; font-weight: 700; color: var(--ink-soft); padding-bottom: 4px; }
  .mini-cal-day { font-size: 11.5px; padding: 6px 0; border-radius: 7px; cursor: pointer; color: var(--ink); }
  .mini-cal-day:hover { background: var(--paper); }
  .mini-cal-day.muted { color: #C7C2D6; }
  .mini-cal-day.today { border: 1.5px solid var(--primary); font-weight: 700; }
  .mini-cal-day.selected { background: var(--primary); color: #fff; font-weight: 700; }
  .mini-cal-day.has-appt::after { content: ""; display: block; width: 4px; height: 4px; border-radius: 50%; background: var(--primary); margin: 2px auto 0; }
  .mini-cal-day.selected.has-appt::after { background: #fff; }

  .legend-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
  .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--ink-soft); }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; }

  /* week/month simplified views */
  .week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; }
  .week-day-col { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 10px; min-height: 220px; }
  .week-day-head { font-size: 11.5px; font-weight: 700; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--line); text-align: center; }
  .week-day-head.today { color: var(--primary-dark); }
  .week-appt-chip { font-size: 10.5px; padding: 5px 7px; border-radius: 7px; margin-bottom: 5px; border-left: 3px solid; cursor: pointer; }
  .month-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
  .month-dow { font-size: 11px; font-weight: 700; color: var(--ink-soft); text-align: center; padding-bottom: 4px; }
  .month-cell { background: var(--card); border: 1px solid var(--line); border-radius: 10px; min-height: 84px; padding: 6px 8px; cursor: pointer; font-size: 11.5px; }
  .month-cell:hover { border-color: var(--primary); }
  .month-cell.muted { opacity: .4; }
  .month-cell.today { border-color: var(--primary); border-width: 1.5px; }
  .month-cell-num { font-weight: 700; margin-bottom: 4px; }
  .month-cell-count { display: inline-block; background: var(--primary-tint); color: var(--primary-dark); font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 999px; }

  /* ---------- Tables ---------- */
  .filter-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; align-items: center; }
  .filter-row select, .filter-row input { border: 1px solid var(--line); border-radius: 9px; padding: 8px 12px; font-size: 12.5px; background: var(--card); color: var(--ink); }
  table.data-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  table.data-table th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: .04em; color: var(--ink-soft); font-weight: 700; padding: 10px 16px; border-bottom: 1px solid var(--line); white-space: nowrap; }
  table.data-table td { padding: 12px 16px; border-bottom: 1px solid var(--line); vertical-align: middle; }
  table.data-table tr:last-child td { border-bottom: none; }
  table.data-table tr.row-clickable { cursor: pointer; transition: background .12s ease; }
  table.data-table tr.row-clickable:hover { background: var(--paper); }
  .cell-client { display: flex; align-items: center; gap: 10px; }
  .cell-client-name { font-weight: 700; }
  .cell-client-sub { font-size: 11px; color: var(--ink-soft); }
  .row-actions { display: flex; gap: 6px; }
  .icon-btn { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--line); background: var(--card); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--ink-soft); }
  .icon-btn:hover { background: var(--paper); color: var(--ink); }
  .repeat-warning { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; color: var(--st-annule); background: #FDEDEC; padding: 2px 8px; border-radius: 999px; margin-left: 6px; }

  .table-empty { padding: 40px 20px; text-align: center; color: var(--ink-soft); font-size: 13px; }

  /* ---------- Notifications ---------- */
  .notif-row { display: flex; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--line); align-items: flex-start; }
  .notif-row:last-child { border-bottom: none; }
  .notif-row.unread { background: #FBFAFF; }
  .notif-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .notif-text { font-size: 12.5px; line-height: 1.5; }
  .notif-text b { font-weight: 700; }
  .notif-time { font-size: 11px; color: var(--ink-soft); margin-top: 2px; }
  .notif-dot-unread { width: 8px; height: 8px; border-radius: 50%; background: var(--primary); margin-left: auto; margin-top: 6px; flex-shrink: 0; }

  /* ---------- Modals ---------- */
  .modal-overlay { position: fixed; inset: 0; background: rgba(27,23,48,0.5); backdrop-filter: blur(2px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; opacity: 0; transition: opacity .2s ease; }
  .modal-overlay.open { opacity: 1; }
  .modal-box { width: 100%; max-width: 520px; max-height: 88vh; overflow-y: auto; background: var(--card); border-radius: 18px; box-shadow: 0 40px 80px -20px rgba(10,10,26,0.5); padding: 24px 26px; transform: translateY(14px) scale(.98); transition: transform .22s ease; }
  .modal-overlay.open .modal-box { transform: translateY(0) scale(1); }
  .modal-box.wide { max-width: 640px; }
  .modal-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; }
  .modal-title { font-size: 17px; font-weight: 800; margin: 0 0 2px; }
  .modal-sub { font-size: 12px; color: var(--ink-soft); margin: 0; }
  .modal-close { border: none; background: var(--paper); width: 30px; height: 30px; border-radius: 50%; cursor: pointer; color: var(--ink-soft); font-size: 16px; flex-shrink: 0; }
  .field-row { margin-bottom: 13px; }
  .field-row label { display: block; font-size: 12px; font-weight: 700; color: var(--ink-soft); margin-bottom: 5px; }
  .field-row input, .field-row select, .field-row textarea { width: 100%; border: 1px solid var(--line); border-radius: 9px; padding: 9px 12px; font-size: 13px; color: var(--ink); background: var(--paper); }
  .field-row input:focus, .field-row select:focus, .field-row textarea:focus { outline: none; border-color: var(--primary); }
  .field-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .field-hint { font-size: 11px; color: var(--ink-soft); margin-top: 4px; }
  .field-error { font-size: 11.5px; color: var(--st-annule); margin-top: 4px; display: none; }
  .field-error.show { display: block; }
  /* Sélecteur de créneaux : les boutons listent les horaires réellement libres renvoyés par l'API. */
  .slot-menu { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0; max-height: 180px; overflow-y: auto; }
  .slot-menu button { border: 1.5px solid var(--line); background: var(--card); border-radius: 9px; padding: 7px 12px; font-size: 12px; font-weight: 700; cursor: pointer; color: var(--ink-soft); }
  .slot-menu button:hover { border-color: var(--primary); color: var(--primary-dark); }
  .slot-menu button.current { border-color: var(--primary); color: var(--primary-dark); background: var(--primary-tint); }
  .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
  .detect-banner { background: var(--primary-tint); color: var(--primary-dark); font-size: 12px; font-weight: 600; padding: 10px 13px; border-radius: 10px; margin-bottom: 14px; display: none; align-items: center; gap: 8px; }
  .detect-banner.show { display: flex; }

  .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; margin-bottom: 16px; }
  .detail-item-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--ink-soft); margin-bottom: 3px; }
  .detail-item-value { font-size: 13.5px; font-weight: 600; }
  .status-menu { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
  .status-menu button { border: 1.5px solid var(--line); background: var(--card); border-radius: 9px; padding: 7px 12px; font-size: 12px; font-weight: 700; cursor: pointer; color: var(--ink-soft); }
  .status-menu button.current { border-color: var(--primary); color: var(--primary-dark); background: var(--primary-tint); }
  .modal-tabs { display: flex; gap: 6px; margin-bottom: 16px; background: var(--paper); border-radius: 10px; padding: 3px; }
  .modal-tabs button { flex: 1; border: none; background: none; padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 700; color: var(--ink-soft); cursor: pointer; }
  .modal-tabs button.active { background: var(--card); color: var(--primary-dark); box-shadow: 0 1px 3px rgba(18,36,47,0.12); }
  .toast { position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%) translateY(20px); background: var(--ink); color: #fff; font-size: 13px; font-weight: 600; padding: 12px 20px; border-radius: 10px; z-index: 200; opacity: 0; transition: opacity .25s ease, transform .25s ease; box-shadow: 0 20px 40px -14px rgba(0,0,0,.4); display: flex; align-items: center; gap: 8px; }
  .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

  @media (max-width: 720px) {
    .sidebar { position: fixed; z-index: 50; left: -260px; transition: left .25s ease; }
    .sidebar.mobile-open { left: 0; }
    .field-2col { grid-template-columns: 1fr; }
    .detail-grid { grid-template-columns: 1fr; }
    .page-head-global { padding: 20px 18px 4px; }
    .page { padding: 14px 18px 60px; }
  }

      `}</style>
  <div className="app">
    
    <aside className="sidebar" id="sidebar">
      <div className="sb-brand">
        <div className="sb-logo">R</div>
        <div className="sb-brand-text">RendezVousApp</div>
      </div>
      <nav>
        <div className="nav-item active" data-page="dashboard">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
          <span className="nav-label">Tableau de bord</span>
        </div>
        <div className="nav-item" data-page="agenda">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span className="nav-label">Agenda</span>
        </div>
        <div className="nav-item" data-page="rdv">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <span className="nav-label">Réservations</span>
        </div>
        <div className="nav-item" data-page="clients">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span className="nav-label">Clients</span>
        </div>
        <div className="nav-item" data-page="services">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/></svg>
          <span className="nav-label">Services</span>
        </div>
        <div className="nav-item" data-page="dispo">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>
          <span className="nav-label">Disponibilités</span>
        </div>
        <div className="nav-item" data-page="receptionnistes">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.9A9 9 0 1 0 9.1 3.5"/><path d="M12 8v4l3 3"/><circle cx="6" cy="16" r="2.5"/></svg>
          <span className="nav-label">Réceptionnistes</span>
        </div>
        <div className="nav-item" data-page="stats">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <span className="nav-label">Statistiques</span>
        </div>
        <div className="nav-item" data-page="assistant">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="8.5" cy="16" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.5" cy="16" r="1.2" fill="currentColor" stroke="none"/><path d="M12 11V7"/><circle cx="12" cy="5" r="2"/></svg>
          <span className="nav-label">Assistant IA</span>
        </div>
        <div className="nav-item" data-page="notifs">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          <span className="nav-label">Notifications</span>
          <span className="nav-badge" id="navNotifBadge">0</span>
        </div>
        <div className="nav-item" data-page="profil">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span className="nav-label">Profil</span>
        </div>
      </nav>
      <button className="sb-collapse-btn" id="collapseBtn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="collapseIcon"><polyline points="15 18 9 12 15 6"/></svg>
        <span className="nav-label">Réduire le menu</span>
      </button>
      <button className="sb-collapse-btn" id="logoutBtn" style={{ marginTop: 6, color: '#D9483C' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span className="nav-label">Déconnexion</span>
      </button>
    </aside>

    
    <div className="main">
      <header className="topbar">
        <div className="tb-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="globalSearch" placeholder="Rechercher un client, une réservation…" />
        </div>
        <div className="tb-right">
          <button className="tb-icon-btn" id="notifBellBtn">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            <span className="tb-icon-dot" id="tbNotifDot">0</span>
          </button>
          <div className="tb-user">
            <div className="tb-avatar" id="tbAvatar" style={{background: 'linear-gradient(135deg,#8957FF,#6B3FD9)'}}></div>
            <div className="tb-user-text">
              <div className="tb-user-name" id="tbUserName"></div>
              <div className="tb-user-role" id="tbUserRole">Professionnel</div>
            </div>
          </div>
        </div>
      </header>

      <div className="page-head-global" id="pageHeadGlobal">
        <div>
          <h1 className="page-title" id="pageTitleMain"></h1>
          <p className="page-sub" id="pageSubMain"></p>
        </div>
        <div id="pageActionsMain"></div>
      </div>

      
      <section className="page active" id="page-dashboard"></section>

      
      <section className="page" id="page-agenda"></section>

      
      <section className="page" id="page-rdv"></section>

      
      <section className="page" id="page-clients"></section>

      
      <section className="page" id="page-services"></section>

      
      <section className="page" id="page-dispo"></section>

      
      <section className="page" id="page-receptionnistes"></section>

      
      <section className="page" id="page-stats"></section>

      
      <section className="page" id="page-assistant"></section>

      
      <section className="page" id="page-notifs"></section>

      
      <section className="page" id="page-profil"></section>
    </div>
  </div>

  
  <div id="modalRoot"></div>
  <div id="toast" className="toast"></div>



    </>
  );
}