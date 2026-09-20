// @ts-nocheck -- vue portée depuis un script JS existant, branchée sur l'API réelle (/api/admin)
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { adminApi } from '../api/admin.api';

export default function AdminDashboard() {
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
     Le backend reste la seule autorité : rôles, filtres et
     règles métier sont appliqués côté serveur.
     ========================================================= */
  const STATUT_UI = { EN_ATTENTE: "attente", ACTIF: "actif", REFUSE: "refuse", DESACTIVE: "desactive" };
  const STATUT_API = { attente: "EN_ATTENTE", actif: "ACTIF", refuse: "REFUSE", desactive: "DESACTIVE" };
  const STATUS_COMPTE = {
    attente: { label: "En attente", cls: "st-encours" },
    actif: { label: "Actif", cls: "st-termine" },
    refuse: { label: "Refusé", cls: "st-annule" },
    desactive: { label: "Désactivé", cls: "st-absent" },
  };
  const ETAT_LABELS = {
    RESERVE: { label: "Réservé", cls: "st-reserve" },
    CLIENT_ARRIVE: { label: "Client arrivé", cls: "st-arrive" },
    EN_COURS: { label: "En cours", cls: "st-encours" },
    TERMINE: { label: "Terminé", cls: "st-termine" },
    ABSENT: { label: "Absent", cls: "st-absent" },
    ANNULE: { label: "Annulé", cls: "st-annule" },
  };
  // Disponibilité d'un service, distincte de sa publication (`actif`).
  const STATUT_SERVICE = {
    DISPONIBLE: { label: "Disponible", cls: "st-termine" },
    COMPLET: { label: "Complet", cls: "st-encours" },
    INDISPONIBLE: { label: "Indisponible", cls: "st-absent" },
  };
  const ROLE_LABELS = { PROFESSIONNEL: "Professionnel", RECEPTIONNISTE: "Réceptionniste", ADMIN: "Administrateur", CLIENT: "Client" };
  const TYPE_INDISPO = { CRENEAU: "Créneau", JOURNEE: "Journée", PERIODE: "Période" };
  const CIBLES_ANNONCE = { TOUS: "Tous les comptes actifs", PROFESSIONNELS: "Professionnels", RECEPTIONNISTES: "Réceptionnistes" };
  const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const NOTIFS_ALERTE = ["COMPTE_REFUSE", "ANNULATION", "CONFLIT_PLANNING", "PROFESSIONNEL_ABSENT"];

  let STATS = null;
  let PROS = [];              // liste complète (sélecteurs, affectations)
  let PROS_VIEW = [];         // liste filtrée affichée dans le tableau
  let RECEPTIONNISTES = [];
  let RECS_VIEW = [];
  let CLIENTS_VIEW = [];
  let SERVICES_VIEW = [];
  let RESERVATIONS = [];
  let RDV_TOTAL = 0;
  let USERS_VIEW = [];
  let AGENDAS = [];
  let PLATFORM = { platformName: "", slogan: "", description: "", logoUrl: "", address: "", phone: "", email: "", joursOuvrables: [], horairesGeneraux: "", conditions: "", conditionsReservation: "", heroImageUrl: "", localisationUrl: "", delaiMinAnnulationHeures: 0, delaiMinModificationHeures: 48, maxChangementsRdv: 1, domaine: "" };
  let NOTIFS = [];
  let AUDIT = { items: [], total: 0, actions: [] };
  let DOMAINES = [];
  let INDISPOS = [];
  // Sélections des tableaux (actions groupées) : des Set d'userId.
  let SELECTION = { pros: new Set(), recs: new Set() };

  let state = {
    page: "dashboard",
    proFilter: { statut: "", search: "", domaineId: "" },
    recFilter: { statut: "", search: "" },
    usersFilter: { role: "", search: "" },
    clientsFilter: { search: "" },
    rdvFilter: { statut: "", professionnelId: "", from: "", to: "", search: "", take: 100, skip: 0 },
    servicesFilter: { search: "", actif: "", statut: "" },
    auditFilter: { action: "", from: "", to: "", take: 50, skip: 0 },
    indispoFilter: { professionnelId: "", type: "", from: "", to: "" },
  };

  /* =========================================================
     UTILITAIRES
     ========================================================= */
  window.todayISO = function todayISO() { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  window.isoPlusDays = function isoPlusDays(iso, n) { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  window.toDay = function toDay(value) { if (!value) return ""; const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  window.toHeure = function toHeure(value) { if (!value) return ""; return new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }
  window.fmtDateShort = function fmtDateShort(value) {
    if (!value) return "—";
    const d = String(value).length === 10 ? new Date(value + "T00:00:00") : new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  window.fmtDateTime = function fmtDateTime(value) { if (!value) return "—"; return `${fmtDateShort(value)} à ${toHeure(value)}`; }
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
  window.fmtMois = function fmtMois(value) { return new Date(value).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }); }
  window.fmtPrix = function fmtPrix(centimes) { return centimes === null || centimes === undefined ? "—" : (centimes / 100).toFixed(2); }
  // Les données saisies par les utilisateurs sont injectées via innerHTML : on échappe systématiquement.
  window.esc = function esc(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  // Argument transmis à un handler inline : on échappe pour JS puis pour le HTML,
  // sans quoi un nom contenant une apostrophe (« L'Atelier ») casserait le onclick.
  window.escArg = function escArg(value) {
    const str = value === null || value === undefined ? "" : String(value);
    return esc(str.replace(/\\/g, "\\\\").replace(/'/g, "\\'"));
  }
  window.initials = function initials(name) { return (name || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase(); }
  const PALETTE = ["#8957FF", "#2FA79D", "#E2478A", "#E2954A", "#3FA65C", "#4A6CF7", "#8A8496"];
  window.colorFor = function colorFor(id) { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; }
  window.val = function val(id) { return (document.getElementById(id)?.value || "").trim(); }
  window.showToast = function showToast(msg) { const t = document.getElementById("toast"); if (!t) return; t.innerHTML = msg; t.classList.add("show"); clearTimeout(showToast._t); showToast._t = setTimeout(() => t.classList.remove("show"), 2800); }
  window.showError = function showError(err) {
    const msg = err?.response?.data?.message || err?.message || "Une erreur est survenue.";
    showToast(esc(Array.isArray(msg) ? msg.join(", ") : msg));
  }
  const debounce = (fn, ms = 320) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const suggestPassword = () => `Rdv-${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 90 + 10)}!`;

  /* =========================================================
     CHARGEMENT DES DONNÉES
     ========================================================= */
  const mapPro = (p) => ({
    id: p.id, userId: p.userId, name: p.nom, email: p.email, phone: p.telephone || "—",
    role: p.specialite || "—",
    domaineId: p.domaineId || "", domaine: p.domaine || "",
    color: colorFor(p.id), statut: STATUT_UI[p.statutCompte] || "attente",
    createdAt: p.createdAt, lastLogin: fmtRelative(p.lastLoginAt),
    nbServices: p.nbServices, nbRdv: p.nbRdv, nbClients: p.nbClients, nbReceptionnistes: p.nbReceptionnistes,
  });
  const mapRec = (r) => ({
    id: r.id, userId: r.userId, name: r.nom, email: r.email, phone: r.telephone || "—",
    statut: STATUT_UI[r.statutCompte] || "attente", createdAt: r.createdAt, lastLogin: fmtRelative(r.lastLoginAt),
    pros: r.professionnelIds, affectations: r.professionnels,
  });
  const mapRdv = (r) => ({
    id: r.id, clientId: r.clientId, client: `${r.client.prenom} ${r.client.nom}`.trim(), telephone: r.client.telephone,
    professionnelId: r.professionnelId, pro: r.professionnel?.nom || "—", service: r.service?.nom || "—",
    date: toDay(r.dateDebut), heure: toHeure(r.dateDebut), fin: toHeure(r.dateFin), etat: r.statut, origine: r.origine,
    motif: r.motifAnnulation, remarque: r.remarque, createdAt: r.createdAt, modifiedAt: r.updatedAt,
  });
  const mapNotif = (n) => ({
    id: n.id, type: NOTIFS_ALERTE.includes(n.type) ? "warn" : "new",
    text: esc(n.message), time: fmtRelative(n.createdAt), unread: !n.lu, kind: n.type,
  });

  window.loadAll = async function loadAll() {
    try {
      const [stats, pros, recs, clients, services, rdv, params, notifs, agendas, domaines] = await Promise.all([
        adminApi.stats(),
        adminApi.listPros(),
        adminApi.listRecs(),
        adminApi.listClients(),
        adminApi.listServices(),
        adminApi.listRdv({ take: state.rdvFilter.take }),
        adminApi.getParams(),
        adminApi.notifications(),
        adminApi.listAgendas(),
        adminApi.listDomaines(),
      ]);
      STATS = stats;
      PROS = pros.map(mapPro); PROS_VIEW = PROS;
      RECEPTIONNISTES = recs.map(mapRec); RECS_VIEW = RECEPTIONNISTES;
      CLIENTS_VIEW = clients;
      SERVICES_VIEW = services;
      RESERVATIONS = (rdv.items || []).map(mapRdv); RDV_TOTAL = rdv.total;
      PLATFORM = { ...PLATFORM, ...params };
      NOTIFS = notifs.map(mapNotif);
      AGENDAS = agendas;
      DOMAINES = domaines;
      return true;
    } catch (e) { showError(e); return false; }
  }
  window.refreshAll = async function refreshAll() {
    const ok = await loadAll();
    renderPage(state.page);
    if (ok) showToast("Données actualisées");
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
  document.getElementById("collapseBtn").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("collapsed"), { signal: ac.signal });
  document.getElementById("notifBellBtn").addEventListener("click", () => goToPage("notifs"), { signal: ac.signal });

  window.renderPage = function renderPage(page) {
    if (page === "dashboard") renderDashboard();
    else if (page === "pros") renderProsPage();
    else if (page === "receptionnistes") renderRecPage();
    else if (page === "users") renderUsersPage();
    else if (page === "clients") renderClientsPage();
    else if (page === "rdv") renderRdvPage();
    else if (page === "services") renderServicesPage();
    else if (page === "agendas") renderAgendasPage();
    else if (page === "absences") renderAbsencesPage();
    else if (page === "domaines") renderDomainesPage();
    else if (page === "params") renderParamsPage();
    else if (page === "audit") renderAuditPage();
    else if (page === "notifs") renderNotifsPage();
    updateBadges();
  }
  window.updateBadges = function updateBadges() {
    const pro = PROS.filter((p) => p.statut === "attente").length;
    const rec = RECEPTIONNISTES.filter((r) => r.statut === "attente").length;
    const n = NOTIFS.filter((x) => x.unread).length;
    const set = (id, value, display) => { const el = document.getElementById(id); if (!el) return; el.textContent = value; el.style.display = value ? display : "none"; };
    set("navProBadge", pro, "inline-block");
    set("navRecBadge", rec, "inline-block");
    set("navNotifBadge", n, "inline-block");
    set("tbNotifDot", n, "flex");
  }

  /* =========================================================
     ICONES
     ========================================================= */
  window.svg = function svg(inner, w) { w = w || 15; return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`; }
  window.iconCheck = function iconCheck() { return svg('<polyline points="20 6 9 17 4 12"/>'); }
  window.iconX = function iconX() { return svg('<circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'); }
  window.iconEye = function iconEye() { return svg('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>', 14); }
  window.iconEdit = function iconEdit() { return svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>', 14); }
  window.iconTrash = function iconTrash() { return svg('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', 14); }
  window.iconKey = function iconKey() { return svg('<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3"/>', 14); }
  window.iconPlus = function iconPlus() { return svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 14); }
  window.iconPrinter = function iconPrinter() { return svg('<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'); }
  window.iconRefresh = function iconRefresh() { return svg('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>', 14); }
  window.iconUsers = function iconUsers() { return svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'); }
  window.iconBriefcase = function iconBriefcase() { return svg('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'); }
  window.iconCal = function iconCal() { return svg('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'); }
  window.iconAlert = function iconAlert() { return svg('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', 13); }
  window.iconTag = function iconTag() { return svg('<path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'); }
  window.iconSend = function iconSend() { return svg('<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>', 14); }
  window.iconClock = function iconClock() { return svg('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>', 14); }
  window.iconMail = function iconMail() { return svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>', 14); }
  window.iconChevronLeft = function iconChevronLeft() { return svg('<polyline points="15 18 9 12 15 6"/>', 14); }
  window.iconChevronRight = function iconChevronRight() { return svg('<polyline points="9 18 15 12 9 6"/>', 14); }

  /* =========================================================
     PAGE : TABLEAU DE BORD ADMIN
     ========================================================= */
  window.renderDashboard = function renderDashboard() {
    const s = STATS || {};
    const parStatut = s.rdvParStatut || {};
    const platformIncomplete = !PLATFORM.description || !PLATFORM.address || !PLATFORM.phone;

    const statCards = [
      { label: "Professionnels au total", value: s.nbPros ?? 0, icon: iconBriefcase(), bg: "#F1ECFF", color: "#8957FF" },
      { label: "Professionnels actifs", value: s.proActifs ?? 0, icon: iconCheck(), bg: "#E9F7ED", color: "#3FA65C" },
      { label: "Professionnels désactivés", value: s.proDesactives ?? 0, icon: iconX(), bg: "#EEEDF2", color: "#8A8496" },
      { label: "Réceptionnistes", value: s.nbRec ?? 0, icon: iconUsers(), bg: "#E6F7F5", color: "#2FA79D" },
      { label: "Clients (au moins 1 RDV)", value: s.nbClients ?? 0, icon: iconUsers(), bg: "#FDF1E2", color: "#E2954A" },
      { label: "Rendez-vous aujourd'hui", value: s.rdvAujourdhui ?? 0, icon: iconCal(), bg: "#F1ECFF", color: "#6B3FD9" },
      { label: "Professionnels sans domaine", value: s.prosSansDomaine ?? 0, icon: iconTag(), bg: "#FDECF3", color: "#E2478A" },
      { label: "Absences en cours ou à venir", value: s.absencesEnCours ?? 0, icon: iconAlert(), bg: "#FDF1E2", color: "#E2954A" },
    ];
    const repartitionDomaines = s.repartitionDomaines || [];
    const maxDom = repartitionDomaines.length ? Math.max(...repartitionDomaines.map((d) => d.nbProfessionnels), 1) : 1;
    const resCards = Object.entries(ETAT_LABELS).map(([k, v]) => ({ label: v.label, cls: v.cls, value: parStatut[k] || 0 }));
    const topServices = s.topServices || [];
    const maxSv = topServices.length ? Math.max(...topServices.map((t) => t.total)) : 1;
    const evolution = s.evolution || [];
    const maxEvo = evolution.length ? Math.max(...evolution.map((e) => e.total)) : 1;
    const attente = [
      ...PROS.filter((p) => p.statut === "attente").map((p) => ({ ...p, type: "Professionnel" })),
      ...RECEPTIONNISTES.filter((r) => r.statut === "attente").map((r) => ({ ...r, type: "Réceptionniste" })),
    ];

    document.getElementById("page-dashboard").innerHTML = `
      <div class="page-head">
        <div><h1 class="page-title">Tableau de bord — Administration</h1><p class="page-sub">Supervision et statistiques globales de la plateforme</p></div>
        <button class="btn btn-ghost btn-sm" onclick="refreshAll()">${iconRefresh()} Actualiser</button>
      </div>
      ${platformIncomplete ? `<div class="card" style="background:#FDF1E2;border-color:#F3D9AE;padding:14px 18px;display:flex;align-items:center;gap:10px;margin-bottom:18px;font-size:12.5px;color:#8A5A1E;">
        ${iconAlert()} Complétez les paramètres généraux de votre plateforme pour une meilleure présentation auprès de vos clients.
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="goToPage('params')">Compléter</button>
      </div>` : ""}
      <div class="stat-grid">${statCards.map((c) => `<div class="stat-card"><div class="stat-icon" style="background:${c.bg};color:${c.color}">${c.icon}</div><div class="stat-value">${c.value}</div><div class="stat-label">${c.label}</div></div>`).join("")}</div>
      <div class="dash-grid">
        <div class="card">
          <div class="card-head"><h3>Réservations — répartition par état</h3><button class="btn btn-ghost btn-sm" onclick="goToPage('rdv')">Voir tout</button></div>
          <div style="display:flex;gap:10px;padding:18px 20px;flex-wrap:wrap;">
            ${resCards.map((c) => `<div style="flex:1;min-width:110px;text-align:center;padding:12px;border:1px solid var(--line);border-radius:12px;"><span class="status-pill ${c.cls}" style="margin-bottom:8px;">${c.label}</span><div style="font-size:20px;font-weight:800;margin-top:8px;">${c.value}</div></div>`).join("")}
          </div>
          <div style="padding:0 20px 8px;display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--ink-soft);">
            <span>Total : <b style="color:var(--ink)">${s.nbRdv ?? 0}</b></span>
            <span>À venir : <b style="color:var(--ink)">${s.rdvAVenir ?? 0}</b></span>
            <span>Cette semaine : <b style="color:var(--ink)">${s.rdvSemaine ?? 0}</b></span>
            <span>Taux d'annulation : <b style="color:var(--ink)">${s.tauxAnnulation ?? 0} %</b></span>
          </div>
          <div style="padding:14px 20px 20px;">
            <div class="detail-item-label" style="margin-bottom:8px;">Services les plus réservés</div>
            ${topServices.length ? topServices.map((t) => `<div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span>${esc(t.nom)}</span><b>${t.total}</b></div><div style="background:var(--paper);border-radius:999px;height:7px;overflow:hidden;"><div style="width:${(t.total / maxSv) * 100}%;background:var(--primary);height:100%;"></div></div></div>`).join("") : `<div class="table-empty">Aucune réservation enregistrée</div>`}
          </div>
          <div style="padding:0 20px 20px;">
            <div class="detail-item-label" style="margin-bottom:10px;">Évolution des rendez-vous (6 derniers mois)</div>
            <div style="display:flex;align-items:flex-end;gap:10px;height:110px;">
              ${evolution.length ? evolution.map((e) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;justify-content:flex-end;height:100%;"><b style="font-size:11.5px;">${e.total}</b><div style="width:100%;background:var(--primary-tint);border-radius:8px 8px 0 0;height:${Math.max((e.total / maxEvo) * 100, 4)}%;"></div><span style="font-size:10.5px;color:var(--ink-soft)">${fmtMois(e.mois)}</span></div>`).join("") : `<div class="table-empty" style="width:100%">Aucune donnée</div>`}
            </div>
          </div>
        </div>
        <div>
          <div class="card" style="margin-bottom:14px;">
            <div class="card-head"><h3>Inscriptions en attente</h3></div>
            ${attente.map((x) => `
              <div class="dash-list-row">
                <div class="avatar-sm" style="background:var(--ink-soft)">${initials(x.name)}</div>
                <div style="flex:1"><div class="dash-list-name">${esc(x.name)}</div><div class="dash-list-sub">${x.type}</div></div>
                <button class="btn btn-primary btn-sm" onclick="setCompteStatut('${x.userId}','actif')">${iconCheck()} Valider</button>
                <button class="btn btn-danger-ghost btn-sm" onclick="setCompteStatut('${x.userId}','refuse')">Refuser</button>
              </div>`).join("") || `<div class="table-empty">Aucune inscription en attente</div>`}
          </div>
          <div class="card" style="margin-bottom:14px;">
            <div class="card-head"><h3>Activité récente</h3><button class="btn btn-ghost btn-sm" onclick="goToPage('notifs')">Tout voir</button></div>
            ${NOTIFS.slice(0, 4).map((n) => notifRowHtml(n)).join("") || `<div class="table-empty">Aucune notification</div>`}
          </div>
          <div class="card" style="margin-bottom:14px;">
            <div class="card-head"><h3>Répartition par domaine</h3><button class="btn btn-ghost btn-sm" onclick="goToPage('domaines')">Gérer</button></div>
            <div style="padding:14px 20px 18px;">
              ${repartitionDomaines.length ? repartitionDomaines.map((d) => `<div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span>${esc(d.nom)}${d.actif ? "" : " (masqué)"}</span><b>${d.nbProfessionnels}</b></div><div style="background:var(--paper);border-radius:999px;height:7px;overflow:hidden;"><div style="width:${(d.nbProfessionnels / maxDom) * 100}%;background:${d.actif ? "var(--primary)" : "var(--ink-soft)"};height:100%;"></div></div></div>`).join("") : `<div class="table-empty">Aucun domaine d'activité défini</div>`}
              ${(s.prosSansDomaine ?? 0) > 0 ? `<div style="font-size:11.5px;color:var(--ink-soft);margin-top:10px;">${s.prosSansDomaine} professionnel(s) ne sont rattachés à aucun domaine. <a href="#" style="color:var(--primary-dark);font-weight:700;" onclick="event.preventDefault();filtrerProsSansDomaine()">Les afficher</a></div>` : ""}
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Professionnels les plus sollicités</h3></div>
            ${(s.topProfessionnels || []).map((p) => `<div class="dash-list-row"><div class="avatar-sm" style="background:${colorFor(p.id)}">${initials(p.nom)}</div><div style="flex:1"><div class="dash-list-name">${esc(p.nom)}</div><div class="dash-list-sub">${p.total} rendez-vous</div></div></div>`).join("") || `<div class="table-empty">Aucune donnée</div>`}
          </div>
        </div>
      </div>
    `;
  }

  /* =========================================================
     PAGE : PROFESSIONNELS
     ========================================================= */
  window.renderProsPage = function renderProsPage() {
    document.getElementById("page-pros").innerHTML = `
      <div class="page-head">
        <div><h1 class="page-title">Professionnels</h1><p class="page-sub">Validation des inscriptions, activation des comptes, consultation de l'activité</p></div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary btn-sm" onclick="openCreateCompte('PROFESSIONNEL')">${iconPlus()} Nouveau compte</button>
          <button class="btn btn-ghost btn-sm" onclick="exportProsCsv()">${iconPrinter()} Exporter</button>
        </div>
      </div>
      <div class="filter-row">
        <input type="text" placeholder="Rechercher un nom, un e-mail…" value="${esc(state.proFilter.search)}" oninput="updateProFilter('search', this.value)" style="min-width:220px" />
        <select onchange="updateProFilter('statut', this.value)"><option value="">Tous les statuts</option>${Object.entries(STATUS_COMPTE).map(([k, v]) => `<option value="${k}" ${state.proFilter.statut === k ? "selected" : ""}>${v.label}</option>`).join("")}</select>
        <select onchange="updateProFilter('domaineId', this.value)">
          <option value="">Tous les domaines</option>
          <option value="AUCUN" ${state.proFilter.domaineId === "AUCUN" ? "selected" : ""}>Sans domaine</option>
          ${DOMAINES.map((d) => `<option value="${d.id}" ${state.proFilter.domaineId === d.id ? "selected" : ""}>${esc(d.nom)}</option>`).join("")}
        </select>
      </div>
      <div id="prosBulkBar"></div>
      <div class="card"><table class="data-table"><thead><tr><th style="width:34px"><input type="checkbox" id="prosCheckAll" onchange="toggleAllSelection('pros', this.checked)" /></th><th>Professionnel</th><th>Domaine</th><th>Services</th><th>Statut</th><th>Créé le</th><th>Dernière connexion</th><th></th></tr></thead><tbody id="prosTableBody"></tbody></table></div>
    `;
    renderProsTable();
  }
  /** Raccourci du tableau de bord : n'afficher que les professionnels non classés. */
  window.filtrerProsSansDomaine = function filtrerProsSansDomaine() {
    state.proFilter = { statut: "", search: "", domaineId: "AUCUN" };
    goToPage("pros");
    reloadPros();
  }
  const reloadProsDebounced = debounce(() => reloadPros());
  window.updateProFilter = function updateProFilter(k, v) { state.proFilter[k] = v; reloadProsDebounced(); }
  window.reloadPros = async function reloadPros() {
    try {
      const f = state.proFilter;
      const data = await adminApi.listPros({
        statut: f.statut ? STATUT_API[f.statut] : undefined,
        search: f.search || undefined,
        domaineId: f.domaineId || undefined,
      });
      PROS_VIEW = data.map(mapPro);
      // On oublie les lignes sélectionnées qui ne sont plus affichées.
      const visibles = new Set(PROS_VIEW.map((p) => p.userId));
      SELECTION.pros = new Set([...SELECTION.pros].filter((id) => visibles.has(id)));
      renderProsTable();
    } catch (e) { showError(e); }
  }
  window.renderProsTable = function renderProsTable() {
    const body = document.getElementById("prosTableBody");
    if (!body) return;
    if (!PROS_VIEW.length) { body.innerHTML = `<tr><td colspan="8"><div class="table-empty">Aucun professionnel trouvé</div></td></tr>`; renderBulkBar("pros"); return; }
    body.innerHTML = PROS_VIEW.map((p) => `<tr class="row-clickable" onclick="openProFiche('${p.id}')">
      <td onclick="event.stopPropagation()"><input type="checkbox" ${SELECTION.pros.has(p.userId) ? "checked" : ""} onchange="toggleSelection('pros','${p.userId}', this.checked)" /></td>
      <td><div class="cell-client"><div class="avatar-sm" style="background:${p.color}">${initials(p.name)}</div><div><div class="cell-client-name">${esc(p.name)}</div><div class="cell-client-sub">${esc(p.role)}</div></div></div></td>
      <td>${p.domaine ? `<span class="status-pill st-reserve">${esc(p.domaine)}</span>` : `<span class="dash-list-sub">—</span>`}</td>
      <td>${p.nbServices}</td>
      <td><span class="status-pill ${STATUS_COMPTE[p.statut].cls}">${STATUS_COMPTE[p.statut].label}</span></td>
      <td>${fmtDateShort(p.createdAt)}</td><td>${p.lastLogin}</td>
      <td><div class="row-actions" onclick="event.stopPropagation()">
        <button class="icon-btn" title="Consulter la fiche" onclick="openProFiche('${p.id}')">${iconEye()}</button>
        <button class="icon-btn" title="Modifier la fiche" onclick="openEditPro('${p.id}')">${iconEdit()}</button>
        <button class="icon-btn" title="Agenda" onclick="openAgenda('${p.id}')">${iconCal()}</button>
        <button class="icon-btn" title="Réinitialiser le mot de passe" onclick="openResetPassword('${p.userId}','${escArg(p.name)}')">${iconKey()}</button>
      </div></td>
    </tr>`).join("");
    renderBulkBar("pros");
  }
  window.exportProsCsv = function exportProsCsv() {
    const f = state.proFilter;
    exportCsv("professionnels", "professionnels.csv", {
      statut: f.statut ? STATUT_API[f.statut] : undefined, search: f.search || undefined, domaineId: f.domaineId || undefined,
    });
  }

  /* =========================================================
     SÉLECTION MULTIPLE ET ACTIONS GROUPÉES
     ========================================================= */
  const SELECTION_SOURCE = { pros: () => PROS_VIEW, recs: () => RECS_VIEW };
  window.toggleSelection = function toggleSelection(scope, userId, checked) {
    if (checked) SELECTION[scope].add(userId); else SELECTION[scope].delete(userId);
    renderBulkBar(scope);
    const all = document.getElementById(scope === "pros" ? "prosCheckAll" : "recsCheckAll");
    if (all) all.checked = SELECTION[scope].size === SELECTION_SOURCE[scope]().length && SELECTION[scope].size > 0;
  }
  window.toggleAllSelection = function toggleAllSelection(scope, checked) {
    SELECTION[scope] = checked ? new Set(SELECTION_SOURCE[scope]().map((x) => x.userId)) : new Set();
    if (scope === "pros") renderProsTable(); else renderRecTable();
  }
  window.renderBulkBar = function renderBulkBar(scope) {
    const bar = document.getElementById(scope === "pros" ? "prosBulkBar" : "recsBulkBar");
    if (!bar) return;
    const n = SELECTION[scope].size;
    if (!n) { bar.innerHTML = ""; return; }
    bar.innerHTML = `<div class="card" style="padding:10px 16px;margin-bottom:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:var(--primary-tint);border-color:#D8CCFB;">
      <b style="font-size:12.5px;">${n} compte(s) sélectionné(s)</b>
      <button class="btn btn-primary btn-sm" onclick="applyBulkStatut('${scope}','actif')">${iconCheck()} Valider / activer</button>
      <button class="btn btn-ghost btn-sm" onclick="applyBulkStatut('${scope}','desactive')">${iconX()} Désactiver</button>
      <button class="btn btn-danger-ghost btn-sm" onclick="applyBulkStatut('${scope}','refuse')">Refuser</button>
      <button class="btn btn-ghost btn-sm" onclick="openAnnonce('${scope}')">${iconSend()} Envoyer une annonce</button>
      <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="toggleAllSelection('${scope}', false)">Tout désélectionner</button>
    </div>`;
  }
  window.applyBulkStatut = async function applyBulkStatut(scope, statutUi) {
    const userIds = [...SELECTION[scope]];
    if (!userIds.length) return;
    try {
      const res = await adminApi.setStatutGroupe(userIds, STATUT_API[statutUi]);
      SELECTION[scope] = new Set();
      await loadAll();
      await Promise.all([reloadPros(), reloadRecs()]);
      renderPage(state.page);
      const ignores = res.ignores?.length ? ` — ${res.ignores.length} ignoré(s)` : "";
      showToast(`${res.traites.length} compte(s) mis à jour${ignores}`);
    } catch (e) { showError(e); }
  }
  window.openProFiche = async function openProFiche(id) {
    try {
      const p = await adminApi.getPro(id);
      const statut = STATUT_UI[p.statutCompte];
      const color = colorFor(p.id);
      const html = `
        <div class="modal-head">
          <div style="display:flex;align-items:center;gap:12px;"><div class="avatar-sm" style="width:42px;height:42px;font-size:15px;background:${color}">${initials(p.nom)}</div><div><p class="modal-title">${esc(p.nom)}</p><p class="modal-sub">${esc(p.specialite || "—")}</p></div></div>
          <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div class="detail-grid">
          <div><div class="detail-item-label">E-mail</div><div class="detail-item-value">${esc(p.email)}</div></div>
          <div><div class="detail-item-label">Téléphone</div><div class="detail-item-value">${esc(p.telephone || "—")}</div></div>
          <div><div class="detail-item-label">Statut du compte</div><div class="detail-item-value"><span class="status-pill ${STATUS_COMPTE[statut].cls}">${STATUS_COMPTE[statut].label}</span></div></div>
          <div><div class="detail-item-label">Créé le</div><div class="detail-item-value">${fmtDateShort(p.createdAt)}</div></div>
          <div><div class="detail-item-label">Dernière connexion</div><div class="detail-item-value">${fmtRelative(p.lastLoginAt)}</div></div>
          <div><div class="detail-item-label">E-mail vérifié</div><div class="detail-item-value">${p.emailVerifie ? "Oui" : "Non"}</div></div>
          <div><div class="detail-item-label">Adresse</div><div class="detail-item-value">${esc(p.adresse || "—")}</div></div>
          <div><div class="detail-item-label">Domaine d'activité</div><div class="detail-item-value">
            <select onchange="setProDomaine('${p.id}', this.value)" style="max-width:220px">
              <option value="">— Aucun domaine —</option>
              ${DOMAINES.map((d) => `<option value="${d.id}" ${p.domaineId === d.id ? "selected" : ""}>${esc(d.nom)}${d.actif ? "" : " (masqué)"}</option>`).join("")}
            </select>
          </div></div>
        </div>
        <div class="stat-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px;">
          <div class="stat-card" style="padding:12px;"><div class="stat-value" style="font-size:17px;">${p.nbServices}</div><div class="stat-label">Services</div></div>
          <div class="stat-card" style="padding:12px;"><div class="stat-value" style="font-size:17px;">${p.nbRdv}</div><div class="stat-label">Rendez-vous</div></div>
          <div class="stat-card" style="padding:12px;"><div class="stat-value" style="font-size:17px;">${p.nbClients}</div><div class="stat-label">Clients</div></div>
          <div class="stat-card" style="padding:12px;"><div class="stat-value" style="font-size:17px;">${p.nbReceptionnistes}</div><div class="stat-label">Réceptionnistes</div></div>
        </div>
        <div class="detail-item-label" style="margin-bottom:8px;">Services proposés</div>
        <div style="margin-bottom:16px;">${p.services.length ? p.services.map((sv) => `<div class="dash-list-row" style="padding:8px 0;"><div style="flex:1"><div class="dash-list-name" style="font-size:12.5px;">${esc(sv.nom)}</div><div class="dash-list-sub">${sv.dureeMinutes} min · ${fmtPrix(sv.prix)}</div></div><span class="status-pill ${sv.actif ? "st-termine" : "st-absent"}">${sv.actif ? "Actif" : "Désactivé"}</span></div>`).join("") : `<div class="table-empty">Aucun service</div>`}</div>
        <div class="detail-item-label" style="margin-bottom:8px;">Disponibilités hebdomadaires</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">${p.disponibilites.length ? p.disponibilites.map((d) => `<span class="status-pill st-reserve">${JOURS[d.jourSemaine]} ${d.heureDebut}–${d.heureFin}</span>`).join("") : `<span class="dash-list-sub">Aucune disponibilité définie</span>`}</div>
        ${p.parametresReservation ? `<div class="detail-item-label" style="margin-bottom:8px;">Règles de réservation du professionnel</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">
          <span class="status-pill st-reserve">Intervalle : ${p.parametresReservation.intervalleMinutes} min</span>
          <span class="status-pill st-reserve">Délai min. : ${p.parametresReservation.delaiMinHeures} h</span>
          <span class="status-pill st-reserve">Horizon : ${p.parametresReservation.delaiMaxJours} j</span>
          <span class="status-pill st-reserve">Max ${p.parametresReservation.maxRdvParClientParJour} RDV/client/jour</span>
          <span class="status-pill st-absent">Seuil absences : ${p.parametresReservation.seuilAbsences}</span>
        </div>` : ""}
        ${p.receptionnistes.length ? `<div class="detail-item-label" style="margin-bottom:8px;">Réceptionnistes associées</div><div style="margin-bottom:16px;">${p.receptionnistes.map((r) => `<div class="dash-list-row" style="padding:8px 0;"><div class="avatar-sm" style="background:${colorFor(r.receptionnisteId)}">${initials(r.nom)}</div><div style="flex:1"><div class="dash-list-name" style="font-size:12.5px;">${esc(r.nom)}</div><div class="dash-list-sub">${esc(r.email)}</div></div><span class="status-pill ${r.actifSurEspace ? "st-termine" : "st-absent"}" title="Activation décidée par le professionnel">${r.actifSurEspace ? "Active ici" : "Suspendue ici"}</span><button class="btn btn-ghost btn-sm" onclick="openPermissions('${r.affectationId}')">${iconEdit()} Autorisations</button></div>`).join("")}</div>` : ""}
        <div class="detail-item-label" style="margin-bottom:8px;">10 derniers rendez-vous</div>
        <div style="margin-bottom:16px;">${p.derniersRdv.length ? p.derniersRdv.map((r) => `<div class="dash-list-row" style="padding:8px 0;"><div style="flex:1"><div class="dash-list-name" style="font-size:12.5px;">${esc(r.client.prenom + " " + r.client.nom)}</div><div class="dash-list-sub">${esc(r.service.nom)} · ${fmtDateTime(r.dateDebut)}</div></div><span class="status-pill ${ETAT_LABELS[r.statut].cls}">${ETAT_LABELS[r.statut].label}</span></div>`).join("") : `<div class="table-empty">Aucun rendez-vous</div>`}</div>
        <div class="modal-actions" style="justify-content:space-between;flex-wrap:wrap;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${statut === "attente" ? `<button class="btn btn-primary btn-sm" onclick="setCompteStatut('${p.userId}','actif')">${iconCheck()} Valider l'inscription</button><button class="btn btn-danger-ghost btn-sm" onclick="setCompteStatut('${p.userId}','refuse')">${iconX()} Refuser</button>` : ""}
            ${statut === "actif" ? `<button class="btn btn-ghost btn-sm" onclick="setCompteStatut('${p.userId}','desactive')">${iconX()} Désactiver le compte</button>` : ""}
            ${(statut === "desactive" || statut === "refuse") ? `<button class="btn btn-primary btn-sm" onclick="setCompteStatut('${p.userId}','actif')">${iconCheck()} Réactiver le compte</button>` : ""}
            <button class="btn btn-ghost btn-sm" onclick="openEditPro('${p.id}')">${iconEdit()} Modifier la fiche</button>
            <button class="btn btn-ghost btn-sm" onclick="openResetPassword('${p.userId}','${escArg(p.nom)}')">${iconKey()} Mot de passe</button>
            <button class="btn btn-ghost btn-sm" onclick="openChangeEmail('${p.userId}','${escArg(p.email)}')">${iconMail()} Changer l'e-mail</button>
            <button class="btn btn-ghost btn-sm" onclick="openAgenda('${p.id}')">${iconCal()} Agenda</button>
            <button class="btn btn-danger-ghost btn-sm" onclick="askDeleteCompte('${p.userId}','${escArg(p.nom)}')">${iconTrash()} Supprimer</button>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="closeModal()">Fermer</button>
        </div>
      `;
      openModal(html, true);
    } catch (e) { showError(e); }
  }

  /* =========================================================
     ÉDITION DES FICHES (professionnel, réceptionniste, e-mail)
     ========================================================= */
  window.openEditPro = async function openEditPro(id) {
    try {
      const p = await adminApi.getPro(id);
      openModal(`
        <div class="modal-head"><div><p class="modal-title">Modifier la fiche</p><p class="modal-sub">${esc(p.nom)}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
        <div class="field-row"><label>Nom complet</label><input type="text" id="epNom" value="${esc(p.nom)}" /></div>
        <div class="field-2col">
          <div class="field-row"><label>Fonction / spécialité</label><input type="text" id="epSpec" value="${esc(p.specialite || "")}" /></div>
          <div class="field-row"><label>Téléphone</label><input type="text" id="epTel" value="${esc(p.telephone || "")}" /></div>
        </div>
        <div class="field-row"><label>Adresse du cabinet</label><input type="text" id="epAdr" value="${esc(p.adresse || "")}" /></div>
        <div class="field-row"><label>Présentation publique</label><textarea id="epDesc" rows="3">${esc(p.description || "")}</textarea></div>
        <div class="field-row"><label>URL de la photo</label><input type="text" id="epPhoto" value="${esc(p.photoUrl || "")}" placeholder="https://…" /></div>
        <div class="field-hint">Le professionnel est notifié de la modification. L'adresse e-mail se change séparément.</div>
        <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveEditPro('${id}')">${iconCheck()} Enregistrer</button></div>
      `);
    } catch (e) { showError(e); }
  }
  window.saveEditPro = async function saveEditPro(id) {
    const nom = val("epNom");
    if (nom.length < 2) { showToast("Le nom doit contenir au moins 2 caractères"); return; }
    try {
      await adminApi.updatePro(id, {
        nom, specialite: val("epSpec"), telephone: val("epTel"),
        adresse: val("epAdr"), description: val("epDesc"), photoUrl: val("epPhoto"),
      });
      closeModal();
      await loadAll();
      await reloadPros();
      renderPage(state.page);
      showToast("Fiche du professionnel mise à jour");
    } catch (e) { showError(e); }
  }
  window.openEditRec = async function openEditRec(id) {
    const r = RECS_VIEW.find((x) => x.id === id) || RECEPTIONNISTES.find((x) => x.id === id);
    if (!r) { showToast("Réceptionniste introuvable — actualisez la page"); return; }
    openModal(`
      <div class="modal-head"><div><p class="modal-title">Modifier la fiche</p><p class="modal-sub">${esc(r.name)}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-row"><label>Nom complet</label><input type="text" id="erNom" value="${esc(r.name)}" /></div>
      <div class="field-row"><label>Téléphone</label><input type="text" id="erTel" value="${esc(r.phone === "—" ? "" : r.phone)}" /></div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveEditRec('${id}')">${iconCheck()} Enregistrer</button></div>
    `);
  }
  window.saveEditRec = async function saveEditRec(id) {
    const nom = val("erNom");
    if (nom.length < 2) { showToast("Le nom doit contenir au moins 2 caractères"); return; }
    try {
      await adminApi.updateRec(id, { nom, telephone: val("erTel") });
      closeModal();
      await loadAll();
      await reloadRecs();
      renderPage(state.page);
      showToast("Fiche de la réceptionniste mise à jour");
    } catch (e) { showError(e); }
  }
  window.openChangeEmail = function openChangeEmail(userId, emailActuel) {
    openModal(`
      <div class="modal-head"><div><p class="modal-title">Changer l'adresse e-mail</p><p class="modal-sub">${esc(emailActuel)}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-row"><label>Nouvelle adresse de connexion</label><input type="email" id="ceEmail" value="${esc(emailActuel)}" /></div>
      <div class="field-hint">C'est l'identifiant de connexion du compte. L'adresse repasse à « non vérifiée » et le titulaire est notifié.</div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveChangeEmail('${userId}')">${iconCheck()} Enregistrer</button></div>
    `);
  }
  window.saveChangeEmail = async function saveChangeEmail(userId) {
    const email = val("ceEmail");
    if (!email.includes("@")) { showToast("Adresse e-mail invalide"); return; }
    try {
      await adminApi.updateEmail(userId, email);
      closeModal();
      await loadAll();
      await Promise.all([reloadPros(), reloadRecs()]);
      renderPage(state.page);
      showToast("Adresse e-mail mise à jour");
    } catch (e) { showError(e); }
  }
  window.setProDomaine = async function setProDomaine(professionnelId, domaineId) {
    try {
      await adminApi.setProDomaine(professionnelId, domaineId || null);
      await loadAll();
      await reloadPros();
      showToast(domaineId ? "Professionnel rattaché au domaine" : "Professionnel détaché de son domaine");
    } catch (e) { showError(e); }
  }

  /* =========================================================
     COMPTES — statut, création, mot de passe, suppression
     ========================================================= */
  window.setCompteStatut = async function setCompteStatut(userId, statutUi) {
    try {
      await adminApi.setStatut(userId, STATUT_API[statutUi]);
      closeModal();
      await loadAll();
      await reloadPros();
      await reloadRecs();
      renderPage(state.page);
      showToast(`Statut mis à jour : <b>${STATUS_COMPTE[statutUi].label}</b>`);
    } catch (e) { showError(e); }
  }
  window.openCreateCompte = function openCreateCompte(role) {
    const titre = role === "PROFESSIONNEL" ? "Nouveau professionnel" : role === "ADMIN" ? "Nouvel administrateur" : "Nouvelle réceptionniste";
    openModal(`
      <div class="modal-head"><div><p class="modal-title">${titre}</p><p class="modal-sub">Le compte est actif immédiatement (créé par l'administrateur)</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-row"><label>Nom complet *</label><input type="text" id="ncNom" placeholder="Ex. Dr. Ahmed Benali" /></div>
      <div class="field-2col">
        <div class="field-row"><label>E-mail *</label><input type="email" id="ncEmail" placeholder="nom@exemple.com" /></div>
        <div class="field-row"><label>Téléphone</label><input type="text" id="ncTel" /></div>
      </div>
      <div class="field-row"><label>Mot de passe provisoire * (8 caractères minimum)</label><input type="text" id="ncPwd" value="${suggestPassword()}" /></div>
      ${role === "PROFESSIONNEL" ? `<div class="field-2col">
        <div class="field-row"><label>Fonction / spécialité</label><input type="text" id="ncSpec" placeholder="Ex. Médecin généraliste" /></div>
        <div class="field-row"><label>Domaine d'activité</label><select id="ncDomaine"><option value="">— Aucun —</option>${DOMAINES.filter((d) => d.actif).map((d) => `<option value="${d.id}">${esc(d.nom)}</option>`).join("")}</select></div>
      </div>` : ""}
      ${role === "ADMIN" ? `<div class="field-hint" style="color:#8A5A1E;">Un administrateur dispose de tous les droits de supervision de la plateforme. Le nom saisi n'est conservé que dans le journal d'audit : un compte Admin n'a pas de fiche métier.</div>` : ""}
      <div class="field-hint">Communiquez le mot de passe provisoire à la personne concernée : elle pourra le modifier depuis son espace.</div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveCompte('${role}')">${iconCheck()} Créer le compte</button></div>
    `);
  }
  window.saveCompte = async function saveCompte(role) {
    const payload = { role, nom: val("ncNom"), email: val("ncEmail"), password: val("ncPwd") };
    if (val("ncTel")) payload.telephone = val("ncTel");
    if (role === "PROFESSIONNEL" && val("ncSpec")) payload.specialite = val("ncSpec");
    if (role === "PROFESSIONNEL" && val("ncDomaine")) payload.domaineId = val("ncDomaine");
    if (!payload.nom || !payload.email || payload.password.length < 8) { showToast("Nom, e-mail et mot de passe (8 caractères min.) sont obligatoires"); return; }
    try {
      await adminApi.createCompte(payload);
      closeModal();
      await loadAll();
      renderPage(state.page);
      showToast(`Compte créé : <b>${esc(payload.email)}</b>`);
    } catch (e) { showError(e); }
  }
  window.openResetPassword = function openResetPassword(userId, name) {
    openModal(`
      <div class="modal-head"><div><p class="modal-title">Réinitialiser le mot de passe</p><p class="modal-sub">${esc(name)}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-row"><label>Nouveau mot de passe (8 caractères minimum)</label><input type="text" id="rpPwd" value="${suggestPassword()}" /></div>
      <div class="field-hint">Le titulaire du compte reçoit une notification l'informant de la réinitialisation.</div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveResetPassword('${userId}')">${iconCheck()} Réinitialiser</button></div>
    `);
  }
  window.saveResetPassword = async function saveResetPassword(userId) {
    const password = val("rpPwd");
    if (password.length < 8) { showToast("Le mot de passe doit contenir au moins 8 caractères"); return; }
    try { await adminApi.resetPassword(userId, password); closeModal(); showToast("Mot de passe réinitialisé"); }
    catch (e) { showError(e); }
  }
  window.askDeleteCompte = function askDeleteCompte(userId, name) {
    openModal(`
      <div class="modal-head"><div><p class="modal-title">Supprimer le compte</p><p class="modal-sub">${esc(name)}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-hint" style="margin-bottom:14px;">Cette action est définitive. Elle est refusée si des rendez-vous sont rattachés au compte : dans ce cas, désactivez-le pour conserver l'historique.</div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-danger-ghost" onclick="confirmDeleteCompte('${userId}')">${iconTrash()} Supprimer définitivement</button></div>
    `);
  }
  window.confirmDeleteCompte = async function confirmDeleteCompte(userId) {
    try {
      await adminApi.deleteCompte(userId);
      closeModal();
      await loadAll();
      await reloadPros();
      await reloadRecs();
      renderPage(state.page);
      showToast("Compte supprimé");
    } catch (e) { showError(e); }
  }

  /* =========================================================
     PAGE : RÉCEPTIONNISTES
     ========================================================= */
  window.renderRecPage = function renderRecPage() {
    document.getElementById("page-receptionnistes").innerHTML = `
      <div class="page-head">
        <div><h1 class="page-title">Réceptionnistes</h1><p class="page-sub">Validation, activation, affectation aux professionnels et autorisations</p></div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary btn-sm" onclick="openCreateCompte('RECEPTIONNISTE')">${iconPlus()} Nouveau compte</button>
          <button class="btn btn-ghost btn-sm" onclick="exportRecsCsv()">${iconPrinter()} Exporter</button>
        </div>
      </div>
      <div class="filter-row">
        <input type="text" placeholder="Rechercher…" value="${esc(state.recFilter.search)}" oninput="updateRecFilter('search', this.value)" style="min-width:220px" />
        <select onchange="updateRecFilter('statut', this.value)"><option value="">Tous les statuts</option>${Object.entries(STATUS_COMPTE).map(([k, v]) => `<option value="${k}" ${state.recFilter.statut === k ? "selected" : ""}>${v.label}</option>`).join("")}</select>
      </div>
      <div id="recsBulkBar"></div>
      <div class="card"><table class="data-table"><thead><tr><th style="width:34px"><input type="checkbox" id="recsCheckAll" onchange="toggleAllSelection('recs', this.checked)" /></th><th>Réceptionniste</th><th>E-mail</th><th>Statut</th><th>Professionnels affectés</th><th></th></tr></thead><tbody id="recTableBody"></tbody></table></div>
    `;
    renderRecTable();
  }
  const reloadRecsDebounced = debounce(() => reloadRecs());
  window.updateRecFilter = function updateRecFilter(k, v) { state.recFilter[k] = v; reloadRecsDebounced(); }
  window.reloadRecs = async function reloadRecs() {
    try {
      const f = state.recFilter;
      const data = await adminApi.listRecs({ statut: f.statut ? STATUT_API[f.statut] : undefined, search: f.search || undefined });
      RECS_VIEW = data.map(mapRec);
      const visibles = new Set(RECS_VIEW.map((r) => r.userId));
      SELECTION.recs = new Set([...SELECTION.recs].filter((id) => visibles.has(id)));
      renderRecTable();
    } catch (e) { showError(e); }
  }
  window.renderRecTable = function renderRecTable() {
    const body = document.getElementById("recTableBody");
    if (!body) return;
    if (!RECS_VIEW.length) { body.innerHTML = `<tr><td colspan="6"><div class="table-empty">Aucune réceptionniste trouvée</div></td></tr>`; renderBulkBar("recs"); return; }
    body.innerHTML = RECS_VIEW.map((r) => `<tr>
      <td><input type="checkbox" ${SELECTION.recs.has(r.userId) ? "checked" : ""} onchange="toggleSelection('recs','${r.userId}', this.checked)" /></td>
      <td><div class="cell-client"><div class="avatar-sm" style="background:${colorFor(r.id)}">${initials(r.name)}</div><div><div class="cell-client-name">${esc(r.name)}</div><div class="cell-client-sub">${esc(r.phone)}</div></div></div></td>
      <td>${esc(r.email)}</td>
      <td><span class="status-pill ${STATUS_COMPTE[r.statut].cls}">${STATUS_COMPTE[r.statut].label}</span></td>
      <td>${r.affectations.length ? r.affectations.map((a) => `<span class="status-pill ${a.actifSurEspace ? "st-reserve" : "st-absent"}" style="margin:2px 2px 2px 0;cursor:pointer" title="${a.actifSurEspace ? "Active sur cet espace" : "Suspendue par le professionnel sur cet espace"} — cliquer pour les autorisations" onclick="openPermissions('${a.affectationId}')">${esc(a.nom)}</span>`).join("") : "Aucun"}</td>
      <td><div class="row-actions">
        <button class="btn btn-ghost btn-sm" onclick="openAffectForm('${r.id}')">${iconUsers()} Affecter</button>
        <button class="icon-btn" title="Modifier la fiche" onclick="openEditRec('${r.id}')">${iconEdit()}</button>
        ${r.statut === "attente"
          ? `<button class="icon-btn" title="Valider" onclick="setCompteStatut('${r.userId}','actif')">${iconCheck()}</button><button class="icon-btn" title="Refuser" onclick="setCompteStatut('${r.userId}','refuse')">${iconX()}</button>`
          : `<button class="icon-btn" title="${r.statut === "actif" ? "Désactiver" : "Activer"}" onclick="setCompteStatut('${r.userId}','${r.statut === "actif" ? "desactive" : "actif"}')">${r.statut === "actif" ? iconX() : iconCheck()}</button>`}
        <button class="icon-btn" title="Réinitialiser le mot de passe" onclick="openResetPassword('${r.userId}','${escArg(r.name)}')">${iconKey()}</button>
        <button class="icon-btn" title="Changer l'e-mail" onclick="openChangeEmail('${r.userId}','${escArg(r.email)}')">${iconMail()}</button>
        <button class="icon-btn" title="Supprimer" onclick="askDeleteCompte('${r.userId}','${escArg(r.name)}')">${iconTrash()}</button>
      </div></td>
    </tr>`).join("");
    renderBulkBar("recs");
  }
  window.exportRecsCsv = function exportRecsCsv() {
    const f = state.recFilter;
    exportCsv("receptionnistes", "receptionnistes.csv", {
      statut: f.statut ? STATUT_API[f.statut] : undefined, search: f.search || undefined,
    });
  }
  window.openAffectForm = function openAffectForm(id) {
    const r = RECS_VIEW.find((x) => x.id === id) || RECEPTIONNISTES.find((x) => x.id === id);
    if (!r) return;
    const actifs = PROS.filter((p) => p.statut === "actif");
    openModal(`
      <div class="modal-head"><div><p class="modal-title">Affecter — ${esc(r.name)}</p><p class="modal-sub">Sélectionnez un ou plusieurs professionnels</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      ${actifs.length ? actifs.map((p) => `<label style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);font-size:13px;"><input type="checkbox" id="aff_${p.id}" ${r.pros.includes(p.id) ? "checked" : ""} /> ${esc(p.name)} — ${esc(p.role)}</label>`).join("") : `<div class="table-empty">Aucun professionnel actif</div>`}
      <div class="field-hint">Les autorisations détaillées (agenda, rendez-vous, planning, paramètres) se règlent ensuite via le bouton « Autorisations ».</div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveAffect('${id}')">${iconCheck()} Enregistrer</button></div>
    `);
  }
  window.saveAffect = async function saveAffect(id) {
    const professionnelIds = PROS.filter((p) => p.statut === "actif").filter((p) => document.getElementById("aff_" + p.id)?.checked).map((p) => p.id);
    try {
      await adminApi.setAffectations(id, professionnelIds);
      closeModal();
      await loadAll();
      await reloadRecs();
      showToast("Affectations mises à jour");
    } catch (e) { showError(e); }
  }
  window.openPermissions = function openPermissions(affectationId) {
    let aff = null; let recName = "";
    for (const r of RECEPTIONNISTES) {
      const found = r.affectations.find((a) => a.affectationId === affectationId);
      if (found) { aff = found; recName = r.name; break; }
    }
    if (!aff) { showToast("Affectation introuvable — actualisez la page"); return; }
    const p = aff.permissions;
    const champs = [
      ["peutConsulterAgenda", "Consulter l'agenda"],
      ["peutGererRdv", "Gérer les rendez-vous"],
      ["peutGererPlanning", "Gérer le planning (disponibilités)"],
      ["peutGererParametres", "Gérer les paramètres du professionnel"],
    ];
    openModal(`
      <div class="modal-head"><div><p class="modal-title">Autorisations</p><p class="modal-sub">${esc(recName)} · ${esc(aff.nom)}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      ${champs.map(([key, label]) => `<label style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);font-size:13px;"><input type="checkbox" id="perm_${key}" ${p[key] ? "checked" : ""} /> ${label}</label>`).join("")}
      <div class="field-hint">Ces droits s'appliquent uniquement à ce professionnel : la même réceptionniste peut avoir des droits différents ailleurs.</div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="savePermissions('${affectationId}')">${iconCheck()} Enregistrer</button></div>
    `);
  }
  window.savePermissions = async function savePermissions(affectationId) {
    const permissions = {
      peutConsulterAgenda: !!document.getElementById("perm_peutConsulterAgenda")?.checked,
      peutGererRdv: !!document.getElementById("perm_peutGererRdv")?.checked,
      peutGererPlanning: !!document.getElementById("perm_peutGererPlanning")?.checked,
      peutGererParametres: !!document.getElementById("perm_peutGererParametres")?.checked,
    };
    try {
      await adminApi.updatePermissions(affectationId, permissions);
      closeModal();
      await loadAll();
      await reloadRecs();
      showToast("Autorisations mises à jour");
    } catch (e) { showError(e); }
  }

  /* =========================================================
     PAGE : UTILISATEURS (recherche globale)
     ========================================================= */
  window.renderUsersPage = function renderUsersPage() {
    document.getElementById("page-users").innerHTML = `
      <div class="page-head"><div><h1 class="page-title">Utilisateurs</h1><p class="page-sub">Recherche globale — Professionnels, Réceptionnistes, Clients</p></div></div>
      <div class="filter-row">
        <input type="text" id="userSearchInput" placeholder="Nom, e-mail, téléphone…" value="${esc(state.usersFilter.search)}" oninput="updateUsersFilter('search', this.value)" style="min-width:220px" />
        <select id="userRoleFilter" onchange="updateUsersFilter('role', this.value)"><option value="">Tous les rôles</option>${Object.entries(ROLE_LABELS).map(([k, v]) => `<option value="${k}" ${state.usersFilter.role === k ? "selected" : ""}>${v}</option>`).join("")}</select>
      </div>
      <div class="card"><table class="data-table"><thead><tr><th>Nom</th><th>Rôle</th><th>E-mail</th><th>Téléphone</th><th>Statut</th><th>Créé le</th></tr></thead><tbody id="usersTableBody"></tbody></table></div>
    `;
    reloadUsers();
  }
  const reloadUsersDebounced = debounce(() => reloadUsers());
  window.updateUsersFilter = function updateUsersFilter(k, v) { state.usersFilter[k] = v; reloadUsersDebounced(); }
  window.reloadUsers = async function reloadUsers() {
    try {
      const f = state.usersFilter;
      USERS_VIEW = await adminApi.listUsers({ role: f.role || undefined, search: f.search || undefined });
      renderUsersTable();
    } catch (e) { showError(e); }
  }
  window.renderUsersTable = function renderUsersTable() {
    const body = document.getElementById("usersTableBody");
    if (!body) return;
    if (!USERS_VIEW.length) { body.innerHTML = `<tr><td colspan="6"><div class="table-empty">Aucun utilisateur trouvé</div></td></tr>`; return; }
    body.innerHTML = USERS_VIEW.map((u) => {
      const st = STATUT_UI[u.statutCompte] || "actif";
      return `<tr>
        <td><div class="cell-client"><div class="avatar-sm" style="background:${colorFor(u.id)}">${initials(u.nom)}</div><div class="cell-client-name">${esc(u.nom)}</div></div></td>
        <td>${ROLE_LABELS[u.type] || u.type}</td><td>${esc(u.email || "—")}</td><td>${esc(u.telephone || "—")}</td>
        <td><span class="status-pill ${STATUS_COMPTE[st].cls}">${STATUS_COMPTE[st].label}</span></td>
        <td>${fmtDateShort(u.createdAt)}</td>
      </tr>`;
    }).join("");
  }

  /* =========================================================
     PAGE : CLIENTS (global)
     ========================================================= */
  window.renderClientsPage = function renderClientsPage() {
    document.getElementById("page-clients").innerHTML = `
      <div class="page-head"><div><h1 class="page-title">Clients</h1><p class="page-sub">Vue globale, tous professionnels confondus</p></div><button class="btn btn-ghost btn-sm" onclick="exportCsv('clients','clients.csv',{ search: state.clientsFilter.search || undefined })">${iconPrinter()} Exporter</button></div>
      <div class="filter-row"><input type="text" placeholder="Nom, e-mail, téléphone…" value="${esc(state.clientsFilter.search)}" oninput="updateClientsFilter(this.value)" style="min-width:240px" /></div>
      <div class="card"><table class="data-table"><thead><tr><th>Client</th><th>Téléphone</th><th>Dernier professionnel</th><th>Rendez-vous</th><th>Dernier RDV</th><th>Créé le</th></tr></thead><tbody id="clientsTableBody"></tbody></table></div>
    `;
    renderClientsTable();
  }
  const reloadClientsDebounced = debounce(() => reloadClients());
  window.updateClientsFilter = function updateClientsFilter(v) { state.clientsFilter.search = v; reloadClientsDebounced(); }
  window.reloadClients = async function reloadClients() {
    try { CLIENTS_VIEW = await adminApi.listClients(state.clientsFilter.search || undefined); renderClientsTable(); }
    catch (e) { showError(e); }
  }
  window.renderClientsTable = function renderClientsTable() {
    const body = document.getElementById("clientsTableBody");
    if (!body) return;
    if (!CLIENTS_VIEW.length) { body.innerHTML = `<tr><td colspan="6"><div class="table-empty">Aucun client trouvé</div></td></tr>`; return; }
    body.innerHTML = CLIENTS_VIEW.map((c) => `<tr class="row-clickable" onclick="openClientFiche('${c.id}')">
      <td><div class="cell-client"><div class="avatar-sm" style="background:${colorFor(c.id)}">${initials(c.prenom + " " + c.nom)}</div><div><div class="cell-client-name">${esc(c.prenom + " " + c.nom)}</div><div class="cell-client-sub">${esc(c.email || "—")}</div></div></div></td>
      <td>${esc(c.telephone)}</td><td>${esc(c.professionnel || "—")}</td><td>${c.nbRdv}</td><td>${fmtDateShort(c.dernierRdv)}</td><td>${fmtDateShort(c.createdAt)}</td>
    </tr>`).join("");
  }
  window.openClientFiche = async function openClientFiche(id) {
    try {
      const c = await adminApi.getClient(id);
      openModal(`
        <div class="modal-head"><div style="display:flex;align-items:center;gap:12px;"><div class="avatar-sm" style="width:42px;height:42px;font-size:15px;background:${colorFor(c.id)}">${initials(c.prenom + " " + c.nom)}</div><div><p class="modal-title">${esc(c.prenom + " " + c.nom)}</p><p class="modal-sub">${c.nbRdv} rendez-vous</p></div></div><button class="modal-close" onclick="closeModal()">×</button></div>
        <div class="detail-grid">
          <div><div class="detail-item-label">Téléphone</div><div class="detail-item-value">${esc(c.telephone)}</div></div>
          <div><div class="detail-item-label">E-mail</div><div class="detail-item-value">${esc(c.email || "—")}</div></div>
          <div><div class="detail-item-label">Date de naissance</div><div class="detail-item-value">${fmtDateShort(c.dateNaissance)}</div></div>
          <div><div class="detail-item-label">Adresse</div><div class="detail-item-value">${esc(c.adresse || "—")}</div></div>
          <div><div class="detail-item-label">Fiche créée le</div><div class="detail-item-value">${fmtDateShort(c.createdAt)}</div></div>
        </div>
        <div class="detail-item-label" style="margin-bottom:8px;">Historique des rendez-vous</div>
        <div>${c.rendezVous.length ? c.rendezVous.map((r) => `<div class="dash-list-row" style="padding:8px 0;"><div style="flex:1"><div class="dash-list-name" style="font-size:12.5px;">${esc(r.service.nom)}</div><div class="dash-list-sub">${esc(r.professionnel.nom)} · ${fmtDateTime(r.dateDebut)}</div></div><span class="status-pill ${ETAT_LABELS[r.statut].cls}">${ETAT_LABELS[r.statut].label}</span></div>`).join("") : `<div class="table-empty">Aucun rendez-vous</div>`}</div>
        <div class="modal-actions" style="justify-content:space-between;flex-wrap:wrap;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-ghost btn-sm" onclick="openEditClient('${c.id}')">${iconEdit()} Modifier la fiche</button>
            ${c.nbRdv === 0 ? `<button class="btn btn-danger-ghost btn-sm" onclick="askDeleteClient('${c.id}','${escArg(c.prenom + " " + c.nom)}')">${iconTrash()} Supprimer</button>` : ""}
          </div>
          <button class="btn btn-ghost" onclick="closeModal()">Fermer</button>
        </div>
      `, true);
    } catch (e) { showError(e); }
  }
  window.openEditClient = async function openEditClient(id) {
    try {
      const c = await adminApi.getClient(id);
      openModal(`
        <div class="modal-head"><div><p class="modal-title">Modifier la fiche client</p><p class="modal-sub">${esc(c.prenom + " " + c.nom)}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
        <div class="field-2col">
          <div class="field-row"><label>Prénom *</label><input type="text" id="ecPrenom" value="${esc(c.prenom)}" /></div>
          <div class="field-row"><label>Nom *</label><input type="text" id="ecNom" value="${esc(c.nom)}" /></div>
        </div>
        <div class="field-2col">
          <div class="field-row"><label>Téléphone *</label><input type="text" id="ecTel" value="${esc(c.telephone)}" /></div>
          <div class="field-row"><label>E-mail</label><input type="email" id="ecEmail" value="${esc(c.email || "")}" /></div>
        </div>
        <div class="field-2col">
          <div class="field-row"><label>Date de naissance</label><input type="date" id="ecNaiss" value="${toDay(c.dateNaissance)}" /></div>
          <div class="field-row"><label>Adresse</label><input type="text" id="ecAdr" value="${esc(c.adresse || "")}" /></div>
        </div>
        <div class="field-hint">Le téléphone identifie le client de façon unique : un numéro déjà utilisé sera refusé.</div>
        <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveEditClient('${id}')">${iconCheck()} Enregistrer</button></div>
      `);
    } catch (e) { showError(e); }
  }
  window.saveEditClient = async function saveEditClient(id) {
    const payload = { nom: val("ecNom"), prenom: val("ecPrenom"), telephone: val("ecTel"), adresse: val("ecAdr") };
    if (!payload.nom || !payload.prenom || payload.telephone.length < 6) { showToast("Nom, prénom et téléphone sont obligatoires"); return; }
    if (val("ecEmail")) payload.email = val("ecEmail");
    if (val("ecNaiss")) payload.dateNaissance = new Date(val("ecNaiss") + "T00:00:00").toISOString();
    try {
      await adminApi.updateClient(id, payload);
      closeModal();
      await reloadClients();
      showToast("Fiche client mise à jour");
    } catch (e) { showError(e); }
  }
  window.askDeleteClient = function askDeleteClient(id, name) {
    openModal(`
      <div class="modal-head"><div><p class="modal-title">Supprimer la fiche client</p><p class="modal-sub">${esc(name)}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-hint" style="margin-bottom:14px;">Action définitive. Elle est refusée si le client a des rendez-vous : l'historique ne doit jamais être perdu.</div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-danger-ghost" onclick="confirmDeleteClient('${id}')">${iconTrash()} Supprimer définitivement</button></div>
    `);
  }
  window.confirmDeleteClient = async function confirmDeleteClient(id) {
    try {
      await adminApi.deleteClient(id);
      closeModal();
      await loadAll();
      await reloadClients();
      renderPage(state.page);
      showToast("Fiche client supprimée");
    } catch (e) { showError(e); }
  }

  /* =========================================================
     PAGE : RÉSERVATIONS (global)
     ========================================================= */
  window.renderRdvPage = function renderRdvPage() {
    const f = state.rdvFilter;
    document.getElementById("page-rdv").innerHTML = `
      <div class="page-head"><div><h1 class="page-title">Réservations</h1><p class="page-sub">Vue globale, tous professionnels confondus</p></div><button class="btn btn-ghost btn-sm" onclick="exportRdvCsv()">${iconPrinter()} Exporter</button></div>
      <div class="filter-row">
        <input type="text" placeholder="Client, service, professionnel…" value="${esc(f.search)}" oninput="updateRdvFilter('search', this.value)" style="min-width:220px" />
        <select onchange="updateRdvFilter('statut', this.value)"><option value="">Tous les états</option>${Object.entries(ETAT_LABELS).map(([k, v]) => `<option value="${k}" ${f.statut === k ? "selected" : ""}>${v.label}</option>`).join("")}</select>
        <select onchange="updateRdvFilter('professionnelId', this.value)"><option value="">Tous les professionnels</option>${PROS.map((p) => `<option value="${p.id}" ${f.professionnelId === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>
        <input type="date" value="${f.from}" onchange="updateRdvFilter('from', this.value)" title="À partir du" />
        <input type="date" value="${f.to}" onchange="updateRdvFilter('to', this.value)" title="Jusqu'au" />
        <button class="btn btn-ghost btn-sm" onclick="resetRdvFilter()">Réinitialiser</button>
      </div>
      <div class="card"><table class="data-table"><thead><tr><th>Client</th><th>Professionnel</th><th>Service</th><th>Date</th><th>Heure</th><th>État</th><th></th></tr></thead><tbody id="rdvTableBody"></tbody></table></div>
      <div id="rdvFooter" style="padding:12px 2px;font-size:12px;color:var(--ink-soft);"></div>
    `;
    renderRdvTable();
  }
  const reloadRdvDebounced = debounce(() => reloadRdv());
  window.updateRdvFilter = function updateRdvFilter(k, v) { state.rdvFilter[k] = v; state.rdvFilter.skip = 0; reloadRdvDebounced(); }
  window.resetRdvFilter = function resetRdvFilter() { state.rdvFilter = { statut: "", professionnelId: "", from: "", to: "", search: "", take: 100, skip: 0 }; renderRdvPage(); reloadRdv(); }
  window.reloadRdv = async function reloadRdv() {
    try {
      state.rdvFilter.skip = 0;
      const f = state.rdvFilter;
      const data = await adminApi.listRdv({
        statut: f.statut || undefined, professionnelId: f.professionnelId || undefined,
        from: f.from || undefined, to: f.to || undefined, search: f.search || undefined,
        take: f.take, skip: f.skip,
      });
      RESERVATIONS = (data.items || []).map(mapRdv);
      RDV_TOTAL = data.total;
      renderRdvTable();
    } catch (e) { showError(e); }
  }
  window.renderRdvTable = function renderRdvTable() {
    const body = document.getElementById("rdvTableBody");
    if (!body) return;
    if (!RESERVATIONS.length) { body.innerHTML = `<tr><td colspan="7"><div class="table-empty">Aucune réservation ne correspond à ces filtres</div></td></tr>`; }
    else {
      body.innerHTML = RESERVATIONS.map((r) => `<tr class="row-clickable" onclick="openRdvFiche('${r.id}')">
        <td>${esc(r.client)}</td><td>${esc(r.pro)}</td><td>${esc(r.service)}</td><td>${fmtDateShort(r.date)}</td><td>${r.heure}</td>
        <td><span class="status-pill ${ETAT_LABELS[r.etat].cls}">${ETAT_LABELS[r.etat].label}</span></td>
        <td><div class="row-actions" onclick="event.stopPropagation()"><button class="icon-btn" title="Détail" onclick="openRdvFiche('${r.id}')">${iconEye()}</button>${r.etat === "RESERVE" ? `<button class="icon-btn" title="Déplacer" onclick="openDeplacerRdv('${r.id}')">${iconClock()}</button>` : ""}${["RESERVE", "CLIENT_ARRIVE", "EN_COURS"].includes(r.etat) ? `<button class="icon-btn" title="Annuler" onclick="openAnnulerRdv('${r.id}')">${iconX()}</button>` : ""}</div></td>
      </tr>`).join("");
    }
    const footer = document.getElementById("rdvFooter");
    if (footer) {
      const affiches = RESERVATIONS.length;
      footer.innerHTML = `${affiches} réservation(s) affichée(s) sur ${RDV_TOTAL}
        ${affiches < RDV_TOTAL ? `<button class="btn btn-ghost btn-sm" style="margin-left:10px" onclick="loadMoreRdv()">Charger la suite</button>` : ""}`;
    }
  }
  window.loadMoreRdv = async function loadMoreRdv() {
    try {
      const f = state.rdvFilter;
      const data = await adminApi.listRdv({
        statut: f.statut || undefined, professionnelId: f.professionnelId || undefined,
        from: f.from || undefined, to: f.to || undefined, search: f.search || undefined,
        take: f.take, skip: f.skip + f.take,
      });
      state.rdvFilter.skip += f.take;
      RESERVATIONS = RESERVATIONS.concat((data.items || []).map(mapRdv));
      RDV_TOTAL = data.total;
      renderRdvTable();
    } catch (e) { showError(e); }
  }
  window.openRdvFiche = async function openRdvFiche(id) {
    try {
      const r = await adminApi.getRdv(id);
      openModal(`
        <div class="modal-head"><div><p class="modal-title">${esc(r.client.prenom + " " + r.client.nom)}</p><p class="modal-sub">${esc(r.service.nom)} · ${esc(r.professionnel.nom)}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
        <div class="detail-grid">
          <div><div class="detail-item-label">Date</div><div class="detail-item-value">${fmtDateShort(r.dateDebut)}</div></div>
          <div><div class="detail-item-label">Horaire</div><div class="detail-item-value">${toHeure(r.dateDebut)} – ${toHeure(r.dateFin)}</div></div>
          <div><div class="detail-item-label">État</div><div class="detail-item-value"><span class="status-pill ${ETAT_LABELS[r.statut].cls}">${ETAT_LABELS[r.statut].label}</span></div></div>
          <div><div class="detail-item-label">Origine</div><div class="detail-item-value">${esc(r.origine)}</div></div>
          <div><div class="detail-item-label">Reports effectués</div><div class="detail-item-value">${r.nombreChangements ?? 0}${PLATFORM.maxChangementsRdv !== undefined ? ` / ${PLATFORM.maxChangementsRdv}` : ""}</div></div>
          <div><div class="detail-item-label">Téléphone client</div><div class="detail-item-value">${esc(r.client.telephone)}</div></div>
          <div><div class="detail-item-label">Créée le</div><div class="detail-item-value">${fmtDateTime(r.createdAt)}</div></div>
          <div><div class="detail-item-label">Dernière modification</div><div class="detail-item-value">${fmtDateTime(r.updatedAt)}</div></div>
          ${r.motifAnnulation ? `<div><div class="detail-item-label">Motif d'annulation</div><div class="detail-item-value">${esc(r.motifAnnulation)}</div></div>` : ""}
          ${r.remarque ? `<div><div class="detail-item-label">Remarque</div><div class="detail-item-value">${esc(r.remarque)}</div></div>` : ""}
        </div>
        ${r.reponsesChamps?.length ? `<div class="detail-item-label" style="margin-bottom:8px;">Informations complémentaires</div><div style="margin-bottom:16px;">${r.reponsesChamps.map((rc) => `<div class="dash-list-row" style="padding:6px 0;"><div style="flex:1"><div class="dash-list-sub">${esc(rc.champ.label)}</div><div class="dash-list-name" style="font-size:12.5px;">${esc(rc.valeur)}</div></div></div>`).join("")}</div>` : ""}
        <div class="detail-item-label" style="margin-bottom:8px;">Historique des statuts</div>
        <div>${r.historique?.length ? r.historique.map((h) => `<div class="dash-list-row" style="padding:6px 0;"><div style="flex:1"><div class="dash-list-name" style="font-size:12.5px;">${h.ancienStatut ? ETAT_LABELS[h.ancienStatut].label + " → " : ""}${ETAT_LABELS[h.nouveauStatut].label}</div><div class="dash-list-sub">${fmtDateTime(h.createdAt)}</div></div></div>`).join("") : `<div class="table-empty">Aucun changement enregistré</div>`}</div>
        <div class="modal-actions" style="justify-content:space-between;flex-wrap:wrap;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${r.statut === "RESERVE" ? `<button class="btn btn-ghost btn-sm" onclick="openDeplacerRdv('${r.id}','${toDay(r.dateDebut)}','${toHeure(r.dateDebut)}')">${iconClock()} Déplacer</button>` : ""}
            ${["RESERVE", "CLIENT_ARRIVE", "EN_COURS"].includes(r.statut) ? `<button class="btn btn-danger-ghost btn-sm" onclick="openAnnulerRdv('${r.id}')">${iconX()} Annuler le rendez-vous</button>` : ""}
          </div>
          <button class="btn btn-ghost" onclick="closeModal()">Fermer</button>
        </div>
      `, true);
    } catch (e) { showError(e); }
  }
  window.exportRdvCsv = function exportRdvCsv() {
    const f = state.rdvFilter;
    exportCsv("rendez-vous", "rendez-vous.csv", {
      statut: f.statut || undefined, professionnelId: f.professionnelId || undefined,
      from: f.from || undefined, to: f.to || undefined, search: f.search || undefined,
    });
  }
  /**
   * Déplacement d'un créneau. Le serveur revérifie la disponibilité : un créneau
   * déjà pris est refusé, la durée du service est conservée.
   */
  window.openDeplacerRdv = function openDeplacerRdv(id, dateIso, heure) {
    const rdv = RESERVATIONS.find((r) => r.id === id);
    const date = dateIso || rdv?.date || todayISO();
    const h = heure || rdv?.heure || "09:00";
    openModal(`
      <div class="modal-head"><div><p class="modal-title">Déplacer le rendez-vous</p><p class="modal-sub">${rdv ? esc(rdv.client + " · " + rdv.service) : "Nouveau créneau"}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-2col">
        <div class="field-row"><label>Nouvelle date</label><input type="date" id="dpDate" value="${date}" /></div>
        <div class="field-row"><label>Nouvelle heure</label><input type="time" id="dpHeure" value="${h}" /></div>
      </div>
      <div class="field-hint">La durée du service est conservée. Le créneau est revérifié côté serveur : s'il est déjà occupé, le déplacement est refusé.</div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="confirmDeplacerRdv('${id}')">${iconCheck()} Déplacer</button></div>
    `);
  }
  window.confirmDeplacerRdv = async function confirmDeplacerRdv(id) {
    const date = val("dpDate"); const heure = val("dpHeure");
    if (!date || !heure) { showToast("Indiquez une date et une heure"); return; }
    try {
      await adminApi.deplacerRdv(id, new Date(`${date}T${heure}:00`).toISOString());
      closeModal();
      await Promise.all([loadAll(), reloadRdv()]);
      renderPage(state.page);
      showToast("Rendez-vous déplacé");
    } catch (e) { showError(e); }
  }
  window.openAnnulerRdv = function openAnnulerRdv(id) {
    openModal(`
      <div class="modal-head"><div><p class="modal-title">Annulation administrative</p><p class="modal-sub">Le professionnel et son équipe sont notifiés</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-row"><label>Motif de l'annulation</label><textarea id="annulMotif" rows="2" placeholder="Ex. demande du client, indisponibilité exceptionnelle…"></textarea></div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Retour</button><button class="btn btn-danger-ghost" onclick="confirmAnnulerRdv('${id}')">${iconX()} Confirmer l'annulation</button></div>
    `);
  }
  window.confirmAnnulerRdv = async function confirmAnnulerRdv(id) {
    try {
      await adminApi.annulerRdv(id, val("annulMotif") || undefined);
      closeModal();
      await Promise.all([loadAll(), reloadRdv()]);
      renderPage(state.page);
      showToast("Rendez-vous annulé");
    } catch (e) { showError(e); }
  }

  /* =========================================================
     PAGE : SERVICES (global)
     ========================================================= */
  window.renderServicesPage = function renderServicesPage() {
    document.getElementById("page-services").innerHTML = `
      <div class="page-head"><div><h1 class="page-title">Services</h1><p class="page-sub">Consultation et activation des services créés par les professionnels</p></div><button class="btn btn-ghost btn-sm" onclick="exportServicesCsv()">${iconPrinter()} Exporter</button></div>
      <div class="filter-row">
        <input type="text" placeholder="Rechercher un service, un professionnel…" value="${esc(state.servicesFilter.search)}" oninput="updateServicesFilter('search', this.value)" style="min-width:240px" />
        <select onchange="updateServicesFilter('actif', this.value)"><option value="">Publiés et non publiés</option><option value="true" ${state.servicesFilter.actif === "true" ? "selected" : ""}>Publiés</option><option value="false" ${state.servicesFilter.actif === "false" ? "selected" : ""}>Non publiés</option></select>
        <select onchange="updateServicesFilter('statut', this.value)"><option value="">Toutes les disponibilités</option>${Object.entries(STATUT_SERVICE).map(([k, v]) => `<option value="${k}" ${state.servicesFilter.statut === k ? "selected" : ""}>${v.label}</option>`).join("")}</select>
      </div>
      <div class="card"><table class="data-table"><thead><tr><th>Service</th><th>Professionnel</th><th>Durée</th><th>Prix</th><th>Publication</th><th>Disponibilité</th><th>Rendez-vous</th><th></th></tr></thead><tbody id="servicesTableBody"></tbody></table></div>
    `;
    renderServicesTable();
  }
  const reloadServicesDebounced = debounce(() => reloadServices());
  window.updateServicesFilter = function updateServicesFilter(k, v) { state.servicesFilter[k] = v; reloadServicesDebounced(); }
  window.reloadServices = async function reloadServices() {
    try {
      const f = state.servicesFilter;
      SERVICES_VIEW = await adminApi.listServices({ search: f.search || undefined, actif: f.actif || undefined, statut: f.statut || undefined });
      renderServicesTable();
    } catch (e) { showError(e); }
  }
  window.renderServicesTable = function renderServicesTable() {
    const body = document.getElementById("servicesTableBody");
    if (!body) return;
    if (!SERVICES_VIEW.length) { body.innerHTML = `<tr><td colspan="8"><div class="table-empty">Aucun service trouvé</div></td></tr>`; return; }
    body.innerHTML = SERVICES_VIEW.map((s) => {
      const dispo = STATUT_SERVICE[s.statut] || STATUT_SERVICE.DISPONIBLE;
      return `<tr>
      <td><div class="cell-client-name">${esc(s.nom)}</div><div class="cell-client-sub">${esc(s.description || "")}</div></td>
      <td>${esc(s.professionnel)}</td><td>${s.dureeMinutes} min</td><td>${fmtPrix(s.prix)}</td>
      <td><span class="status-pill ${s.actif ? "st-termine" : "st-absent"}">${s.actif ? "Publié" : "Non publié"}</span></td>
      <td><select onchange="setServiceDisponibilite('${s.id}', this.value)" title="Disponibilité affichée au client" style="font-size:11.5px;padding:4px 6px;">${Object.entries(STATUT_SERVICE).map(([k, v]) => `<option value="${k}" ${s.statut === k ? "selected" : ""}>${v.label}</option>`).join("")}</select></td>
      <td>${s.nbRdv}</td>
      <td><div class="row-actions">
        <button class="icon-btn" title="${s.actif ? "Dépublier" : "Publier"}" onclick="toggleServiceStatut('${s.id}', ${s.actif ? "false" : "true"})">${s.actif ? iconX() : iconCheck()}</button>
        ${s.nbRdv === 0 ? `<button class="icon-btn" title="Supprimer" onclick="askDeleteService('${s.id}','${escArg(s.nom)}')">${iconTrash()}</button>` : ""}
      </div></td>
    </tr>`;
    }).join("");
  }
  window.exportServicesCsv = function exportServicesCsv() {
    const f = state.servicesFilter;
    exportCsv("services", "services.csv", { search: f.search || undefined, actif: f.actif || undefined, statut: f.statut || undefined });
  }
  window.setServiceDisponibilite = async function setServiceDisponibilite(id, statut) {
    try {
      await adminApi.setServiceStatut(id, statut);
      await reloadServices();
      showToast(`Disponibilité : <b>${STATUT_SERVICE[statut].label}</b>`);
    } catch (e) { showError(e); }
  }
  window.askDeleteService = function askDeleteService(id, nom) {
    openModal(`
      <div class="modal-head"><div><p class="modal-title">Supprimer le service</p><p class="modal-sub">${esc(nom)}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-hint" style="margin-bottom:14px;">Action définitive, refusée dès qu'un rendez-vous utilise ce service. Dans ce cas, dépubliez-le plutôt.</div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-danger-ghost" onclick="confirmDeleteService('${id}')">${iconTrash()} Supprimer définitivement</button></div>
    `);
  }
  window.confirmDeleteService = async function confirmDeleteService(id) {
    try {
      await adminApi.deleteService(id);
      closeModal();
      await loadAll();
      await reloadServices();
      renderPage(state.page);
      showToast("Service supprimé");
    } catch (e) { showError(e); }
  }
  window.toggleServiceStatut = async function toggleServiceStatut(id, actif) {
    try {
      await adminApi.setServiceActif(id, actif);
      await reloadServices();
      showToast(`Service ${actif ? "activé" : "désactivé"}`);
    } catch (e) { showError(e); }
  }

  /* =========================================================
     PAGE : AGENDAS (consultation seule)
     ========================================================= */
  window.renderAgendasPage = function renderAgendasPage() {
    document.getElementById("page-agendas").innerHTML = `
      <div class="page-head"><div><h1 class="page-title">Agendas</h1><p class="page-sub">Consultation des disponibilités et des créneaux par professionnel</p></div><button class="btn btn-ghost btn-sm" onclick="refreshAll()">${iconRefresh()} Actualiser</button></div>
      <div class="stat-grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">
        ${AGENDAS.length ? AGENDAS.map((a) => `<div class="card" style="padding:16px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;"><div class="avatar-sm" style="background:${colorFor(a.professionnelId)}">${initials(a.nom)}</div><div><div style="font-weight:800;font-size:13.5px;">${esc(a.nom)}</div><div style="font-size:11.5px;color:var(--ink-soft)">${esc(a.specialite || "—")}</div></div></div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink-soft);margin-bottom:6px;"><span>Rendez-vous à venir</span><b style="color:var(--ink)">${a.nbRdvAVenir}</b></div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink-soft);margin-bottom:6px;"><span>Jours travaillés</span><b style="color:var(--ink)">${a.joursTravailles.map((j) => JOURS[j].slice(0, 3)).join(", ") || "—"}</b></div>
          <div style="font-size:11.5px;color:var(--ink-soft);margin-bottom:10px;">${a.prochainRdv ? `Prochain : ${esc(a.prochainRdv.client)} — ${fmtDateTime(a.prochainRdv.dateDebut)}` : "Aucun rendez-vous à venir"}</div>
          ${a.indisponibilites.length ? `<div style="margin-bottom:10px;">${a.indisponibilites.map((i) => `<span class="status-pill st-absent" style="margin:2px 2px 2px 0;">${fmtDateShort(i.dateDebut)} → ${fmtDateShort(i.dateFin)}</span>`).join("")}</div>` : ""}
          <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;" onclick="openAgenda('${a.professionnelId}')">${iconEye()} Consulter l'agenda</button>
        </div>`).join("") : `<div class="card"><div class="table-empty">Aucun professionnel actif</div></div>`}
      </div>
    `;
  }
  window.openAgenda = async function openAgenda(professionnelId, dateIso) {
    const date = dateIso || todayISO();
    try {
      const a = await adminApi.getAgenda(professionnelId, date);
      const creneaux = a.rendezVous.map((r) => `<div class="dash-list-row" style="padding:8px 0;">
        <div style="min-width:96px;font-weight:700;font-size:12.5px;">${toHeure(r.dateDebut)} – ${toHeure(r.dateFin)}</div>
        <div style="flex:1"><div class="dash-list-name" style="font-size:12.5px;">${esc(r.client.prenom + " " + r.client.nom)}</div><div class="dash-list-sub">${esc(r.service.nom)} · ${esc(r.client.telephone)}</div></div>
        <span class="status-pill ${ETAT_LABELS[r.statut].cls}">${ETAT_LABELS[r.statut].label}</span></div>`).join("");
      openModal(`
        <div class="modal-head"><div><p class="modal-title">Agenda — ${esc(a.professionnel.nom)}</p><p class="modal-sub">Consultation seule · ${fmtDateShort(a.date)}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
          <button class="btn btn-ghost btn-sm" onclick="openAgenda('${professionnelId}','${isoPlusDays(date, -1)}')">${iconChevronLeft()} Jour précédent</button>
          <input type="date" value="${a.date}" onchange="openAgenda('${professionnelId}', this.value)" />
          <button class="btn btn-ghost btn-sm" onclick="openAgenda('${professionnelId}','${isoPlusDays(date, 1)}')">Jour suivant ${iconChevronRight()}</button>
          <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="openAgenda('${professionnelId}','${todayISO()}')">Aujourd'hui</button>
        </div>
        <div class="detail-item-label" style="margin-bottom:8px;">Horaires de travail — ${JOURS[a.jourSemaine]}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">${a.disponibilites.length ? a.disponibilites.map((d) => `<span class="status-pill st-reserve">${d.heureDebut} – ${d.heureFin}</span>`).join("") : `<span class="dash-list-sub">Jour non travaillé</span>`}</div>
        ${a.indisponibilites.length ? `<div class="detail-item-label" style="margin-bottom:8px;">Indisponibilités</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">${a.indisponibilites.map((i) => `<span class="status-pill st-absent">${esc(i.motif || i.type)} : ${fmtDateTime(i.dateDebut)} → ${fmtDateTime(i.dateFin)}</span>`).join("")}</div>` : ""}
        <div class="detail-item-label" style="margin-bottom:8px;">Rendez-vous de la journée (${a.rendezVous.length})</div>
        <div>${creneaux || `<div class="table-empty">Aucun rendez-vous ce jour</div>`}</div>
        <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Fermer</button></div>
      `, true);
    } catch (e) { showError(e); }
  }

  /* =========================================================
     PAGE : PARAMÈTRES GÉNÉRAUX DE LA PLATEFORME
     ========================================================= */
  window.renderParamsPage = function renderParamsPage() {
    document.getElementById("page-params").innerHTML = `
      <div class="page-head"><div><h1 class="page-title">Paramètres généraux</h1><p class="page-sub">Ces informations sont affichées côté Client, dans l'interface publique</p></div></div>
      <div class="card" style="padding:22px;max-width:640px;">
        <div class="field-row"><label>Nom de la plateforme / de l'entreprise</label><input type="text" id="plName" value="${esc(PLATFORM.platformName)}" /></div>
        <div class="field-row"><label>Description</label><textarea id="plDesc" rows="2" placeholder="À propos...">${esc(PLATFORM.description || "")}</textarea></div>
        <div class="field-2col">
          <div class="field-row"><label>Téléphone de contact</label><input type="text" id="plPhone" value="${esc(PLATFORM.phone || "")}" /></div>
          <div class="field-row"><label>E-mail de contact</label><input type="email" id="plEmail" value="${esc(PLATFORM.email || "")}" /></div>
        </div>
        <div class="field-row"><label>Adresse</label><input type="text" id="plAddress" value="${esc(PLATFORM.address || "")}" /></div>
        <div class="field-row"><label>Jours ouvrables par défaut</label>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${JOURS.map((d) => `<label style="display:flex;align-items:center;gap:5px;font-size:11.5px;border:1px solid var(--line);padding:6px 10px;border-radius:8px;"><input type="checkbox" id="jour_${d}" ${(PLATFORM.joursOuvrables || []).includes(d) ? "checked" : ""} /> ${d}</label>`).join("")}
          </div>
        </div>
        <div class="field-row"><label>Horaires généraux par défaut</label><input type="text" id="plHoraires" value="${esc(PLATFORM.horairesGeneraux || "")}" placeholder="09:00 – 18:00" /></div>
        <div class="field-row"><label>Slogan principal</label><input type="text" id="plSlogan" value="${esc(PLATFORM.slogan || "")}" placeholder="Votre rendez-vous, simplifié." /></div>
        <div class="field-row"><label>Conditions générales</label><textarea id="plConditions" rows="2">${esc(PLATFORM.conditions || "")}</textarea></div>
        <div class="field-row"><label>Conditions affichées au moment de réserver</label><textarea id="plCondRes" rows="2" placeholder="Texte présenté au client avant validation…">${esc(PLATFORM.conditionsReservation || "")}</textarea></div>
        <div class="field-2col">
          <div class="field-row"><label>URL du logo</label><input type="text" id="plLogo" value="${esc(PLATFORM.logoUrl || "")}" placeholder="https://…" /></div>
          <div class="field-row"><label>Image d'accueil (hero)</label><input type="text" id="plHero" value="${esc(PLATFORM.heroImageUrl || "")}" placeholder="https://…" /></div>
        </div>
        <div class="field-row"><label>Lien de localisation (carte)</label><input type="text" id="plLoc" value="${esc(PLATFORM.localisationUrl || "")}" placeholder="https://maps…" /></div>
        <div class="field-hint">Domaine principal de l'instance : <b>${esc(PLATFORM.domaine || "non défini")}</b> (fixé lors de la configuration initiale).</div>
      </div>
      <div class="card" style="padding:22px;max-width:640px;margin-top:18px;">
        <h3 style="margin:0 0 4px;font-size:14.5px;">Règles d'annulation et de report</h3>
        <p class="page-sub" style="margin:0 0 14px;">Appliquées côté client lorsqu'il gère son rendez-vous depuis son lien de suivi.</p>
        <div class="field-2col">
          <div class="field-row"><label>Délai minimum avant annulation (heures)</label><input type="number" min="0" id="plDelaiAnnul" value="${PLATFORM.delaiMinAnnulationHeures ?? 0}" /></div>
          <div class="field-row"><label>Délai minimum avant modification (heures)</label><input type="number" min="0" id="plDelaiModif" value="${PLATFORM.delaiMinModificationHeures ?? 48}" /></div>
        </div>
        <div class="field-row"><label>Nombre de reports autorisés par rendez-vous</label><input type="number" min="0" id="plMaxChang" value="${PLATFORM.maxChangementsRdv ?? 1}" /></div>
        <button class="btn btn-primary" onclick="savePlatform()">${iconCheck()} Enregistrer les paramètres</button>
      </div>
    `;
  }
  window.savePlatform = async function savePlatform() {
    const data = {
      platformName: val("plName"),
      description: val("plDesc"),
      phone: val("plPhone"),
      address: val("plAddress"),
      horairesGeneraux: val("plHoraires"),
      slogan: val("plSlogan"),
      conditions: val("plConditions"),
      conditionsReservation: val("plCondRes"),
      logoUrl: val("plLogo"),
      heroImageUrl: val("plHero"),
      localisationUrl: val("plLoc"),
      delaiMinAnnulationHeures: Number(val("plDelaiAnnul")) || 0,
      delaiMinModificationHeures: Number(val("plDelaiModif")) || 0,
      maxChangementsRdv: Number(val("plMaxChang")) || 0,
      joursOuvrables: JOURS.filter((d) => document.getElementById("jour_" + d)?.checked),
    };
    if (val("plEmail")) data.email = val("plEmail");
    try {
      PLATFORM = { ...PLATFORM, ...(await adminApi.updateParams(data)) };
      showToast("Paramètres généraux enregistrés");
      updateBadges();
    } catch (e) { showError(e); }
  }
  /* =========================================================
     PAGE : JOURNAL D'AUDIT
     ========================================================= */
  window.renderAuditPage = function renderAuditPage() {
    const f = state.auditFilter;
    document.getElementById("page-audit").innerHTML = `
      <div class="page-head"><div><h1 class="page-title">Journal d'audit</h1><p class="page-sub">Traçabilité des actions sensibles de la plateforme</p></div><button class="btn btn-ghost btn-sm" onclick="exportCsv('audit','journal-audit.csv')">${iconPrinter()} Exporter</button></div>
      <div class="filter-row">
        <select onchange="updateAuditFilter('action', this.value)"><option value="">Toutes les actions</option>${AUDIT.actions.map((a) => `<option value="${a}" ${f.action === a ? "selected" : ""}>${a}</option>`).join("")}</select>
        <input type="date" value="${f.from}" onchange="updateAuditFilter('from', this.value)" title="À partir du" />
        <input type="date" value="${f.to}" onchange="updateAuditFilter('to', this.value)" title="Jusqu'au" />
      </div>
      <div class="card"><table class="data-table"><thead><tr><th>Date</th><th>Action</th><th>Utilisateur</th><th>Cible</th><th>Détails</th></tr></thead><tbody id="auditTableBody"></tbody></table></div>
      <div id="auditFooter" style="padding:12px 2px;font-size:12px;color:var(--ink-soft);"></div>
    `;
    reloadAudit();
  }
  window.updateAuditFilter = function updateAuditFilter(k, v) { state.auditFilter[k] = v; state.auditFilter.skip = 0; reloadAudit(); }
  window.reloadAudit = async function reloadAudit(append) {
    try {
      const f = state.auditFilter;
      const data = await adminApi.audit({ action: f.action || undefined, from: f.from || undefined, to: f.to || undefined, take: f.take, skip: f.skip });
      AUDIT = { ...data, items: append ? AUDIT.items.concat(data.items) : data.items };
      renderAuditTable();
    } catch (e) { showError(e); }
  }
  window.loadMoreAudit = function loadMoreAudit() { state.auditFilter.skip += state.auditFilter.take; reloadAudit(true); }
  window.renderAuditTable = function renderAuditTable() {
    const body = document.getElementById("auditTableBody");
    if (!body) return;
    if (!AUDIT.items.length) { body.innerHTML = `<tr><td colspan="5"><div class="table-empty">Aucune entrée d'audit</div></td></tr>`; }
    else {
      body.innerHTML = AUDIT.items.map((a) => `<tr>
        <td>${fmtDateTime(a.createdAt)}</td>
        <td><span class="status-pill st-reserve">${esc(a.action)}</span></td>
        <td>${esc(a.user?.email || "—")}</td>
        <td style="font-size:11px;color:var(--ink-soft)">${esc(a.cible || "—")}</td>
        <td style="font-size:11px;color:var(--ink-soft);max-width:280px;overflow:hidden;text-overflow:ellipsis;">${esc(a.details ? JSON.stringify(a.details) : "")}</td>
      </tr>`).join("");
    }
    const footer = document.getElementById("auditFooter");
    if (footer) {
      footer.innerHTML = `${AUDIT.items.length} entrée(s) affichée(s) sur ${AUDIT.total}
        ${AUDIT.items.length < AUDIT.total ? `<button class="btn btn-ghost btn-sm" style="margin-left:10px" onclick="loadMoreAudit()">Charger la suite</button>` : ""}`;
    }
  }

  /* =========================================================
     PAGE : NOTIFICATIONS
     ========================================================= */
  const NOTIF_ICONS = {
    new: { bg: "#F1ECFF", color: "#8957FF", svg: '<path d="M12 5v14M5 12h14"/>' },
    warn: { bg: "#FDF1E2", color: "#E2954A", svg: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
  };
  window.notifRowHtml = function notifRowHtml(n) {
    const ic = NOTIF_ICONS[n.type] || NOTIF_ICONS.new;
    return `<div class="notif-row ${n.unread ? "unread" : ""}"><div class="notif-icon" style="background:${ic.bg};color:${ic.color}">${svg(ic.svg, 16)}</div><div class="notif-text"><span>${n.text}</span><div class="notif-time">${n.time}</div></div>${n.unread ? `<span class="notif-dot-unread"></span>` : ""}</div>`;
  }
  window.renderNotifsPage = function renderNotifsPage() {
    document.getElementById("page-notifs").innerHTML = `
      <div class="page-head"><div><h1 class="page-title">Notifications</h1><p class="page-sub">Inscriptions en attente et événements de la plateforme</p></div><div style="display:flex;gap:8px;"><button class="btn btn-ghost btn-sm" onclick="refreshAll()">${iconRefresh()} Actualiser</button><button class="btn btn-ghost btn-sm" onclick="markAllRead()">Tout marquer comme lu</button></div></div>
      <div class="card">${NOTIFS.length ? NOTIFS.map((n) => notifRowHtml(n)).join("") : `<div class="table-empty">Aucune notification</div>`}</div>
    `;
  }
  window.markAllRead = async function markAllRead() {
    try {
      await adminApi.markNotificationsRead();
      NOTIFS = NOTIFS.map((n) => ({ ...n, unread: false }));
      renderNotifsPage();
      updateBadges();
      showToast("Notifications marquées comme lues");
    } catch (e) { showError(e); }
  }

  /* =========================================================
     EXPORTS CSV
     ========================================================= */
  window.exportCsv = async function exportCsv(entity, filename) {
    try { await adminApi.downloadExport(entity, filename); showToast(`${iconPrinter()} Export « ${filename} » téléchargé`); }
    catch (e) { showError(e); }
  }

  /* =========================================================
     MODALS génériques
     ========================================================= */
  window.closeModal = function closeModal() {
    const root = document.getElementById("modalRoot");
    if (!root) return;
    const ov = root.querySelector(".modal-overlay");
    if (ov) { ov.classList.remove("open"); setTimeout(() => { root.innerHTML = ""; }, 200); }
  }
  window.openModal = function openModal(innerHtml, wide) {
    document.getElementById("modalRoot").innerHTML = `<div class="modal-overlay" id="activeOverlay"><div class="modal-box ${wide ? "wide" : ""}">${innerHtml}</div></div>`;
    const ov = document.getElementById("activeOverlay");
    requestAnimationFrame(() => ov.classList.add("open"));
    ov.addEventListener("click", (e) => { if (e.target === ov) closeModal(); });
  }

  /* =========================================================
     RECHERCHE GLOBALE + INITIALISATION
     ========================================================= */
  document.getElementById("globalSearch").addEventListener("input", debounce(function () {
    const q = this.value.trim();
    if (q.length < 2) return;
    state.usersFilter.search = q;
    goToPage("users");
  }), { signal: ac.signal });

  (async () => {
    await loadAll();
    if (!ac.signal.aborted) renderPage(state.page);
  })();

    // ---- end ported script ----

    return () => {
      ac.abort();

      delete (window as any).todayISO;
      delete (window as any).isoPlusDays;
      delete (window as any).toDay;
      delete (window as any).toHeure;
      delete (window as any).fmtDateShort;
      delete (window as any).fmtDateTime;
      delete (window as any).fmtRelative;
      delete (window as any).fmtMois;
      delete (window as any).fmtPrix;
      delete (window as any).esc;
      delete (window as any).escArg;
      delete (window as any).initials;
      delete (window as any).colorFor;
      delete (window as any).val;
      delete (window as any).showToast;
      delete (window as any).showError;
      delete (window as any).loadAll;
      delete (window as any).refreshAll;
      delete (window as any).goToPage;
      delete (window as any).renderPage;
      delete (window as any).updateBadges;
      delete (window as any).svg;
      delete (window as any).iconCheck;
      delete (window as any).iconX;
      delete (window as any).iconEye;
      delete (window as any).iconEdit;
      delete (window as any).iconTrash;
      delete (window as any).iconKey;
      delete (window as any).iconPlus;
      delete (window as any).iconPrinter;
      delete (window as any).iconRefresh;
      delete (window as any).iconUsers;
      delete (window as any).iconBriefcase;
      delete (window as any).iconCal;
      delete (window as any).iconAlert;
      delete (window as any).iconChevronLeft;
      delete (window as any).iconChevronRight;
      delete (window as any).renderDashboard;
      delete (window as any).renderProsPage;
      delete (window as any).updateProFilter;
      delete (window as any).reloadPros;
      delete (window as any).renderProsTable;
      delete (window as any).openProFiche;
      delete (window as any).setCompteStatut;
      delete (window as any).openCreateCompte;
      delete (window as any).saveCompte;
      delete (window as any).openResetPassword;
      delete (window as any).saveResetPassword;
      delete (window as any).askDeleteCompte;
      delete (window as any).confirmDeleteCompte;
      delete (window as any).renderRecPage;
      delete (window as any).updateRecFilter;
      delete (window as any).reloadRecs;
      delete (window as any).renderRecTable;
      delete (window as any).openAffectForm;
      delete (window as any).saveAffect;
      delete (window as any).openPermissions;
      delete (window as any).savePermissions;
      delete (window as any).renderUsersPage;
      delete (window as any).updateUsersFilter;
      delete (window as any).reloadUsers;
      delete (window as any).renderUsersTable;
      delete (window as any).renderClientsPage;
      delete (window as any).updateClientsFilter;
      delete (window as any).reloadClients;
      delete (window as any).renderClientsTable;
      delete (window as any).openClientFiche;
      delete (window as any).renderRdvPage;
      delete (window as any).updateRdvFilter;
      delete (window as any).resetRdvFilter;
      delete (window as any).reloadRdv;
      delete (window as any).renderRdvTable;
      delete (window as any).loadMoreRdv;
      delete (window as any).openRdvFiche;
      delete (window as any).openAnnulerRdv;
      delete (window as any).confirmAnnulerRdv;
      delete (window as any).renderServicesPage;
      delete (window as any).updateServicesFilter;
      delete (window as any).reloadServices;
      delete (window as any).renderServicesTable;
      delete (window as any).toggleServiceStatut;
      delete (window as any).renderAgendasPage;
      delete (window as any).openAgenda;
      delete (window as any).renderParamsPage;
      delete (window as any).savePlatform;
      delete (window as any).renderAuditPage;
      delete (window as any).updateAuditFilter;
      delete (window as any).reloadAudit;
      delete (window as any).loadMoreAudit;
      delete (window as any).renderAuditTable;
      delete (window as any).notifRowHtml;
      delete (window as any).renderNotifsPage;
      delete (window as any).markAllRead;
      delete (window as any).exportCsv;
      delete (window as any).closeModal;
      delete (window as any).openModal;
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

  .page { padding: 26px 30px 60px; display: none; }
  .page.active { display: block; }
  .page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 22px; flex-wrap: wrap; }
  .page-title { font-size: 23px; font-weight: 800; margin: 0 0 4px; }
  .page-sub { font-size: 13px; color: var(--ink-soft); margin: 0; }

  .btn {
    display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; border: none;
    border-radius: 10px; padding: 10px 16px; cursor: pointer; transition: transform .1s ease, opacity .15s ease, background .15s ease;
  }
  .btn:hover { transform: translateY(-1px); }
  .btn-primary { background: var(--primary); color: #fff; }
  .btn-primary:hover { background: var(--primary-dark); }
  .btn-ghost { background: var(--card); color: var(--ink); border: 1px solid var(--line); }
  .btn-ghost:hover { background: var(--paper); }
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
  .view-toggle button { border: none; background: none; padding: 7px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 700; color: var(--ink-soft); cursor: pointer; }
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
  .filter-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
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
        <div className="sb-section-title">Comptes</div>
        <div className="nav-item" data-page="pros">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.9A9 9 0 1 0 9.1 3.5"/><path d="M12 8v4l3 3"/></svg>
          <span className="nav-label">Professionnels</span>
          <span className="nav-badge" id="navProBadge">0</span>
        </div>
        <div className="nav-item" data-page="receptionnistes">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span className="nav-label">Réceptionnistes</span>
          <span className="nav-badge" id="navRecBadge">0</span>
        </div>
        <div className="nav-item" data-page="users">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span className="nav-label">Utilisateurs</span>
        </div>
        <div className="sb-section-title">Activité globale</div>
        <div className="nav-item" data-page="clients">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <span className="nav-label">Clients</span>
        </div>
        <div className="nav-item" data-page="rdv">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <span className="nav-label">Réservations</span>
        </div>
        <div className="nav-item" data-page="services">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/></svg>
          <span className="nav-label">Services</span>
        </div>
        <div className="nav-item" data-page="agendas">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span className="nav-label">Agendas</span>
        </div>
        <div className="sb-section-title">Plateforme</div>
        <div className="nav-item" data-page="params">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span className="nav-label">Paramètres généraux</span>
        </div>
        <div className="nav-item" data-page="audit">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <span className="nav-label">Journal d&apos;audit</span>
        </div>
        <div className="nav-item" data-page="notifs">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          <span className="nav-label">Notifications</span>
          <span className="nav-badge" id="navNotifBadge">0</span>
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
          <input type="text" id="globalSearch" placeholder="Rechercher un utilisateur, un client…" />
        </div>
        <div className="tb-right">
          <button className="tb-icon-btn" id="notifBellBtn">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            <span className="tb-icon-dot" id="tbNotifDot">0</span>
          </button>
          <div className="tb-user">
            <div className="tb-avatar" style={{background: 'linear-gradient(135deg,#1B1730,#4A4460)'}}>AG</div>
            <div className="tb-user-text"><div className="tb-user-name">Admin général</div><div className="tb-user-role">Administrateur</div></div>
          </div>
        </div>
      </header>

      <section className="page active" id="page-dashboard"></section>
      <section className="page" id="page-pros"></section>
      <section className="page" id="page-receptionnistes"></section>
      <section className="page" id="page-users"></section>
      <section className="page" id="page-clients"></section>
      <section className="page" id="page-rdv"></section>
      <section className="page" id="page-services"></section>
      <section className="page" id="page-agendas"></section>
      <section className="page" id="page-params"></section>
      <section className="page" id="page-audit"></section>
      <section className="page" id="page-notifs"></section>
    </div>
  </div>

  
  <div id="modalRoot"></div>
  <div id="toast" className="toast"></div>



    </>
  );
}