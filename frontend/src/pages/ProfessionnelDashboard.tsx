// @ts-nocheck -- fichier porté depuis un script JS existant (voir note en fin de réponse)
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

export default function ProfessionnelDashboard() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    const ac = new AbortController();
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      logout();
      navigate('/connexion');
    }, { signal: ac.signal });

    // ---- begin ported script (identique à la version HTML d'origine) ----
  /* =========================================================
     DONNÉES (mock) — Espace Professionnel, conforme au cahier des charges
     ========================================================= */
  const STATUS = {
    reserve: { label: "Réservé", cls: "st-reserve", color: "#8957FF" },
    termine: { label: "Terminé", cls: "st-termine", color: "#3FA65C" },
    annule:  { label: "Annulé",  cls: "st-annule",  color: "#D9483C" },
  };
  const ME = { id: "p1", name: "Dr. Ahmed Benali", role: "Médecin généraliste", color: "#8957FF", initials: "AB" };

  // Types de champs personnalisés disponibles pour le constructeur de formulaire par service
  const FIELD_TYPES = [
    { value: "texte_court", label: "Texte court" },
    { value: "texte_long",  label: "Texte long" },
    { value: "nombre",      label: "Nombre" },
    { value: "liste",       label: "Liste déroulante" },
    { value: "radio",       label: "Boutons radio" },
    { value: "checkbox",    label: "Cases à cocher" },
    { value: "switch",      label: "Oui / Non" },
    { value: "date",        label: "Date" },
    { value: "fichier",     label: "Upload fichier / photo" },
  ];
  const HAS_OPTIONS_TYPES = ["liste", "radio", "checkbox"];

  window.todayISO = function todayISO() { return new Date().toISOString().slice(0, 10); }
  window.isoPlusDays = function isoPlusDays(iso, n) { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  const TODAY = todayISO();
  let uidCounter = 100;
  window.uid = function uid(p) { return (p || "id") + (uidCounter++); }

  let SERVICES = [
    { id: "s1", name: "Consultation générale", desc: "Consultation médicale standard", duration: 30, price: 3000, status: "active", customFields: [] },
    { id: "s2", name: "Suivi chronique", desc: "Suivi d'une pathologie chronique", duration: 30, price: 2500, status: "active", customFields: [] },
    { id: "s3", name: "Certificat médical", desc: "Délivrance d'un certificat", duration: 15, price: 1500, status: "active", customFields: [] },
    { id: "s4", name: "Consultation à domicile", desc: "Déplacement au domicile du patient", duration: 45, price: 5000, status: "inactive", customFields: [
      { id: "cf1", label: "Adresse précise du domicile", type: "texte_long", required: true, options: [], defaultValue: "", helpText: "Étage, code d'accès, repères utiles", conditions: [], conditionLogic: "ET" },
      { id: "cf2", label: "Consultation remboursée ?", type: "switch", required: false, options: [], defaultValue: "non", helpText: "", conditions: [], conditionLogic: "ET" },
      { id: "cf3", label: "Upload ordonnance", type: "fichier", required: true, options: [], defaultValue: "", helpText: "Formats acceptés : PDF, JPG", conditions: [{ fieldId: "cf2", value: "oui" }], conditionLogic: "ET" },
    ] },
  ];

  let APPTS = [
    { id: uid("a"), client: "Yasmine Hadj", phone: "0555 12 34 66", dob: "1990-04-12", email: "yasmine.hadj@mail.com", service: "Consultation générale", date: TODAY, start: "09:00", end: "09:30", status: "reserve", remark: "", createdAt: "2026-08-24", source: "en ligne" },
    { id: uid("a"), client: "Karim Yacine", phone: "0555 22 33 44", dob: "1988-09-14", email: "karim.y@mail.com", service: "Consultation générale", date: TODAY, start: "11:00", end: "11:30", status: "reserve", remark: "", createdAt: "2026-08-26", source: "réceptionniste" },
    { id: uid("a"), client: "Meriem Salhi", phone: "0555 43 21 09", dob: "1991-06-06", email: "meriem.s@mail.com", service: "Suivi chronique", date: TODAY, start: "14:00", end: "14:30", status: "reserve", remark: "", createdAt: "2026-08-23", source: "en ligne" },
    { id: uid("a"), client: "Linda Cherif", phone: "0555 66 77 88", dob: "1999-04-04", email: "linda.c@mail.com", service: "Certificat médical", date: TODAY, start: "17:00", end: "17:15", status: "reserve", remark: "", createdAt: "2026-08-27", source: "en ligne" },
    { id: uid("a"), client: "Yasmine Hadj", phone: "0555 12 34 66", dob: "1990-04-12", email: "yasmine.hadj@mail.com", service: "Consultation générale", date: isoPlusDays(TODAY, -2), start: "09:00", end: "09:30", status: "termine", remark: "", createdAt: isoPlusDays(TODAY, -10), source: "en ligne" },
    { id: uid("a"), client: "Karim Yacine", phone: "0555 22 33 44", dob: "1988-09-14", email: "karim.y@mail.com", service: "Consultation générale", date: isoPlusDays(TODAY, -14), start: "09:00", end: "09:30", status: "termine", remark: "", createdAt: isoPlusDays(TODAY, -20), source: "réceptionniste" },
    { id: uid("a"), client: "Sarah Medjdoub", phone: "0553 45 67 89", dob: "1998-07-30", email: "sarah.m@mail.com", service: "Suivi chronique", date: isoPlusDays(TODAY, -1), start: "10:00", end: "10:30", status: "termine", remark: "", createdAt: isoPlusDays(TODAY, -6), source: "en ligne" },
    { id: uid("a"), client: "Amel Bensalem", phone: "0555 88 77 66", dob: "2001-05-17", email: "amel.b@mail.com", service: "Certificat médical", date: isoPlusDays(TODAY, -3), start: "12:00", end: "12:15", status: "annule", remark: "Erreur de réservation", createdAt: isoPlusDays(TODAY, -5), source: "en ligne" },
    { id: uid("a"), client: "Meriem Salhi", phone: "0555 43 21 09", dob: "1991-06-06", email: "meriem.s@mail.com", service: "Suivi chronique", date: isoPlusDays(TODAY, 1), start: "10:00", end: "10:30", status: "reserve", remark: "", createdAt: TODAY, source: "en ligne" },
    { id: uid("a"), client: "Hamza Belkhir", phone: "0555 65 43 21", dob: "1967-08-21", email: "hamza.b@mail.com", service: "Consultation générale", date: isoPlusDays(TODAY, 2), start: "09:30", end: "10:00", status: "reserve", remark: "", createdAt: TODAY, source: "réceptionniste" },
  ];

  let NOTES = {}; // clientName -> [{id, text, date}]

  let RECEPTIONNISTES = [
    { id: "r1", name: "Imane B.", email: "imane.b@rendezvousapp.com", phone: "0555 90 10 20", active: true, perms: { agenda: true, gererRdv: true, gererPlanning: true, gererParametres: false } },
    { id: "r2", name: "Feriel N.", email: "feriel.n@rendezvousapp.com", phone: "0555 40 50 60", active: false, perms: { agenda: true, gererRdv: false, gererPlanning: false, gererParametres: false } },
  ];

  let AVAILABILITY = {
    Lundi:    { on: true,  ranges: [{start:"09:00", end:"12:00"}, {start:"14:00", end:"17:00"}] },
    Mardi:    { on: true,  ranges: [{start:"10:00", end:"18:00"}] },
    Mercredi: { on: false, ranges: [] },
    Jeudi:    { on: true,  ranges: [{start:"09:00", end:"16:00"}] },
    Vendredi: { on: false, ranges: [] },
    Samedi:   { on: true,  ranges: [{start:"09:00", end:"13:00"}] },
    Dimanche: { on: false, ranges: [] },
  };

  let INDISPOS = [
    { id: uid("i"), type: "jour", start: isoPlusDays(TODAY, 6), end: isoPlusDays(TODAY, 6), motif: "Congé", notified: true },
  ];

  let PARAMS = {
    minGap: 10, minLead: 2, maxLead: 90, absenceThreshold: 2, maxRdvPerClientDay: 1,
  };

  let PROFILE = {
    name: "Dr. Ahmed Benali", desc: "Médecin généraliste — cabinet ouvert du lundi au samedi, consultations sur rendez-vous.",
    address: "12 rue des Frères Bouadou, Sétif", phone: "0555 10 20 30", email: "ahmed.benali@rendezvousapp.com",
  };

  let NOTIFS = [
    { id: 1, type: "new", text: "Nouvelle réservation en ligne — <b>Hamza Belkhir</b> le " + isoPlusDays(TODAY,2), time: "Il y a 20 min", unread: true },
    { id: 2, type: "cancel", text: "<b>Amel Bensalem</b> a annulé son rendez-vous du " + isoPlusDays(TODAY,-3), time: "Il y a 1 h", unread: true },
    { id: 3, type: "agenda", text: "Modification dans l'agenda par votre réceptionniste Imane B.", time: "Il y a 2 h", unread: true },
    { id: 4, type: "receptionniste", text: "Nouvelle réceptionniste affectée par l'Admin : <b>Feriel N.</b>", time: "Hier", unread: false },
    { id: 5, type: "perms", text: "Autorisations mises à jour pour <b>Imane B.</b>", time: "Hier", unread: false },
  ];
  const NOTIF_ICONS = {
    new: { bg: "#F1ECFF", color: "#8957FF", svg: '<path d="M12 5v14M5 12h14"/>' },
    cancel: { bg: "#FDEDEC", color: "#D9483C", svg: '<circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' },
    agenda: { bg: "#FDF1E2", color: "#E2954A", svg: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
    receptionniste: { bg: "#E6F7F5", color: "#2FA79D", svg: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>' },
    perms: { bg: "#F1ECFF", color: "#8957FF", svg: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>' },
  };

  let state = {
    page: "dashboard", agendaView: "day", agendaDate: TODAY, monthCursor: TODAY.slice(0,7),
    rdvFilters: { status: "", search: "" },
    clientsView: "list", clientsFilters: { search: "", upcoming: "" },
    servicesView: "grid", servicesFilters: { search: "", status: "" },
    receptionnistesView: "list", receptionnistesFilters: { search: "", status: "" },
    dispoIndispoOpen: false,
  };

  // Brouillon de travail pour le constructeur de champs personnalisés d'un service
  let CF_DRAFT = [];
  let CF_SERVICE_ID = null;
  let CF_EDIT_DRAFT = null;

  window.fmtDateLong = function fmtDateLong(iso) { const d = new Date(iso + "T00:00:00"); return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
  window.fmtDateShort = function fmtDateShort(iso) { const d = new Date(iso + "T00:00:00"); return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  window.capitalize = function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  window.calcAge = function calcAge(dob) { const d = new Date(dob); const now = new Date(); let age = now.getFullYear()-d.getFullYear(); if (now.getMonth()<d.getMonth()||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate())) age--; return age; }
  window.initials = function initials(name) { return name.split(" ").map((w) => w[0]).slice(0,2).join("").toUpperCase(); }
  window.showToast = function showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.innerHTML = msg; t.classList.add("show");
    clearTimeout(showToast._t); showToast._t = setTimeout(() => t.classList.remove("show"), 2600);
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
    const navBadge = document.getElementById("navNotifBadge");
    if (navBadge) { navBadge.textContent = n; navBadge.style.display = n ? "inline-block" : "none"; }
    const tbDot = document.getElementById("tbNotifDot");
    if (tbDot) { tbDot.textContent = n; tbDot.style.display = n ? "flex" : "none"; }
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

  /* =========================================================
     EN-TÊTE DE PAGE UNIQUE (évite de répéter le titre dans chaque écran)
     ========================================================= */
  const PAGE_META = {
    dashboard: { title: () => `Bonjour, ${ME.name.replace('Dr. ','')}`, sub: () => `Voici un résumé de votre activité aujourd'hui — ${fmtDateLong(TODAY)}`, action: { label: "Nouveau rendez-vous", onClick: "openNewRdv()", icon: true } },
    agenda: { title: "Agenda", sub: "Vues par jour, semaine ou mois — cliquez un rendez-vous pour le consulter", action: { label: "Nouveau rendez-vous", onClick: "openNewRdv()", icon: true } },
    rdv: { title: "Réservations", sub: "Organisées par état — Réservé, Terminé, Annulé", action: { label: "Nouveau rendez-vous", onClick: "openNewRdv()", icon: true } },
    clients: { title: "Clients", sub: "Clients associés à votre activité" },
    services: { title: "Services", sub: "Gérez les services proposés à vos clients", action: { label: "Ajouter un service", onClick: "openServiceForm()", icon: true } },
    dispo: { title: "Disponibilités", sub: "Jours, horaires et créneaux disponibles" },
    receptionnistes: { title: "Réceptionnistes", sub: "Gérez les réceptionnistes qui vous sont affectées et leurs autorisations" },
    stats: { title: "Statistiques", sub: "Activité globale — toutes périodes confondues" },
    assistant: { title: "Assistant IA", sub: "Personnalisé selon votre activité, vos services, votre planning et vos clients" },
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
    const todays = APPTS.filter((a) => a.date === TODAY && a.status !== "annule");
    const upcoming = APPTS.filter((a) => a.date > TODAY && a.status === "reserve").sort((a,b) => (a.date+a.start).localeCompare(b.date+b.start)).slice(0,4);
    const termines = APPTS.filter((a) => a.status === "termine").length;
    const clientsCount = new Set(APPTS.map((a) => a.client)).size;
    const activeServices = SERVICES.filter((s) => s.status === "active").length;

    const statCards = [
      { label: "Rendez-vous aujourd'hui", value: todays.length, icon: iconCal(), bg: "#F1ECFF", color: "#8957FF" },
      { label: "Prochains rendez-vous", value: upcoming.length, icon: iconClock(), bg: "#FDF1E2", color: "#E2954A" },
      { label: "Rendez-vous terminés", value: termines, icon: iconCheckCircle(), bg: "#E9F7ED", color: "#3FA65C" },
      { label: "Clients", value: clientsCount, icon: iconUsers(), bg: "#E6F7F5", color: "#2FA79D" },
      { label: "Services actifs", value: activeServices, icon: iconCheck(), bg: "#EEEDF2", color: "#8A8496" },
    ];
    const quickLinks = [
      ["agenda","Agenda",iconCal()], ["rdv","Réservations",iconCheck()], ["clients","Clients",iconUsers()],
      ["services","Services",iconCheck()], ["dispo","Disponibilités",iconClock()], ["receptionnistes","Réceptionnistes",iconUsers()], ["stats","Statistiques",iconCheckCircle()],
    ];

    document.getElementById("page-dashboard").innerHTML = `
      <div class="stat-grid">
        ${statCards.map((s) => `<div class="stat-card"><div class="stat-icon" style="background:${s.bg};color:${s.color}">${s.icon}</div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`).join("")}
      </div>
      <div class="dash-grid">
        <div class="card">
          <div class="card-head"><h3>Planning du jour</h3><button class="btn btn-ghost btn-sm" onclick="goToPage('agenda')">Voir l'agenda</button></div>
          ${todays.length ? todays.sort((a,b)=>a.start.localeCompare(b.start)).map((a) => `
            <div class="dash-list-row">
              <span class="dash-list-time">${a.start}</span>
              <div style="flex:1"><div class="dash-list-name">${a.client}</div><div class="dash-list-sub">${a.service}</div></div>
              <span class="status-pill ${STATUS[a.status].cls}">${STATUS[a.status].label}</span>
            </div>`).join("") : `<div class="table-empty">Aucun rendez-vous aujourd'hui</div>`}
        </div>
        <div>
          <div class="card" style="margin-bottom:14px;">
            <div class="card-head"><h3>Accès rapide</h3></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:16px;">
              ${quickLinks.map(([p,l,ic]) => `<button class="btn btn-ghost btn-sm" style="justify-content:flex-start;" onclick="goToPage('${p}')">${ic} ${l}</button>`).join("")}
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Notifications récentes</h3><button class="btn btn-ghost btn-sm" onclick="goToPage('notifs')">Tout voir</button></div>
            ${NOTIFS.slice(0,3).map((n) => notifRowHtml(n)).join("")}
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
          <button class="${state.agendaView==='day'?'active':''}" onclick="setAgendaView('day')">Jour</button>
          <button class="${state.agendaView==='week'?'active':''}" onclick="setAgendaView('week')">Semaine</button>
          <button class="${state.agendaView==='month'?'active':''}" onclick="setAgendaView('month')">Mois</button>
        </div>
      </div>
      <div class="agenda-body">
        <div id="agendaMain"></div>
        <div>
          ${miniCalHtml()}
          <div class="card" style="margin-top:14px;padding:14px 16px;">
            <div style="font-size:12px;font-weight:700;margin-bottom:10px;">Légende</div>
            <div class="legend-row">${Object.entries(STATUS).map(([k,v]) => `<span class="legend-item"><span class="legend-dot" style="background:${v.color}"></span>${v.label}</span>`).join("")}</div>
          </div>
        </div>
      </div>
    `;
    renderAgendaMain();
  }
  window.agendaDateLabel = function agendaDateLabel() {
    if (state.agendaView === "day") return capitalize(fmtDateLong(state.agendaDate));
    if (state.agendaView === "week") { const start = weekStart(state.agendaDate); return fmtDateShort(start) + " – " + fmtDateShort(isoPlusDays(start,6)); }
    const d = new Date(state.monthCursor + "-01T00:00:00");
    return capitalize(d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));
  }
  window.weekStart = function weekStart(iso) { const d = new Date(iso + "T00:00:00"); const day = (d.getDay()+6)%7; d.setDate(d.getDate()-day); return d.toISOString().slice(0,10); }
  window.agendaShift = function agendaShift(dir) {
    if (state.agendaView === "day") state.agendaDate = isoPlusDays(state.agendaDate, dir);
    else if (state.agendaView === "week") state.agendaDate = isoPlusDays(state.agendaDate, dir*7);
    else { const d = new Date(state.monthCursor+"-01T00:00:00"); d.setMonth(d.getMonth()+dir); state.monthCursor = d.toISOString().slice(0,7); }
    renderAgenda();
  }
  window.agendaToday = function agendaToday() { state.agendaDate = TODAY; state.monthCursor = TODAY.slice(0,7); renderAgenda(); }
  window.setAgendaView = function setAgendaView(v) { state.agendaView = v; renderAgenda(); }

  const HOURS = Array.from({length:11}, (_,i) => 8+i);
  window.renderAgendaMain = function renderAgendaMain() {
    const el = document.getElementById("agendaMain");
    if (!el) return;
    if (state.agendaView === "day") { el.innerHTML = dayViewHtml(); placeDayAppts(); }
    else if (state.agendaView === "week") el.innerHTML = weekViewHtml();
    else el.innerHTML = monthViewHtml();
  }
  window.dayViewHtml = function dayViewHtml() {
    let head = `<div class="day-grid-head" style="grid-template-columns:44px 1fr"><div></div><div class="day-col-head"><div class="avatar-sm" style="background:${ME.color};margin:0 auto 4px;">${ME.initials}</div><div class="day-col-head-name">${ME.name}</div><div class="day-col-head-role">${ME.role}</div></div></div>`;
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
    const dayAppts = APPTS.filter((a) => a.date === state.agendaDate && a.status !== "annule");
    col.style.position = "relative";
    dayAppts.forEach((a) => {
      const [sh,sm] = a.start.split(":").map(Number); const [eh,em] = a.end.split(":").map(Number);
      const startMin = (sh-HOURS[0])*60+sm; const durMin = Math.max(20,(eh*60+em)-(sh*60+sm));
      const top = (startMin/60)*rowH; const height = (durMin/60)*rowH - 4;
      const block = document.createElement("div");
      block.className = "appt-block";
      block.style.top = top+"px"; block.style.height = Math.max(24,height)+"px";
      block.style.background = STATUS[a.status].color+"22"; block.style.borderLeftColor = STATUS[a.status].color; block.style.color = "#1B1730";
      block.innerHTML = `<b>${a.client}</b><span>${a.start} · ${a.service}</span>`;
      block.onclick = (e) => { e.stopPropagation(); openRdvDetail(a.id); };
      col.appendChild(block);
    });
  }
  window.handleDayColClick = function handleDayColClick(e, hour) { if (e.target.closest(".appt-block")) return; openNewRdv({date: state.agendaDate, start: hour+":00"}); }
  window.weekViewHtml = function weekViewHtml() {
    const start = weekStart(state.agendaDate);
    const days = Array.from({length:7},(_,i) => isoPlusDays(start,i));
    return `<div class="week-grid">` + days.map((d) => {
      const dayAppts = APPTS.filter((a) => a.date===d && a.status!=='annule').sort((a,b)=>a.start.localeCompare(b.start));
      const dow = new Date(d+"T00:00:00").toLocaleDateString("fr-FR",{weekday:"short",day:"numeric"});
      return `<div class="week-day-col"><div class="week-day-head ${d===TODAY?'today':''}">${capitalize(dow)}</div>
        ${dayAppts.length ? dayAppts.map((a) => `<div class="week-appt-chip" style="background:${STATUS[a.status].color}18;border-color:${STATUS[a.status].color}" onclick="openRdvDetail('${a.id}')"><b>${a.start}</b> ${a.client}</div>`).join("") : `<div style="font-size:10.5px;color:var(--ink-soft);text-align:center;padding-top:10px;">—</div>`}
      </div>`;
    }).join("") + `</div>`;
  }
  window.monthViewHtml = function monthViewHtml() {
    const first = new Date(state.monthCursor+"-01T00:00:00");
    const startOffset = (first.getDay()+6)%7;
    const gridStart = new Date(first); gridStart.setDate(first.getDate()-startOffset);
    const cells = Array.from({length:42},(_,i) => { const d = new Date(gridStart); d.setDate(gridStart.getDate()+i); return d.toISOString().slice(0,10); });
    const dows = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
    let html = `<div class="month-grid">` + dows.map((d) => `<div class="month-dow">${d}</div>`).join("");
    cells.forEach((iso) => {
      const inMonth = iso.slice(0,7)===state.monthCursor;
      const count = APPTS.filter((a) => a.date===iso && a.status!=='annule').length;
      const num = parseInt(iso.slice(8,10),10);
      html += `<div class="month-cell ${inMonth?'':'muted'} ${iso===TODAY?'today':''}" onclick="jumpToDay('${iso}')"><div class="month-cell-num">${num}</div>${count?`<span class="month-cell-count">${count} RDV</span>`:""}</div>`;
    });
    return html + `</div>`;
  }
  window.jumpToDay = function jumpToDay(iso) { state.agendaDate = iso; state.agendaView = "day"; renderAgenda(); }
  window.miniCalHtml = function miniCalHtml() {
    const first = new Date(state.monthCursor+"-01T00:00:00");
    const startOffset = (first.getDay()+6)%7;
    const gridStart = new Date(first); gridStart.setDate(first.getDate()-startOffset);
    const cells = Array.from({length:42},(_,i) => { const d = new Date(gridStart); d.setDate(gridStart.getDate()+i); return d.toISOString().slice(0,10); });
    const dows = ["L","M","M","J","V","S","D"];
    let html = `<div class="mini-cal"><div class="mini-cal-head"><button onclick="miniCalShift(-1)">${iconChevronLeft()}</button><span>${capitalize(first.toLocaleDateString("fr-FR",{month:"long",year:"numeric"}))}</span><button onclick="miniCalShift(1)">${iconChevronRight()}</button></div><div class="mini-cal-grid">`;
    dows.forEach((d) => html += `<div class="mini-cal-dow">${d}</div>`);
    cells.forEach((iso) => {
      const inMonth = iso.slice(0,7)===state.monthCursor;
      const hasAppt = APPTS.some((a) => a.date===iso && a.status!=="annule");
      const num = parseInt(iso.slice(8,10),10);
      html += `<div class="mini-cal-day ${inMonth?'':'muted'} ${iso===TODAY?'today':''} ${iso===state.agendaDate?'selected':''} ${hasAppt?'has-appt':''}" onclick="jumpToDay('${iso}')">${num}</div>`;
    });
    return html + `</div></div>`;
  }
  window.miniCalShift = function miniCalShift(dir) { const d = new Date(state.monthCursor+"-01T00:00:00"); d.setMonth(d.getMonth()+dir); state.monthCursor = d.toISOString().slice(0,7); renderAgenda(); }

  /* =========================================================
     PAGE : RÉSERVATIONS
     ========================================================= */
  window.renderRdvPage = function renderRdvPage() {
    document.getElementById("page-rdv").innerHTML = `
      <div class="filter-row">
        <input type="text" placeholder="Rechercher un client…" oninput="updateRdvFilter('search', this.value)" style="min-width:220px" />
        <select onchange="updateRdvFilter('status', this.value)">
          <option value="">Tous les états</option>
          ${Object.entries(STATUS).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join("")}
        </select>
      </div>
      <div class="card"><table class="data-table"><thead><tr><th>Client</th><th>Service</th><th>Date</th><th>Heure</th><th>Origine</th><th>Statut</th><th></th></tr></thead><tbody id="rdvTableBody"></tbody></table></div>
    `;
    renderRdvTable();
  }
  window.updateRdvFilter = function updateRdvFilter(key, val) { state.rdvFilters[key] = val; renderRdvTable(); }
  window.renderRdvTable = function renderRdvTable() {
    const f = state.rdvFilters;
    let rows = APPTS.filter((a) => (!f.status || a.status===f.status) && (!f.search || a.client.toLowerCase().includes(f.search.toLowerCase())))
      .sort((a,b) => (b.date+b.start).localeCompare(a.date+a.start));
    const body = document.getElementById("rdvTableBody");
    if (!body) return;
    if (!rows.length) { body.innerHTML = `<tr><td colspan="7"><div class="table-empty">Aucune réservation ne correspond à ces filtres</div></td></tr>`; return; }
    body.innerHTML = rows.map((a) => `<tr class="row-clickable" onclick="openRdvDetail('${a.id}')">
      <td><div class="cell-client"><div class="avatar-sm" style="background:${ME.color}">${initials(a.client)}</div><div><div class="cell-client-name">${a.client}</div><div class="cell-client-sub">${a.phone}</div></div></div></td>
      <td>${a.service}</td><td>${fmtDateShort(a.date)}</td><td>${a.start}</td>
      <td style="font-size:11.5px;color:var(--ink-soft);">${a.source}</td>
      <td><span class="status-pill ${STATUS[a.status].cls}">${STATUS[a.status].label}</span></td>
      <td><div class="row-actions" onclick="event.stopPropagation()"><button class="icon-btn" title="Consulter" onclick="openRdvDetail('${a.id}')">${iconEye()}</button></div></td>
    </tr>`).join("");
  }

  /* =========================================================
     PAGE : CLIENTS (+ fiche + notes internes)
     ========================================================= */
  window.uniqueClients = function uniqueClients() {
    const map = new Map();
    APPTS.forEach((a) => { if (!map.has(a.client)) map.set(a.client, { name:a.client, phone:a.phone, email:a.email, dob:a.dob, appts:[] }); map.get(a.client).appts.push(a); });
    return Array.from(map.values());
  }
  window.renderClientsPage = function renderClientsPage() {
    document.getElementById("page-clients").innerHTML = `
      <div class="filter-row">
        <input type="text" placeholder="Rechercher un client…" oninput="updateClientsFilter('search', this.value)" style="min-width:220px" />
        <select onchange="updateClientsFilter('upcoming', this.value)">
          <option value="">Tous les clients</option>
          <option value="oui">Avec RDV à venir</option>
          <option value="non">Sans RDV à venir</option>
        </select>
        <div class="view-toggle" id="clientsViewToggle" style="margin-left:auto">
          <button class="${state.clientsView==='list'?'active':''}" onclick="setClientsView('list')" title="Vue liste">${iconList()}</button>
          <button class="${state.clientsView==='grid'?'active':''}" onclick="setClientsView('grid')" title="Vue grille">${iconGrid()}</button>
        </div>
      </div>
      <div id="clientsContainer"></div>
    `;
    renderClientsContainer();
  }
  window.updateClientsFilter = function updateClientsFilter(key, val) { state.clientsFilters[key] = val; renderClientsContainer(); }
  window.setClientsView = function setClientsView(v) {
    state.clientsView = v;
    const toggle = document.getElementById("clientsViewToggle");
    if (toggle) toggle.querySelectorAll("button").forEach((b,i) => b.classList.toggle("active", (i===0 && v==="list") || (i===1 && v==="grid")));
    renderClientsContainer();
  }
  window.filteredClients = function filteredClients() {
    const f = state.clientsFilters;
    return uniqueClients().filter((c) => {
      if (f.search && !c.name.toLowerCase().includes(f.search.toLowerCase())) return false;
      const hasUpcoming = c.appts.some((a) => a.date >= TODAY && a.status === "reserve");
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
  window.renderClientsTable = function renderClientsTable(clients) {
    const body = document.getElementById("clientsTableBody");
    if (!body) return;
    if (!clients.length) { body.innerHTML = `<tr><td colspan="6"><div class="table-empty">Aucun client ne correspond à ces filtres</div></td></tr>`; return; }
    body.innerHTML = clients.map((c) => {
      const upcoming = c.appts.filter((a) => a.date >= TODAY && a.status === "reserve").length;
      const past = c.appts.filter((a) => a.status === "termine").length;
      return `<tr class="row-clickable" onclick="openClientFiche('${encodeURIComponent(c.name)}')">
        <td><div class="cell-client"><div class="avatar-sm" style="background:var(--primary)">${initials(c.name)}</div><div><div class="cell-client-name">${c.name}</div><div class="cell-client-sub">${calcAge(c.dob)} ans</div></div></div></td>
        <td>${c.phone}</td><td>${c.email}</td><td>${upcoming}</td><td>${past}</td>
        <td><div class="row-actions" onclick="event.stopPropagation()"><button class="icon-btn" onclick="openClientFiche('${encodeURIComponent(c.name)}')">${iconEye()}</button></div></td>
      </tr>`;
    }).join("");
  }
  window.renderClientsGrid = function renderClientsGrid(clients) {
    const grid = document.getElementById("clientsGrid");
    if (!grid) return;
    if (!clients.length) { grid.innerHTML = `<div class="table-empty">Aucun client ne correspond à ces filtres</div>`; return; }
    grid.innerHTML = clients.map((c) => {
      const upcoming = c.appts.filter((a) => a.date >= TODAY && a.status === "reserve").length;
      const past = c.appts.filter((a) => a.status === "termine").length;
      return `<div class="card" style="padding:16px;cursor:pointer;" onclick="openClientFiche('${encodeURIComponent(c.name)}')">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;"><div class="avatar-sm" style="width:40px;height:40px;font-size:14px;background:var(--primary)">${initials(c.name)}</div><div><div style="font-weight:700;font-size:13.5px;">${c.name}</div><div style="font-size:11px;color:var(--ink-soft)">${calcAge(c.dob)} ans</div></div></div>
        <div style="font-size:12px;color:var(--ink-soft);margin-bottom:3px;">${c.phone}</div>
        <div style="font-size:12px;color:var(--ink-soft);margin-bottom:10px;">${c.email}</div>
        <div style="display:flex;justify-content:space-between;font-size:11.5px;"><span>${upcoming} à venir</span><span>${past} passés</span></div>
      </div>`;
    }).join("");
  }
  window.openClientFiche = function openClientFiche(encodedName) {
    const name = decodeURIComponent(encodedName);
    const c = uniqueClients().find((x) => x.name === name);
    if (!c) return;
    const history = c.appts.slice().sort((a,b) => (b.date+b.start).localeCompare(a.date+a.start));
    const upcoming = history.filter((a) => a.date >= TODAY && a.status === "reserve");
    const past = history.filter((a) => a.status === "termine");
    const cancelled = history.filter((a) => a.status === "annule");
    const notes = NOTES[name] || [];
    const html = `
      <div class="modal-head">
        <div style="display:flex;align-items:center;gap:12px;"><div class="avatar-sm" style="width:42px;height:42px;font-size:15px;background:var(--primary)">${initials(c.name)}</div><div><p class="modal-title">${c.name}</p><p class="modal-sub">${calcAge(c.dob)} ans · ${c.phone}</p></div></div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
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
        <button class="btn btn-primary btn-sm" onclick="addClientNote('${encodeURIComponent(name)}')">${iconPlus()} Ajouter la note</button>
        <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px;" id="notesList">
          ${notes.length ? notes.map((n) => noteRowHtml(n, name)).join("") : `<div class="table-empty">Aucune note pour ce client</div>`}
        </div>
      </div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Fermer</button></div>
    `;
    openModal(html, true);
  }
  window.rdvMiniRow = function rdvMiniRow(a) { return `<div class="dash-list-row" style="padding:8px 4px;"><span class="dash-list-time" style="width:auto;">${fmtDateShort(a.date)}</span><div style="flex:1"><div class="dash-list-name" style="font-size:12.5px;">${a.service}</div></div><span class="status-pill ${STATUS[a.status].cls}">${STATUS[a.status].label}</span></div>`; }
  window.switchClientTab = function switchClientTab(btn, tab) {
    btn.parentElement.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("clientTabRdv").style.display = tab === "rdv" ? "block" : "none";
    document.getElementById("clientTabNotes").style.display = tab === "notes" ? "block" : "none";
  }
  window.noteRowHtml = function noteRowHtml(n, clientName) {
    return `<div class="card" style="padding:10px 14px;"><div style="font-size:12.5px;">${n.text}</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;"><span style="font-size:10.5px;color:var(--ink-soft)">${n.date}</span><div class="row-actions"><button class="icon-btn" onclick="deleteClientNote('${encodeURIComponent(clientName)}','${n.id}')">${iconTrash()}</button></div></div></div>`;
  }
  window.addClientNote = function addClientNote(encodedName) {
    const name = decodeURIComponent(encodedName);
    const text = document.getElementById("newNoteText").value.trim();
    if (!text) return;
    if (!NOTES[name]) NOTES[name] = [];
    NOTES[name].unshift({ id: uid("n"), text, date: fmtDateShort(TODAY) });
    document.getElementById("notesList").innerHTML = NOTES[name].map((n) => noteRowHtml(n, name)).join("");
    document.getElementById("newNoteText").value = "";
    showToast("Note interne ajoutée");
  }
  window.deleteClientNote = function deleteClientNote(encodedName, id) {
    const name = decodeURIComponent(encodedName);
    NOTES[name] = (NOTES[name] || []).filter((n) => n.id !== id);
    document.getElementById("notesList").innerHTML = NOTES[name].length ? NOTES[name].map((n) => noteRowHtml(n, name)).join("") : `<div class="table-empty">Aucune note pour ce client</div>`;
  }

  /* =========================================================
     PAGE : SERVICES
     ========================================================= */
  window.renderServicesPage = function renderServicesPage() {
    document.getElementById("page-services").innerHTML = `
      <div class="filter-row">
        <input type="text" placeholder="Rechercher un service…" oninput="updateServicesFilter('search', this.value)" style="min-width:220px" />
        <select onchange="updateServicesFilter('status', this.value)">
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
        </select>
        <div class="view-toggle" id="servicesViewToggle" style="margin-left:auto">
          <button class="${state.servicesView==='grid'?'active':''}" onclick="setServicesView('grid')" title="Vue grille">${iconGrid()}</button>
          <button class="${state.servicesView==='list'?'active':''}" onclick="setServicesView('list')" title="Vue liste">${iconList()}</button>
        </div>
      </div>
      <div id="servicesContainer"></div>
    `;
    renderServicesContainer();
  }
  window.updateServicesFilter = function updateServicesFilter(key, val) { state.servicesFilters[key] = val; renderServicesContainer(); }
  window.setServicesView = function setServicesView(v) {
    state.servicesView = v;
    const toggle = document.getElementById("servicesViewToggle");
    if (toggle) toggle.querySelectorAll("button").forEach((b,i) => b.classList.toggle("active", (i===0 && v==="grid") || (i===1 && v==="list")));
    renderServicesContainer();
  }
  window.filteredServices = function filteredServices() {
    const f = state.servicesFilters;
    return SERVICES.filter((s) => (!f.status || s.status===f.status) && (!f.search || s.name.toLowerCase().includes(f.search.toLowerCase())));
  }
  window.renderServicesContainer = function renderServicesContainer() {
    const wrap = document.getElementById("servicesContainer");
    if (!wrap) return;
    const items = filteredServices();
    if (state.servicesView === "list") {
      wrap.innerHTML = `<div class="card"><table class="data-table"><thead><tr><th>Service</th><th>Durée</th><th>Prix</th><th>Champs perso.</th><th>Statut</th><th></th></tr></thead><tbody id="servicesListBody"></tbody></table></div>`;
      renderServicesListBody(items);
    } else {
      wrap.innerHTML = `<div class="stat-grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))" id="servicesGrid"></div>`;
      renderServicesGrid(items);
    }
  }
  window.renderServicesGrid = function renderServicesGrid(list) {
    const grid = document.getElementById("servicesGrid");
    if (!grid) return;
    const items = list || SERVICES;
    if (!items.length) { grid.innerHTML = `<div class="table-empty">Aucun service ne correspond à ces filtres</div>`; return; }
    grid.innerHTML = items.map((s) => `
      <div class="card" style="padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <div style="font-weight:800;font-size:14px;">${s.name}</div>
          <span class="status-pill ${s.status==='active'?'st-termine':'st-absent'}">${s.status==='active'?'Actif':'Inactif'}</span>
        </div>
        <div style="font-size:12px;color:var(--ink-soft);margin-bottom:10px;min-height:32px;">${s.desc}</div>
        <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:8px;"><span>${s.duration} min</span><b>${s.price.toLocaleString('fr-FR')} DA</b></div>
        ${(s.customFields && s.customFields.length) ? `<div style="font-size:11px;color:var(--primary-dark);background:var(--primary-tint);display:inline-block;padding:2px 8px;border-radius:999px;margin-bottom:10px;">${s.customFields.length} champ${s.customFields.length>1?'s':''} personnalisé${s.customFields.length>1?'s':''}</div>` : `<div style="margin-bottom:10px;"></div>`}
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" style="flex:1;justify-content:center;" onclick="openServiceForm('${s.id}')">${iconEdit()} Modifier</button>
          <button class="icon-btn" title="${s.status==='active'?'Désactiver':'Activer'}" onclick="toggleServiceStatus('${s.id}')">${s.status==='active'?iconX():iconCheck()}</button>
          <button class="icon-btn" title="Supprimer" onclick="deleteService('${s.id}')">${iconTrash()}</button>
        </div>
      </div>`).join("");
  }
  window.renderServicesListBody = function renderServicesListBody(list) {
    const body = document.getElementById("servicesListBody");
    if (!body) return;
    if (!list.length) { body.innerHTML = `<tr><td colspan="6"><div class="table-empty">Aucun service ne correspond à ces filtres</div></td></tr>`; return; }
    body.innerHTML = list.map((s) => `<tr>
      <td><div class="cell-client-name">${s.name}</div><div class="cell-client-sub">${s.desc}</div></td>
      <td>${s.duration} min</td>
      <td>${s.price.toLocaleString('fr-FR')} DA</td>
      <td>${(s.customFields && s.customFields.length) ? s.customFields.length : '—'}</td>
      <td><span class="status-pill ${s.status==='active'?'st-termine':'st-absent'}">${s.status==='active'?'Actif':'Inactif'}</span></td>
      <td><div class="row-actions">
        <button class="icon-btn" title="Modifier" onclick="openServiceForm('${s.id}')">${iconEdit()}</button>
        <button class="icon-btn" title="${s.status==='active'?'Désactiver':'Activer'}" onclick="toggleServiceStatus('${s.id}')">${s.status==='active'?iconX():iconCheck()}</button>
        <button class="icon-btn" title="Supprimer" onclick="deleteService('${s.id}')">${iconTrash()}</button>
      </div></td>
    </tr>`).join("");
  }
  window.toggleServiceStatus = function toggleServiceStatus(id) {
    const s = SERVICES.find((x) => x.id===id); if (!s) return;
    s.status = s.status === "active" ? "inactive" : "active";
    renderServicesContainer();
    showToast(`Service « ${s.name} » ${s.status==='active'?'activé':'désactivé'}`);
  }
  window.deleteService = function deleteService(id) {
    const s = SERVICES.find((x) => x.id===id); if (!s) return;
    if (!confirm(`Supprimer le service « ${s.name} » ? Les rendez-vous passés associés resteront conservés dans l'historique.`)) return;
    SERVICES = SERVICES.filter((x) => x.id !== id);
    renderServicesContainer();
    showToast("Service supprimé");
  }

  /* ---- Formulaire de service (Détails + Champs personnalisés) ---- */
  window.openServiceForm = function openServiceForm(id, initialTab) {
    const s = id ? SERVICES.find((x) => x.id===id) : null;
    const bucket = id || "__new__";
    if (CF_SERVICE_ID !== bucket) {
      CF_DRAFT = s ? JSON.parse(JSON.stringify(s.customFields || [])) : [];
      CF_SERVICE_ID = bucket;
    }
    const tab = initialTab === "champs" ? "champs" : "details";
    const html = `
      <div class="modal-head"><div><p class="modal-title">${s?'Modifier le service':'Ajouter un service'}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="modal-tabs">
        <button class="${tab==='details'?'active':''}" onclick="switchServiceTab(this,'details')">Détails</button>
        <button class="${tab==='champs'?'active':''}" onclick="switchServiceTab(this,'champs')">Champs personnalisés${CF_DRAFT.length?` (${CF_DRAFT.length})`:""}</button>
      </div>
      <div id="svTabDetails" style="display:${tab==='details'?'block':'none'}">
        <div class="field-row"><label>Nom du service</label><input type="text" id="svName" value="${s?s.name:''}" placeholder="Consultation générale" /></div>
        <div class="field-row"><label>Description</label><textarea id="svDesc" rows="2" placeholder="Description courte">${s?s.desc:''}</textarea></div>
        <div class="field-2col">
          <div class="field-row"><label>Durée (minutes)</label><input type="number" id="svDuration" value="${s?s.duration:30}" /></div>
          <div class="field-row"><label>Prix (DA)</label><input type="number" id="svPrice" value="${s?s.price:''}" placeholder="Si applicable" /></div>
        </div>
        <div class="field-row"><label>Statut</label><select id="svStatus"><option value="active" ${s&&s.status==='active'?'selected':''}>Actif</option><option value="inactive" ${s&&s.status==='inactive'?'selected':''}>Inactif</option></select></div>
        <div class="field-hint">L'ajout d'une image du service sera disponible lors du branchement au stockage de fichiers.</div>
      </div>
      <div id="svTabChamps" style="display:${tab==='champs'?'block':'none'}">
        <div class="field-hint" style="margin-bottom:12px;">Ces champs apparaissent dans le formulaire de réservation du client, à l'étape « Options spécifiques ». Ce que vous configurez ici est ce que le client voit.</div>
        <div id="cfList"></div>
        <button class="btn btn-ghost btn-sm" style="margin-top:4px;" onclick="openFieldEditor()">${iconPlus()} Ajouter un champ</button>
      </div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveService('${id||''}')">${iconCheck()} Enregistrer</button></div>
    `;
    openModal(html, true);
    renderCFList();
  }
  window.switchServiceTab = function switchServiceTab(btn, tab) {
    btn.parentElement.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("svTabDetails").style.display = tab==="details" ? "block" : "none";
    document.getElementById("svTabChamps").style.display = tab==="champs" ? "block" : "none";
  }

  /* ---- Liste des champs personnalisés du service en cours d'édition ---- */
  window.cfFieldLabel = function cfFieldLabel(f) { return (f && f.label) ? f.label : "(Sans nom)"; }
  window.cfTypeLabel = function cfTypeLabel(t) { const ft = FIELD_TYPES.find((x) => x.value===t); return ft ? ft.label : t; }
  window.renderCFList = function renderCFList() {
    const el = document.getElementById("cfList");
    if (!el) return;
    if (!CF_DRAFT.length) { el.innerHTML = `<div class="table-empty">Aucun champ personnalisé — le client ne voit que le formulaire standard.</div>`; return; }
    el.innerHTML = CF_DRAFT.map((f) => {
      const condCount = (f.conditions || []).length;
      return `<div class="card" style="padding:12px 14px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div>
            <div style="font-weight:700;font-size:13px;">${cfFieldLabel(f)} ${f.required?'<span class="status-pill st-annule" style="margin-left:6px;">Obligatoire</span>':''}</div>
            <div style="font-size:11.5px;color:var(--ink-soft);margin-top:3px;">${cfTypeLabel(f.type)}${condCount ? ` · Condition${condCount>1?'s':''} (${f.conditionLogic||'ET'})` : ' · Toujours visible'}</div>
          </div>
          <div class="row-actions">
            <button class="icon-btn" title="Modifier" onclick="openFieldEditor('${f.id}')">${iconEdit()}</button>
            <button class="icon-btn" title="Supprimer" onclick="deleteCFField('${f.id}')">${iconTrash()}</button>
          </div>
        </div>
      </div>`;
    }).join("");
  }
  window.deleteCFField = function deleteCFField(fieldId) {
    if (!confirm("Supprimer ce champ personnalisé ?")) return;
    CF_DRAFT = CF_DRAFT.filter((f) => f.id !== fieldId);
    CF_DRAFT.forEach((f) => { f.conditions = (f.conditions||[]).filter((c) => c.fieldId !== fieldId); });
    renderCFList();
    const badgeTabBtn = document.querySelector(".modal-tabs button:nth-child(2)");
    if (badgeTabBtn) badgeTabBtn.textContent = `Champs personnalisés${CF_DRAFT.length?` (${CF_DRAFT.length})`:""}`;
  }
  window.returnToServiceForm = function returnToServiceForm() {
    openServiceForm(CF_SERVICE_ID === "__new__" ? undefined : CF_SERVICE_ID, "champs");
  }

  /* ---- Éditeur d'un champ (label, type, obligatoire, options, condition) ---- */
  window.openFieldEditor = function openFieldEditor(fieldId) {
    const existing = fieldId ? CF_DRAFT.find((x) => x.id===fieldId) : null;
    CF_EDIT_DRAFT = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: uid("cf"), label: "", type: "texte_court", required: false, options: [], defaultValue: "", helpText: "", conditions: [], conditionLogic: "ET",
    };
    renderFieldEditorModal();
  }
  window.renderFieldEditorModal = function renderFieldEditorModal() {
    const f = CF_EDIT_DRAFT;
    const isEditing = CF_DRAFT.some((x) => x.id === f.id);
    const otherFields = CF_DRAFT.filter((x) => x.id !== f.id);
    const conditions = f.conditions || [];
    const html = `
      <div class="modal-head"><div><p class="modal-title">${isEditing?'Modifier le champ':'Nouveau champ'}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-row"><label>Label (nom affiché au client)</label><input type="text" id="cfLabel" value="${f.label}" oninput="updateCFDraft('label', this.value)" placeholder="Ex. Type de véhicule" /></div>
      <div class="field-2col">
        <div class="field-row"><label>Type de champ</label><select id="cfType" onchange="onCFTypeChange(this.value)">${FIELD_TYPES.map((t) => `<option value="${t.value}" ${f.type===t.value?'selected':''}>${t.label}</option>`).join("")}</select></div>
        <div class="field-row"><label>Obligatoire</label><select onchange="updateCFDraft('required', this.value==='oui')"><option value="non" ${!f.required?'selected':''}>Facultatif</option><option value="oui" ${f.required?'selected':''}>Obligatoire</option></select></div>
      </div>
      <div id="cfOptionsWrap" style="display:${HAS_OPTIONS_TYPES.includes(f.type)?'block':'none'}">
        <div class="field-row"><label>Options (une par ligne, définies librement)</label><textarea id="cfOptions" rows="3" oninput="updateCFDraft('options', this.value.split('\\n').map(s=>s.trim()).filter(Boolean))" placeholder="Option A">${(f.options||[]).join("\n")}</textarea></div>
      </div>
      <div class="field-row"><label>Valeur par défaut (optionnel)</label><input type="text" value="${f.defaultValue||''}" oninput="updateCFDraft('defaultValue', this.value)" /></div>
      <div class="field-row"><label>Texte d'aide (optionnel)</label><input type="text" value="${f.helpText||''}" oninput="updateCFDraft('helpText', this.value)" /></div>
      <div class="card" style="padding:14px;margin-top:6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${conditions.length?'10px':'0'};">
          <div style="font-weight:700;font-size:12.5px;">Condition d'affichage (facultatif)</div>
          <button class="btn btn-ghost btn-sm" onclick="addCFCondition()" ${!otherFields.length?'disabled title="Créez d\'abord un autre champ pour ce service"':''}>${iconPlus()} Ajouter une condition</button>
        </div>
        ${conditions.length>1?`<div class="field-row" style="margin:8px 0;"><label>Logique entre les conditions</label><select onchange="updateCFDraft('conditionLogic', this.value)"><option value="ET" ${f.conditionLogic!=='OU'?'selected':''}>ET — toutes les conditions</option><option value="OU" ${f.conditionLogic==='OU'?'selected':''}>OU — au moins une condition</option></select></div>`:""}
        <div id="cfConditionsList">${conditions.length ? conditions.map((c,i) => cfConditionRowHtml(c,i,otherFields)).join("") : `<div class="field-hint">Sans condition, ce champ est toujours visible côté client.</div>`}</div>
      </div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="returnToServiceForm()">Retour</button><button class="btn btn-primary" onclick="saveCFField()">${iconCheck()} Enregistrer le champ</button></div>
    `;
    openModal(html, true);
  }
  window.onCFTypeChange = function onCFTypeChange(v) {
    updateCFDraft("type", v);
    const wrap = document.getElementById("cfOptionsWrap");
    if (wrap) wrap.style.display = HAS_OPTIONS_TYPES.includes(v) ? "block" : "none";
  }
  window.updateCFDraft = function updateCFDraft(key, val) { CF_EDIT_DRAFT[key] = val; }
  window.cfConditionRowHtml = function cfConditionRowHtml(c, i, otherFields) {
    const refField = otherFields.find((x) => x.id===c.fieldId) || otherFields[0];
    let valueInput;
    if (refField && refField.type === "switch") {
      valueInput = `<select onchange="updateCFCondition(${i},'value',this.value)"><option value="oui" ${c.value==='oui'?'selected':''}>Oui</option><option value="non" ${c.value==='non'?'selected':''}>Non</option></select>`;
    } else if (refField && HAS_OPTIONS_TYPES.includes(refField.type)) {
      valueInput = `<select onchange="updateCFCondition(${i},'value',this.value)">${(refField.options||[]).map((o) => `<option value="${o}" ${c.value===o?'selected':''}>${o}</option>`).join("")}</select>`;
    } else {
      valueInput = `<input type="text" value="${c.value||''}" oninput="updateCFCondition(${i},'value',this.value)" placeholder="Valeur" />`;
    }
    return `<div class="field-2col" style="margin-bottom:8px;align-items:end;">
      <div class="field-row" style="margin-bottom:0"><label>Si</label><select onchange="updateCFCondition(${i},'fieldId',this.value)">${otherFields.map((o) => `<option value="${o.id}" ${(c.fieldId===o.id)?'selected':''}>${cfFieldLabel(o)}</option>`).join("")}</select></div>
      <div class="field-row" style="margin-bottom:0;display:flex;gap:6px;">
        <div style="flex:1"><label>Vaut</label>${valueInput}</div>
        <button class="icon-btn" style="margin-top:22px;flex-shrink:0;" title="Retirer" onclick="removeCFCondition(${i})">${iconTrash()}</button>
      </div>
    </div>`;
  }
  window.addCFCondition = function addCFCondition() {
    const otherFields = CF_DRAFT.filter((x) => x.id !== CF_EDIT_DRAFT.id);
    if (!otherFields.length) return;
    if (!CF_EDIT_DRAFT.conditions) CF_EDIT_DRAFT.conditions = [];
    const ref = otherFields[0];
    CF_EDIT_DRAFT.conditions.push({ fieldId: ref.id, value: ref.type==="switch" ? "oui" : ((ref.options||[])[0] || "") });
    renderFieldEditorModal();
  }
  window.removeCFCondition = function removeCFCondition(i) { CF_EDIT_DRAFT.conditions.splice(i,1); renderFieldEditorModal(); }
  window.updateCFCondition = function updateCFCondition(i, key, val) {
    CF_EDIT_DRAFT.conditions[i][key] = val;
    if (key === "fieldId") {
      const otherFields = CF_DRAFT.filter((x) => x.id !== CF_EDIT_DRAFT.id);
      const ref = otherFields.find((x) => x.id===val);
      CF_EDIT_DRAFT.conditions[i].value = ref && ref.type==="switch" ? "oui" : ((ref && ref.options && ref.options[0]) || "");
      renderFieldEditorModal();
    }
  }
  window.saveCFField = function saveCFField() {
    if (!CF_EDIT_DRAFT.label || !CF_EDIT_DRAFT.label.trim()) { showToast("Le label du champ est requis"); return; }
    if (HAS_OPTIONS_TYPES.includes(CF_EDIT_DRAFT.type) && !(CF_EDIT_DRAFT.options||[]).length) { showToast("Ajoutez au moins une option pour ce type de champ"); return; }
    const idx = CF_DRAFT.findIndex((x) => x.id === CF_EDIT_DRAFT.id);
    if (idx >= 0) CF_DRAFT[idx] = CF_EDIT_DRAFT; else CF_DRAFT.push(CF_EDIT_DRAFT);
    showToast(`Champ « ${CF_EDIT_DRAFT.label} » enregistré`);
    returnToServiceForm();
  }

  window.saveService = function saveService(id) {
    const nameEl = document.getElementById("svName");
    const name = nameEl ? nameEl.value.trim() : "";
    if (!name) {
      showToast("Le nom du service est requis");
      const tabBtn = document.querySelector(".modal-tabs button");
      if (tabBtn) switchServiceTab(tabBtn, "details");
      return;
    }
    const data = {
      name, desc: document.getElementById("svDesc").value.trim(),
      duration: parseInt(document.getElementById("svDuration").value,10) || 30,
      price: parseInt(document.getElementById("svPrice").value,10) || 0,
      status: document.getElementById("svStatus").value,
      customFields: CF_DRAFT,
    };
    if (id) { Object.assign(SERVICES.find((x) => x.id===id), data); showToast(`Service « ${name} » modifié`); }
    else { SERVICES.push({ id: uid("s"), ...data }); showToast(`Service « ${name} » ajouté`); }
    CF_DRAFT = []; CF_SERVICE_ID = null;
    closeModal(); renderServicesContainer();
  }

  /* =========================================================
     PAGE : DISPONIBILITÉS
     ========================================================= */
  window.renderDispoPage = function renderDispoPage() {
    const days = Object.keys(AVAILABILITY);
    document.getElementById("page-dispo").innerHTML = `
      <div class="card" style="padding:20px;margin-bottom:18px;">
        <div class="card-head" style="padding:0 0 14px;border:none;"><h3>Jours et horaires disponibles</h3></div>
        ${days.map((d) => {
          const info = AVAILABILITY[d];
          return `<div style="display:flex;align-items:center;gap:16px;padding:12px 0;border-top:1px solid var(--line);">
            <label style="display:flex;align-items:center;gap:8px;width:130px;font-size:13px;font-weight:700;">
              <input type="checkbox" ${info.on?'checked':''} onchange="toggleDayOn('${d}', this.checked)" /> ${d}
            </label>
            <div style="flex:1;font-size:12.5px;color:var(--ink-soft);">
              ${info.on ? (info.ranges.map((r,i) => `<span style="margin-right:14px;">${r.start} – ${r.end}</span>`).join("") || "Aucun horaire défini") : "Fermé"}
            </div>
            ${info.on ? `<button class="btn btn-ghost btn-sm" onclick="editDayRanges('${d}')">${iconEdit()} Modifier</button>` : ""}
          </div>`;
        }).join("")}
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        <button class="accordion-toggle" onclick="toggleIndispoAccordion()">
          <h3 style="margin:0;font-size:14.5px;">Indisponibilités</h3>
          <span class="accordion-chevron ${state.dispoIndispoOpen?'open':''}">${iconChevronRight()}</span>
        </button>
        <div class="accordion-body" style="display:${state.dispoIndispoOpen?'block':'none'};padding:0 20px 20px;">
          <button class="btn btn-primary btn-sm" style="margin-bottom:14px;" onclick="openIndispoForm()">${iconPlus()} Fermer une période</button>
          <table class="data-table"><thead><tr><th>Type</th><th>Du</th><th>Au</th><th>Motif</th><th>Clients notifiés</th><th></th></tr></thead>
          <tbody>${INDISPOS.length ? INDISPOS.map((i) => `<tr><td style="text-transform:capitalize">${i.type}</td><td>${fmtDateShort(i.start)}</td><td>${fmtDateShort(i.end)}</td><td>${i.motif}</td><td>${i.notified?`<span class="status-pill st-termine">Oui</span>`:`<button class="btn btn-ghost btn-sm" onclick="notifyClientsIndispo('${i.id}')">Notifier</button>`}</td><td><button class="icon-btn" onclick="removeIndispo('${i.id}')">${iconTrash()}</button></td></tr>`).join("") : `<tr><td colspan="6"><div class="table-empty">Aucune indisponibilité programmée</div></td></tr>`}</tbody></table>
        </div>
      </div>
    `;
  }
  window.toggleIndispoAccordion = function toggleIndispoAccordion() { state.dispoIndispoOpen = !state.dispoIndispoOpen; renderDispoPage(); }
  window.toggleDayOn = function toggleDayOn(day, checked) { AVAILABILITY[day].on = checked; renderDispoPage(); showToast(`${day} ${checked?'ouvert':'fermé'}`); }
  window.editDayRanges = function editDayRanges(day) {
    const info = AVAILABILITY[day];
    const html = `
      <div class="modal-head"><div><p class="modal-title">Horaires — ${day}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div id="rangesList">${info.ranges.map((r,i) => rangeRowHtml(r,i)).join("") || `<div class="field-hint" id="noRangeHint">Aucun horaire — ajoutez une plage.</div>`}</div>
      <button class="btn btn-ghost btn-sm" style="margin-top:8px;" onclick="addRangeRow('${day}')">${iconPlus()} Ajouter une plage</button>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveDayRanges('${day}')">${iconCheck()} Enregistrer</button></div>
    `;
    openModal(html);
  }
  window.rangeRowHtml = function rangeRowHtml(r,i) { return `<div class="field-2col" data-idx="${i}" style="margin-bottom:8px;"><div class="field-row" style="margin-bottom:0"><input type="time" value="${r.start}" class="rangeStart" /></div><div class="field-row" style="margin-bottom:0"><input type="time" value="${r.end}" class="rangeEnd" /></div></div>`; }
  window.addRangeRow = function addRangeRow(day) {
    const hint = document.getElementById("noRangeHint"); if (hint) hint.remove();
    document.getElementById("rangesList").insertAdjacentHTML("beforeend", rangeRowHtml({start:"09:00",end:"12:00"}, 99));
  }
  window.saveDayRanges = function saveDayRanges(day) {
    const rows = document.querySelectorAll("#rangesList > div");
    const ranges = Array.from(rows).map((r) => ({ start: r.querySelector(".rangeStart").value, end: r.querySelector(".rangeEnd").value }));
    AVAILABILITY[day].ranges = ranges;
    closeModal(); renderDispoPage();
    showToast(`Horaires du ${day} mis à jour`);
  }
  window.openIndispoForm = function openIndispoForm() {
    const html = `
      <div class="modal-head"><div><p class="modal-title">Fermer une période</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-row"><label>Type</label><select id="inType"><option value="creneau">Un créneau</option><option value="jour">Une journée</option><option value="periode" selected>Une période</option></select></div>
      <div class="field-2col"><div class="field-row"><label>Du</label><input type="date" id="inStart" value="${TODAY}" /></div><div class="field-row"><label>Au</label><input type="date" id="inEnd" value="${TODAY}" /></div></div>
      <div class="field-row"><label>Motif</label><select id="inMotif"><option>Congé</option><option>Absence</option><option>Réunion</option><option>Fermeture exceptionnelle</option><option>Indisponibilité personnelle</option><option>Autre</option></select></div>
      <div class="field-hint">Les rendez-vous déjà réservés sur cette période seront automatiquement annulés.</div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveIndispo()">${iconCheck()} Fermer la période</button></div>
    `;
    openModal(html);
  }
  window.saveIndispo = function saveIndispo() {
    const type = document.getElementById("inType").value;
    const start = document.getElementById("inStart").value;
    const end = document.getElementById("inEnd").value;
    const motif = document.getElementById("inMotif").value;
    const affected = APPTS.filter((a) => a.date >= start && a.date <= end && a.status === "reserve");
    affected.forEach((a) => { a.status = "annule"; a.remark = "Annulé — " + motif; });
    INDISPOS.push({ id: uid("i"), type, start, end, motif, notified: false });
    state.dispoIndispoOpen = true;
    closeModal(); renderDispoPage();
    showToast(`Période fermée${affected.length ? ` — ${affected.length} rendez-vous annulé(s)` : ""}`);
    if (affected.length) addNotif("agenda", `${affected.length} rendez-vous annulés suite à une fermeture (${motif})`);
  }
  window.notifyClientsIndispo = function notifyClientsIndispo(id) {
    const i = INDISPOS.find((x) => x.id===id); if (!i) return;
    i.notified = true; renderDispoPage();
    showToast("E-mail envoyé aux clients concernés");
  }
  window.removeIndispo = function removeIndispo(id) { INDISPOS = INDISPOS.filter((x) => x.id !== id); renderDispoPage(); }

  /* =========================================================
     PAGE : RÉCEPTIONNISTES
     ========================================================= */
  window.renderReceptionnistesPage = function renderReceptionnistesPage() {
    document.getElementById("page-receptionnistes").innerHTML = `
      <div class="filter-row">
        <input type="text" placeholder="Rechercher une réceptionniste…" oninput="updateReceptionnistesFilter('search', this.value)" style="min-width:220px" />
        <select onchange="updateReceptionnistesFilter('status', this.value)">
          <option value="">Tous les statuts</option>
          <option value="active">Active</option>
          <option value="inactive">Désactivée</option>
        </select>
        <div class="view-toggle" id="receptionnistesViewToggle" style="margin-left:auto">
          <button class="${state.receptionnistesView==='list'?'active':''}" onclick="setReceptionnistesView('list')" title="Vue liste">${iconList()}</button>
          <button class="${state.receptionnistesView==='grid'?'active':''}" onclick="setReceptionnistesView('grid')" title="Vue grille">${iconGrid()}</button>
        </div>
      </div>
      <div id="receptionnistesContainer"></div>
      <div class="field-hint" style="margin-top:10px;">L'affectation d'une réceptionniste à votre compte est effectuée par l'Admin général ; vous gérez ici son activation et ses autorisations.</div>
    `;
    renderReceptionnistesContainer();
  }
  window.updateReceptionnistesFilter = function updateReceptionnistesFilter(key, val) { state.receptionnistesFilters[key] = val; renderReceptionnistesContainer(); }
  window.setReceptionnistesView = function setReceptionnistesView(v) {
    state.receptionnistesView = v;
    const toggle = document.getElementById("receptionnistesViewToggle");
    if (toggle) toggle.querySelectorAll("button").forEach((b,i) => b.classList.toggle("active", (i===0 && v==="list") || (i===1 && v==="grid")));
    renderReceptionnistesContainer();
  }
  window.filteredReceptionnistes = function filteredReceptionnistes() {
    const f = state.receptionnistesFilters;
    return RECEPTIONNISTES.filter((r) => (!f.search || r.name.toLowerCase().includes(f.search.toLowerCase())) && (!f.status || (f.status==='active')===r.active));
  }
  window.renderReceptionnistesContainer = function renderReceptionnistesContainer() {
    const wrap = document.getElementById("receptionnistesContainer");
    if (!wrap) return;
    const list = filteredReceptionnistes();
    if (state.receptionnistesView === "grid") {
      wrap.innerHTML = `<div class="stat-grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${list.length ? list.map((r) => `
        <div class="card" style="padding:16px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;"><div class="avatar-sm" style="width:40px;height:40px;font-size:14px;background:#E2478A">${initials(r.name)}</div><div><div style="font-weight:700;font-size:13.5px;">${r.name}</div><span class="status-pill ${r.active?'st-termine':'st-absent'}">${r.active?'Active':'Désactivée'}</span></div></div>
          <div style="font-size:12px;color:var(--ink-soft);margin-bottom:3px;">${r.email}</div>
          <div style="font-size:12px;color:var(--ink-soft);margin-bottom:10px;">${r.phone}</div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm" style="flex:1;justify-content:center;" onclick="openPermsForm('${r.id}')">${iconEdit()} Autorisations</button>
            <button class="icon-btn" title="${r.active?'Désactiver':'Activer'}" onclick="toggleReceptionniste('${r.id}')">${r.active?iconX():iconCheck()}</button>
          </div>
        </div>`).join("") : `<div class="table-empty">Aucune réceptionniste ne correspond à ces filtres</div>`}</div>`;
    } else {
      wrap.innerHTML = `<div class="card"><table class="data-table">
        <thead><tr><th>Réceptionniste</th><th>E-mail</th><th>Téléphone</th><th>Statut</th><th>Autorisations</th><th></th></tr></thead>
        <tbody>${list.length ? list.map((r) => `<tr>
          <td><div class="cell-client"><div class="avatar-sm" style="background:#E2478A">${initials(r.name)}</div><div class="cell-client-name">${r.name}</div></div></td>
          <td>${r.email}</td><td>${r.phone}</td>
          <td><span class="status-pill ${r.active?'st-termine':'st-absent'}">${r.active?'Active':'Désactivée'}</span></td>
          <td style="font-size:11px;color:var(--ink-soft);">${Object.entries(r.perms).filter(([,v])=>v).map(([k])=>permLabel(k)).join(", ") || "Aucune"}</td>
          <td><div class="row-actions">
            <button class="btn btn-ghost btn-sm" onclick="openPermsForm('${r.id}')">${iconEdit()} Autorisations</button>
            <button class="icon-btn" title="${r.active?'Désactiver':'Activer'}" onclick="toggleReceptionniste('${r.id}')">${r.active?iconX():iconCheck()}</button>
          </div></td>
        </tr>`).join("") : `<tr><td colspan="6"><div class="table-empty">Aucune réceptionniste ne correspond à ces filtres</div></td></tr>`}</tbody>
      </table></div>`;
    }
  }
  window.permLabel = function permLabel(k) { return { agenda: "Consulter l'agenda", gererRdv: "Gérer les rendez-vous", gererPlanning: "Gérer le planning détaillé", gererParametres: "Gérer les paramètres" }[k] || k; }
  window.toggleReceptionniste = function toggleReceptionniste(id) {
    const r = RECEPTIONNISTES.find((x) => x.id===id); if (!r) return;
    r.active = !r.active; renderReceptionnistesContainer();
    showToast(`${r.name} ${r.active?'activée':'désactivée'}`);
  }
  window.openPermsForm = function openPermsForm(id) {
    const r = RECEPTIONNISTES.find((x) => x.id===id); if (!r) return;
    const perms = ["agenda","gererRdv","gererPlanning","gererParametres"];
    const html = `
      <div class="modal-head"><div><p class="modal-title">Autorisations — ${r.name}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      ${perms.map((k) => `<label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);font-size:13px;"><input type="checkbox" id="perm_${k}" ${r.perms[k]?'checked':''} /> ${permLabel(k)}</label>`).join("")}
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="savePerms('${id}')">${iconCheck()} Enregistrer</button></div>
    `;
    openModal(html);
  }
  window.savePerms = function savePerms(id) {
    const r = RECEPTIONNISTES.find((x) => x.id===id); if (!r) return;
    ["agenda","gererRdv","gererPlanning","gererParametres"].forEach((k) => r.perms[k] = document.getElementById("perm_"+k).checked);
    closeModal(); renderReceptionnistesContainer();
    showToast("Autorisations mises à jour");
    addNotif("perms", `Autorisations mises à jour pour <b>${r.name}</b>`);
  }

  /* =========================================================
     PAGE : STATISTIQUES
     ========================================================= */
  window.renderStatsPage = function renderStatsPage() {
    const total = APPTS.length, termines = APPTS.filter(a=>a.status==="termine").length, annules = APPTS.filter(a=>a.status==="annule").length;
    const clients = uniqueClients();
    const serviceCounts = {};
    APPTS.forEach((a) => { if (a.status !== "annule") serviceCounts[a.service] = (serviceCounts[a.service]||0)+1; });
    const topServices = Object.entries(serviceCounts).sort((a,b) => b[1]-a[1]);
    const maxCount = topServices.length ? topServices[0][1] : 1;
    document.getElementById("page-stats").innerHTML = `
      <div class="filter-row">
        <select style="border:1px solid var(--line);border-radius:9px;padding:8px 12px;font-size:12.5px;"><option>Cette semaine</option><option>Ce mois</option><option selected>Toutes périodes</option><option>Période personnalisée</option></select>
      </div>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Rendez-vous</div></div>
        <div class="stat-card"><div class="stat-value">${termines}</div><div class="stat-label">Terminés</div></div>
        <div class="stat-card"><div class="stat-value">${annules}</div><div class="stat-label">Annulés</div></div>
        <div class="stat-card"><div class="stat-value">${clients.length}</div><div class="stat-label">Clients total</div></div>
        <div class="stat-card"><div class="stat-value">${Math.round((termines/(total||1))*100)}%</div><div class="stat-label">Taux d'occupation</div></div>
      </div>
      <div class="card" style="padding:20px;">
        <h3 style="margin:0 0 16px;font-size:14.5px;">Services les plus réservés</h3>
        ${topServices.map(([name,count]) => `<div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;"><span>${name}</span><b>${count}</b></div>
          <div style="background:var(--paper);border-radius:999px;height:8px;overflow:hidden;"><div style="width:${(count/maxCount)*100}%;background:var(--primary);height:100%;"></div></div>
        </div>`).join("") || `<div class="table-empty">Pas encore de données</div>`}
      </div>
    `;
  }

  /* =========================================================
     PAGE : ASSISTANT IA (chat mock, basé sur les données réelles)
     ========================================================= */
  let CHAT = [{ role: "bot", text: "Bonjour Dr. Benali. Je peux résumer votre agenda, retrouver un client ou un rendez-vous, ou faire le point sur votre activité. Que souhaitez-vous savoir ?" }];
  window.renderAssistantPage = function renderAssistantPage() {
    document.getElementById("page-assistant").innerHTML = `
      <div class="card" style="display:flex;flex-direction:column;height:520px;">
        <div id="chatLog" style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:14px;"></div>
        <div style="border-top:1px solid var(--line);padding:14px 16px;display:flex;gap:10px;">
          <input type="text" id="chatInput" placeholder="Ex. « Combien de rendez-vous aujourd'hui ? »" style="flex:1;border:1px solid var(--line);border-radius:10px;padding:10px 14px;font-size:13px;" onkeydown="if(event.key==='Enter')sendChat()" />
          <button class="btn btn-primary" onclick="sendChat()">${iconSend()}</button>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
        ${["Rendez-vous aujourd'hui","Mes prochains rendez-vous","Services les plus réservés","Clients à absences répétées"].map((q) => `<button class="btn btn-ghost btn-sm" onclick="quickChat('${q}')">${q}</button>`).join("")}
      </div>
    `;
    renderChatLog();
  }
  window.renderChatLog = function renderChatLog() {
    const log = document.getElementById("chatLog");
    if (!log) return;
    log.innerHTML = CHAT.map((m) => `
      <div style="display:flex;gap:10px;${m.role==='user'?'flex-direction:row-reverse;':''}">
        <div class="avatar-sm" style="background:${m.role==='bot'?'var(--primary)':'#E2954A'};flex-shrink:0;">${m.role==='bot'?iconBot():initials(ME.name)}</div>
        <div style="background:${m.role==='bot'?'var(--paper)':'var(--primary-tint)'};border-radius:12px;padding:10px 14px;font-size:12.5px;line-height:1.5;max-width:75%;">${m.text}</div>
      </div>`).join("");
    log.scrollTop = 999999;
  }
  window.quickChat = function quickChat(q) { const el = document.getElementById("chatInput"); if (el) el.value = q; sendChat(); }
  window.sendChat = function sendChat() {
    const input = document.getElementById("chatInput");
    if (!input) return;
    const q = input.value.trim(); if (!q) return;
    CHAT.push({ role: "user", text: q }); input.value = "";
    CHAT.push({ role: "bot", text: answerAssistant(q) });
    renderChatLog();
  }
  window.answerAssistant = function answerAssistant(q) {
    const ql = q.toLowerCase();
    if (ql.includes("aujourd")) {
      const t = APPTS.filter((a) => a.date===TODAY && a.status!=="annule");
      return t.length ? `Vous avez <b>${t.length}</b> rendez-vous aujourd'hui : ${t.map(a=>`${a.start} ${a.client}`).join(", ")}.` : "Aucun rendez-vous prévu aujourd'hui.";
    }
    if (ql.includes("prochain")) {
      const up = APPTS.filter((a) => a.date>TODAY && a.status==="reserve").sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)).slice(0,5);
      return up.length ? `Vos prochains rendez-vous : ` + up.map(a=>`${fmtDateShort(a.date)} à ${a.start} — ${a.client}`).join(" · ") : "Aucun rendez-vous à venir programmé.";
    }
    if (ql.includes("service")) {
      const counts = {}; APPTS.forEach((a) => { if (a.status!=="annule") counts[a.service]=(counts[a.service]||0)+1; });
      const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
      return top.length ? `Le service le plus réservé est « <b>${top[0][0]}</b> » avec ${top[0][1]} rendez-vous.` : "Pas encore assez de données sur vos services.";
    }
    if (ql.includes("absen")) {
      return "La détection des absences répétées est disponible dans l'espace Réceptionniste ; aucun de vos clients n'a encore atteint le seuil configuré.";
    }
    if (ql.includes("client")) {
      return `Vous suivez actuellement <b>${uniqueClients().length}</b> clients.`;
    }
    if (ql.includes("annul")) {
      const c = APPTS.filter((a) => a.status==="annule").length;
      return `${c} rendez-vous ont été annulés au total.`;
    }
    return "Je peux vous renseigner sur vos rendez-vous, vos clients, vos services ou votre activité récente — pouvez-vous préciser votre question ?";
  }

  /* =========================================================
     PAGE : NOTIFICATIONS
     ========================================================= */
  window.notifRowHtml = function notifRowHtml(n) {
    const ic = NOTIF_ICONS[n.type];
    return `<div class="notif-row ${n.unread?'unread':''}"><div class="notif-icon" style="background:${ic.bg};color:${ic.color}">${svg(ic.svg,16)}</div><div class="notif-text"><span>${n.text}</span><div class="notif-time">${n.time}</div></div>${n.unread?`<span class="notif-dot-unread"></span>`:""}</div>`;
  }
  window.renderNotifsPage = function renderNotifsPage() {
    document.getElementById("page-notifs").innerHTML = `
      <div class="card">${NOTIFS.map((n) => notifRowHtml(n)).join("")}</div>
    `;
  }
  window.markAllRead = function markAllRead() { NOTIFS.forEach((n) => n.unread=false); renderNotifsPage(); updateNotifBadges(); }
  window.addNotif = function addNotif(type, text) { NOTIFS.unshift({ id: Date.now(), type, text, time: "À l'instant", unread: true }); updateNotifBadges(); }

  /* =========================================================
     PAGE : PROFIL
     ========================================================= */
  window.renderProfilPage = function renderProfilPage() {
    document.getElementById("page-profil").innerHTML = `
      <div class="card" style="padding:22px;max-width:560px;">
        <div class="field-row"><label>Nom du professionnel / bureau</label><input type="text" id="prName" value="${PROFILE.name}" /></div>
        <div class="field-row"><label>Description</label><textarea id="prDesc" rows="3">${PROFILE.desc}</textarea></div>
        <div class="field-row"><label>Adresse</label><input type="text" id="prAddress" value="${PROFILE.address}" /></div>
        <div class="field-2col">
          <div class="field-row"><label>Téléphone</label><input type="text" id="prPhone" value="${PROFILE.phone}" /></div>
          <div class="field-row"><label>E-mail</label><input type="email" id="prEmail" value="${PROFILE.email}" /></div>
        </div>
        <div class="field-row"><label>Photo du bureau</label><div style="border:1.5px dashed var(--line);border-radius:10px;padding:20px;text-align:center;font-size:12px;color:var(--ink-soft);">Glissez une image ou cliquez pour téléverser</div></div>
        <button class="btn btn-primary" onclick="saveProfile()">${iconCheck()} Enregistrer les modifications</button>
      </div>
    `;
  }
  window.saveProfile = function saveProfile() {
    PROFILE = { name: document.getElementById("prName").value, desc: document.getElementById("prDesc").value, address: document.getElementById("prAddress").value, phone: document.getElementById("prPhone").value, email: document.getElementById("prEmail").value };
    showToast("Profil mis à jour");
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
    root.innerHTML = `<div class="modal-overlay" id="activeOverlay"><div class="modal-box ${wide?'wide':''}">${innerHtml}</div></div>`;
    const ov = document.getElementById("activeOverlay");
    requestAnimationFrame(() => ov.classList.add("open"));
    ov.addEventListener("click", (e) => { if (e.target === ov) closeModal(); });
  }

  /* ---- Nouveau rendez-vous (créé directement par le Pro depuis l'agenda) ---- */
  window.openNewRdv = function openNewRdv(prefill) {
    prefill = prefill || {};
    const html = `
      <div class="modal-head"><div><p class="modal-title">Nouveau rendez-vous</p><p class="modal-sub">Sélectionnez la date, le créneau et le client</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="detect-banner" id="detectBanner"></div>
      <div class="field-2col">
        <div class="field-row"><label>Nom du client</label><input type="text" id="nrName" oninput="detectClient()" placeholder="Karim Yacine" /></div>
        <div class="field-row"><label>Téléphone</label><input type="tel" id="nrTel" oninput="detectClient()" placeholder="0555 00 00 00" /></div>
      </div>
      <div class="field-row"><label>Service</label><select id="nrService">${SERVICES.filter(s=>s.status==='active').map((s) => `<option value="${s.name}">${s.name} — ${s.duration} min</option>`).join("")}</select></div>
      <div class="field-2col">
        <div class="field-row"><label>Date</label><input type="date" id="nrDate" value="${prefill.date || state.agendaDate}" /></div>
        <div class="field-row"><label>Créneau</label><input type="time" id="nrTime" value="${prefill.start || '09:00'}" /></div>
      </div>
      <div class="field-error" id="nrError">Merci de renseigner le nom, le téléphone et le créneau.</div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitNewRdv()">${iconCheck()} Confirmer le rendez-vous</button></div>
    `;
    openModal(html);
  }
  window.detectClient = function detectClient() {
    const name = document.getElementById("nrName").value.trim();
    const tel = document.getElementById("nrTel").value.trim();
    const banner = document.getElementById("detectBanner");
    const existing = uniqueClients().find((c) => (tel.length>=6 && c.phone.replace(/\s/g,"")===tel.replace(/\s/g,"")) || (name && c.name.toLowerCase()===name.toLowerCase()));
    if (existing) { banner.innerHTML = `${iconCheck()} Client existant : <b>${existing.name}</b> (${existing.appts.length} rendez-vous précédents)`; banner.classList.add("show"); }
    else banner.classList.remove("show");
  }
  window.submitNewRdv = function submitNewRdv() {
    const client = document.getElementById("nrName").value.trim();
    const phone = document.getElementById("nrTel").value.trim();
    const service = document.getElementById("nrService").value;
    const date = document.getElementById("nrDate").value;
    const start = document.getElementById("nrTime").value;
    if (!client || !phone || !start) { document.getElementById("nrError").classList.add("show"); return; }
    const svc = SERVICES.find((s) => s.name===service);
    const [sh,sm] = start.split(":").map(Number);
    const endTotal = sh*60+sm+(svc?svc.duration:30);
    const end = String(Math.floor(endTotal/60)).padStart(2,"0")+":"+String(endTotal%60).padStart(2,"0");
    const existing = uniqueClients().find((c) => c.name.toLowerCase()===client.toLowerCase());
    APPTS.push({ id: uid("a"), client, phone, dob: existing?existing.dob:"1990-01-01", email: existing?existing.email:client.toLowerCase().replace(/\s/g,".")+"@mail.com", service, date, start, end, status: "reserve", remark: "", createdAt: TODAY, source: "professionnel" });
    closeModal();
    showToast(`Rendez-vous créé pour <b>${client}</b> le ${fmtDateShort(date)} à ${start}`);
    renderPage(state.page);
  }

  /* ---- Consulter / annuler un rendez-vous ---- */
  window.openRdvDetail = function openRdvDetail(id) {
    const a = APPTS.find((x) => x.id===id); if (!a) return;
    const html = `
      <div class="modal-head"><div><p class="modal-title">${a.client}</p><p class="modal-sub">${a.service}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="detail-grid">
        <div><div class="detail-item-label">Téléphone</div><div class="detail-item-value">${a.phone}</div></div>
        <div><div class="detail-item-label">E-mail</div><div class="detail-item-value">${a.email}</div></div>
        <div><div class="detail-item-label">Date</div><div class="detail-item-value">${fmtDateShort(a.date)}</div></div>
        <div><div class="detail-item-label">Heure</div><div class="detail-item-value">${a.start} – ${a.end}</div></div>
        <div><div class="detail-item-label">Origine</div><div class="detail-item-value" style="text-transform:capitalize">${a.source}</div></div>
        <div><div class="detail-item-label">Statut</div><div class="detail-item-value"><span class="status-pill ${STATUS[a.status].cls}">${STATUS[a.status].label}</span></div></div>
      </div>
      ${a.remark ? `<div class="field-row"><label>Remarque</label><div style="font-size:12.5px;color:var(--ink-soft)">${a.remark}</div></div>` : ""}
      <div class="modal-actions" style="justify-content:space-between;">
        <div style="display:flex;gap:8px;">
          ${a.status==="reserve" ? `<button class="btn btn-ghost btn-sm" onclick="markTermine('${a.id}')">${iconCheck()} Marquer terminé</button>` : ""}
        </div>
        ${a.status==="reserve" ? `<button class="btn btn-danger-ghost btn-sm" onclick="openCancelForm('${a.id}')">${iconX()} Annuler</button>` : ""}
      </div>
    `;
    openModal(html);
  }
  window.markTermine = function markTermine(id) { const a = APPTS.find((x) => x.id===id); if (!a) return; a.status="termine"; closeModal(); showToast("Rendez-vous marqué comme terminé"); renderPage(state.page); }
  window.openCancelForm = function openCancelForm(id) {
    const a = APPTS.find((x) => x.id===id); if (!a) return;
    const html = `
      <div class="modal-head"><div><p class="modal-title">Annuler le rendez-vous</p><p class="modal-sub">${a.client}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-row"><label>Motif (obligatoire)</label><select id="cancelMotif"><option>Indisponibilité exceptionnelle</option><option>Fermeture du bureau</option><option>Problème professionnel</option><option>Modification du planning</option><option>Erreur de réservation</option><option>Autre motif</option></select></div>
      <div class="field-hint">Le client sera informé de l'annulation par e-mail, avec le motif.</div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="openRdvDetail('${a.id}')">Retour</button><button class="btn btn-danger-ghost" onclick="confirmCancel('${a.id}')">${iconCheck()} Confirmer l'annulation</button></div>
    `;
    openModal(html);
  }
  window.confirmCancel = function confirmCancel(id) {
    const a = APPTS.find((x) => x.id===id); if (!a) return;
    a.status = "annule"; a.remark = document.getElementById("cancelMotif").value;
    closeModal(); showToast(`Rendez-vous annulé — motif : ${a.remark}`);
    addNotif("cancel", `Rendez-vous de <b>${a.client}</b> annulé (${a.remark})`);
    renderPage(state.page);
  }

  /* =========================================================
     GLOBAL SEARCH + INIT
     ========================================================= */
  document.getElementById("globalSearch")?.addEventListener("input", function() {
    const q = this.value.trim(); if (q.length<2) return;
    goToPage("clients"); setTimeout(() => { state.clientsFilters.search = q; renderClientsContainer(); }, 0);
  }, { signal: ac.signal });
  renderPage("dashboard");

    // ---- end ported script ----

    return () => {
      ac.abort();

      delete (window as any).todayISO;
      delete (window as any).isoPlusDays;
      delete (window as any).uid;
      delete (window as any).fmtDateLong;
      delete (window as any).fmtDateShort;
      delete (window as any).capitalize;
      delete (window as any).calcAge;
      delete (window as any).initials;
      delete (window as any).showToast;
      delete (window as any).goToPage;
      delete (window as any).renderPage;
      delete (window as any).updateNotifBadges;
      delete (window as any).svg;
      delete (window as any).iconPlus;
      delete (window as any).iconCal;
      delete (window as any).iconCheck;
      delete (window as any).iconCheckCircle;
      delete (window as any).iconClock;
      delete (window as any).iconX;
      delete (window as any).iconUsers;
      delete (window as any).iconChevronLeft;
      delete (window as any).iconChevronRight;
      delete (window as any).iconPrinter;
      delete (window as any).iconEdit;
      delete (window as any).iconEye;
      delete (window as any).iconTrash;
      delete (window as any).iconAlert;
      delete (window as any).iconSend;
      delete (window as any).iconBot;
      delete (window as any).iconGrid;
      delete (window as any).iconList;
      delete (window as any).renderPageHead;
      delete (window as any).renderDashboard;
      delete (window as any).renderAgenda;
      delete (window as any).agendaDateLabel;
      delete (window as any).weekStart;
      delete (window as any).agendaShift;
      delete (window as any).agendaToday;
      delete (window as any).setAgendaView;
      delete (window as any).renderAgendaMain;
      delete (window as any).dayViewHtml;
      delete (window as any).placeDayAppts;
      delete (window as any).handleDayColClick;
      delete (window as any).weekViewHtml;
      delete (window as any).monthViewHtml;
      delete (window as any).jumpToDay;
      delete (window as any).miniCalHtml;
      delete (window as any).miniCalShift;
      delete (window as any).renderRdvPage;
      delete (window as any).updateRdvFilter;
      delete (window as any).renderRdvTable;
      delete (window as any).uniqueClients;
      delete (window as any).renderClientsPage;
      delete (window as any).updateClientsFilter;
      delete (window as any).setClientsView;
      delete (window as any).filteredClients;
      delete (window as any).renderClientsContainer;
      delete (window as any).renderClientsTable;
      delete (window as any).renderClientsGrid;
      delete (window as any).openClientFiche;
      delete (window as any).rdvMiniRow;
      delete (window as any).switchClientTab;
      delete (window as any).noteRowHtml;
      delete (window as any).addClientNote;
      delete (window as any).deleteClientNote;
      delete (window as any).renderServicesPage;
      delete (window as any).updateServicesFilter;
      delete (window as any).setServicesView;
      delete (window as any).filteredServices;
      delete (window as any).renderServicesContainer;
      delete (window as any).renderServicesGrid;
      delete (window as any).renderServicesListBody;
      delete (window as any).toggleServiceStatus;
      delete (window as any).deleteService;
      delete (window as any).openServiceForm;
      delete (window as any).switchServiceTab;
      delete (window as any).cfFieldLabel;
      delete (window as any).cfTypeLabel;
      delete (window as any).renderCFList;
      delete (window as any).deleteCFField;
      delete (window as any).returnToServiceForm;
      delete (window as any).openFieldEditor;
      delete (window as any).renderFieldEditorModal;
      delete (window as any).onCFTypeChange;
      delete (window as any).updateCFDraft;
      delete (window as any).cfConditionRowHtml;
      delete (window as any).addCFCondition;
      delete (window as any).removeCFCondition;
      delete (window as any).updateCFCondition;
      delete (window as any).saveCFField;
      delete (window as any).saveService;
      delete (window as any).renderDispoPage;
      delete (window as any).toggleIndispoAccordion;
      delete (window as any).toggleDayOn;
      delete (window as any).editDayRanges;
      delete (window as any).rangeRowHtml;
      delete (window as any).addRangeRow;
      delete (window as any).saveDayRanges;
      delete (window as any).openIndispoForm;
      delete (window as any).saveIndispo;
      delete (window as any).notifyClientsIndispo;
      delete (window as any).removeIndispo;
      delete (window as any).renderReceptionnistesPage;
      delete (window as any).updateReceptionnistesFilter;
      delete (window as any).setReceptionnistesView;
      delete (window as any).filteredReceptionnistes;
      delete (window as any).renderReceptionnistesContainer;
      delete (window as any).permLabel;
      delete (window as any).toggleReceptionniste;
      delete (window as any).openPermsForm;
      delete (window as any).savePerms;
      delete (window as any).renderStatsPage;
      delete (window as any).renderAssistantPage;
      delete (window as any).renderChatLog;
      delete (window as any).quickChat;
      delete (window as any).sendChat;
      delete (window as any).answerAssistant;
      delete (window as any).notifRowHtml;
      delete (window as any).renderNotifsPage;
      delete (window as any).markAllRead;
      delete (window as any).addNotif;
      delete (window as any).renderProfilPage;
      delete (window as any).saveProfile;
      delete (window as any).closeModal;
      delete (window as any).openModal;
      delete (window as any).openNewRdv;
      delete (window as any).detectClient;
      delete (window as any).submitNewRdv;
      delete (window as any).openRdvDetail;
      delete (window as any).markTermine;
      delete (window as any).openCancelForm;
      delete (window as any).confirmCancel;
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
            <div className="tb-avatar" style={{background: 'linear-gradient(135deg,#8957FF,#6B3FD9)'}}>AB</div>
            <div className="tb-user-text">
              <div className="tb-user-name">Dr. Ahmed Benali</div>
              <div className="tb-user-role">Professionnel · Médecin généraliste</div>
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