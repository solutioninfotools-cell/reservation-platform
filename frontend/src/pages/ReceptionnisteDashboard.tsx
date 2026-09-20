// @ts-nocheck -- vue portée depuis un script JS existant, branchée sur l'API réelle (/api/receptionniste, /api/appointments)
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { receptionnisteApi } from '../api/receptionniste.api';
import { appointmentsApi } from '../api/professionnel.api';
import { notificationsApi } from '../api/notifications.api';
import { publicApi } from '../api/public.api';

export default function ReceptionnisteDashboard() {
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
     Le backend est la seule autorité : affectations, permissions,
     transitions de statut et disponibilité des créneaux sont
     vérifiées côté serveur.
     ========================================================= */
  const STATUS = {
    RESERVE:       { label: "Réservé",       cls: "st-reserve",  color: "#8957FF" },
    CLIENT_ARRIVE: { label: "Client arrivé", cls: "st-arrive",   color: "#2FA79D" },
    EN_COURS:      { label: "En cours",      cls: "st-encours",  color: "#E2954A" },
    TERMINE:       { label: "Terminé",       cls: "st-termine",  color: "#3FA65C" },
    ABSENT:        { label: "Absent",        cls: "st-absent",   color: "#8A8496" },
    ANNULE:        { label: "Annulé",        cls: "st-annule",   color: "#D9483C" },
  };
  // Miroir des transitions autorisées côté backend : on n'affiche que les
  // actions réellement acceptées (le serveur les revalide de toute façon).
  const TRANSITIONS = {
    RESERVE: ["CLIENT_ARRIVE", "EN_COURS", "TERMINE", "ABSENT", "ANNULE"],
    CLIENT_ARRIVE: ["EN_COURS", "TERMINE", "ANNULE"],
    EN_COURS: ["TERMINE", "ANNULE"],
    TERMINE: [], ABSENT: [], ANNULE: [],
  };
  const NOTIF_STYLE = {
    NOUVELLE_RESERVATION:    { bg: "#F1ECFF", color: "#8957FF", svg: '<path d="M12 5v14M5 12h14"/>' },
    ANNULATION:              { bg: "#FDEDEC", color: "#D9483C", svg: '<circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' },
    CONFLIT_PLANNING:        { bg: "#FDF1E2", color: "#E2954A", svg: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
    PROFESSIONNEL_ABSENT:    { bg: "#EEEDF2", color: "#8A8496", svg: '<circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>' },
    RAPPEL:                  { bg: "#E6F7F5", color: "#2FA79D", svg: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>' },
    MODIFICATION:            { bg: "#F1ECFF", color: "#8957FF", svg: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>' },
    CHANGEMENT_STATUT:       { bg: "#F1ECFF", color: "#8957FF", svg: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>' },
    AFFECTATION:             { bg: "#E6F7F5", color: "#2FA79D", svg: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>' },
    AUTORISATIONS_MODIFIEES: { bg: "#FDF1E2", color: "#E2954A", svg: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3"/>' },
    COMPTE_VALIDE:           { bg: "#E9F7ED", color: "#3FA65C", svg: '<polyline points="20 6 9 17 4 12"/>' },
    COMPTE_REFUSE:           { bg: "#FDEDEC", color: "#D9483C", svg: '<circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' },
  };
  const NOTIF_FALLBACK = { bg: "#EEEDF2", color: "#8A8496", svg: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' };
  const SEUIL_ABSENCES = 2;

  let PROS = [];      // professionnels auxquels cette réceptionniste est affectée
  let APPTS = [];     // rendez-vous de ces professionnels uniquement
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

  /* =========================================================
     ÉTAT UI
     ========================================================= */
  let state = {
    page: "dashboard",
    agendaView: "day",       // day | week | month
    agendaDate: TODAY,
    proFilter: "all",        // "all" ou id du pro
    monthCursor: TODAY.slice(0, 7),
    rdvFilters: { status: "", pro: "", search: "" },
    clientSearch: { nom: "", tel: "", email: "" },
    newRdv: { proId: "", serviceId: "", date: "", start: "", dateDebut: "", services: [], creneaux: [], clientTrouve: null },
  };

  /* =========================================================
     UTILITAIRES
     ========================================================= */
  // Les données saisies par les utilisateurs sont injectées via innerHTML : on échappe systématiquement.
  window.esc = function esc(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  // Argument transmis à un handler inline : échappement JS puis HTML.
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
  // Construit un instant à partir d'une date locale + heure locale.
  window.toIso = function toIso(dateIso, hm) {
    const [h, m] = hm.split(":").map(Number);
    const d = new Date(dateIso + "T00:00:00");
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }
  window.proById = function proById(id) {
    return PROS.find((p) => p.id === id) || { id, name: "—", role: "", color: "#8A8496", initials: "?", perms: {}, actif: false };
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
  const PALETTE = ["#8957FF", "#2FA79D", "#E2478A", "#E2954A", "#3FA65C", "#4A6CF7", "#8A8496"];
  window.colorFor = function colorFor(id) { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; }
  // Absences réellement enregistrées en base pour ce client (aucun compteur simulé).
  window.absentCount = function absentCount(clientId) {
    return APPTS.filter((a) => a.clientId === clientId && a.status === "ABSENT").length;
  }
  window.val = function val(id) { return (document.getElementById(id)?.value || "").trim(); }
  window.showToast = function showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.innerHTML = msg;
    t.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }
  window.showError = function showError(err) {
    const msg = err?.response?.data?.message || err?.message || "Une erreur est survenue.";
    showToast(esc(Array.isArray(msg) ? msg.join(", ") : msg));
  }
  // Permission accordée par le professionnel sur son espace (revérifiée côté serveur).
  window.peut = function peut(proId, perm) { const p = proById(proId); return !!(p.actif && p.perms?.[perm]); }
  window.peutGererUn = function peutGererUn() { return PROS.some((p) => p.actif && p.perms?.peutGererRdv); }

  /* =========================================================
     CHARGEMENT DES DONNÉES
     ========================================================= */
  const mapAppt = (r) => ({
    id: r.id,
    proId: r.professionnelId,
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
    createdAt: r.createdAt,
  });
  const mapNotif = (n) => ({ id: n.id, type: n.type, text: esc(n.message), time: fmtRelative(n.createdAt), unread: !n.lu });

  window.loadAll = async function loadAll() {
    try {
      const affectations = await receptionnisteApi.affectations();
      PROS = affectations.map((a) => ({
        id: a.professionnel.id,
        affectationId: a.id,
        name: a.professionnel.nom,
        role: a.professionnel.specialite || "—",
        color: colorFor(a.professionnel.id),
        initials: initials(a.professionnel.nom),
        actif: a.actif,
        perms: {
          peutConsulterAgenda: a.peutConsulterAgenda,
          peutGererRdv: a.peutGererRdv,
          peutGererPlanning: a.peutGererPlanning,
          peutGererParametres: a.peutGererParametres,
        },
      }));
      // On ne demande que les agendas réellement consultables : la liste est
      // bornée aux professionnels affectés, jamais à l'ensemble de la plateforme.
      const consultables = PROS.filter((p) => p.actif && p.perms.peutConsulterAgenda);
      const listes = await Promise.all(consultables.map((p) => appointmentsApi.list({ professionnelId: p.id })));
      APPTS = listes.flat().map(mapAppt);
      NOTIFS = (await notificationsApi.list()).map(mapNotif);
      return true;
    } catch (e) { showError(e); return false; }
  }
  window.refreshAll = async function refreshAll(silencieux) {
    const ok = await loadAll();
    renderPage(state.page);
    if (ok && !silencieux) showToast("Données actualisées");
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
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => goToPage(item.dataset.page), { signal: ac.signal });
  });
  document.getElementById("collapseBtn")?.addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("collapsed");
  }, { signal: ac.signal });
  document.getElementById("notifBellBtn")?.addEventListener("click", () => goToPage("notifs"), { signal: ac.signal });

  window.renderPage = function renderPage(page) {
    if (page === "dashboard") renderDashboard();
    else if (page === "agenda") renderAgenda();
    else if (page === "rdv") renderRdvPage();
    else if (page === "clients") renderClientsPage();
    else if (page === "pros") renderProsPage();
    else if (page === "notifs") renderNotifsPage();
    updateNotifBadges();
  }
  window.updateNotifBadges = function updateNotifBadges() {
    const n = NOTIFS.filter((x) => x.unread).length;
    const set = (id, display) => { const el = document.getElementById(id); if (!el) return; el.textContent = n; el.style.display = n ? display : "none"; };
    set("navNotifBadge", "inline-block");
    set("tbNotifDot", "flex");
  }

  /* =========================================================
     PAGE : TABLEAU DE BORD
     ========================================================= */
  window.renderDashboard = function renderDashboard() {
    const todays = APPTS.filter((a) => a.date === TODAY);
    const counts = {
      total: todays.length,
      arrive: todays.filter((a) => a.status === "CLIENT_ARRIVE").length,
      encours: todays.filter((a) => a.status === "EN_COURS").length,
      termine: todays.filter((a) => a.status === "TERMINE").length,
      annule: todays.filter((a) => a.status === "ANNULE").length,
      absent: todays.filter((a) => a.status === "ABSENT").length,
    };
    const next = todays
      .filter((a) => ["RESERVE", "CLIENT_ARRIVE"].includes(a.status) && a.start >= nowHM())
      .sort((a, b) => a.start.localeCompare(b.start))[0];

    const statCards = [
      { label: "Rendez-vous aujourd'hui", value: counts.total, icon: iconCal(), bg: "#F1ECFF", color: "#8957FF" },
      { label: "Clients arrivés", value: counts.arrive, icon: iconCheck(), bg: "#E6F7F5", color: "#2FA79D" },
      { label: "En cours", value: counts.encours, icon: iconClock(), bg: "#FDF1E2", color: "#E2954A" },
      { label: "Terminés", value: counts.termine, icon: iconCheckCircle(), bg: "#E9F7ED", color: "#3FA65C" },
      { label: "Annulés", value: counts.annule, icon: iconX(), bg: "#FDEDEC", color: "#D9483C" },
      { label: "Absents", value: counts.absent, icon: iconUserX(), bg: "#EEEDF2", color: "#8A8496" },
    ];
    const planning = todays.slice().sort((a, b) => a.start.localeCompare(b.start));

    document.getElementById("page-dashboard").innerHTML = `
      <div class="page-head">
        <div><h1 class="page-title">Tableau de bord</h1><p class="page-sub">Gérez les rendez-vous des professionnels auxquels vous êtes affectée</p></div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-ghost btn-sm" onclick="refreshAll()">${iconRefresh()} Actualiser</button>
          ${peutGererUn() ? `<button class="btn btn-primary" onclick="openNewRdv()">${iconPlus()} Nouveau rendez-vous</button>` : ""}
        </div>
      </div>
      ${PROS.length ? "" : `<div class="card" style="padding:18px 20px;margin-bottom:18px;font-size:12.5px;color:var(--ink-soft);">Aucun professionnel ne vous est affecté pour le moment. L'administrateur ou le professionnel doit vous affecter à un espace.</div>`}
      <div class="stat-grid">
        ${statCards.map((s) => `
          <div class="stat-card">
            <div class="stat-icon" style="background:${s.bg};color:${s.color}">${s.icon}</div>
            <div class="stat-value">${s.value}</div>
            <div class="stat-label">${s.label}</div>
          </div>`).join("")}
      </div>
      <div class="dash-grid">
        <div class="card">
          <div class="card-head"><h3>Planning du jour — ${fmtDateLong(TODAY)}</h3><button class="btn btn-ghost btn-sm" onclick="goToPage('agenda')">Voir l'agenda</button></div>
          ${planning.length ? planning.map((a) => `
            <div class="dash-list-row">
              <span class="dash-list-time">${esc(a.start)}</span>
              <div class="avatar-sm" style="background:${proById(a.proId).color}">${esc(proById(a.proId).initials)}</div>
              <div style="flex:1">
                <div class="dash-list-name">${esc(a.client)}</div>
                <div class="dash-list-sub">${esc(a.service)} · ${esc(proById(a.proId).name)}</div>
              </div>
              <span class="status-pill ${STATUS[a.status].cls}">${STATUS[a.status].label}</span>
            </div>`).join("") : `<div class="table-empty">Aucun rendez-vous aujourd'hui</div>`}
        </div>
        <div>
          ${next ? `
            <div class="next-rdv-card">
              <p class="next-rdv-eyebrow">Prochain rendez-vous</p>
              <p class="next-rdv-name">${esc(next.client)}</p>
              <div class="next-rdv-meta">${esc(next.service)} · ${esc(proById(next.proId).name)}</div>
              <div class="next-rdv-time">${esc(next.start)}</div>
            </div>` : `<div class="card" style="padding:20px;text-align:center;color:var(--ink-soft);font-size:13px;">Aucun rendez-vous à venir aujourd'hui</div>`}
          <div class="card">
            <div class="card-head"><h3>Notifications récentes</h3><button class="btn btn-ghost btn-sm" onclick="goToPage('notifs')">Tout voir</button></div>
            ${NOTIFS.length ? NOTIFS.slice(0, 3).map((n) => notifRowHtml(n)).join("") : `<div class="table-empty">Aucune notification</div>`}
          </div>
        </div>
      </div>
    `;
  }
  window.nowHM = function nowHM() {
    const d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  /* =========================================================
     PAGE : AGENDA
     Structure : colonnes par professionnel + rail latéral
     ========================================================= */
  const AG_START = 8 * 60;    // première heure affichée (08:00)
  const AG_END = 19 * 60;     // dernière ligne (18:00 → 19:00)
  const AG_SLOT = 30;         // une ligne = 30 min
  const AG_SLOT_H = 46;       // hauteur d'une ligne, en px
  const AG_GUTTER = 64;       // largeur de la colonne des heures, en px
  const AG_PX = AG_SLOT_H / AG_SLOT;
  const AG_HEIGHT = ((AG_END - AG_START) / AG_SLOT) * AG_SLOT_H;
  let nowTimer = null;

  window.hmToMin = function hmToMin(hm) { const [h, m] = hm.split(":").map(Number); return h * 60 + m; }
  window.minToHM = function minToHM(min) {
    min = Math.max(0, Math.round(min));
    return String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0");
  }
  window.agTop = function agTop(min) { return (min - AG_START) * AG_PX; }

  window.renderAgenda = function renderAgenda() {
    document.getElementById("page-agenda").innerHTML = `
      <div class="page-head">
        <div><h1 class="page-title">Agenda</h1><p class="page-sub">Gérez les rendez-vous des professionnels auxquels vous êtes affectée</p></div>
        ${peutGererUn() ? `<button class="btn btn-primary" onclick="openNewRdv()">${iconPlus()} Nouveau rendez-vous</button>` : ""}
      </div>

      <div class="agenda-toolbar">
        <div class="date-nav">
          <button onclick="agendaShift(-1)" title="Précédent">${iconChevronLeft()}</button>
          <button class="date-nav-today" onclick="agendaToday()">Aujourd'hui</button>
          <button onclick="agendaShift(1)" title="Suivant">${iconChevronRight()}</button>
        </div>
        <span class="agenda-date-label">${agendaDateLabel()}</span>
        <label class="date-picker" title="Choisir une date">
          ${iconCal()}
          <input type="date" value="${state.agendaDate}" onchange="jumpToDay(this.value)" />
        </label>
        <select class="ag-select" onchange="setAgendaView(this.value)">
          <option value="day" ${state.agendaView === "day" ? "selected" : ""}>Vue jour</option>
          <option value="week" ${state.agendaView === "week" ? "selected" : ""}>Vue semaine</option>
          <option value="month" ${state.agendaView === "month" ? "selected" : ""}>Vue mois</option>
        </select>
        <select class="ag-select" onchange="setProFilter(this.value)">
          <option value="all" ${state.proFilter === "all" ? "selected" : ""}>Tous les professionnels</option>
          ${PROS.map((p) => `<option value="${esc(p.id)}" ${state.proFilter === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}
        </select>
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="window.print()">${iconPrinter()} Imprimer</button>
      </div>

      <div class="agenda-body">
        <div class="agenda-main">
          <div id="agendaMain"></div>
          <div class="agenda-legend">
            ${Object.entries(STATUS).map(([, v]) => `<span class="legend-item"><span class="legend-dot" style="background:${v.color}"></span>${v.label}</span>`).join("")}
          </div>
        </div>
        <aside class="agenda-rail">
          ${miniCalHtml()}
          ${agendaStatusPanel()}
          ${agendaRemindersPanel()}
        </aside>
      </div>
    `;
    renderAgendaMain();
  }

  window.agendaDateLabel = function agendaDateLabel() {
    if (state.agendaView === "day") return capitalize(fmtDateLong(state.agendaDate));
    if (state.agendaView === "week") {
      const start = weekStart(state.agendaDate);
      return fmtDateShort(start) + " – " + fmtDateShort(isoPlusDays(start, 6));
    }
    const d = new Date(state.monthCursor + "-01T00:00:00");
    return capitalize(d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));
  }
  window.capitalize = function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  window.weekStart = function weekStart(iso) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lundi = 0
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  window.agendaShift = function agendaShift(dir) {
    if (state.agendaView === "day") state.agendaDate = isoPlusDays(state.agendaDate, dir);
    else if (state.agendaView === "week") state.agendaDate = isoPlusDays(state.agendaDate, dir * 7);
    else {
      const d = new Date(state.monthCursor + "-01T00:00:00");
      d.setMonth(d.getMonth() + dir);
      state.monthCursor = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 7);
      renderAgenda();
      return;
    }
    state.monthCursor = state.agendaDate.slice(0, 7);
    renderAgenda();
  }
  window.agendaToday = function agendaToday() { state.agendaDate = TODAY; state.monthCursor = TODAY.slice(0, 7); renderAgenda(); }
  window.setAgendaView = function setAgendaView(v) { state.agendaView = v; renderAgenda(); }
  window.setProFilter = function setProFilter(id) { state.proFilter = id; renderAgenda(); }

  window.visiblePros = function visiblePros() { return state.proFilter === "all" ? PROS : PROS.filter((p) => p.id === state.proFilter); }
  window.dayAppts = function dayAppts(proId) {
    return APPTS
      .filter((a) => a.date === state.agendaDate && a.proId === proId && a.status !== "ANNULE")
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  window.renderAgendaMain = function renderAgendaMain() {
    const el = document.getElementById("agendaMain");
    if (!el) return;
    clearInterval(nowTimer);
    if (state.agendaView === "day") {
      el.innerHTML = dayViewHtml();
      wireDayDnD();
      updateNowLine();
      nowTimer = setInterval(updateNowLine, 60000);
    } else if (state.agendaView === "week") {
      el.innerHTML = weekViewHtml();
    } else {
      el.innerHTML = monthViewHtml();
    }
  }

  /* ---------- Vue jour : une colonne par professionnel ---------- */
  window.dayViewHtml = function dayViewHtml() {
    const pros = visiblePros();
    if (!pros.length) return `<div class="card"><div class="table-empty">Aucun professionnel affecté à afficher</div></div>`;
    const cols = `${AG_GUTTER}px repeat(${pros.length}, minmax(0, 1fr))`;
    const hours = [];
    for (let m = AG_START; m < AG_END; m += 60) hours.push(m);

    const head = `
      <div class="day-grid-head" style="grid-template-columns:${cols}">
        <div class="day-head-corner"></div>
        ${pros.map((p) => `
          <div class="day-col-head" onclick="setProFilter('${escArg(state.proFilter === p.id ? "all" : p.id)}')" title="Filtrer sur ce professionnel">
            <div class="avatar-sm" style="background:${p.color}">${esc(p.initials)}</div>
            <div class="day-col-head-txt">
              <div class="day-col-head-name">${esc(p.name)}</div>
              <div class="day-col-head-role">${esc(p.role)}</div>
            </div>
            <span class="day-col-head-dot" style="background:${p.color}"></span>
          </div>`).join("")}
      </div>`;

    const gutter = `
      <div class="time-gutter" style="height:${AG_HEIGHT}px">
        ${hours.map((m) => `<span class="hour-label" style="top:${agTop(m)}px">${minToHM(m)}</span>`).join("")}
      </div>`;

    const columns = pros.map((p) => `
      <div class="day-col" data-pro="${esc(p.id)}" style="height:${AG_HEIGHT}px" onclick="handleDayColClick(event,'${escArg(p.id)}')">
        ${layoutLanes(dayAppts(p.id)).map((x) => apptBlockHtml(x.appt, x.lane, x.lanes)).join("")}
      </div>`).join("");

    const body = `
      <div class="day-grid-body" style="grid-template-columns:${cols}">
        ${gutter}
        ${columns}
        <div class="now-line" id="agendaNowLine" style="display:none;left:${AG_GUTTER}px"><span class="now-badge"></span></div>
      </div>`;

    // en-tête et corps dans le même conteneur scrollable : les colonnes restent alignées
    return `<div class="day-grid"><div class="day-grid-scroll">${head}${body}</div></div>`;
  }

  // Répartit les rendez-vous qui se chevauchent en couloirs côte à côte
  window.layoutLanes = function layoutLanes(appts) {
    const out = [];
    let cluster = [];
    let clusterEnd = -1;
    const flush = () => {
      if (!cluster.length) return;
      const laneEnds = [];
      const first = out.length;
      cluster.forEach((a) => {
        const s = hmToMin(a.start), e = hmToMin(a.end);
        let lane = laneEnds.findIndex((end) => end <= s);
        if (lane === -1) { lane = laneEnds.length; laneEnds.push(e); } else laneEnds[lane] = e;
        out.push({ appt: a, lane, lanes: 0 });
      });
      for (let i = first; i < out.length; i++) out[i].lanes = laneEnds.length;
      cluster = []; clusterEnd = -1;
    };
    appts.forEach((a) => {
      const s = hmToMin(a.start);
      if (cluster.length && s >= clusterEnd) flush();
      cluster.push(a);
      clusterEnd = Math.max(clusterEnd, hmToMin(a.end));
    });
    flush();
    return out;
  }

  window.statusIcon = function statusIcon(status) {
    if (status === "TERMINE") return iconCheckCircle();
    if (status === "CLIENT_ARRIVE") return iconCheck();
    if (status === "EN_COURS") return iconClock();
    if (status === "ABSENT") return iconUserX();
    if (status === "ANNULE") return iconX();
    return iconCal();
  }

  window.apptBlockHtml = function apptBlockHtml(a, lane, lanes) {
    const s = hmToMin(a.start), e = hmToMin(a.end);
    const top = agTop(s);
    const height = Math.max(26, (e - s) * AG_PX - 4);
    const width = 100 / (lanes || 1);
    const color = STATUS[a.status].color;
    const compact = height < 74 ? " is-compact" : "";
    // Seul un rendez-vous encore « Réservé » est déplaçable côté backend.
    const draggable = peut(a.proId, "peutGererRdv") && a.status === "RESERVE";
    return `
      <div class="appt-block${compact}" draggable="${draggable}" data-id="${esc(a.id)}"
           style="top:${top}px;height:${height}px;left:calc(${lane * width}% + 4px);width:calc(${width}% - 8px);background:${color}18;border-left-color:${color}"
           onclick="event.stopPropagation();openRdvDetail('${escArg(a.id)}')"
           title="${esc(a.client)} · ${esc(a.start)} – ${esc(a.end)} · ${esc(a.service)}">
        <span class="appt-status" style="color:${color}">${statusIcon(a.status)}</span>
        <div class="appt-time">${esc(a.start)} – ${esc(a.end)}</div>
        <div class="appt-client">${esc(a.client)}</div>
        <div class="appt-phone">${esc(a.phone)}</div>
        <div class="appt-service">${esc(a.service)}</div>
      </div>`;
  }

  window.handleDayColClick = function handleDayColClick(e, proId) {
    if (e.target.closest(".appt-block")) return;
    if (!peut(proId, "peutGererRdv")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const min = AG_START + Math.floor((e.clientY - rect.top) / AG_PX / 15) * 15;
    openNewRdv({ proId, date: state.agendaDate, start: minToHM(Math.min(min, AG_END - 30)) });
  }

  window.wireDayDnD = function wireDayDnD() {
    document.querySelectorAll('.appt-block[draggable="true"]').forEach((block) => {
      block.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", block.dataset.id);
        e.dataTransfer.effectAllowed = "move";
        block.classList.add("appt-dragging");
      });
      block.addEventListener("dragend", () => block.classList.remove("appt-dragging"));
    });
    document.querySelectorAll(".day-col[data-pro]").forEach((col) => {
      col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("drop-hover"); });
      col.addEventListener("dragleave", () => col.classList.remove("drop-hover"));
      col.addEventListener("drop", async (e) => {
        e.preventDefault();
        col.classList.remove("drop-hover");
        const appt = APPTS.find((a) => a.id === e.dataTransfer.getData("text/plain"));
        if (!appt) return;
        // Le backend ne déplace un rendez-vous que dans le temps : changer de
        // professionnel supposerait un autre service et d'autres disponibilités.
        // On refuse explicitement plutôt que d'afficher un déplacement fictif.
        if (col.dataset.pro !== appt.proId) {
          showToast("Un rendez-vous ne peut pas être transféré à un autre professionnel — annulez puis recréez-le.");
          return;
        }
        const rect = col.getBoundingClientRect();
        const dur = hmToMin(appt.end) - hmToMin(appt.start);
        let start = AG_START + Math.round((e.clientY - rect.top) / AG_PX / 15) * 15;
        start = Math.min(Math.max(start, AG_START), AG_END - dur);
        const hm = minToHM(start);
        if (hm === appt.start) return;
        try {
          await appointmentsApi.reschedule(appt.id, toIso(appt.date, hm));
          showToast(`Rendez-vous de <b>${esc(appt.client)}</b> déplacé à ${hm}`);
          await refreshAll(true);
        } catch (err) { showError(err); renderAgenda(); }
      });
    });
  }

  window.updateNowLine = function updateNowLine() {
    const line = document.getElementById("agendaNowLine");
    if (!line) return;
    const min = hmToMin(nowHM());
    const visible = state.agendaDate === TODAY && min >= AG_START && min <= AG_END;
    line.style.display = visible ? "block" : "none";
    if (!visible) return;
    line.style.top = agTop(min) + "px";
    line.querySelector(".now-badge").textContent = nowHM();
  }

  /* ---------- Rail latéral ---------- */
  window.agendaStatusPanel = function agendaStatusPanel() {
    const day = APPTS.filter((a) => a.date === state.agendaDate && (state.proFilter === "all" || a.proId === state.proFilter));
    return `
      <div class="rail-card">
        <div class="rail-head"><h4>Statut des rendez-vous</h4></div>
        <div class="rail-body">
          ${Object.entries(STATUS).map(([k, v]) => `
            <div class="rail-status-row">
              <span class="rail-status-icon" style="background:${v.color}1A;color:${v.color}">${statusIcon(k)}</span>
              <span class="rail-status-label">${v.label}</span>
              <span class="rail-status-count">${day.filter((a) => a.status === k).length}</span>
            </div>`).join("")}
        </div>
        <button class="rail-link" onclick="goToPage('rdv')">Voir le rapport détaillé ${iconChevronRight()}</button>
      </div>`;
  }

  window.agendaReminders = function agendaReminders() {
    const ref = state.agendaDate === TODAY ? nowHM() : "00:00";
    return APPTS
      .filter((a) => a.date === state.agendaDate && ["RESERVE", "CLIENT_ARRIVE"].includes(a.status) && a.start >= ref && (state.proFilter === "all" || a.proId === state.proFilter))
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  window.agendaRemindersPanel = function agendaRemindersPanel() {
    const list = agendaReminders();
    return `
      <div class="rail-card">
        <div class="rail-head"><h4>Rappels à venir</h4><span class="rail-badge">${list.length}</span></div>
        <div class="rail-body">
          ${list.length ? list.slice(0, 4).map((a) => `
            <div class="rail-rdv-row" onclick="openRdvDetail('${escArg(a.id)}')">
              <div class="avatar-sm" style="background:${proById(a.proId).color}">${esc(initials(a.client))}</div>
              <div class="rail-rdv-txt">
                <div class="rail-rdv-name">${esc(a.client)}</div>
                <div class="rail-rdv-sub">${esc(a.start)} · ${esc(a.service)}</div>
              </div>
              ${iconChevronRight()}
            </div>`).join("") : `<div class="rail-empty">Aucun rappel pour cette journée</div>`}
        </div>
        <button class="rail-link" onclick="goToPage('rdv')">Voir tous les rappels ${iconChevronRight()}</button>
      </div>`;
  }

  /* ---------- Vues semaine / mois ---------- */
  window.weekViewHtml = function weekViewHtml() {
    const start = weekStart(state.agendaDate);
    const days = Array.from({ length: 7 }, (_, i) => isoPlusDays(start, i));
    return `<div class="week-grid">` + days.map((d) => {
      const appts = APPTS.filter((a) => a.date === d && (state.proFilter === "all" || a.proId === state.proFilter) && a.status !== "ANNULE").sort((a, b) => a.start.localeCompare(b.start));
      const dow = new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
      return `<div class="week-day-col">
        <div class="week-day-head ${d === TODAY ? 'today' : ''}">${capitalize(dow)}</div>
        ${appts.length ? appts.map((a) => `<div class="week-appt-chip" style="background:${STATUS[a.status].color}18;border-color:${STATUS[a.status].color}" onclick="openRdvDetail('${escArg(a.id)}')"><b>${esc(a.start)}</b> ${esc(a.client)}</div>`).join("") : `<div style="font-size:10.5px;color:var(--ink-soft);text-align:center;padding-top:10px;">—</div>`}
      </div>`;
    }).join("") + `</div>`;
  }

  window.monthViewHtml = function monthViewHtml() {
    const first = new Date(state.monthCursor + "-01T00:00:00");
    const gridStart = new Date(first); gridStart.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); });
    const dows = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    let html = `<div class="month-grid">` + dows.map((d) => `<div class="month-dow">${d}</div>`).join("");
    cells.forEach((iso) => {
      const inMonth = iso.slice(0, 7) === state.monthCursor;
      const count = APPTS.filter((a) => a.date === iso && (state.proFilter === "all" || a.proId === state.proFilter) && a.status !== "ANNULE").length;
      html += `<div class="month-cell ${inMonth ? '' : 'muted'} ${iso === TODAY ? 'today' : ''}" onclick="jumpToDay('${iso}')">
        <div class="month-cell-num">${parseInt(iso.slice(8, 10), 10)}</div>
        ${count ? `<span class="month-cell-count">${count} RDV</span>` : ""}
      </div>`;
    });
    return html + `</div>`;
  }
  window.jumpToDay = function jumpToDay(iso) {
    state.agendaDate = iso;
    state.monthCursor = iso.slice(0, 7);
    state.agendaView = "day";
    renderAgenda();
  }

  window.miniCalHtml = function miniCalHtml() {
    const first = new Date(state.monthCursor + "-01T00:00:00");
    const gridStart = new Date(first); gridStart.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); });
    const dows = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    let html = `<div class="mini-cal"><div class="mini-cal-head">
      <button onclick="miniCalShift(-1)">${iconChevronLeft()}</button>
      <span>${capitalize(first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }))}</span>
      <button onclick="miniCalShift(1)">${iconChevronRight()}</button>
    </div><div class="mini-cal-grid">`;
    dows.forEach((d) => html += `<div class="mini-cal-dow">${d}</div>`);
    cells.forEach((iso) => {
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
     PAGE : RENDEZ-VOUS (liste complète, filtres, export)
     ========================================================= */
  window.renderRdvPage = function renderRdvPage() {
    document.getElementById("page-rdv").innerHTML = `
      <div class="page-head">
        <div><h1 class="page-title">Rendez-vous</h1><p class="page-sub">Liste complète, avec filtres et export</p></div>
        ${peutGererUn() ? `<button class="btn btn-primary" onclick="openNewRdv()">${iconPlus()} Nouveau rendez-vous</button>` : ""}
      </div>
      <div class="filter-row">
        <input type="text" id="rdvSearchInput" placeholder="Rechercher un client…" value="${esc(state.rdvFilters.search)}" oninput="updateRdvFilter('search', this.value)" style="min-width:220px" />
        <select onchange="updateRdvFilter('status', this.value)">
          <option value="">Tous les statuts</option>
          ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${state.rdvFilters.status === k ? 'selected' : ''}>${v.label}</option>`).join("")}
        </select>
        <select onchange="updateRdvFilter('pro', this.value)">
          <option value="">Tous les professionnels</option>
          ${PROS.map((p) => `<option value="${esc(p.id)}" ${state.rdvFilters.pro === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join("")}
        </select>
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="exportRdvCsv()">${iconPrinter()} Exporter CSV</button>
      </div>
      <div class="card">
        <table class="data-table">
          <thead><tr><th>Client</th><th>Service</th><th>Professionnel</th><th>Date</th><th>Heure</th><th>Statut</th><th></th></tr></thead>
          <tbody id="rdvTableBody"></tbody>
        </table>
      </div>
    `;
    renderRdvTable();
  }
  window.updateRdvFilter = function updateRdvFilter(key, v) { state.rdvFilters[key] = v; renderRdvTable(); }
  window.filteredRdv = function filteredRdv() {
    const f = state.rdvFilters;
    return APPTS.filter((a) => {
      if (f.status && a.status !== f.status) return false;
      if (f.pro && a.proId !== f.pro) return false;
      if (f.search) {
        const q = f.search.toLowerCase();
        if (!a.client.toLowerCase().includes(q) && !a.phone.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  }
  window.renderRdvTable = function renderRdvTable() {
    const rows = filteredRdv();
    const body = document.getElementById("rdvTableBody");
    if (!body) return;
    if (!rows.length) { body.innerHTML = `<tr><td colspan="7"><div class="table-empty">Aucun rendez-vous ne correspond à ces filtres</div></td></tr>`; return; }
    body.innerHTML = rows.map((a) => {
      const p = proById(a.proId);
      const warn = absentCount(a.clientId) >= SEUIL_ABSENCES ? `<span class="repeat-warning">${iconAlert()} absences répétées</span>` : "";
      return `<tr class="row-clickable" onclick="openRdvDetail('${escArg(a.id)}')">
        <td><div class="cell-client"><div class="avatar-sm" style="background:${p.color}">${esc(initials(a.client))}</div><div><div class="cell-client-name">${esc(a.client)}${warn}</div><div class="cell-client-sub">${esc(a.phone)}</div></div></div></td>
        <td>${esc(a.service)}</td>
        <td>${esc(p.name)}</td>
        <td>${fmtDateShort(a.date)}</td>
        <td>${esc(a.start)}</td>
        <td><span class="status-pill ${STATUS[a.status].cls}">${STATUS[a.status].label}</span></td>
        <td><div class="row-actions" onclick="event.stopPropagation()">
          <button class="icon-btn" title="Voir le détail" onclick="openRdvDetail('${escArg(a.id)}')">${iconEye()}</button>
        </div></td>
      </tr>`;
    }).join("");
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
    const rows = filteredRdv().map((a) => [a.client, a.phone, a.service, proById(a.proId).name, a.date, a.start, a.end, STATUS[a.status].label]);
    exportCsv("rendez-vous.csv", ["Client", "Téléphone", "Service", "Professionnel", "Date", "Début", "Fin", "Statut"], rows);
  }

  /* =========================================================
     PAGE : CLIENTS
     Les fiches sont dérivées des rendez-vous renvoyés par l'API,
     dédoublonnées par identifiant client réel (et non par nom).
     ========================================================= */
  window.uniqueClients = function uniqueClients() {
    const map = new Map();
    APPTS.forEach((a) => {
      if (!map.has(a.clientId)) map.set(a.clientId, { id: a.clientId, name: a.client, phone: a.phone, email: a.email, dob: a.dob, appts: [] });
      map.get(a.clientId).appts.push(a);
    });
    return Array.from(map.values());
  }
  window.renderClientsPage = function renderClientsPage() {
    document.getElementById("page-clients").innerHTML = `
      <div class="page-head">
        <div><h1 class="page-title">Clients</h1><p class="page-sub">Recherche, historique et export</p></div>
      </div>
      <div class="filter-row">
        <input type="text" placeholder="Nom, prénom…" value="${esc(state.clientSearch.nom)}" oninput="updateClientFilter('nom', this.value)" />
        <input type="text" placeholder="Téléphone…" value="${esc(state.clientSearch.tel)}" oninput="updateClientFilter('tel', this.value)" />
        <input type="text" placeholder="E-mail…" value="${esc(state.clientSearch.email)}" oninput="updateClientFilter('email', this.value)" />
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="exportClientsCsv()">${iconPrinter()} Exporter CSV</button>
      </div>
      <div class="card">
        <table class="data-table">
          <thead><tr><th>Client</th><th>Téléphone</th><th>E-mail</th><th>Rendez-vous</th><th>Dernier RDV</th><th></th></tr></thead>
          <tbody id="clientsTableBody"></tbody>
        </table>
      </div>
    `;
    renderClientsTable();
  }
  window.updateClientFilter = function updateClientFilter(key, v) { state.clientSearch[key] = v; renderClientsTable(); }
  window.filteredClients = function filteredClients() {
    const f = state.clientSearch;
    return uniqueClients().filter((c) => {
      if (f.nom && !c.name.toLowerCase().includes(f.nom.toLowerCase())) return false;
      if (f.tel && !(c.phone || "").includes(f.tel)) return false;
      if (f.email && !(c.email || "").toLowerCase().includes(f.email.toLowerCase())) return false;
      return true;
    });
  }
  window.renderClientsTable = function renderClientsTable() {
    const clients = filteredClients();
    const body = document.getElementById("clientsTableBody");
    if (!body) return;
    if (!clients.length) { body.innerHTML = `<tr><td colspan="6"><div class="table-empty">Aucun client trouvé</div></td></tr>`; return; }
    body.innerHTML = clients.map((c) => {
      const last = c.appts.slice().sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start))[0];
      const age = calcAge(c.dob);
      const warn = absentCount(c.id) >= SEUIL_ABSENCES ? `<span class="repeat-warning">${iconAlert()} absences répétées</span>` : "";
      return `<tr class="row-clickable" onclick="openClientFiche('${escArg(c.id)}')">
        <td><div class="cell-client"><div class="avatar-sm" style="background:var(--primary)">${esc(initials(c.name))}</div><div><div class="cell-client-name">${esc(c.name)}${warn}</div><div class="cell-client-sub">${age === null ? "Âge non renseigné" : age + " ans"}</div></div></div></td>
        <td>${esc(c.phone)}</td>
        <td>${esc(c.email || "—")}</td>
        <td>${c.appts.length}</td>
        <td>${fmtDateShort(last.date)}</td>
        <td><div class="row-actions" onclick="event.stopPropagation()"><button class="icon-btn" title="Voir la fiche" onclick="openClientFiche('${escArg(c.id)}')">${iconEye()}</button></div></td>
      </tr>`;
    }).join("");
  }
  window.exportClientsCsv = function exportClientsCsv() {
    const rows = filteredClients().map((c) => [c.name, c.phone, c.email || "", c.dob || "", c.appts.length, absentCount(c.id)]);
    exportCsv("clients.csv", ["Client", "Téléphone", "E-mail", "Date de naissance", "Rendez-vous", "Absences"], rows);
  }

  /* =========================================================
     PAGE : PROFESSIONNELS
     ========================================================= */
  window.renderProsPage = function renderProsPage() {
    document.getElementById("page-pros").innerHTML = `
      <div class="page-head"><div><h1 class="page-title">Professionnels</h1><p class="page-sub">Professionnels auxquels vous êtes affectée, et vos autorisations</p></div></div>
      ${PROS.length ? `<div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
        ${PROS.map((p) => {
          const todays = APPTS.filter((a) => a.proId === p.id && a.date === TODAY && a.status !== "ANNULE");
          const clientsCount = new Set(APPTS.filter((a) => a.proId === p.id).map((a) => a.clientId)).size;
          const perms = [
            ["Consulter l'agenda", p.perms.peutConsulterAgenda],
            ["Gérer les rendez-vous", p.perms.peutGererRdv],
            ["Gérer le planning", p.perms.peutGererPlanning],
            ["Gérer les paramètres", p.perms.peutGererParametres],
          ];
          return `<div class="card" style="padding:18px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
              <div class="avatar-sm" style="width:44px;height:44px;font-size:15px;background:${p.color}">${esc(p.initials)}</div>
              <div><div style="font-weight:800;font-size:14.5px;">${esc(p.name)}</div><div style="font-size:12px;color:var(--ink-soft)">${esc(p.role)}</div></div>
            </div>
            ${p.actif ? "" : `<div class="repeat-warning" style="margin-bottom:12px;">${iconAlert()} Votre accès à cet espace est suspendu</div>`}
            <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink-soft);margin-bottom:4px;"><span>RDV aujourd'hui</span><b style="color:var(--ink)">${todays.length}</b></div>
            <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink-soft);margin-bottom:12px;"><span>Clients suivis</span><b style="color:var(--ink)">${clientsCount}</b></div>
            <div class="detail-item-label" style="margin-bottom:6px;">Vos autorisations</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
              ${perms.map((x) => `<span class="status-pill ${x[1] ? 'st-termine' : 'st-absent'}" style="font-size:10.5px;">${x[0]}</span>`).join("")}
            </div>
            <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;" onclick="setAgendaViewFor('${escArg(p.id)}')">Voir son agenda</button>
          </div>`;
        }).join("")}
      </div>` : `<div class="card"><div class="table-empty">Aucun professionnel ne vous est affecté</div></div>`}
    `;
  }
  window.setAgendaViewFor = function setAgendaViewFor(proId) { state.proFilter = proId; state.agendaView = "day"; state.agendaDate = TODAY; goToPage("agenda"); }

  /* =========================================================
     PAGE : NOTIFICATIONS
     ========================================================= */
  window.notifRowHtml = function notifRowHtml(n) {
    const ic = NOTIF_STYLE[n.type] || NOTIF_FALLBACK;
    return `<div class="notif-row ${n.unread ? 'unread' : ''}">
      <div class="notif-icon" style="background:${ic.bg};color:${ic.color}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ic.svg}</svg></div>
      <div class="notif-text"><span>${n.text}</span><div class="notif-time">${n.time}</div></div>
      ${n.unread ? `<span class="notif-dot-unread"></span>` : ""}
    </div>`;
  }
  window.renderNotifsPage = function renderNotifsPage() {
    document.getElementById("page-notifs").innerHTML = `
      <div class="page-head">
        <div><h1 class="page-title">Notifications</h1><p class="page-sub">Alertes et nouvelles demandes</p></div>
        <button class="btn btn-ghost btn-sm" onclick="markAllRead()">Tout marquer comme lu</button>
      </div>
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
     MODALS
     ========================================================= */
  window.closeModal = function closeModal() {
    const root = document.getElementById("modalRoot");
    const ov = root.querySelector(".modal-overlay");
    if (ov) { ov.classList.remove("open"); setTimeout(() => root.innerHTML = "", 200); }
  }
  window.openModal = function openModal(innerHtml, wide) {
    document.getElementById("modalRoot").innerHTML = `<div class="modal-overlay" id="activeOverlay"><div class="modal-box ${wide ? 'wide' : ''}">${innerHtml}</div></div>`;
    const ov = document.getElementById("activeOverlay");
    requestAnimationFrame(() => ov.classList.add("open"));
    ov.addEventListener("click", (e) => { if (e.target === ov) closeModal(); });
  }

  /* ---- Nouveau rendez-vous : services publiés et créneaux réellement libres ---- */
  window.openNewRdv = function openNewRdv(prefill) {
    prefill = prefill || {};
    const gerables = PROS.filter((p) => p.actif && p.perms.peutGererRdv);
    if (!gerables.length) { showToast("Vous n'avez pas l'autorisation de créer un rendez-vous."); return; }
    const pro = gerables.find((p) => p.id === prefill.proId) || gerables[0];
    state.newRdv = { proId: pro.id, serviceId: "", date: prefill.date || state.agendaDate, start: prefill.start || "", dateDebut: "", services: [], creneaux: [], clientTrouve: null };
    openModal(`
      <div class="modal-head">
        <div><p class="modal-title">Nouveau rendez-vous</p><p class="modal-sub">Réservation rapide — client au téléphone ou à l'accueil</p></div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="detect-banner" id="detectBanner"></div>
      <div class="field-2col">
        <div class="field-row"><label>Nom *</label><input type="text" id="nrNom" oninput="detectClientDebounced()" /></div>
        <div class="field-row"><label>Prénom *</label><input type="text" id="nrPrenom" /></div>
      </div>
      <div class="field-2col">
        <div class="field-row"><label>Date de naissance</label><input type="date" id="nrDob" oninput="detectClientDebounced()" /></div>
        <div class="field-row"><label>Téléphone *</label><input type="tel" id="nrTel" oninput="detectClientDebounced()" /></div>
      </div>
      <div class="field-row"><label>E-mail</label><input type="email" id="nrEmail" /></div>
      <div class="field-row"><label>Professionnel *</label>
        <select id="nrPro" onchange="onNewRdvProChange(this.value)">
          ${gerables.map((p) => `<option value="${esc(p.id)}" ${p.id === pro.id ? 'selected' : ''}>${esc(p.name)} — ${esc(p.role)}</option>`).join("")}
        </select>
      </div>
      <div class="field-row"><label>Service / motif *</label><select id="nrService" onchange="onNewRdvServiceChange(this.value)"><option value="">Chargement…</option></select></div>
      <div class="field-row"><label>Date *</label><input type="date" id="nrDate" value="${esc(state.newRdv.date)}" onchange="onNewRdvDateChange(this.value)" /></div>
      <div class="field-row"><label>Créneau disponible *</label><div id="nrSlots"><div class="rail-empty">Choisissez un service et une date.</div></div></div>
      <div class="field-row"><label>Remarque</label><textarea id="nrRemarque" rows="2"></textarea></div>
      <div class="field-error" id="nrError"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
        <button class="btn btn-primary" id="nrSubmit" onclick="submitNewRdv()">${iconCheck()} Créer le rendez-vous</button>
      </div>
    `);
    loadNewRdvServices();
  }
  window.onNewRdvProChange = function onNewRdvProChange(id) {
    state.newRdv.proId = id;
    state.newRdv.serviceId = "";
    state.newRdv.dateDebut = "";
    loadNewRdvServices();
  }
  window.onNewRdvServiceChange = function onNewRdvServiceChange(id) { state.newRdv.serviceId = id; loadNewRdvSlots(); }
  window.onNewRdvDateChange = function onNewRdvDateChange(d) { state.newRdv.date = d; loadNewRdvSlots(); }
  window.loadNewRdvServices = async function loadNewRdvServices() {
    const sel = document.getElementById("nrService");
    if (!sel) return;
    try {
      const services = await publicApi.getServices(state.newRdv.proId);
      state.newRdv.services = services;
      if (!services.length) {
        sel.innerHTML = `<option value="">Aucun service publié par ce professionnel</option>`;
        state.newRdv.serviceId = "";
        renderNewRdvSlots([], "Ce professionnel n'a publié aucun service réservable.");
        return;
      }
      state.newRdv.serviceId = services[0].id;
      sel.innerHTML = services.map((s) => `<option value="${esc(s.id)}">${esc(s.nom)} — ${s.dureeMinutes} min</option>`).join("");
      loadNewRdvSlots();
    } catch (e) { showError(e); }
  }
  // Les créneaux affichés sont ceux calculés par le backend (disponibilités,
  // indisponibilités et rendez-vous déjà pris) : aucune grille horaire inventée.
  window.loadNewRdvSlots = async function loadNewRdvSlots() {
    const { proId, serviceId, date } = state.newRdv;
    state.newRdv.dateDebut = "";
    if (!proId || !serviceId || !date) { renderNewRdvSlots([], "Choisissez un service et une date."); return; }
    renderNewRdvSlots([], "Chargement des créneaux…");
    try {
      const res = await publicApi.getSlots(proId, serviceId, date);
      state.newRdv.creneaux = res.creneaux || [];
      renderNewRdvSlots(state.newRdv.creneaux, "Aucun créneau disponible ce jour-là.");
    } catch (e) {
      state.newRdv.creneaux = [];
      renderNewRdvSlots([], "Créneaux indisponibles pour cette date.");
      showError(e);
    }
  }
  window.renderNewRdvSlots = function renderNewRdvSlots(creneaux, emptyMsg) {
    const box = document.getElementById("nrSlots");
    if (!box) return;
    if (!creneaux.length) { box.innerHTML = `<div class="rail-empty">${esc(emptyMsg)}</div>`; return; }
    // Si l'heure cliquée dans l'agenda correspond à un créneau réel, on la présélectionne.
    const prefer = creneaux.find((c) => toHM(c) === state.newRdv.start) || creneaux[0];
    box.innerHTML = `<div class="status-menu" id="nrSlotMenu">${creneaux.map((c) => `<button type="button" data-iso="${esc(c)}" class="${c === prefer ? 'current' : ''}" onclick="pickSlot('${escArg(c)}')">${toHM(c)}</button>`).join("")}</div>`;
    state.newRdv.dateDebut = prefer;
  }
  window.pickSlot = function pickSlot(iso) {
    state.newRdv.dateDebut = iso;
    document.querySelectorAll("#nrSlotMenu button").forEach((b) => b.classList.toggle("current", b.dataset.iso === iso));
  }
  let detectTimer = null;
  window.detectClientDebounced = function detectClientDebounced() {
    clearTimeout(detectTimer);
    detectTimer = setTimeout(detectClient, 350);
  }
  // Détection d'un client existant : décidée par le backend (téléphone, ou nom + date de naissance).
  window.detectClient = async function detectClient() {
    const banner = document.getElementById("detectBanner");
    if (!banner) return;
    const nom = val("nrNom"), dob = val("nrDob"), tel = val("nrTel").replace(/\s/g, "");
    if (tel.length < 6 && !(nom && dob)) { banner.classList.remove("show"); state.newRdv.clientTrouve = null; return; }
    try {
      const c = await receptionnisteApi.detectClient({ telephone: tel || undefined, nom: nom || undefined, dateNaissance: dob || undefined });
      state.newRdv.clientTrouve = c;
      if (!c) { banner.classList.remove("show"); return; }
      const nb = APPTS.filter((a) => a.clientId === c.id).length;
      const abs = absentCount(c.id);
      const warn = abs >= SEUIL_ABSENCES ? ` — ⚠️ absences répétées (${abs})` : "";
      banner.innerHTML = `${iconCheck()} Client existant : <b>${esc(`${c.prenom || ""} ${c.nom || ""}`.trim())}</b> (${nb} rendez-vous dans vos espaces)${warn}`;
      banner.classList.add("show");
      // On complète les champs encore vides avec la fiche réelle, sans écraser la saisie.
      const fill = (id, value) => { const el = document.getElementById(id); if (el && !el.value && value) el.value = value; };
      fill("nrPrenom", c.prenom);
      fill("nrEmail", c.email);
      fill("nrDob", c.dateNaissance ? toDay(c.dateNaissance) : "");
    } catch (e) { /* la détection est un confort : son échec ne bloque pas la saisie */ }
  }
  window.submitNewRdv = async function submitNewRdv() {
    const err = document.getElementById("nrError");
    const nom = val("nrNom"), prenom = val("nrPrenom"), tel = val("nrTel").replace(/\s/g, "");
    const { proId, serviceId, dateDebut } = state.newRdv;
    if (!nom || !prenom || !tel || !proId || !serviceId || !dateDebut) {
      err.textContent = "Renseignez le nom, le prénom, le téléphone, le service et un créneau disponible.";
      err.classList.add("show");
      return;
    }
    err.classList.remove("show");
    const btn = document.getElementById("nrSubmit");
    btn.disabled = true;
    try {
      await receptionnisteApi.creerRdv({
        professionnelId: proId,
        serviceId,
        dateDebut,
        nom,
        prenom,
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
      const msg = e?.response?.data?.message || "La création du rendez-vous a échoué.";
      err.textContent = Array.isArray(msg) ? msg.join(", ") : msg;
      err.classList.add("show");
      // Un conflit signifie que le créneau vient d'être pris : on recharge la liste réelle.
      if (e?.response?.status === 409) loadNewRdvSlots();
    }
  }

  /* ---- Consulter / modifier un rendez-vous ---- */
  window.openRdvDetail = function openRdvDetail(id) {
    const a = APPTS.find((x) => x.id === id);
    if (!a) return;
    const p = proById(a.proId);
    const abs = absentCount(a.clientId);
    const age = calcAge(a.dob);
    const gerable = peut(a.proId, "peutGererRdv");
    const suivants = TRANSITIONS[a.status] || [];
    const telBrut = String(a.phone).replace(/\s/g, "");
    openModal(`
      <div class="modal-head">
        <div><p class="modal-title">${esc(a.client)}</p><p class="modal-sub">${esc(a.service)} · ${esc(p.name)}</p></div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      ${abs >= SEUIL_ABSENCES ? `<div class="repeat-warning" style="margin-bottom:12px;">${iconAlert()} Ce client a ${abs} absences enregistrées</div>` : ""}
      <div class="detail-grid">
        <div><div class="detail-item-label">Date de naissance</div><div class="detail-item-value">${a.dob ? fmtDateShort(a.dob) + " (" + age + " ans)" : "—"}</div></div>
        <div><div class="detail-item-label">Téléphone</div><div class="detail-item-value">${esc(a.phone)}</div></div>
        <div><div class="detail-item-label">E-mail</div><div class="detail-item-value">${esc(a.email || "—")}</div></div>
        <div><div class="detail-item-label">Professionnel</div><div class="detail-item-value">${esc(p.name)}</div></div>
        <div><div class="detail-item-label">Date</div><div class="detail-item-value">${fmtDateShort(a.date)}</div></div>
        <div><div class="detail-item-label">Heure</div><div class="detail-item-value">${esc(a.start)} – ${esc(a.end)}</div></div>
        <div><div class="detail-item-label">Créé le</div><div class="detail-item-value">${fmtDateShort(a.createdAt)}</div></div>
        <div><div class="detail-item-label">Statut actuel</div><div class="detail-item-value"><span class="status-pill ${STATUS[a.status].cls}">${STATUS[a.status].label}</span></div></div>
      </div>
      ${a.remark ? `<div class="field-row"><label>Remarque</label><div class="detail-item-value">${esc(a.remark)}</div></div>` : ""}
      ${a.motif ? `<div class="field-row"><label>Motif d'annulation</label><div class="detail-item-value">${esc(a.motif)}</div></div>` : ""}
      ${gerable && suivants.length ? `
        <div class="detail-item-label" style="margin-bottom:8px;">Changer le statut</div>
        <div class="status-menu">
          ${suivants.filter((k) => k !== "ANNULE").map((k) => `<button onclick="changeStatus('${escArg(a.id)}','${k}')">${STATUS[k].label}</button>`).join("")}
        </div>` : `<div class="detail-item-label" style="margin-bottom:8px;">${gerable ? "Ce rendez-vous est clos : plus aucun changement de statut n'est possible." : "Vous n'avez pas l'autorisation de modifier ce rendez-vous."}</div>`}
      <div class="modal-actions" style="justify-content:space-between;">
        <div style="display:flex;gap:8px;">
          ${gerable && a.status === "RESERVE" ? `<button class="btn btn-ghost btn-sm" onclick="openEditRdv('${escArg(a.id)}')">${iconEdit()} Déplacer</button>` : ""}
          <a class="btn btn-ghost btn-sm" href="tel:${esc(telBrut)}">${iconPhone()} Appeler</a>
        </div>
        ${gerable && suivants.includes("ANNULE") ? `<button class="btn btn-danger-ghost btn-sm" onclick="openCancelRdv('${escArg(a.id)}')">${iconX()} Annuler le rendez-vous</button>` : ""}
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
  window.openCancelRdv = function openCancelRdv(id) {
    const a = APPTS.find((x) => x.id === id);
    if (!a) return;
    openModal(`
      <div class="modal-head"><div><p class="modal-title">Annuler le rendez-vous</p><p class="modal-sub">${esc(a.client)} — ${fmtDateShort(a.date)} à ${esc(a.start)}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-row"><label>Motif de l'annulation</label><textarea id="cancelMotif" rows="2"></textarea></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="openRdvDetail('${escArg(id)}')">Retour</button>
        <button class="btn btn-danger-ghost" onclick="confirmCancelRdv('${escArg(id)}')">${iconX()} Confirmer l'annulation</button>
      </div>
    `);
  }
  window.confirmCancelRdv = async function confirmCancelRdv(id) {
    try {
      await appointmentsApi.updateStatus(id, "ANNULE", val("cancelMotif") || undefined);
      closeModal();
      showToast("Rendez-vous annulé");
      await refreshAll(true);
    } catch (e) { showError(e); }
  }

  /* ---- Déplacer un rendez-vous (créneaux réellement libres) ---- */
  window.openEditRdv = function openEditRdv(id) {
    const a = APPTS.find((x) => x.id === id);
    if (!a) return;
    state.newRdv = { ...state.newRdv, proId: a.proId, serviceId: a.serviceId, date: a.date, start: a.start, dateDebut: "", creneaux: [] };
    openModal(`
      <div class="modal-head"><div><p class="modal-title">Déplacer le rendez-vous</p><p class="modal-sub">${esc(a.client)} · ${esc(a.service)}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:12px;">Le client, le service et le professionnel restent inchangés : seul le créneau est déplacé, parmi ceux réellement libres.</p>
      <div class="field-row"><label>Date</label><input type="date" id="erDate" value="${esc(a.date)}" onchange="onEditDateChange(this.value)" /></div>
      <div class="field-row"><label>Créneau disponible</label><div id="nrSlots"><div class="rail-empty">Chargement…</div></div></div>
      <div class="field-error" id="erError"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="openRdvDetail('${escArg(id)}')">Retour</button>
        <button class="btn btn-primary" onclick="saveEditRdv('${escArg(id)}')">${iconCheck()} Enregistrer</button>
      </div>
    `);
    loadNewRdvSlots();
  }
  window.onEditDateChange = function onEditDateChange(d) { state.newRdv.date = d; loadNewRdvSlots(); }
  window.saveEditRdv = async function saveEditRdv(id) {
    const err = document.getElementById("erError");
    if (!state.newRdv.dateDebut) { err.textContent = "Choisissez un créneau disponible."; err.classList.add("show"); return; }
    try {
      await appointmentsApi.reschedule(id, state.newRdv.dateDebut);
      closeModal();
      showToast("Rendez-vous déplacé");
      await refreshAll(true);
    } catch (e) {
      const msg = e?.response?.data?.message || "Le déplacement a échoué.";
      err.textContent = Array.isArray(msg) ? msg.join(", ") : msg;
      err.classList.add("show");
      loadNewRdvSlots();
    }
  }

  /* ---- Fiche client ---- */
  window.openClientFiche = function openClientFiche(clientId) {
    const c = uniqueClients().find((x) => x.id === clientId);
    if (!c) return;
    const history = c.appts.slice().sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
    const premier = history[history.length - 1];
    const abs = absentCount(c.id);
    const age = calcAge(c.dob);
    openModal(`
      <div class="modal-head">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="avatar-sm" style="width:42px;height:42px;font-size:15px;background:var(--primary)">${esc(initials(c.name))}</div>
          <div><p class="modal-title">${esc(c.name)}</p><p class="modal-sub">${age === null ? "Âge non renseigné" : age + " ans"} · Premier rendez-vous le ${fmtDateShort(premier.date)}</p></div>
        </div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      ${abs >= SEUIL_ABSENCES ? `<div class="repeat-warning" style="margin-bottom:12px;">${iconAlert()} ${abs} absences enregistrées — seuil d'alerte atteint</div>` : ""}
      <div class="detail-grid">
        <div><div class="detail-item-label">Téléphone</div><div class="detail-item-value">${esc(c.phone)}</div></div>
        <div><div class="detail-item-label">E-mail</div><div class="detail-item-value">${esc(c.email || "—")}</div></div>
        <div><div class="detail-item-label">Date de naissance</div><div class="detail-item-value">${c.dob ? fmtDateShort(c.dob) : "—"}</div></div>
        <div><div class="detail-item-label">Total rendez-vous</div><div class="detail-item-value">${c.appts.length}</div></div>
      </div>
      <div class="detail-item-label" style="margin:16px 0 8px;">Historique des rendez-vous</div>
      <div style="max-height:220px;overflow-y:auto;border:1px solid var(--line);border-radius:10px;">
        ${history.map((a) => `<div class="dash-list-row" style="padding:10px 14px;">
          <span class="dash-list-time" style="width:auto;">${fmtDateShort(a.date)}</span>
          <div style="flex:1"><div class="dash-list-name" style="font-size:12.5px;">${esc(a.service)}</div><div class="dash-list-sub">${esc(proById(a.proId).name)}</div></div>
          <span class="status-pill ${STATUS[a.status].cls}">${STATUS[a.status].label}</span>
        </div>`).join("")}
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Fermer</button>
        ${peutGererUn() ? `<button class="btn btn-primary" onclick="openNewRdv({ date: '${escArg(TODAY)}' })">${iconPlus()} Nouveau rendez-vous</button>` : ""}
      </div>
    `, true);
  }

  /* =========================================================
     ICONES (inline svg helpers)
     ========================================================= */
  window.svg = function svg(inner, w) { w = w || 15; return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`; }
  window.iconPlus = function iconPlus() { return svg('<path d="M12 5v14M5 12h14"/>'); }
  window.iconCal = function iconCal() { return svg('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'); }
  window.iconCheck = function iconCheck() { return svg('<polyline points="20 6 9 17 4 12"/>'); }
  window.iconCheckCircle = function iconCheckCircle() { return svg('<circle cx="12" cy="12" r="9"/><polyline points="8 12 11 15 16 9"/>'); }
  window.iconClock = function iconClock() { return svg('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>'); }
  window.iconX = function iconX() { return svg('<circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'); }
  window.iconUserX = function iconUserX() { return svg('<circle cx="9" cy="8" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 3 1.3"/><line x1="17" y1="8" x2="22" y2="13"/><line x1="22" y1="8" x2="17" y2="13"/>'); }
  window.iconChevronLeft = function iconChevronLeft() { return svg('<polyline points="15 18 9 12 15 6"/>', 14); }
  window.iconChevronRight = function iconChevronRight() { return svg('<polyline points="9 18 15 12 9 6"/>', 14); }
  window.iconPrinter = function iconPrinter() { return svg('<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'); }
  window.iconEdit = function iconEdit() { return svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>', 14); }
  window.iconEye = function iconEye() { return svg('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>', 14); }
  window.iconAlert = function iconAlert() { return svg('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', 12); }
  window.iconPhone = function iconPhone() { return svg('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>', 14); }
  window.iconRefresh = function iconRefresh() { return svg('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>', 14); }

  /* =========================================================
     RECHERCHE GLOBALE (barre du haut)
     ========================================================= */
  document.getElementById("globalSearch")?.addEventListener("input", function () {
    const q = this.value.trim();
    if (q.length < 2) return;
    state.clientSearch.nom = q;
    goToPage("clients");
  }, { signal: ac.signal });

  /* =========================================================
     INIT — rien n'est affiché avant la réponse du backend
     ========================================================= */
  (async () => {
    await loadAll();
    if (ac.signal.aborted) return;
    renderPage("dashboard");
  })();

    // ---- end ported script ----

    return () => {
      ac.abort();
      clearInterval(nowTimer);
      clearTimeout(detectTimer);

      [
        "todayISO", "isoPlusDays", "esc", "escArg", "toDay", "toHM", "toIso", "proById",
        "fmtDateLong", "fmtDateShort", "fmtRelative", "calcAge", "initials", "colorFor",
        "absentCount", "val", "showToast", "showError", "peut", "peutGererUn",
        "loadAll", "refreshAll", "goToPage", "renderPage", "updateNotifBadges",
        "renderDashboard", "nowHM", "renderAgenda", "agendaDateLabel", "capitalize", "weekStart",
        "agendaShift", "agendaToday", "setAgendaView", "setProFilter", "visiblePros",
        "renderAgendaMain", "dayViewHtml", "hmToMin", "minToHM", "agTop", "dayAppts",
        "layoutLanes", "statusIcon", "apptBlockHtml", "updateNowLine", "agendaStatusPanel",
        "agendaReminders", "agendaRemindersPanel", "handleDayColClick", "wireDayDnD",
        "weekViewHtml", "monthViewHtml", "jumpToDay", "miniCalHtml", "miniCalShift",
        "renderRdvPage", "updateRdvFilter", "filteredRdv", "renderRdvTable", "exportCsv",
        "exportRdvCsv", "uniqueClients", "renderClientsPage", "updateClientFilter",
        "filteredClients", "renderClientsTable", "exportClientsCsv", "renderProsPage",
        "setAgendaViewFor", "notifRowHtml", "renderNotifsPage", "markAllRead",
        "closeModal", "openModal", "openNewRdv", "onNewRdvProChange", "onNewRdvServiceChange",
        "onNewRdvDateChange", "loadNewRdvServices", "loadNewRdvSlots", "renderNewRdvSlots",
        "pickSlot", "detectClientDebounced", "detectClient", "submitNewRdv", "openRdvDetail",
        "changeStatus", "openCancelRdv", "confirmCancelRdv", "openEditRdv", "onEditDateChange",
        "saveEditRdv", "openClientFiche", "svg", "iconPlus", "iconCal", "iconCheck",
        "iconCheckCircle", "iconClock", "iconX", "iconUserX", "iconChevronLeft",
        "iconChevronRight", "iconPrinter", "iconEdit", "iconEye", "iconAlert", "iconPhone",
        "iconRefresh",
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

  /* ---------- Agenda : barre d'outils ---------- */
  .agenda-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
  .date-nav { display: flex; align-items: center; background: var(--card); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  .date-nav button { height: 34px; border: none; background: var(--card); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--ink-soft); padding: 0 10px; }
  .date-nav button:hover { background: var(--paper); color: var(--ink); }
  .date-nav-today { font-size: 12.5px; font-weight: 700; color: var(--ink) !important; border-left: 1px solid var(--line) !important; border-right: 1px solid var(--line) !important; }
  .agenda-date-label { font-size: 14.5px; font-weight: 800; padding: 0 2px; }
  .date-picker { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 10px; border: 1px solid var(--line); border-radius: 10px; background: var(--card); color: var(--ink-soft); cursor: pointer; }
  .date-picker input { border: none; background: none; font-size: 12.5px; color: var(--ink); outline: none; width: 118px; cursor: pointer; }
  .ag-select { height: 34px; border: 1px solid var(--line); border-radius: 10px; background: var(--card); color: var(--ink); font-size: 12.5px; font-weight: 600; padding: 0 10px; cursor: pointer; outline: none; }
  .ag-select:focus { border-color: var(--primary); }

  /* ---------- Agenda : mise en page ---------- */
  .agenda-body { display: grid; grid-template-columns: minmax(0, 1fr) 296px; gap: 18px; align-items: start; }
  @media (max-width: 1200px) { .agenda-body { grid-template-columns: minmax(0, 1fr); } }
  .agenda-main { min-width: 0; }
  .agenda-rail { display: flex; flex-direction: column; gap: 14px; }

  /* ---------- Agenda : grille jour ---------- */
  .day-grid { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
  .day-grid-head { display: grid; border-bottom: 1px solid var(--line); background: var(--card); position: sticky; top: 0; z-index: 6; }
  .day-head-corner { border-right: 1px solid var(--line); }
  .day-col-head { display: flex; align-items: center; gap: 9px; padding: 11px 12px; border-right: 1px solid var(--line); cursor: pointer; position: relative; min-width: 0; }
  .day-col-head:hover { background: var(--paper); }
  .day-col-head-txt { min-width: 0; }
  .day-col-head-name { font-size: 12.5px; font-weight: 700; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .day-col-head-role { font-size: 10.5px; color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .day-col-head-dot { width: 7px; height: 7px; border-radius: 50%; margin-left: auto; flex-shrink: 0; }
  .day-col-add { display: flex; align-items: center; justify-content: center; gap: 5px; margin: 8px; border: 1.5px dashed var(--line); border-radius: 10px; background: none; color: var(--ink-soft); font-size: 11.5px; font-weight: 700; cursor: pointer; }
  .day-col-add:hover { border-color: var(--primary); color: var(--primary-dark); background: var(--primary-tint); }

  .day-grid-scroll { max-height: 620px; overflow-y: auto; }
  .day-grid-body { display: grid; position: relative; }
  .time-gutter { position: relative; border-right: 1px solid var(--line); background: var(--card); }
  .hour-label { position: absolute; right: 8px; margin-top: 3px; font-size: 10.5px; font-weight: 600; color: var(--ink-soft); white-space: nowrap; }

  /* trait plein à chaque heure (92px), trait clair à chaque demi-heure (46px) */
  .day-col {
    position: relative; border-right: 1px solid var(--line); cursor: pointer; min-width: 0;
    background-image: repeating-linear-gradient(
      to bottom,
      var(--line) 0 1px, transparent 1px 46px, #F0EEF7 46px 47px, transparent 47px 92px);
  }
  .day-col:hover { background-color: #FCFBFF; }
  .day-col.drop-hover { background-color: var(--primary-tint); }
  .day-col-ghost { cursor: default; background-image: none; background: var(--paper); border-right: none; }

  .lunch-band {
    position: absolute; left: 0; right: 0; display: flex; align-items: center; justify-content: center;
    font-size: 10.5px; font-weight: 700; color: var(--ink-soft); letter-spacing: .02em;
    background: repeating-linear-gradient(45deg, #F1EFF7 0 6px, #E9E6F2 6px 12px);
    border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); z-index: 1;
  }

  .appt-block {
    position: absolute; border-radius: 9px; padding: 6px 8px; overflow: hidden; cursor: pointer;
    border-left: 3px solid; box-shadow: 0 1px 3px rgba(18,36,47,.08); z-index: 2;
    transition: transform .1s ease, box-shadow .1s ease;
  }
  .appt-block:hover { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(18,36,47,.16); z-index: 4; }
  .appt-status { position: absolute; top: 5px; right: 6px; display: flex; }
  .appt-status svg { width: 13px; height: 13px; }
  .appt-time { font-size: 10px; font-weight: 700; color: var(--ink-soft); padding-right: 16px; }
  .appt-client { font-size: 11.5px; font-weight: 700; color: var(--ink); line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .appt-phone { font-size: 10px; color: var(--ink-soft); }
  .appt-service { font-size: 10px; color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .appt-block.is-compact .appt-phone, .appt-block.is-compact .appt-service { display: none; }
  .appt-dragging { opacity: .45; }

  .now-line { position: absolute; right: 0; height: 0; border-top: 2px solid var(--st-annule); z-index: 5; pointer-events: none; }
  .now-line::after { content: ""; position: absolute; left: -3px; top: -4px; width: 7px; height: 7px; border-radius: 50%; background: var(--st-annule); }
  .now-badge { position: absolute; right: 100%; margin-right: 6px; top: -9px; background: var(--st-annule); color: #fff; font-size: 9.5px; font-weight: 800; border-radius: 5px; padding: 2px 5px; }

  .agenda-legend { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 11px 16px; margin-top: 12px; }
  .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: var(--ink-soft); }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; }

  /* ---------- Agenda : rail latéral ---------- */
  .mini-cal { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px 16px; }
  .mini-cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: 13px; font-weight: 700; }
  .mini-cal-head button { border: none; background: var(--paper); width: 26px; height: 26px; border-radius: 7px; cursor: pointer; color: var(--ink-soft); display: flex; align-items: center; justify-content: center; }
  .mini-cal-head button:hover { background: var(--primary-tint); color: var(--primary-dark); }
  .mini-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; text-align: center; }
  .mini-cal-dow { font-size: 9.5px; font-weight: 700; color: var(--ink-soft); padding-bottom: 5px; text-transform: uppercase; }
  .mini-cal-day { font-size: 11.5px; padding: 6px 0; border-radius: 8px; cursor: pointer; color: var(--ink); }
  .mini-cal-day:hover { background: var(--paper); }
  .mini-cal-day.muted { color: #C7C2D6; }
  .mini-cal-day.today { border: 1.5px solid var(--primary); font-weight: 700; }
  .mini-cal-day.selected { background: var(--primary); color: #fff; font-weight: 700; border-color: var(--primary); }
  .mini-cal-day.has-appt::after { content: ""; display: block; width: 4px; height: 4px; border-radius: 50%; background: var(--primary); margin: 2px auto 0; }
  .mini-cal-day.selected.has-appt::after { background: #fff; }

  .rail-card { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
  .rail-head { display: flex; align-items: center; gap: 8px; padding: 13px 16px 0; }
  .rail-head h4 { margin: 0; font-size: 13px; font-weight: 800; }
  .rail-badge { margin-left: auto; background: var(--primary-tint); color: var(--primary-dark); font-size: 10.5px; font-weight: 700; border-radius: 999px; padding: 1px 8px; }
  .rail-body { padding: 8px 8px 4px; }
  .rail-status-row { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 9px; }
  .rail-status-row:hover { background: var(--paper); }
  .rail-status-icon { width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .rail-status-icon svg { width: 14px; height: 14px; }
  .rail-status-label { font-size: 12px; font-weight: 600; }
  .rail-status-count { margin-left: auto; font-size: 12.5px; font-weight: 800; }
  .rail-rdv-row { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 10px; cursor: pointer; color: var(--ink-soft); }
  .rail-rdv-row:hover { background: var(--paper); }
  .rail-rdv-txt { min-width: 0; flex: 1; }
  .rail-rdv-name { font-size: 12px; font-weight: 700; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rail-rdv-sub { font-size: 10.5px; color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rail-empty { padding: 16px 8px; text-align: center; font-size: 11.5px; color: var(--ink-soft); }
  .rail-link { width: 100%; display: flex; align-items: center; justify-content: center; gap: 5px; border: none; border-top: 1px solid var(--line); background: none; padding: 11px; font-size: 11.5px; font-weight: 700; color: var(--primary-dark); cursor: pointer; }
  .rail-link:hover { background: var(--primary-tint); }

  /* ---------- Agenda : vues semaine / mois ---------- */
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
        <div className="nav-item" data-page="agenda">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span className="nav-label">Agenda</span>
        </div>
        <div className="nav-item" data-page="rdv">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <span className="nav-label">Rendez-vous</span>
        </div>
        <div className="nav-item" data-page="clients">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span className="nav-label">Clients</span>
        </div>
        <div className="nav-item" data-page="pros">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.9A9 9 0 1 0 9.1 3.5"/><path d="M12 8v4l3 3"/></svg>
          <span className="nav-label">Professionnels</span>
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
          <input type="text" id="globalSearch" placeholder="Rechercher un client, un professionnel, un rendez-vous…" />
        </div>
        <div className="tb-right">
          <button className="tb-icon-btn" id="notifBellBtn">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            <span className="tb-icon-dot" id="tbNotifDot">0</span>
          </button>
          <div className="tb-user">
            <div className="tb-avatar">IB</div>
            <div className="tb-user-text">
              <div className="tb-user-name">Imane B.</div>
              <div className="tb-user-role">Réceptionniste</div>
            </div>
          </div>
        </div>
      </header>

      
      <section className="page active" id="page-dashboard"></section>

      
      <section className="page" id="page-agenda"></section>

      
      <section className="page" id="page-rdv"></section>

      
      <section className="page" id="page-clients"></section>

      
      <section className="page" id="page-pros"></section>

      
      <section className="page" id="page-notifs"></section>
    </div>
  </div>

  
  <div id="modalRoot"></div>
  <div id="toast" className="toast"></div>



    </>
  );
}