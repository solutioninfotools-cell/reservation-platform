// @ts-nocheck -- fichier porté depuis un script JS existant (voir note en fin de réponse)
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

export default function ReceptionnisteDashboard() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const authDebug = useAuthStore.getState();
console.log("AUTH STATE:", authDebug);
console.log("TOKEN TYPE:", typeof authDebug.accessToken);
console.log("JWT PARTS:", authDebug.accessToken?.split(".").length);
console.log("TOKEN LENGTH:", authDebug.accessToken?.length);

  useEffect(() => {
    const ac = new AbortController();
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      logout();
      navigate('/connexion');
    }, { signal: ac.signal });

    // ---- begin ported script (identique à la version HTML d'origine) ----
  /* =========================================================
     DONNÉES UI + données chargées depuis le backend
     ========================================================= */
  const STATUS = {
    reserve:  { label: "Réservé",       cls: "st-reserve",  color: "#8957FF" },
    arrive:   { label: "Client arrivé", cls: "st-arrive",   color: "#66A5ED" },
    encours:  { label: "En cours",      cls: "st-encours",  color: "#E2954A" },
    termine:  { label: "Terminé",       cls: "st-termine",  color: "#3FA65C" },
    absent:   { label: "Absent",        cls: "st-absent",   color: "#7758A3" },
    annule:   { label: "Annulé",        cls: "st-annule",   color: "#711023" },
  };
  const STATUS_FLOW = ["reserve", "arrive", "encours", "termine"];

  window.localDateISO = function localDateISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  window.todayISO = function todayISO() {
    return localDateISO(new Date());
  }

  window.isoPlusDays = function isoPlusDays(iso, n) {
    const [y, m, day] = iso.split("-").map(Number);
    const d = new Date(y, m - 1, day);
    d.setDate(d.getDate() + n);
    return localDateISO(d);
  }
  const TODAY = todayISO();

  const API_BASE = "http://localhost:3000/api";

  // Données affichées dans l'interface : elles viennent maintenant du backend.
  let PROS = [];
  let CLIENTS = [];
  let APPTS = [];
  let NOTIFS = [];

  // Créneaux réels chargés depuis la table Disponibilite.
  // Structure : { [professionnelId]: [{ jourSemaine, heureDebut, heureFin, ... }] }
  let AVAILABILITIES = {};

  function getAccessToken() {
    return useAuthStore.getState().accessToken || "";
  }
async function apiPatch(path, body = {}) {
  const token = getAccessToken();

  const response = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok)
    throw new Error(data?.message || `Erreur HTTP ${response.status}`);

  return data;
}

  async function apiGet(path) {
    const token = getAccessToken();
    const response = await fetch(`${API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.message || data?.error || `Erreur HTTP ${response.status}`;
      throw new Error(message);
    }
    return data;
  }


  function availabilityDayIndex(iso) {
    // Prisma : 0 = lundi ... 6 = dimanche
    const d = new Date(`${iso}T12:00:00`);
    return (d.getDay() + 6) % 7;
  }

  function timeToMinutes(value) {
    const [h, m] = String(value || "00:00").split(":").map(Number);
    return (h * 60) + m;
  }

  async function loadCreneauxForProfessional(proId) {
    const data = await apiGet(
      `/receptionniste/professionnels/${encodeURIComponent(proId)}/creneaux`
    );

    AVAILABILITIES[proId] = Array.isArray(data) ? data : [];
    return AVAILABILITIES[proId];
  }

  async function loadAllCreneaux() {
    const entries = await Promise.all(
      PROS.map(async (p) => {
        try {
          const creneaux = await apiGet(
            `/receptionniste/professionnels/${encodeURIComponent(p.id)}/creneaux`
          );

          return [
            p.id,
            Array.isArray(creneaux) ? creneaux : []
          ];
        } catch (error) {
          console.error(`❌ Créneaux ${p.name} :`, error);
          return [p.id, []];
        }
      })
    );

    AVAILABILITIES = Object.fromEntries(entries);
  }

  function getProfessionalCreneauxForDate(proId, iso) {
    const day = availabilityDayIndex(iso);

    return (AVAILABILITIES[proId] || [])
      .filter((c) => Number(c.jourSemaine) === day);
  }

  function isProfessionalAvailableAtTime(proId, iso, time) {
    const minute = timeToMinutes(time);
    const creneaux = getProfessionalCreneauxForDate(proId, iso);

    return creneaux.some((c) => {
      const start = timeToMinutes(c.heureDebut);
      const end = timeToMinutes(c.heureFin);

      return minute >= start && minute < end;
    });
  }

  function isProfessionalAvailableAtHour(proId, iso, hour) {
    const hourStart = hour * 60;
    const hourEnd = hourStart + 60;
    const creneaux = getProfessionalCreneauxForDate(proId, iso);

    return creneaux.some((c) => {
      const start = timeToMinutes(c.heureDebut);
      const end = timeToMinutes(c.heureFin);

      // L'heure est cliquable si elle chevauche au moins une disponibilité.
      return hourStart < end && hourEnd > start;
    });
  }

  function isAnyVisibleProfessionalAvailableAtHour(iso, hour) {
    const pros = visiblePros();
    return pros.some((p) =>
      isProfessionalAvailableAtHour(p.id, iso, hour)
    );
  }

  function normalizeStatus(value) {
    const status = String(value || "reserve").toLowerCase();
    if (status === "en_cours" || status === "en-cours") return "encours";
    if (status === "réservé" || status === "reservee" || status === "reserved") return "reserve";
    if (status === "arrivé" || status === "arrivee") return "arrive";
    if (status === "terminé" || status === "terminee") return "termine";
    if (status === "annulé" || status === "annulee" || status === "cancelled") return "annule";
    return STATUS[status] ? status : "reserve";
  }

  function datePart(value) {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value).slice(0, 10) : localDateISO(d);
  }

  function timePart(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(11, 16);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function normalizeAppointment(rdv, client) {
    return {
      id: rdv.id,
      proId: rdv.professionnelId || rdv.proId || "",
      date: rdv.date || datePart(rdv.dateDebut),
      start: rdv.start || timePart(rdv.dateDebut),
      end: rdv.end || timePart(rdv.dateFin),
      client: client.name,
      phone: client.phone,
      dob: client.dob,
      email: client.email,
      service: rdv.service?.nom || rdv.serviceNom || rdv.motif || "Service",
      serviceId: rdv.serviceId || rdv.service?.id || "",
      status: normalizeStatus(rdv.statut || rdv.status),
      remark: rdv.remarque || rdv.remark || "",
      createdAt: datePart(rdv.createdAt) || client.createdAt || TODAY
    };
  }

  function normalizeClient(raw) {
    const name =
      raw.name ||
      [raw.prenom, raw.nom].filter(Boolean).join(" ") ||
      "Client";

    const client = {
      id: raw.id,
      name,
      phone: raw.phone || raw.telephone || "",
      email: raw.email || "",
      dob: datePart(raw.dob || raw.dateNaissance),
      adresse: raw.adresse || raw.address || "",
      createdAt: datePart(raw.createdAt),
      appts: []
    };

    const rdvs = raw.appts || raw.rdvs || raw.rendezVous || [];
    client.appts = Array.isArray(rdvs)
      ? rdvs.map((rdv) => normalizeAppointment(rdv, client))
      : [];

    return client;
  }

  function normalizeProfessional(item, index) {
    const p = item.professionnel || item;
    const u = p.user || {};
    const prenom = p.prenom || u.prenom || "";
    const nom = p.nom || u.nom || "";
    const name =
      p.name ||
      p.nomComplet ||
      [prenom, nom].filter(Boolean).join(" ") ||
      u.email ||
      `Professionnel ${index + 1}`;

    const specialite =
      typeof p.specialite === "string"
        ? p.specialite
        : p.specialite?.nom;

    const rawColor = p.couleur || p.color || "";
    const fallbackColors = ["#8957FF", "#2FA79D", "#E2478A", "#E2954A", "#4A7BE2"];

    return {
      id: p.id,
      name,
      role: specialite || p.role || p.profession || p.type || "Professionnel",
      phone: p.telephone || p.phone || u.telephone || "",
      email: p.email || u.email || "",
      photo: p.photo || p.photoUrl || u.photo || "",
      color: rawColor
        ? (String(rawColor).startsWith("#") ? String(rawColor) : `#${rawColor}`)
        : fallbackColors[index % fallbackColors.length],
      initials: name
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      accountActive: item.actif !== false && p.actif !== false,
      canEdit: item.peutGererParametres === true,
          canManagePlanning:  item.peutGererPlanning === true
    };
  }

  function rebuildAppointmentsFromClients() {
    const allowedPros = new Set(PROS.map((p) => p.id));
    const byId = new Map();

    CLIENTS.forEach((client) => {
      client.appts.forEach((appt) => {
        if (allowedPros.size && !allowedPros.has(appt.proId)) return;
        byId.set(appt.id, appt);
      });
    });

    APPTS = Array.from(byId.values());
  }

  async function loadProfessionnels() {
    const data = await apiGet("/receptionniste/professionnels");
    const rows = Array.isArray(data) ? data : [];
    PROS = rows.map(normalizeProfessional);
    rebuildAppointmentsFromClients();
    return PROS;
  }
async function loadRdvList() {
  try {
    const data = await apiGet('/receptionniste/rendez-vous');

    if (!Array.isArray(data)) {
      APPTS = [];
      return;
    }

    APPTS = data.map((rdv) => {
      const debut = new Date(rdv.dateDebut);
      const fin = new Date(rdv.dateFin);

      return {
        id: rdv.id,
        clientId: rdv.clientId || rdv.client?.id || '',
        proId: rdv.professionnelId,
        serviceId: rdv.serviceId || rdv.service?.id || '',

        date: localDateISO(debut),
        start: `${String(debut.getHours()).padStart(2, '0')}:${String(debut.getMinutes()).padStart(2, '0')}`,
        end: `${String(fin.getHours()).padStart(2, '0')}:${String(fin.getMinutes()).padStart(2, '0')}`,

        nom: rdv.client?.nom || '',
        prenom: rdv.client?.prenom || '',
        client: `${rdv.client?.prenom || ''} ${rdv.client?.nom || ''}`.trim(),
        phone: rdv.client?.telephone || '',
        email: rdv.client?.email || '',
        adresse: rdv.client?.adresse || '',
        dob: rdv.client?.dateNaissance
          ? String(rdv.client.dateNaissance).slice(0, 10)
          : '',

        service: rdv.service?.nom || 'Service',
        status: mapRdvStatus(rdv.statut),
        remark: rdv.remarque || '',
        createdAt: datePart(rdv.createdAt)
      };
    });

    console.log('📅 RDVs convertis :', APPTS);
  } catch (error) {
    console.error('❌ Chargement RDVs :', error);
    throw error;
  }
}

function mapRdvStatus(statut) {
  const s = String(statut || '').toLowerCase();

  if (s.includes('annul')) return 'annule';
  if (s.includes('absent')) return 'absent';
  if (s.includes('termin')) return 'termine';
  if (s.includes('cours')) return 'encours';
  if (s.includes('arriv')) return 'arrive';

  return 'reserve';
}

  async function loadClients(search = "") {
    const query = search.trim();
    const suffix = query ? `?search=${encodeURIComponent(query)}` : "";
    const data = await apiGet(`/receptionniste/clients${suffix}`);
    const rows = Array.isArray(data) ? data : [];

    const allowedPros = new Set(PROS.map((p) => p.id));
    CLIENTS = rows.map(normalizeClient).map((client) => ({
      ...client,
      appts: allowedPros.size
        ? client.appts.filter((appt) => allowedPros.has(appt.proId))
        : client.appts
    }));

    if (allowedPros.size) {
      CLIENTS = CLIENTS.filter((client) => client.appts.length > 0);
    }

    rebuildAppointmentsFromClients();

    if (document.getElementById("clientsTableBody")) renderClientsTable();
    if (document.getElementById("page-pros")?.classList.contains("active")) renderProsPage();
    if (state.page === "dashboard") {
      renderAgenda();
    }

    return CLIENTS;
  }

  window.loadServicesForProfessional = async function loadServicesForProfessional(proId) {
    const select = document.getElementById("nrService");
    if (!select) return;

    if (!proId) {
      select.innerHTML = `<option value="">Choisir un service</option>`;
      return;
    }

    select.innerHTML = `<option value="">Chargement...</option>`;

    try {
      const response = await fetch(`${API_BASE}/public/professionnels/${encodeURIComponent(proId)}/services`);
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data?.message || `Erreur HTTP ${response.status}`);

      const services = Array.isArray(data) ? data : (data?.services || []);
      const actifs = services.filter((service) => service.actif !== false);

      select.innerHTML =
        `<option value="">Choisir un service</option>` +
        actifs.map((service) =>
          `<option value="${service.id}">${service.nom || service.name || "Service"}</option>`
        ).join("");
    } catch (error) {
      console.error("❌ Services :", error);
      select.innerHTML = `<option value="">Impossible de charger les services</option>`;
    }
  };

  async function loadBackendData() {
    try {
      await loadProfessionnels();
      await loadAllCreneaux();
      await loadClients();
      await loadRdvList();
    } catch (error) {
      console.error("❌ Chargement backend :", error);
      showToast(`❌ ${error.message || "Impossible de charger les données du backend"}`);
    }

    goToPage("dashboard");
  }


  const NOTIF_ICONS = {
    new: { bg: "#F1ECFF", color: "#8957FF", svg: '<path d="M12 5v14M5 12h14"/>' },
    cancel: { bg: "#FDEDEC", color: "#D9483C", svg: '<circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' },
    conflict: { bg: "#FDF1E2", color: "#E2954A", svg: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
    absent: { bg: "#EEEDF2", color: "#8A8496", svg: '<circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>' },
    soon: { bg: "#E6F7F5", color: "#2FA79D", svg: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>' },
    edit: { bg: "#F1ECFF", color: "#8957FF", svg: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>' },
  };

  /* =========================================================
     ÉTAT UI
     ========================================================= */
  let state = {
    page: "dashboard",
    agendaView: "day",       // day | week | month
    agendaDate: TODAY,
    proFilter: "all",
    proView: "grid",         // grid | list
    monthCursor: TODAY.slice(0, 7),
    datePicker: {
      open: false,
      viewYear: new Date().getFullYear(),
      viewMonth: new Date().getMonth()
    },
    rdvFilters: { status: "", pro: "", search: "" },
    clientSearch: { query: "" },
  };

  window.proById = function proById(id) { return PROS.find((p) => p.id === id); }
  window.fmtDateLong = function fmtDateLong(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  window.fmtDateShort = function fmtDateShort(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  window.calcAge = function calcAge(dob) {
    const d = new Date(dob); const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
    return age;
  }
  window.absentCount = function absentCount(client) {
    return APPTS.filter((a) => a.client === client && a.status === "absent").length;
  }
  window.showToast = function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerHTML = msg;
    t.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* =========================================================
     NAVIGATION
     ========================================================= */
  window.goToPage = function goToPage(page) {
  state.page = page;

  document.querySelectorAll(".nav-item").forEach((n) =>
    n.classList.toggle("active", n.dataset.page === page)
  );

  document.querySelectorAll(".page").forEach((p) => {
    const shouldShow = page === "dashboard"
      ? p.id === "page-agenda"
      : p.id === "page-" + page;
    p.classList.toggle("active", shouldShow);
  });

  renderPage(page);
}
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => goToPage(item.dataset.page), { signal: ac.signal });
  });

  document.getElementById("notifBellBtn")?.addEventListener(
    "click",
    () => goToPage("notifs"),
    { signal: ac.signal }
  );

  document.getElementById("globalSearchBtn")?.addEventListener(
    "click",
    () => {
      goToPage("clients");
      setTimeout(() => document.getElementById("clientSearchInput")?.focus(), 50);
    },
    { signal: ac.signal }
  );

  const profileBtn = document.getElementById("profileBtn");
  const profileMenu = document.getElementById("profileMenu");

  profileBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    profileMenu?.classList.toggle("show");
    profileBtn.classList.toggle("open");
  }, { signal: ac.signal });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#profileBtn") && !e.target.closest("#profileMenu")) {
      profileMenu?.classList.remove("show");
      profileBtn?.classList.remove("open");
    }
  }, { signal: ac.signal });

    window.renderPage = function (page) {
      if (page === "dashboard") renderAgenda();
      else if (page === "rdv") renderRdvPage();
      else if (page === "clients") renderClientsPage();
      else if (page === "pros") renderProsPage();
      else if (page === "settings") renderSettingsPage();
      else if (page === "notifs") renderNotifsPage();
      updateNotifBadges();
    };
window.updateNotifBadges = function updateNotifBadges() {
    const n = NOTIFS.filter((x) => x.unread).length;
    document.getElementById("navNotifBadge").textContent = n;
    document.getElementById("navNotifBadge").style.display = n ? "inline-block" : "none";
    document.getElementById("tbNotifDot").textContent = n;
    document.getElementById("tbNotifDot").style.display = n ? "flex" : "none";
  }

  /* =========================================================
     PAGE : TABLEAU DE BORD
     ========================================================= */
  window.renderDashboard = function renderDashboard() {
    const todays = APPTS.filter((a) => a.date === TODAY);
    const counts = {
      total: todays.length,
      arrive: todays.filter((a) => a.status === "arrive").length,
      encours: todays.filter((a) => a.status === "encours").length,
      termine: todays.filter((a) => a.status === "termine").length,
      annule: todays.filter((a) => a.status === "annule").length,
      absent: todays.filter((a) => a.status === "absent").length,
    };
    const upcoming = todays
      .filter((a) => ["reserve", "arrive"].includes(a.status) && a.start >= nowHM())
      .sort((a, b) => a.start.localeCompare(b.start));
    const next = upcoming[0];

    const statCards = [
      { label: "Rendez-vous aujourd'hui", value: counts.total, icon: iconCal(), bg: "#F1ECFF", color: "#8957FF" },
      { label: "Clients arrivés", value: counts.arrive, icon: iconCheck(), bg: "#E6F7F5", color: "#2FA79D" },
      { label: "En cours", value: counts.encours, icon: iconClock(), bg: "#FDF1E2", color: "#E2954A" },
      { label: "Terminés", value: counts.termine, icon: iconCheckCircle(), bg: "#E9F7ED", color: "#3FA65C" },
      { label: "Annulés", value: counts.annule, icon: iconX(), bg: "#FDEDEC", color: "#D9483C" },
      { label: "Absents", value: counts.absent, icon: iconUserX(), bg: "#EEEDF2", color: "#8A8496" },
    ];

    let html = `
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
          <div class="card-head"><h3>Planning du jour — ${fmtDateLong(TODAY)}</h3><button class="btn btn-ghost btn-sm" onclick="document.getElementById('page-agenda')?.scrollIntoView({behavior:'smooth',block:'start'})">Voir l'agenda</button></div>
          ${todays.length ? todays.sort((a,b)=>a.start.localeCompare(b.start)).map((a) => `
            <div class="dash-list-row" style="cursor:pointer;" onclick="openClientFiche('${encodeURIComponent(a.client)}')">
              <span class="dash-list-time">${a.start}</span>
              <div class="avatar-sm" style="background:${proById(a.proId).color}">${proById(a.proId).initials}</div>
              <div style="flex:1">
                <div class="dash-list-name">${a.client}</div>
                <div class="dash-list-sub">${a.service} · ${proById(a.proId).name}</div>
              </div>
              <span class="status-pill ${STATUS[a.status].cls}">${STATUS[a.status].label}</span>
            </div>`).join("") : `<div class="table-empty">Aucun rendez-vous aujourd'hui</div>`}
        </div>
        <div>
          ${next ? `
            <div class="next-rdv-card">
              <p class="next-rdv-eyebrow">Prochain rendez-vous</p>
              <p class="next-rdv-name">${next.client}</p>
              <div class="next-rdv-meta">${next.service} · ${proById(next.proId).name}</div>
              <div class="next-rdv-time">${next.start}</div>
            </div>` : `<div class="card" style="padding:20px;text-align:center;color:var(--ink-soft);font-size:13px;">Aucun rendez-vous à venir aujourd'hui</div>`}
          <div class="card">
            <div class="card-head"><h3>Notifications récentes</h3><button class="btn btn-ghost btn-sm" onclick="goToPage('notifs')">Tout voir</button></div>
            ${NOTIFS.slice(0, 3).map((n) => notifRowHtml(n, false)).join("")}
          </div>
         
        </div>
      </div>
    `;
    document.getElementById("page-dashboard").innerHTML = html;
  }
  window.nowHM = function nowHM() {
    const d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  /* =========================================================
     PAGE : AGENDA — nouveau style, données backend
     ========================================================= */
  const START_HOUR = 8;
  const END_HOUR = 19;
  const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const HOUR_HEIGHT = 72;
  const MONTH_NAMES_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

  window.setProView = function setProView(view) {
    state.proView = view;

    if (state.page === "pros") {
      renderProsPage();
    } else {
      renderAgenda();
    }
  };

  window.renderProRow = function renderProRow() {
    if (!PROS.length) {
      return `<div class="card" style="padding:22px;text-align:center;color:var(--ink-soft);">Aucun professionnel affecté.</div>`;
    }

    if (state.proView === "list") {
      return `<div class="pro-list-v3">${PROS.map((p) => {
        const selected = state.proFilter === p.id;
        const count = APPTS.filter((a) => a.proId === p.id && a.date === state.agendaDate && a.status !== "annule").length;
        const avatar = p.photo
          ? `<img src="${p.photo}" alt="${p.name}" class="pro-list-photo-v3" />`
          : `<div class="pro-list-photo-v3" style="background:${p.color};display:flex;align-items:center;justify-content:center;color:white;font-weight:800;">${p.initials}</div>`;

        return `<div class="pro-list-item-v3 ${selected ? 'selected' : ''}" onclick="setProFilter('${selected ? 'all' : p.id}')">
          ${avatar}
          <div class="pro-list-info-v3"><strong>${p.name}</strong><span>${p.role}</span></div>
          <div class="pro-list-services-v3"><span class="pro-service-tag">${p.role}</span></div>
          <div class="pro-list-end-v3"><span class="pro-list-count-v3">${count} RDV</span></div>
        </div>`;
      }).join("")}</div>`;
    }

    return `<div class="agenda-pro-row-v3">${PROS.map((p) => {
      const selected = state.proFilter === p.id;
      const avatar = p.photo
        ? `<img src="${p.photo}" alt="${p.name}" class="pro-photo-v3" />`
        : `<div class="pro-photo-v3" style="background:${p.color};display:flex;align-items:center;justify-content:center;color:white;font-weight:800;">${p.initials}</div>`;

      return `<div class="pro-card-v3 ${selected ? 'selected' : ''}" onclick="setProFilter('${selected ? 'all' : p.id}')">
        <div class="pro-photo-wrap-v3">
          ${avatar}
          <span class="pro-dot-v3" style="background:${p.color}"></span>
          ${selected ? `<span class="pro-check-v3">${iconCheck()}</span>` : ''}
        </div>
        <div class="pro-info-v3"><strong>${p.name}</strong><span>${p.role}</span></div>
      </div>`;
    }).join("")}</div>`;
  };

  window.agendaLegendHtml = function agendaLegendHtml() {
    return `<div class="agenda-legend-v3">
      <span class="agenda-legend-title">Légende</span>
      <div class="agenda-legend-items">
        ${Object.entries(STATUS).map(([k, v]) => `<span class="agenda-legend-item"><span class="agenda-legend-dot" style="background:${v.color}"></span>${v.label}</span>`).join("")}
      </div>
      <span class="agenda-legend-hint">💡 Cliquez sur un créneau vide pour créer un rendez-vous.</span>
    </div>`;
  };

  window.renderAgenda = function renderAgenda() {
    const html = `
      <div class="agenda-page-head">
        <div>
          <h1 class="agenda-title">Agenda</h1>
          <p class="agenda-subtitle">Gérez les rendez-vous des professionnels auxquels vous êtes affectée</p>
        </div>
        <button class="btn-reservio-primary" onclick="openNewRdv()">${iconPlus()} Nouveau rendez-vous</button>
      </div>

      <div class="agenda-toolbar-v3">
        <div class="agenda-toolbar-left-v3">
          <button class="agenda-arrow-btn-v3" id="agendaPrevBtn" type="button" title="Précédent">${iconChevronLeft()}</button>
          <button class="agenda-today-pill-v3" id="agendaTodayBtn" type="button">Aujourd'hui</button>
          <button class="agenda-arrow-btn-v3" id="agendaNextBtn" type="button" title="Suivant">${iconChevronRight()}</button>

          <div class="date-picker-wrap">
            <button class="agenda-date-pill-v3" type="button" id="agendaDatePill">
              ${iconCal()} <span>${agendaDateLabel()}</span>
            </button>
            <div class="date-picker-pop" id="datePickerPop"></div>
          </div>
        </div>

        <div class="agenda-toolbar-right-v3">
          <div class="view-toggle-v3" title="Affichage des professionnels">
            <button type="button" class="${state.proView === 'grid' ? 'active' : ''}" onclick="setProView('grid')" title="Grille">${iconGrid()}</button>
            <button type="button" class="${state.proView === 'list' ? 'active' : ''}" onclick="setProView('list')" title="Liste">${iconList()}</button>
          </div>

          <div class="agenda-select-v3">
            <button type="button" id="agendaViewSelectBtn">
              <span>Vue ${state.agendaView === 'day' ? 'jour' : state.agendaView === 'week' ? 'semaine' : 'mois'}</span>
              <span>⌄</span>
            </button>
            <div class="agenda-select-menu-v3" id="agendaViewMenu">
              <button onclick="setAgendaView('day')">Vue jour</button>
              <button onclick="setAgendaView('week')">Vue semaine</button>
              <button onclick="setAgendaView('month')">Vue mois</button>
            </div>
          </div>

          <div class="agenda-select-v3">
            <button type="button" id="agendaProSelectBtn">
              <span>${state.proFilter === 'all' ? 'Tous les professionnels' : proById(state.proFilter)?.name || 'Tous les professionnels'}</span>
              <span>⌄</span>
            </button>
            <div class="agenda-select-menu-v3" id="agendaProMenu">
              <button onclick="setProFilter('all')">Tous les professionnels</button>
              ${PROS.map((p) => `<button onclick="setProFilter('${p.id}')">${p.name}</button>`).join("")}
            </div>
          </div>

          <div class="export-wrap">
            <button class="agenda-arrow-btn-v3" onclick="toggleExportMenu(event)" title="Exporter">${iconPrinter()}</button>
            <div class="export-dropdown">
              <button onclick="event.stopPropagation(); exportMock('Planning / Agenda', 'PDF'); closeExportMenus()"><span>📄</span> PDF</button>
              <button onclick="event.stopPropagation(); exportMock('Planning / Agenda', 'Excel'); closeExportMenus()"><span>▦</span> Excel</button>
            </div>
          </div>
        </div>
      </div>

      ${renderProRow()}
      <div id="agendaMain"></div>
      ${agendaLegendHtml()}
    `;

    const page = document.getElementById("page-agenda");
    if (!page) return;
    page.innerHTML = html;

    document.getElementById("agendaPrevBtn")?.addEventListener("click", () => agendaShift(-1));
    document.getElementById("agendaNextBtn")?.addEventListener("click", () => agendaShift(1));
    document.getElementById("agendaTodayBtn")?.addEventListener("click", () => agendaToday());

    const viewBtn = document.getElementById("agendaViewSelectBtn");
    const viewMenu = document.getElementById("agendaViewMenu");
    const proBtn = document.getElementById("agendaProSelectBtn");
    const proMenu = document.getElementById("agendaProMenu");

    viewBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      viewMenu?.classList.toggle("show");
      proMenu?.classList.remove("show");
      closeDatePicker();
    });

    proBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      proMenu?.classList.toggle("show");
      viewMenu?.classList.remove("show");
      closeDatePicker();
    });

    document.getElementById("agendaDatePill")?.addEventListener("click", (e) => {
      e.stopPropagation();
      viewMenu?.classList.remove("show");
      proMenu?.classList.remove("show");
      toggleDatePicker();
    });

    renderAgendaMain();
  };

  document.addEventListener("click", (e) => {
    document.getElementById("agendaViewMenu")?.classList.remove("show");
    document.getElementById("agendaProMenu")?.classList.remove("show");
    if (!e.target.closest(".date-picker-wrap")) closeDatePicker();
  }, { signal: ac.signal });

  window.agendaDateLabel = function agendaDateLabel() {
    if (state.agendaView === "day") return capitalize(fmtDateLong(state.agendaDate));
    if (state.agendaView === "week") {
      const start = weekStart(state.agendaDate);
      return `${fmtDateShort(start)} – ${fmtDateShort(isoPlusDays(start, 6))}`;
    }
    const d = new Date(state.agendaDate + "T00:00:00");
    return capitalize(d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));
  };

  window.capitalize = function capitalize(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
  };

  window.weekStart = function weekStart(iso) {
    const [y, m, day] = iso.split("-").map(Number);
    const d = new Date(y, m - 1, day);
    const shift = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - shift);
    return localDateISO(d);
  };

  window.agendaShift = function agendaShift(direction) {
    if (state.agendaView === "day") {
      state.agendaDate = isoPlusDays(state.agendaDate, direction);
    } else if (state.agendaView === "week") {
      state.agendaDate = isoPlusDays(state.agendaDate, direction * 7);
    } else {
      const [y, m] = state.agendaDate.split("-").map(Number);
      const d = new Date(y, m - 1, 1);
      d.setMonth(d.getMonth() + direction);
      state.agendaDate = localDateISO(d);
    }
    state.monthCursor = state.agendaDate.slice(0, 7);
    renderAgenda();
  };

  window.agendaToday = function agendaToday() {
    state.agendaDate = TODAY;
    state.monthCursor = TODAY.slice(0, 7);
    state.agendaView = "day";
    renderAgenda();
  };

  window.setAgendaView = function setAgendaView(view) {
    state.agendaView = view;
    renderAgenda();
  };

  window.setProFilter = function setProFilter(id) {
    state.proFilter = id;
    renderAgenda();
  };

  window.visiblePros = function visiblePros() {
    return state.proFilter === "all" ? PROS : PROS.filter((p) => p.id === state.proFilter);
  };

  window.toggleDatePicker = function toggleDatePicker() {
    state.datePicker.open = !state.datePicker.open;
    if (state.datePicker.open) {
      const [y, m] = state.agendaDate.split("-").map(Number);
      state.datePicker.viewYear = y;
      state.datePicker.viewMonth = m - 1;
    }
    renderDatePicker();
  };

  window.closeDatePicker = function closeDatePicker() {
    if (!state.datePicker.open) return;
    state.datePicker.open = false;
    renderDatePicker();
  };

  window.shiftDatePickerMonth = function shiftDatePickerMonth(direction) {
    let month = state.datePicker.viewMonth + direction;
    let year = state.datePicker.viewYear;
    if (month < 0) { month = 11; year -= 1; }
    if (month > 11) { month = 0; year += 1; }
    state.datePicker.viewMonth = month;
    state.datePicker.viewYear = year;
    renderDatePicker();
  };

  window.setDatePickerMonth = function setDatePickerMonth(month) {
    state.datePicker.viewMonth = Number(month);
    renderDatePicker();
  };

  window.setDatePickerYear = function setDatePickerYear(year) {
    state.datePicker.viewYear = Number(year);
    renderDatePicker();
  };

  window.pickDate = function pickDate(iso) {
    state.agendaDate = iso;
    state.monthCursor = iso.slice(0, 7);
    state.datePicker.open = false;
    renderAgenda();
  };

  window.renderDatePicker = function renderDatePicker() {
    const pop = document.getElementById("datePickerPop");
    if (!pop) return;
    if (!state.datePicker.open) {
      pop.classList.remove("show");
      pop.innerHTML = "";
      return;
    }

    const y = state.datePicker.viewYear;
    const m = state.datePicker.viewMonth;
    const first = new Date(y, m, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const gridStart = new Date(y, m, 1 - startOffset);
    const cells = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return localDateISO(d);
    });
    const years = Array.from({ length: 13 }, (_, i) => y - 6 + i);

    pop.innerHTML = `
      <div class="date-picker-head">
        <button type="button" class="date-picker-nav" onclick="event.stopPropagation(); shiftDatePickerMonth(-1)">${iconChevronLeft()}</button>
        <div class="date-picker-selects">
          <select onchange="event.stopPropagation(); setDatePickerMonth(this.value)">
            ${MONTH_NAMES_FR.map((name, i) => `<option value="${i}" ${i === m ? 'selected' : ''}>${name}</option>`).join("")}
          </select>
          <select onchange="event.stopPropagation(); setDatePickerYear(this.value)">
            ${years.map((year) => `<option value="${year}" ${year === y ? 'selected' : ''}>${year}</option>`).join("")}
          </select>
        </div>
        <button type="button" class="date-picker-nav" onclick="event.stopPropagation(); shiftDatePickerMonth(1)">${iconChevronRight()}</button>
      </div>
      <div class="date-picker-dow-row">${["Lu","Ma","Me","Je","Ve","Sa","Di"].map((d) => `<span>${d}</span>`).join("")}</div>
      <div class="date-picker-grid">
        ${cells.map((iso) => {
          const d = new Date(iso + "T00:00:00");
          const muted = d.getMonth() !== m;
          return `<button type="button" class="date-picker-cell ${muted ? 'muted' : ''} ${iso === TODAY ? 'today' : ''} ${iso === state.agendaDate ? 'selected' : ''}" onclick="event.stopPropagation(); pickDate('${iso}')">${d.getDate()}</button>`;
        }).join("")}
      </div>
      <div class="date-picker-footer"><button type="button" class="date-picker-today-btn" onclick="event.stopPropagation(); pickDate('${TODAY}')">Aujourd'hui</button></div>
    `;

    pop.classList.add("show");
  };

  window.renderAgendaMain = function renderAgendaMain() {
    const el = document.getElementById("agendaMain");
    if (!el) return;

    if (state.agendaView === "day") {
      el.innerHTML = dayViewHtml();
      placeDayAppts();
    } else if (state.agendaView === "week") {
      el.innerHTML = weekViewHtml();
      placeWeekAppts();
    } else {
      el.innerHTML = monthViewHtml();
    }
  };

  window.dayViewHtml = function dayViewHtml() {
    const pros = visiblePros();

    if (!pros.length) {
      return `<div class="card" style="padding:40px;text-align:center;color:var(--ink-soft);">Aucun professionnel à afficher.</div>`;
    }

    return `<div class="agenda-grid-v3">
      <div class="agenda-hours-col-v3">
        ${HOURS.map((h) => `
          <div
            class="agenda-hour-label-v3"
            style="height:${HOUR_HEIGHT}px"
          >
            ${String(h).padStart(2, '0')}:00
          </div>
        `).join("")}

        <div class="agenda-hour-label-v3 agenda-hour-label-last-v3">
          ${END_HOUR}:00
        </div>
      </div>

      <div class="agenda-pros-wrapper-v3">
        ${pros.map((p) => `
          <div class="agenda-pro-col-v3" data-pro="${p.id}">
            ${HOURS.map((h) => {
              const available =
                isProfessionalAvailableAtHour(
                  p.id,
                  state.agendaDate,
                  h
                );

              return `
                <div
                  class="agenda-pro-slot-v3 ${available ? "" : "agenda-slot-unavailable"}"
                  data-hour="${h}"
                  style="height:${HOUR_HEIGHT}px"
                  title="${available ? "Créneau disponible" : "Professionnel indisponible"}"
                  onclick="handleDayColClick(event,'${p.id}',${h})"
                ></div>
              `;
            }).join("")}

            <div class="agenda-pro-slot-v3 agenda-pro-slot-last-v3"></div>
            <div class="agenda-pro-appts-v3"></div>
          </div>
        `).join("")}
      </div>
    </div>`;
  };

  window.handleDayColClick = function handleDayColClick(e, proId, hour) {
    if (e.target.closest(".appt-card-v3")) return;

    const available =
      isProfessionalAvailableAtHour(
        proId,
        state.agendaDate,
        hour
      );

    if (!available) {
      showToast("🔒 Ce professionnel n'est pas disponible à cette heure.");
      return;
    }

    openNewRdv({
      proId,
      date: state.agendaDate,
      start: `${String(hour).padStart(2, '0')}:00`
    });
  };

  window.placeDayAppts = function placeDayAppts() {
    const dayAppts = APPTS.filter((a) =>
      a.date === state.agendaDate &&
      (state.proFilter === "all" || a.proId === state.proFilter) &&
      a.status !== "annule"
    );

    dayAppts.forEach((a) => {
      const overlay = document.querySelector(`.agenda-pro-col-v3[data-pro="${a.proId}"] .agenda-pro-appts-v3`);
      if (!overlay) return;

      const [sh, sm] = a.start.split(":").map(Number);
      const [eh, em] = a.end.split(":").map(Number);
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
      const top = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
      const height = Math.max(42, ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT - 6);
      if (top < 0) return;

      const st = STATUS[a.status] || STATUS.reserve;
      const tints = { reserve: "#E9E3FF", arrive: "#E8F1FF", encours: "#FEF3E2", termine: "#E6F7EE", absent: "#F1F1F4", annule: "#FEECEC" };
      const block = document.createElement("div");
      block.className = "appt-card-v3";
      block.style.top = `${top}px`;
      block.style.height = `${height}px`;
      block.style.background = tints[a.status] || "#E9E3FF";
      block.style.borderLeft = `4px solid ${st.color}`;
    block.innerHTML = `
  <div class="appt-card-v3-main">

    <div class="appt-card-v3-time">
      ${a.start} – ${a.end}
    </div>

    <div class="appt-card-v3-name">
      ${a.client}
    </div>

    <div class="appt-card-v3-service">
      ${a.service}
    </div>

  </div>

  <span
    class="appt-card-v3-badge"
    style="background:${st.color}"
  >
    ${statusIconSvg(a.status)}
  </span>
`;
      block.onclick = (e) => { e.stopPropagation(); openRdvDetail(a.id); };
      overlay.appendChild(block);
    });

    const now = new Date();
    if (state.agendaDate === TODAY && now.getHours() >= START_HOUR && now.getHours() < END_HOUR) {
      const minutes = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
      const line = document.createElement("div");
      line.className = "agenda-timeline-v3";
      line.style.top = `${(minutes / 60) * HOUR_HEIGHT}px`;
      line.innerHTML = `<span class="agenda-timeline-label-v3">${nowHM()}</span>`;
      document.querySelector(".agenda-grid-v3")?.appendChild(line);
    }
  };

  window.weekViewHtml = function weekViewHtml() {
    const start = weekStart(state.agendaDate);
    const days = Array.from(
      { length: 7 },
      (_, i) => isoPlusDays(start, i)
    );

    return `<div class="week-calendar-v3">
      <div class="week-header-v3">
        <div class="week-header-corner-v3"></div>

        <div class="week-header-days-v3">
          ${days.map((iso) => {
            const d = new Date(iso + "T00:00:00");

            return `
              <div
                class="week-header-day-v3 ${iso === TODAY ? 'today' : ''}"
                onclick="jumpToDay('${iso}')"
              >
                <span class="week-header-dow-v3">
                  ${capitalize(
                    d.toLocaleDateString(
                      'fr-FR',
                      { weekday: 'short' }
                    )
                  )}
                </span>

                <span class="week-header-num-v3">
                  ${d.getDate()}
                </span>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <div class="week-body-v3">
        <div class="week-hours-col-v3">
          ${HOURS.map((h) => `
            <div
              class="agenda-hour-label-v3"
              style="height:${HOUR_HEIGHT}px"
            >
              ${String(h).padStart(2,'0')}:00
            </div>
          `).join("")}

          <div class="agenda-hour-label-v3 agenda-hour-label-last-v3">
            ${END_HOUR}:00
          </div>
        </div>

        <div class="week-days-wrapper-v3">
          ${days.map((iso) => `
            <div class="week-day-col-v3" data-date="${iso}">
              ${HOURS.map((h) => {
                const available =
                  isAnyVisibleProfessionalAvailableAtHour(
                    iso,
                    h
                  );

                return `
                  <div
                    class="week-day-slot-v3 ${available ? "" : "agenda-slot-unavailable"}"
                    style="height:${HOUR_HEIGHT}px"
                    title="${available ? "Créneau disponible" : "Aucun professionnel disponible"}"
                    onclick="handleWeekColClick(event,'${iso}',${h})"
                  ></div>
                `;
              }).join("")}

              <div class="week-day-slot-v3 week-day-slot-last-v3"></div>
              <div class="week-day-appts-v3"></div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>`;
  };

  window.handleWeekColClick = function handleWeekColClick(e, iso, hour) {
    if (e.target.closest(".week-appt-card-v3")) return;

    if (!isAnyVisibleProfessionalAvailableAtHour(iso, hour)) {
      showToast("🔒 Aucun professionnel disponible à cette heure.");
      return;
    }

    openNewRdv({
      date: iso,
      start: `${String(hour).padStart(2, '0')}:00`
    });
  };

  window.placeWeekAppts = function placeWeekAppts() {
    const start = weekStart(state.agendaDate);
    const days = Array.from({ length: 7 }, (_, i) => isoPlusDays(start, i));

    days.forEach((iso) => {
      const overlay = document.querySelector(`.week-day-col-v3[data-date="${iso}"] .week-day-appts-v3`);
      if (!overlay) return;

      APPTS.filter((a) =>
        a.date === iso &&
        (state.proFilter === "all" || a.proId === state.proFilter) &&
        a.status !== "annule"
      ).forEach((a) => {
        const [sh, sm] = a.start.split(":").map(Number);
        const [eh, em] = a.end.split(":").map(Number);
        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;
        const top = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
        const height = Math.max(40, ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT - 5);
        if (top < 0) return;

        const st = STATUS[a.status] || STATUS.reserve;
        const p = proById(a.proId) || { name: "Professionnel", color: "#7350E8", initials: "P" };
        const block = document.createElement("div");
        block.className = "week-appt-card-v3";
        block.style.top = `${top}px`;
        block.style.height = `${height}px`;
        block.style.background = `${st.color}18`;
        block.style.borderLeft = `3px solid ${st.color}`;
        block.innerHTML = `<div class="week-appt-time-v3">${a.start}</div><div class="week-appt-name-v3">${a.client}</div><div class="week-appt-pro-v3">${p?.name || ''}</div>`;
        block.onclick = (e) => { e.stopPropagation(); openRdvDetail(a.id); };
        overlay.appendChild(block);
      });
    });
  };

  window.monthViewHtml = function monthViewHtml() {
    const [y, m] = state.agendaDate.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    const offset = (first.getDay() + 6) % 7;
    const cursor = new Date(first);
    cursor.setDate(first.getDate() - offset);
    const weeks = [];

    while (cursor <= last || weeks.length < 4) {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(cursor);
        d.setDate(cursor.getDate() + i);
        return localDateISO(d);
      });
      weeks.push(days);
      cursor.setDate(cursor.getDate() + 7);
      if (weeks.length >= 6 || (cursor > last && cursor.getMonth() !== m - 1)) break;
    }

    return `<div class="month-weeks-v3">${weeks.map((days, idx) => {
      const total = days.reduce((sum, iso) => sum + APPTS.filter((a) => a.date === iso && (state.proFilter === 'all' || a.proId === state.proFilter) && a.status !== 'annule').length, 0);
      return `<article class="week-card-v3">
        <header class="week-card-head-v3">
          <div class="week-card-title-v3"><span class="week-card-badge-v3">Semaine ${idx + 1}</span><span class="week-card-range-v3">${fmtDateShort(days[0])} — ${fmtDateShort(days[6])}</span></div>
          <span class="week-card-count-v3">${total} RDV</span>
        </header>
        <div class="week-card-days-v3">
          ${days.map((iso) => {
            const d = new Date(iso + "T00:00:00");
            const appts = APPTS.filter((a) => a.date === iso && (state.proFilter === 'all' || a.proId === state.proFilter) && a.status !== 'annule').sort((a,b) => a.start.localeCompare(b.start));
            return `<div class="week-card-day-v3 ${d.getMonth() !== m - 1 ? 'muted' : ''} ${iso === TODAY ? 'today' : ''}">
              <div class="week-card-day-head-v3" onclick="jumpToDay('${iso}')"><span class="week-card-dow-v3">${capitalize(d.toLocaleDateString('fr-FR',{weekday:'short'}))}</span><span class="week-card-num-v3">${d.getDate()}</span></div>
              <div class="week-card-appts-v3">
                ${appts.length ? appts.map((a) => {
                  const st = STATUS[a.status] || STATUS.reserve;
                  return `<div class="week-card-appt-v3" style="border-left-color:${st.color};background:${st.color}14" onclick="event.stopPropagation(); openRdvDetail('${a.id}')"><span class="week-card-appt-time-v3">${a.start}</span><span class="week-card-appt-name-v3">${a.client}</span><span class="week-card-appt-pro-v3">${proById(a.proId)?.name || ''}</span></div>`;
                }).join("") : `<div class="week-card-empty-v3">—</div>`}
              </div>
            </div>`;
          }).join("")}
        </div>
      </article>`;
    }).join("")}</div>`;
  };

  window.jumpToDay = function jumpToDay(iso) {
    state.agendaDate = iso;
    state.agendaView = "day";
    renderAgenda();
  };

/* =========================================================
     PAGE : RENDEZ-VOUS (liste complète, filtres, export)
     ========================================================= */
  window.renderRdvPage = function renderRdvPage() {
    let html = `
      <div class="page-head">
        <div><h1 class="page-title">Rendez-vous</h1><p class="page-sub">Liste complète, avec filtres et export</p></div>
        <button class="btn btn-primary" onclick="openNewRdv()">${iconPlus()} Nouveau rendez-vous</button>
      </div>
      <div class="filter-row">
        <input type="text" id="rdvSearchInput" placeholder="Rechercher un client…" value="${state.rdvFilters.search}" oninput="updateRdvFilter('search', this.value)" style="min-width:220px" />
        <select onchange="updateRdvFilter('status', this.value)">
          <option value="">Tous les statuts</option>
          ${Object.entries(STATUS).map(([k,v]) => `<option value="${k}" ${state.rdvFilters.status===k?'selected':''}>${v.label}</option>`).join("")}
        </select>
        <select onchange="updateRdvFilter('pro', this.value)">
          <option value="">Tous les professionnels</option>
          ${PROS.map((p) => `<option value="${p.id}" ${state.rdvFilters.pro===p.id?'selected':''}>${p.name}</option>`).join("")}
        </select>
<div class="export-wrap">
  <button
    class="btn btn-ghost btn-sm"
    onclick="toggleExportMenu(event)"
  >
    ${iconPrinter()} Exporter
  </button>

  <div class="export-dropdown">
    <button onclick="event.stopPropagation(); exportMock('Liste des rendez-vous', 'PDF'); closeExportMenus()">
      <span>📄</span>
      PDF
    </button>

    <button onclick="event.stopPropagation(); exportMock('Liste des rendez-vous', 'Excel'); closeExportMenus()">
      <span>▦</span>
      Excel
    </button>
  </div>
</div>      </div>
      <div class="card">
        <table class="data-table">
          <thead><tr><th>Client</th><th>Service</th><th>Professionnel</th><th>Date</th><th>Heure</th><th>Statut</th><th></th></tr></thead>
          <tbody id="rdvTableBody"></tbody>
        </table>
      </div>
    `;
    document.getElementById("page-rdv").innerHTML = html;
    renderRdvTable();
  }
  window.updateRdvFilter = function updateRdvFilter(key, val) { state.rdvFilters[key] = val; renderRdvTable(); }
  window.renderRdvTable = function renderRdvTable() {
    const f = state.rdvFilters;
    let rows = APPTS.filter((a) => {
      if (f.status && a.status !== f.status) return false;
      if (f.pro && a.proId !== f.pro) return false;
      if (f.search && !a.client.toLowerCase().includes(f.search.toLowerCase())) return false;
      return true;
    }).sort((a,b) => (b.date+b.start).localeCompare(a.date+a.start));
    const body = document.getElementById("rdvTableBody");
    if (!rows.length) { body.innerHTML = `<tr><td colspan="7"><div class="table-empty">Aucun rendez-vous ne correspond à ces filtres</div></td></tr>`; return; }
    body.innerHTML = rows.map((a) => {
      const p = proById(a.proId);
      const warn = absentCount(a.client) >= 2 ? `<span class="repeat-warning">${iconAlert()} absences répétées</span>` : "";
      return `<tr class="row-clickable" onclick="openRdvDetail('${a.id}')">
        <td><div class="cell-client"><div class="avatar-sm" style="background:${p.color}">${initials(a.client)}</div><div><div class="cell-client-name">${a.client}${warn}</div><div class="cell-client-sub">${a.phone}</div></div></div></td>
        <td>${a.service}</td>
        <td>${p.name}</td>
        <td>${fmtDateShort(a.date)}</td>
        <td>${a.start}</td>
        <td><span class="status-pill ${STATUS[a.status].cls}">${STATUS[a.status].label}</span></td>
        <td><div class="row-actions" onclick="event.stopPropagation()">
          <button class="icon-btn" title="Modifier" onclick="openRdvDetail('${a.id}')">${iconEdit()}</button>
        </div></td>
      </tr>`;
    }).join("");
  }
  window.initials = function initials(name) { return name.split(" ").map((w) => w[0]).slice(0,2).join("").toUpperCase(); }

  /* =========================================================
     PAGE : CLIENTS
     ========================================================= */
  window.uniqueClients = function uniqueClients() {
    return CLIENTS;
  }
  window.renderClientsPage = function renderClientsPage() {
    let html = `
      <div class="page-head">
        <div>
          <h1 class="page-title">Clients</h1>
          <p class="page-sub">Retrouvez rapidement un client et consultez son historique</p>
        </div>
      </div>

      <div class="client-search-panel">
        <div class="client-search-left">
          <div class="client-search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <div class="client-search-content">
            <label>Rechercher un client</label>
            <input
              type="text"
              id="clientSearchInput"
              placeholder="Nom, téléphone ou adresse e-mail..."
              value="${state.clientSearch.query || ""}"
              oninput="updateClientFilter('query', this.value)"
            />
          </div>
        </div>

        <div class="client-search-actions">
          <span id="clientCount" class="client-count">0 client</span>
          <div class="export-wrap">
            <button class="btn btn-ghost btn-sm" onclick="toggleExportMenu(event)">
              ${iconPrinter()} Exporter
            </button>
            <div class="export-dropdown">
              <button onclick="event.stopPropagation(); exportMock('Liste des clients', 'PDF'); closeExportMenus()"><span>📄</span> PDF</button>
              <button onclick="event.stopPropagation(); exportMock('Liste des clients', 'Excel'); closeExportMenus()"><span>▦</span> Excel</button>
            </div>
          </div>
        </div>
      </div>

      <div class="client-table-shell">
        <table class="data-table client-table">
          <thead>
            <tr><th>Client</th><th>Téléphone</th><th>E-mail</th><th>Rendez-vous</th><th>Dernier RDV</th><th></th></tr>
          </thead>
          <tbody id="clientsTableBody"></tbody>
        </table>
      </div>
    `;

    document.getElementById("page-clients").innerHTML = html;
    renderClientsTable();
  }

  let clientSearchTimer;
  window.updateClientFilter = function updateClientFilter(key, val) {
    state.clientSearch[key] = val;
    clearTimeout(clientSearchTimer);
    clientSearchTimer = setTimeout(() => {
      loadClients(val).catch((error) => {
        console.error("❌ Recherche clients :", error);
        showToast(`❌ ${error.message || "Erreur de recherche"}`);
      });
    }, 250);
  }

  window.renderClientsTable = function renderClientsTable() {
    const query = (state.clientSearch.query || "").trim().toLowerCase();
    const cleanQuery = query.replace(/\s/g, "");

    let clients = uniqueClients().filter((c) => {
      if (!query) return true;
      const name = c.name.toLowerCase();
      const phone = (c.phone || "").replace(/\s/g, "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      return name.includes(query) || phone.includes(cleanQuery) || email.includes(query);
    });

    const counter = document.getElementById("clientCount");
    if (counter) counter.textContent = `${clients.length} client${clients.length > 1 ? "s" : ""}`;

    const body = document.getElementById("clientsTableBody");
    if (!body) return;

    if (!clients.length) {
      body.innerHTML = `<tr><td colspan="6"><div class="client-empty"><div class="client-empty-icon">🔎</div><strong>Aucun client trouvé</strong><span>Essayez avec un autre nom, téléphone ou e-mail</span></div></td></tr>`;
      return;
    }

    body.innerHTML = clients.map((c) => {
      const last = c.appts.slice().sort((a,b) => (b.date+b.start).localeCompare(a.date+a.start))[0];
      const warn = absentCount(c.name) >= 2 ? `<span class="repeat-warning">${iconAlert()} absences répétées</span>` : "";
      return `
        <tr class="row-clickable client-row" onclick="openClientFiche('${encodeURIComponent(c.name)}')">
          <td>
            <div class="cell-client">
              <div class="avatar-sm client-avatar">${initials(c.name)}</div>
              <div>
                <div class="cell-client-name">${c.name}${warn}</div>
                <div class="cell-client-sub">${c.dob ? `${calcAge(c.dob)} ans` : "Date de naissance non renseignée"}</div>
              </div>
            </div>
          </td>
          <td>${c.phone}</td>
          <td>${c.email || "—"}</td>
          <td><span class="client-rdv-number">${c.appts.length}</span></td>
          <td>${last ? fmtDateShort(last.date) : "—"}</td>
          <td><button class="icon-btn" title="Voir la fiche" onclick="event.stopPropagation(); openClientFiche('${encodeURIComponent(c.name)}')">${iconEye()}</button></td>
        </tr>`;
    }).join("");
  }

/* =========================================================
   PAGE : PROFESSIONNELS
   ========================================================= */
window.openEditCreneaux = async function openEditCreneaux(proId) {
  const p = proById(proId);

  if (!p) {
    showToast("❌ Professionnel introuvable");
    return;
  }

  if (!p.canManagePlanning) {
    showToast("🔒 Vous n'avez pas l'autorisation de modifier ce planning");
    return;
  }

  let creneaux = [];

  try {
    const data = await apiGet(
      `/receptionniste/professionnels/${encodeURIComponent(proId)}/creneaux`
    );

    creneaux = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("❌ Chargement créneaux :", error);
    showToast(`❌ ${error.message || "Impossible de charger les créneaux"}`);
    return;
  }

  const jours = [
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
    "Dimanche"
  ];

  const html = `
    <div class="modal-head">
      <div>
        <p class="modal-title">Disponibilités</p>
        <p class="modal-sub">${p.name} — ${p.role}</p>
      </div>

      <button
        type="button"
        class="modal-close"
        onclick="closeModal()"
      >
        ×
      </button>
    </div>

    <div style="margin-bottom:16px;padding:12px 14px;border-radius:12px;background:var(--primary-soft);color:var(--primary-dark);font-size:12.5px;">
      Modifiez les heures de disponibilité du professionnel puis cliquez sur
      <strong>Enregistrer</strong>.
    </div>

    <div id="creneauxEditor">
      ${jours.map((jour, index) => {
        const slots = creneaux.filter(
          (c) => Number(c.jourSemaine) === index
        );

        return `
          <div
            class="creneau-day"
            data-day="${index}"
            style="
              border:1px solid var(--primary-soft);
              border-radius:12px;
              padding:14px;
              margin-bottom:12px;
              background:#fff;
            "
          >
            <div
              style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:12px;
                margin-bottom:10px;
              "
            >
              <strong>${jour}</strong>

              <button
                type="button"
                class="btn btn-ghost btn-sm"
                onclick="addCreneauRow(${index})"
              >
                + Ajouter un créneau
              </button>
            </div>

            <div
              id="creneaux-day-${index}"
              class="creneaux-day-slots"
            >
              ${
                slots.length
                  ? slots.map((slot) => `
                      <div
                        class="creneau-row"
                        style="
                          display:flex;
                          align-items:center;
                          gap:10px;
                          margin-bottom:8px;
                        "
                      >
                        <input
                          type="time"
                          class="creneau-start"
                          value="${slot.heureDebut || ""}"
                        />

                        <span>—</span>

                        <input
                          type="time"
                          class="creneau-end"
                          value="${slot.heureFin || ""}"
                        />

                        <button
                          type="button"
                          class="icon-btn"
                          onclick="this.closest('.creneau-row').remove()"
                          title="Supprimer"
                        >
                          ×
                        </button>
                      </div>
                    `).join("")
                  : `
                      <div
                        class="creneau-empty"
                        style="
                          font-size:12px;
                          color:var(--ink-soft);
                          padding:6px 0;
                        "
                      >
                        Aucun créneau
                      </div>
                    `
              }
            </div>
          </div>
        `;
      }).join("")}
    </div>

    <div class="modal-actions">
      <button
        type="button"
        class="btn btn-ghost"
        onclick="closeModal()"
      >
        Annuler
      </button>

      <button
        type="button"
        class="btn btn-primary"
        onclick="saveCreneaux('${proId}')"
      >
        ${iconCheck()} Enregistrer
      </button>
    </div>
  `;

  openModal(html, true);
};

window.addCreneauRow = function addCreneauRow(day) {
  const container = document.getElementById(`creneaux-day-${day}`);
  if (!container) return;

  container.querySelector(".creneau-empty")?.remove();

  container.insertAdjacentHTML(
    "beforeend",
    `
      <div
        class="creneau-row"
        style="
          display:flex;
          align-items:center;
          gap:10px;
          margin-bottom:8px;
        "
      >
        <input
          type="time"
          class="creneau-start"
          value="08:00"
        />

        <span>—</span>

        <input
          type="time"
          class="creneau-end"
          value="12:00"
        />

        <button
          type="button"
          class="icon-btn"
          onclick="this.closest('.creneau-row').remove()"
          title="Supprimer"
        >
          ×
        </button>
      </div>
    `
  );
};

window.saveCreneaux = async function saveCreneaux(proId) {
  const creneaux = [];
  const dayBoxes = Array.from(
    document.querySelectorAll(".creneau-day")
  );

  for (const dayBox of dayBoxes) {
    const jourSemaine = Number(dayBox.dataset.day);
    const rows = Array.from(
      dayBox.querySelectorAll(".creneau-row")
    );

    for (const row of rows) {
      const heureDebut =
        row.querySelector(".creneau-start")?.value || "";

      const heureFin =
        row.querySelector(".creneau-end")?.value || "";

      if (!heureDebut || !heureFin) {
        showToast("❌ Complétez les heures de tous les créneaux");
        return;
      }

      if (heureDebut >= heureFin) {
        showToast("❌ L'heure de début doit être avant l'heure de fin");
        return;
      }

      creneaux.push({
        jourSemaine,
        heureDebut,
        heureFin
      });
    }
  }

  try {
    await apiPatch(
      `/receptionniste/professionnels/${encodeURIComponent(proId)}/creneaux`,
      { creneaux }
    );

    await loadCreneauxForProfessional(proId);

    closeModal();

    if (state.page === "dashboard") {
      renderAgenda();
    }

    showToast("✅ Disponibilités enregistrées");
  } catch (error) {
    console.error("❌ Enregistrement créneaux :", error);
    showToast(`❌ ${error.message || "Impossible d'enregistrer les créneaux"}`);
  }
};

window.renderProsPage = function renderProsPage() {

  const isList = state.proView === "list";

  const page = document.getElementById("page-pros");

  if (!page) return;


  const headHtml = `
    <div class="page-head">

      <div>
        <h1 class="page-title">
          Professionnels
        </h1>

        <p class="page-sub">
          Professionnels auxquels vous êtes affectée
        </p>
      </div>


      <div
        class="view-toggle-v3"
        title="Affichage"
      >

        <button
          type="button"
          class="${!isList ? "active" : ""}"
          onclick="setProView('grid')"
          title="Vue grille"
        >
          ${iconGrid()}
        </button>


        <button
          type="button"
          class="${isList ? "active" : ""}"
          onclick="setProView('list')"
          title="Vue liste"
        >
          ${iconList()}
        </button>

      </div>

    </div>
  `;


  // ======================================================
  // AUCUN PROFESSIONNEL
  // ======================================================

  if (!PROS.length) {

    page.innerHTML =
      headHtml +
      `
        <div
          class="card"
          style="
            padding:40px;
            text-align:center;
            color:var(--ink-soft);
          "
        >
          Aucun professionnel affecté.
        </div>
      `;

    return;
  }


  // ======================================================
  // VUE LISTE
  // ======================================================

  if (isList) {

    page.innerHTML =
      headHtml +
      `
      <div class="pro-list-v3">

        ${PROS.map((p) => {

          const todays =
            APPTS.filter(
              (a) =>
                a.proId === p.id &&
                a.date === TODAY &&
                a.status !== "annule"
            );


          const clientsCount =
            new Set(
              APPTS
                .filter(
                  (a) =>
                    a.proId === p.id
                )
                .map(
                  (a) =>
                    a.client
                )
            ).size;


          const avatar =
            p.photo
              ? `
                <img
                  src="${p.photo}"
                  alt="${p.name}"
                  class="pro-list-photo-v3"
                />
              `
              : `
                <div
                  class="pro-list-photo-v3"
                  style="
                    background:${p.color};
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    color:white;
                    font-weight:800;
                  "
                >
                  ${p.initials}
                </div>
              `;


          return `
            <div
              class="pro-list-item-v3"
              onclick="openProfessionalProfile('${p.id}')"
            >

              ${avatar}


              <div class="pro-list-info-v3">

                <strong>
                  ${p.name}
                </strong>

                <span>
                  ${p.role}
                </span>

              </div>


              <div class="pro-list-services-v3">

                <span class="pro-service-tag">
                  ${p.role}
                </span>

              </div>


              <div class="pro-list-end-v3">

                <span class="pro-list-count-v3">
                  ${todays.length}
                  RDV aujourd'hui
                </span>


                <span class="pro-list-count-v3">
                  ${clientsCount}
                  clients
                </span>


                <button
                  class="icon-btn"
                  onclick="
                    event.stopPropagation();
                    setAgendaViewFor('${p.id}');
                  "
                  title="Voir l'agenda"
                >
                  ${iconCal()}
                </button>


                ${
                  p.canManagePlanning
                    ? `
                      <button
                        class="icon-btn accent"
                        onclick="
                          event.stopPropagation();
                          window.openEditCreneaux('${p.id}');
                        "
                        title="Modifier les disponibilités"
                      >
                        ${iconCal()}
                      </button>
                    `
                    : `
                      <span
                        class="access-locked"
                        title="Modification du planning non autorisée"
                      >
                        🔒
                      </span>
                    `
                }

              </div>

            </div>
          `;

        }).join("")}

      </div>
    `;

    return;
  }


  // ======================================================
  // VUE GRILLE
  // ======================================================

  page.innerHTML =
    headHtml +
    `
    <div class="pro-management-grid">

      ${PROS.map((p) => {

        const proAppts =
          APPTS.filter(
            (a) =>
              a.proId === p.id
          );


        const todays =
          proAppts.filter(
            (a) =>
              a.date === TODAY &&
              a.status !== "annule"
          );


        const clientsCount =
          new Set(
            proAppts.map(
              (a) =>
                a.client
            )
          ).size;


        const upcomingCount =
          proAppts.filter(
            (a) =>
              a.status !== "annule" &&
              (
                a.date > TODAY ||
                (
                  a.date === TODAY &&
                  a.start >= nowHM()
                )
              )
          ).length;


        const avatar =
          p.photo
            ? `
              <img
                class="pro-management-avatar"
                src="${p.photo}"
                alt="${p.name}"
              />
            `
            : `
              <div
                class="pro-management-avatar"
                style="
                  background:${p.color};
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  color:white;
                  font-weight:800;
                "
              >
                ${p.initials}
              </div>
            `;


        return `

          <article
            class="pro-management-card"
            onclick="
              openProfessionalProfile('${p.id}')
            "
          >

            <div
              class="pro-management-glow"
              style="
                background:${p.color}
              "
            ></div>


            <div class="pro-management-head">

              ${avatar}


              <div
                class="pro-management-identity"
              >

                <strong>
                  ${p.name}
                </strong>

                <span>
                  ${p.role}
                </span>

              </div>


              <span
                class="pro-account-state"
              >
                ${
                  p.accountActive
                    ? "Actif"
                    : "Inactif"
                }
              </span>

            </div>


            <div
              class="pro-management-services"
            >

              <span
                class="pro-service-tag"
              >
                ${p.role}
              </span>

            </div>


            <div
              class="pro-management-stats"
            >

              <div>

                <strong>
                  ${todays.length}
                </strong>

                <span>
                  RDV aujourd'hui
                </span>

              </div>


              <div>

                <strong>
                  ${clientsCount}
                </strong>

                <span>
                  Clients suivis
                </span>

              </div>


              <div>

                <strong>
                  ${upcomingCount}
                </strong>

                <span>
                  À venir
                </span>

              </div>

            </div>


            <div
              class="pro-management-actions"
            >

              <button
                class="
                  btn
                  btn-ghost
                  btn-sm
                "
                onclick="
                  event.stopPropagation();
                  setAgendaViewFor('${p.id}');
                "
              >
                ${iconCal()}
                Agenda
              </button>


              ${
                p.canManagePlanning
                  ? `
                    <button
                      class="
                        btn
                        btn-ghost
                        btn-sm
                        btn-dispo-granted
                      "
                      onclick="
                        event.stopPropagation();
                        window.openEditCreneaux('${p.id}');
                      "
                    >
                      ${iconCal()}

                      Disponibilités ✏️
                    </button>
                  `
                  : `
                    <span
                      class="
                        access-locked
                        access-locked-btn
                      "
                      title="
                        Le professionnel ne vous
                        autorise pas à modifier
                        son planning
                      "
                    >
                      🔒 Accès non accordé
                    </span>
                  `
              }

            </div>

          </article>
        `;

      }).join("")}

    </div>
  `;
};



// =========================================================
// PROFIL PROFESSIONNEL
// =========================================================

window.openProfessionalProfile =
function openProfessionalProfile(
  proId
) {

  const p =
    proById(proId);


  if (!p) return;


  const proAppts =
    APPTS.filter(
      (a) =>
        a.proId === p.id
    );


  const todays =
    proAppts
      .filter(
        (a) =>
          a.date === TODAY &&
          a.status !== "annule"
      )
      .sort(
        (a, b) =>
          a.start.localeCompare(
            b.start
          )
      );


  const clientsCount =
    new Set(
      proAppts.map(
        (a) =>
          a.client
      )
    ).size;


  const avatar =
    p.photo
      ? `
        <img
          src="${p.photo}"
          alt="${p.name}"
          class="
            professional-profile-avatar
          "
        />
      `
      : `
        <div
          class="
            professional-profile-avatar
          "
          style="
            background:${p.color};
            display:flex;
            align-items:center;
            justify-content:center;
            color:white;
            font-weight:800;
          "
        >
          ${p.initials}
        </div>
      `;


  const html = `

    <div
      class="
        professional-profile-hero
      "
    >

      <div
        class="
          professional-profile-main
        "
      >

        ${avatar}


        <div>

          <h2>
            ${p.name}
          </h2>

          <p>
            ${p.role}
          </p>

        </div>

      </div>


      <button
        class="modal-close"
        onclick="closeModal()"
      >
        ×
      </button>

    </div>


    <div
      class="
        professional-profile-stats
      "
    >

      <div
        class="
          professional-profile-stat
        "
      >

        <span>
          RDV aujourd'hui
        </span>

        <strong>
          ${todays.length}
        </strong>

      </div>


      <div
        class="
          professional-profile-stat
        "
      >

        <span>
          Clients suivis
        </span>

        <strong>
          ${clientsCount}
        </strong>

      </div>


      <div
        class="
          professional-profile-stat
        "
      >

        <span>
          Compte
        </span>

        <strong>
          ${
            p.accountActive
              ? "Actif"
              : "Inactif"
          }
        </strong>

      </div>

    </div>


    <div
      class="
        professional-today-list
      "
    >

      ${
        todays.length

          ? todays
              .map(
                (a) => `

                  <div
                    class="
                      professional-today-rdv
                    "
                    onclick="
                      openRdvDetail('${a.id}')
                    "
                  >

                    <div
                      class="
                        professional-today-time
                      "
                    >
                      ${a.start}
                    </div>


                    <div
                      class="
                        professional-today-info
                      "
                    >

                      <strong>
                        ${a.client}
                      </strong>

                      <span>
                        ${a.service}
                      </span>

                    </div>


                    <span
                      class="
                        status-pill
                        ${STATUS[a.status].cls}
                      "
                    >
                      ${STATUS[a.status].label}
                    </span>

                  </div>
                `
              )
              .join("")

          : `
              <div
                class="
                  professional-empty
                "
              >
                Aucun rendez-vous aujourd'hui
              </div>
            `
      }

    </div>


    <div class="modal-actions">

      <button
        class="
          btn
          btn-ghost
        "
        onclick="
          closeModal();
          setAgendaViewFor('${p.id}');
        "
      >
        ${iconCal()}
        Voir son agenda
      </button>


      ${
        p.canManagePlanning
          ? `
            <button
              class="
                btn
                btn-primary
              "
              onclick="
                closeModal();
                window.openEditCreneaux('${p.id}');
              "
            >
              ${iconCal()}

              Modifier les disponibilités
            </button>
          `
          : `
            <span
              class="
                access-locked
                access-locked-btn
              "
            >
              🔒 Modification du planning non autorisée
            </span>
          `
      }

    </div>
  `;


  openModal(
    html,
    true
  );
};



// =========================================================
// OUVRIR AGENDA PROFESSIONNEL
// =========================================================

window.setAgendaViewFor =
function setAgendaViewFor(
  proId
) {

  state.proFilter =
    proId;

  state.agendaView =
    "day";

  state.agendaDate =
    TODAY;

  goToPage(
    "dashboard"
  );
};
/* =========================================================
   PAGE : parameter
   ========================================================= */

window.renderSettingsPage = function renderSettingsPage() {
      const page = document.getElementById("page-settings");
      if (!page) return;
      page.innerHTML = `
        <div class="page-head">
          <div><h1 class="page-title">Paramètres</h1><p class="page-sub">Préférences de votre espace réceptionniste</p></div>
        </div>
        <div class="settings-grid">
          <section class="settings-card">
            <h3>Compte</h3>
            <div class="field-row"><label>Rôle</label><input type="text" value="Réceptionniste" disabled /></div>
            <div class="field-row"><label>Session</label><input type="text" value="Connectée" disabled /></div>
          </section>
          <section class="settings-card">
            <h3>Interface</h3>
            <p style="margin:0;color:var(--ink-soft);font-size:13px;line-height:1.6;">Les paramètres enregistrés côté serveur seront branchés ici lorsque leurs routes backend seront disponibles.</p>
          </section>
        </div>`;
    };

  /* =========================================================
     PAGE : NOTIFICATIONS
     ========================================================= */
  window.notifRowHtml = function notifRowHtml(n) {
    const ic = NOTIF_ICONS[n.type];
    return `<div class="notif-row ${n.unread?'unread':''}">
      <div class="notif-icon" style="background:${ic.bg};color:${ic.color}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ic.svg}</svg></div>
      <div class="notif-text"><span>${n.text}</span><div class="notif-time">${n.time}</div></div>
      ${n.unread ? `<span class="notif-dot-unread"></span>` : ""}
    </div>`;
  }
  window.renderNotifsPage = function renderNotifsPage() {
    let html = `
      <div class="page-head">
        <div><h1 class="page-title">Notifications</h1><p class="page-sub">Alertes et nouvelles demandes</p></div>
        <button class="btn btn-ghost btn-sm" onclick="markAllRead()">Tout marquer comme lu</button>
      </div>
      <div class="card">${NOTIFS.map((n) => notifRowHtml(n)).join("")}</div>
    `;
    document.getElementById("page-notifs").innerHTML = html;
  }
  window.markAllRead = function markAllRead() { NOTIFS.forEach((n) => n.unread = false); renderNotifsPage(); updateNotifBadges(); }
  window.addNotif = function addNotif(type, text) {
    NOTIFS.unshift({ id: Date.now(), type, text, time: "À l'instant", unread: true });
    updateNotifBadges();
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
    document.getElementById("modalRoot").innerHTML = `<div class="modal-overlay" id="activeOverlay"><div class="modal-box ${wide?'wide':''}">${innerHtml}</div></div>`;
    const ov = document.getElementById("activeOverlay");
    requestAnimationFrame(() => ov.classList.add("open"));
    ov.addEventListener("click", (e) => { if (e.target === ov) closeModal(); });
  }

  /* ---- Nouveau rendez-vous : style moderne + backend réel ---- */
  window.openNewRdv = async function openNewRdv(prefill = {}) {
    let prefillClient = null;
    if (prefill.clientId) {
      try { prefillClient = await apiGet(`/receptionniste/clients/${prefill.clientId}`); }
      catch (error) { console.error("❌ Impossible de récupérer le client :", error); }
    }
    const prefillName = prefillClient ? `${prefillClient.prenom || ''} ${prefillClient.nom || ''}`.trim() : prefill.clientName ? decodeURIComponent(prefill.clientName) : "";
    if (!prefillClient && prefillName) prefillClient = uniqueClients().find((c) => c.name === prefillName) || null;
    const nameParts = prefillName ? prefillName.split(/\s+/) : [];
    const prefillNom = prefillClient?.nom || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : prefillName);
    const prefillPrenom = prefillClient?.prenom || (nameParts.length > 1 ? nameParts.slice(0,-1).join(" ") : "");
    const defaultPro = prefill.proId || (state.proFilter !== "all" ? state.proFilter : PROS[0]?.id || "");
    const defaultDate = prefill.date || state.agendaDate || TODAY;
    const defaultStart = prefill.start || "09:00";

    const html = `
      <form id="newRdvForm" onsubmit="event.preventDefault(); submitNewRdv();">
        <div class="modal-head">
          <div><p class="modal-title">Nouveau rendez-vous</p><p class="modal-sub">Réservation rapide — les informations seront enregistrées dans la base.</p></div>
          <button type="button" class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div class="detect-banner" id="detectBanner"></div>
        <div class="field-2col">
          <div class="field-row"><label>Nom</label><input type="text" id="nrNom" oninput="detectClient()" value="${prefillNom || ''}" placeholder="Bensalem" required /></div>
          <div class="field-row"><label>Prénom</label><input type="text" id="nrPrenom" oninput="detectClient()" value="${prefillPrenom || ''}" placeholder="Amel" required /></div>
        </div>
        <div class="field-2col">
          <div class="field-row"><label>Date de naissance</label><input type="date" id="nrDob" oninput="detectClient()" value="${prefillClient?.dateNaissance ? String(prefillClient.dateNaissance).slice(0,10) : prefillClient?.dob || ''}" /></div>
          <div class="field-row"><label>Téléphone</label><input type="tel" id="nrTel" oninput="detectClient()" value="${prefillClient?.telephone || prefillClient?.phone || ''}" placeholder="0555 00 00 00" maxlength="10" required /></div>
        </div>
        <div class="field-2col">
          <div class="field-row"><label>Email</label><input type="email" id="nrEmail" value="${prefillClient?.email || ''}" placeholder="client@email.com" /></div>
          <div class="field-row"><label>Adresse</label><input type="text" id="nrAdresse" value="${prefillClient?.adresse || ''}" placeholder="Adresse du client" /></div>
        </div>
        <div class="field-2col">
          <div class="field-row"><label>Professionnel</label><select id="nrPro" onchange="loadServicesForProfessional(this.value)" required>${PROS.length ? '' : `<option value="">Aucun professionnel disponible</option>`}${PROS.map((p)=>`<option value="${p.id}" ${defaultPro===p.id?'selected':''}>${p.name} — ${p.role}</option>`).join("")}</select></div>
          <div class="field-row"><label>Date</label><input type="date" id="nrDate" value="${defaultDate}" required /></div>
        </div>
        <div class="field-row"><label>Service / motif</label><select id="nrService" required><option value="">Choisir un service</option></select></div>
        <div class="field-2col">
          <div class="field-row"><label>Créneau</label><input type="time" id="nrTime" value="${defaultStart}" required /></div>
          <div class="field-row"><label>Remarque</label><input type="text" id="nrRemarque" placeholder="Remarque facultative" /></div>
        </div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">${iconCheck()} Créer le rendez-vous</button></div>
      </form>`;
    openModal(html);
    const selectedProId = document.getElementById("nrPro")?.value || defaultPro;
    if (selectedProId) await loadServicesForProfessional(selectedProId);
    if (prefillClient) detectClient();
  };

window.detectClient = function detectClient() {
    const nom = document.getElementById("nrNom").value.trim();
    const prenom = document.getElementById("nrPrenom").value.trim();
    const dob = document.getElementById("nrDob")?.value || "";
    const tel = document.getElementById("nrTel")?.value.trim() || "";
    const fullName = (prenom + " " + nom).trim();
    const banner = document.getElementById("detectBanner");
    if (!banner) return;
    const existing = uniqueClients().find((c) => (dob && c.dob === dob && c.name.toLowerCase() === fullName.toLowerCase()) || (tel.length >= 6 && c.phone.replace(/\s/g,"") === tel.replace(/\s/g,"")));
    if (existing) {
      const warn = absentCount(existing.name) >= 2 ? ` — ⚠️ absences répétées (${absentCount(existing.name)})` : "";
      banner.innerHTML = `${iconCheck()} Client existant détecté : <b>${existing.name}</b> (${existing.appts.length} rendez-vous précédents)${warn}`;
      banner.classList.add("show");
    } else {
      banner.classList.remove("show");
    }
  }
window.submitNewRdv = async function submitNewRdv() {
  const nom = document.getElementById("nrNom").value.trim();
  const prenom = document.getElementById("nrPrenom").value.trim();
  const dob = document.getElementById("nrDob")?.value || "";
  const tel = document.getElementById("nrTel").value.trim();
  const email = document.getElementById("nrEmail")?.value.trim() || "";
  const adresse = document.getElementById("nrAdresse")?.value.trim() || "";
  const serviceId = document.getElementById("nrService").value;
  const proId = document.getElementById("nrPro").value;
  const date = document.getElementById("nrDate").value;
  const start = document.getElementById("nrTime").value;
  const remarque = document.getElementById("nrRemarque")?.value.trim() || "";

  if (!nom || !prenom || !tel || !serviceId || !proId || !date || !start) {
    document.getElementById("nrError")?.classList.add("show");
    return;
  }

  if (!isProfessionalAvailableAtTime(proId, date, start)) {
    showToast("🔒 Ce professionnel n'est pas disponible à cette date/heure.");
    return;
  }

  const token = getAccessToken();
  console.log("🔑 Token présent ?", !!token);

  if (!token) {
    console.error("❌ Aucun token trouvé");
    showToast("❌ Aucun token trouvé. Reconnectez-vous.");
    return;
  }

  const data = {
    nom,
    prenom,
    telephone: tel,
    email: email || undefined,
    adresse: adresse || undefined,
    dateNaissance: dob || undefined,
    professionnelId: proId,
    serviceId,
    dateDebut: `${date}T${start}:00`,
    remarque: remarque || undefined
  };

  console.log("📤 DATA :", data);

  try {
    const response = await fetch(`${API_BASE}/receptionniste/rendez-vous`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    console.log("📥 STATUS :", response.status);
    console.log("📥 BACKEND :", result);

    if (!response.ok) {
      showToast(`❌ ${result.message || "Erreur backend"}`);
      return;
    }

    const fullName = `${prenom} ${nom}`.trim();
    await loadClients();
    await loadRdvList();

    closeModal();
    showToast(`✅ Rendez-vous créé pour <b>${fullName}</b>`);
    addNotif("new", `Nouveau rendez-vous créé pour <b>${fullName}</b>`);
    renderPage(state.page);
  } catch (error) {
    console.error("❌ ERREUR :", error);
    showToast("❌ Impossible de contacter le backend");
  }
};

  /* ---- Consulter / modifier un rendez-vous ---- */
  window.openRdvDetail = function openRdvDetail(id) {
    const a = APPTS.find((x) => x.id === id);
    if (!a) return;
    const p = proById(a.proId);
    const warn = absentCount(a.client) >= 2 ? `<div class="repeat-warning" style="margin-bottom:12px;">${iconAlert()} Ce client a ${absentCount(a.client)} absences enregistrées</div>` : "";
    const html = `
      <div class="modal-head">
        <div><p class="modal-title">${a.client}</p><p class="modal-sub">${a.service} · ${p.name}</p></div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      ${warn}
      <div class="detail-grid">
        <div><div class="detail-item-label">Date de naissance</div><div class="detail-item-value">${a.dob ? `${fmtDateShort(a.dob)} (${calcAge(a.dob)} ans)` : "—"}</div></div>
        <div><div class="detail-item-label">Téléphone</div><div class="detail-item-value">${a.phone}</div></div>
        <div><div class="detail-item-label">E-mail</div><div class="detail-item-value">${a.email || "—"}</div></div>
        <div><div class="detail-item-label">Professionnel</div><div class="detail-item-value">${p.name}</div></div>
        <div><div class="detail-item-label">Date</div><div class="detail-item-value">${fmtDateShort(a.date)}</div></div>
        <div><div class="detail-item-label">Heure</div><div class="detail-item-value">${a.start} – ${a.end}</div></div>
        <div><div class="detail-item-label">Créé le</div><div class="detail-item-value">${fmtDateShort(a.createdAt)}</div></div>
        <div><div class="detail-item-label">Statut actuel</div><div class="detail-item-value"><span class="status-pill ${STATUS[a.status].cls}">${STATUS[a.status].label}</span></div></div>
      </div>
<div class="field-row">
  <label>Remarques</label>

  <div class="detail-item-value" id="rdvRemark">
    ${a.remark || "Aucune remarque"}
  </div>
</div>      <div class="detail-item-label" style="margin-bottom:8px;">Changer le statut</div>
      <div class="status-menu">
        ${Object.entries(STATUS).map(([k,v]) => `<button class="${a.status===k?'current':''}" onclick="changeStatus('${a.id}','${k}')">${v.label}</button>`).join("")}
      </div>
      <div class="modal-actions" style="justify-content:space-between;">
        <div style="display:flex;gap:8px;">
          <button class="btn btn-ghost btn-sm" onclick="openEditRdv('${a.id}')">${iconEdit()} Modifier</button>
          <button class="btn btn-ghost btn-sm" onclick="alert('Coordonnées : ${a.phone} · ${a.email}')">${iconPhone()} Contacter</button>
        </div>
        <button class="btn btn-danger-ghost btn-sm" onclick="cancelRdv('${a.id}')">${iconX()} Annuler le rendez-vous</button>
      </div>
    `;
    openModal(html);
  }
  window.slideToEditAppointment =
function slideToEditAppointment(id) {

  const box =
    document.querySelector(
      "#modalRoot .modal-box"
    );

  if (!box) {
    openEditAppointment(id);
    return;
  }

  box.classList.add(
    "edit-slide-out-left"
  );


  setTimeout(() => {

    openEditAppointment(id);

    requestAnimationFrame(() => {

      const newBox =
        document.querySelector(
          "#modalRoot .modal-box"
        );

      newBox?.classList.add(
        "edit-slide-in-right"
      );

    });

  }, 190);
};
window.changeStatus = async function changeStatus(id, status) {
  try {
    await apiPatch(
      `/receptionniste/rendez-vous/${id}/statut`,
      { statut: status }
    );

    await loadClients();
    await loadRdvList();

    renderPage(state.page);
    openRdvDetail(id);

    showToast(`✅ Statut changé : ${STATUS[status].label}`);

  } catch (error) {
    console.error("❌ Modification statut :", error);
    showToast(`❌ ${error.message}`);
  }
};
  
window.cancelRdv = async function cancelRdv(id) {

  const a = APPTS.find((x) => x.id === id);

  if (!a) {
    showToast("❌ Rendez-vous introuvable");
    return;
  }

  try {

    await apiPatch(
      `/receptionniste/rendez-vous/${id}/annuler`,
      {}
    );

    await loadClients();
    await loadRdvList();

    closeModal();
    renderPage(state.page);

    showToast(
      `✅ Rendez-vous de ${a.client} annulé`
    );

    addNotif(
      "cancel",
      `Rendez-vous de <b>${a.client}</b> annulé`
    );

  } catch (error) {

    console.error(
      "❌ Annulation rendez-vous :",
      error
    );

    showToast(
      `❌ ${error.message}`
    );
  }
};

window.openEditRdv = function openEditRdv(id) {
    const a = APPTS.find((x) => x.id === id);
    if (!a) return;

const html = `
  <form onsubmit="event.preventDefault(); saveEditRdv('${a.id}');">

   <div class="modal-head">

  <div style="display:flex;align-items:center;gap:10px;">

    <div>
      <p class="modal-title">Modifier le client</p>

      <p class="modal-sub">
        Informations liées au rendez-vous de ${a.client}
      </p>
    </div>

     <button
      type="button"
      class="edit-switch-btn"
      onclick="slideToEditAppointment('${a.id}')"
      title="Modifier le rendez-vous"
    >
      ${iconChevronRight()}
    </button>

  </div>


  <button
    type="button"
    class="modal-close"
    onclick="closeModal()"
  >
    ×
  </button>

</div>

    <div class="field-2col">

      <div class="field-row">
        <label>Nom</label>
        <input
          id="editClientNom"
          type="text"
          value="${a.nom || ''}"
          required
        />
      </div>

      <div class="field-row">
        <label>Prénom</label>
        <input
          id="editClientPrenom"
          type="text"
          value="${a.prenom || ''}"
          required
        />
      </div>

    </div>


    <div class="field-2col">

      <div class="field-row">
        <label>Téléphone</label>
        <input
          id="editClientTelephone"
          type="tel"
          value="${a.phone || ''}"
          required
        />
      </div>

      <div class="field-row">
        <label>Date de naissance</label>
        <input
          id="editClientDob"
          type="date"
          value="${a.dateNaissance || ''}"
        />
      </div>

    </div>


    <div class="field-2col">

      <div class="field-row">
        <label>E-mail</label>
        <input
          id="editClientEmail"
          type="email"
          value="${a.email || ''}"
        />
      </div>

      <div class="field-row">
        <label>Adresse</label>
        <input
          id="editClientAdresse"
          type="text"
          value="${a.adresse || ''}"
        />
      </div>

    </div>


    <div class="modal-actions">

      <button
        type="button"
        class="btn btn-ghost"
        onclick="openRdvDetail('${a.id}')"
      >
        Retour
      </button>

      <button
        type="submit"
        class="btn btn-primary"
      >
        ${iconCheck()} Enregistrer
      </button>

    </div>

  </form>
`;

    openModal(html);
  };
window.openEditAppointment =
async function openEditAppointment(id) {

  const a = APPTS.find((x) => x.id === id);

  if (!a) {
    showToast("❌ Rendez-vous introuvable");
    return;
  }

  const html = `
    <form
      onsubmit="event.preventDefault(); saveEditAppointment('${a.id}');"
    >

      <div class="modal-head">

        <div style="display:flex;align-items:center;gap:10px;">

        <button
  type="button"
  class="edit-switch-btn back"
  onclick="slideToEditClient('${a.id}')"
  title="Modifier le client"
>
  ${iconChevronLeft()}
</button>


          <div>
            <p class="modal-title">
              Modifier le rendez-vous
            </p>

            <p class="modal-sub">
              Rendez-vous de ${a.client}
            </p>
          </div>

        </div>


        <button
          type="button"
          class="modal-close"
          onclick="closeModal()"
        >
          ×
        </button>

      </div>


      <div class="field-2col">

        <div class="field-row">

          <label>Professionnel</label>

          <select
            id="editRdvPro"
            onchange="loadEditRdvServices(this.value, '${a.serviceId}')"
            required
          >

            ${PROS.map((p) => `
              <option
                value="${p.id}"
                ${p.id === a.proId ? 'selected' : ''}
              >
                ${p.name} — ${p.role}
              </option>
            `).join("")}

          </select>

        </div>


        <div class="field-row">

          <label>Date</label>

          <input
            type="date"
            id="editRdvDate"
            value="${a.date || ''}"
            required
          />

        </div>

      </div>


      <div class="field-2col">

        <div class="field-row">

          <label>Service / motif</label>

          <select
            id="editRdvService"
            required
          >
            <option value="">
              Chargement...
            </option>
          </select>

        </div>


        <div class="field-row">

          <label>Créneau</label>

          <input
            type="time"
            id="editRdvTime"
            value="${a.start || ''}"
            required
          />

        </div>

      </div>


      <div class="field-row">

        <label>Remarque</label>

       <textarea
  id="editRdvRemark"
  rows="3"
  placeholder="Remarque facultative..."
>${a.remark || ''}</textarea>
      </div>


      <div class="modal-actions">

        <button
          type="button"
          class="btn btn-ghost"
          onclick="openRdvDetail('${a.id}')"
        >
          Retour
        </button>


        <button
          type="submit"
          class="btn btn-primary"
        >
          ${iconCheck()} Enregistrer
        </button>

      </div>

    </form>
  `;


  openModal(html);

  await loadEditRdvServices(
    a.proId,
    a.serviceId
  );
};
window.slideToEditClient =
function slideToEditClient(id) {

  const box =
    document.querySelector(
      "#modalRoot .modal-box"
    );

  if (!box) {
    openEditRdv(id);
    return;
  }


  box.classList.add(
    "edit-slide-out-right"
  );


  setTimeout(() => {

    openEditRdv(id);


    requestAnimationFrame(() => {

      const newBox =
        document.querySelector(
          "#modalRoot .modal-box"
        );

      newBox?.classList.add(
        "edit-slide-in-left"
      );

    });

  }, 190);
};
window.loadEditRdvServices =
async function loadEditRdvServices(
  proId,
  selectedServiceId = ""
) {

  const select =
    document.getElementById("editRdvService");

  if (!select) return;


  select.innerHTML = `
    <option value="">
      Chargement...
    </option>
  `;


  try {

    const response = await fetch(
      `${API_BASE}/public/professionnels/${encodeURIComponent(proId)}/services`
    );

    const data =
      await response.json().catch(() => []);


    if (!response.ok) {
      throw new Error(
        data?.message || `Erreur HTTP ${response.status}`
      );
    }


    const services =
      Array.isArray(data)
        ? data
        : data?.services || [];


    const actifs =
      services.filter(
        (s) => s.actif !== false
      );


    select.innerHTML = `
      <option value="">
        Choisir un service
      </option>

      ${actifs.map((s) => `
        <option
          value="${s.id}"
          ${s.id === selectedServiceId ? 'selected' : ''}
        >
          ${s.nom || s.name || "Service"}
        </option>
      `).join("")}
    `;


  } catch (error) {

    console.error(
      "❌ Services modification RDV :",
      error
    );

    select.innerHTML = `
      <option value="">
        Impossible de charger
      </option>
    `;
  }
};
window.saveEditAppointment =
async function saveEditAppointment(id) {

  const professionnelId =
    document.getElementById("editRdvPro")?.value;

  const serviceId =
    document.getElementById("editRdvService")?.value;

  const date =
    document.getElementById("editRdvDate")?.value;

  const start =
    document.getElementById("editRdvTime")?.value;
const remarque =
  document
    .getElementById("editRdvRemark")
    ?.value
    .trim() || "";



  if (!professionnelId || !serviceId || !date || !start) {
    showToast("❌ Tous les champs obligatoires doivent être remplis");
    return;
  }


  const data = {
    professionnelId,
    serviceId,

    dateDebut:
      `${date}T${start}:00`,

    remarque: remarque

  };


  try {

    await apiPatch(
      `/receptionniste/rendez-vous/${id}`,
      data
    );

    await loadClients();
    await loadRdvList();

    renderPage(state.page);

    openRdvDetail(id);

    showToast("✅ Rendez-vous modifié");

  } catch (error) {

    console.error(
      "❌ Modification rendez-vous :",
      error
    );

    showToast(`❌ ${error.message}`);
  }
};
  window.saveEditRdv = async function saveEditRdv(id) {
    const data = {
      nom: document.getElementById("editClientNom")?.value.trim(),
      prenom: document.getElementById("editClientPrenom")?.value.trim(),
      telephone: document.getElementById("editClientTelephone")?.value.trim(),
      email: document.getElementById("editClientEmail")?.value.trim() || "",
      adresse: document.getElementById("editClientAdresse")?.value.trim() || "",
      dateNaissance: document.getElementById("editClientDob")?.value || null
    };

    if (!data.nom || !data.prenom || !data.telephone) {
      showToast("❌ Nom, prénom et téléphone sont obligatoires");
      return;
    }

    try {
      await apiPatch(`/receptionniste/rendez-vous/${id}/client`, data);
      await loadClients();
      await loadRdvList();
      renderPage(state.page);
      openRdvDetail(id);
      showToast("✅ Informations du client mises à jour");
    } catch (error) {
      console.error("❌ Modification client :", error);
      showToast(`❌ ${error.message}`);
    }
  };

  /* ---- Fiche client ---- *//* ---- Fiche client ---- */
  const CLIENT_NOTES_KEY = "rendezvousapp-client-notes";

  window.getClientNotes = function getClientNotes() {
    try {
      return JSON.parse(localStorage.getItem(CLIENT_NOTES_KEY) || "{}");
    } catch {
      return {};
    }
  }

  window.saveClientNote = function saveClientNote(encodedName) {
    const name = decodeURIComponent(encodedName);
    const textarea = document.getElementById("clientNote");
    if (!textarea) return;
    const notes = getClientNotes();
    notes[name] = textarea.value.trim();
    localStorage.setItem(CLIENT_NOTES_KEY, JSON.stringify(notes));
    showToast(`📝 Note enregistrée pour <b>${name}</b>`);
  }

  window.openClientFiche = function openClientFiche(encodedName) {
    const name = decodeURIComponent(encodedName);
    const c = uniqueClients().find((x) => x.name === name);
    if (!c) return;

    const history = c.appts.slice().sort((a,b) => (b.date+b.start).localeCompare(a.date+a.start));
    const note = getClientNotes()[c.name] || "";
    const warn = absentCount(c.name) >= 2
      ? `<div class="client-alert">${iconAlert()} Ce client possède ${absentCount(c.name)} absences enregistrées</div>`
      : "";

    const html = `
      <div class="client-profile-hero">
        <div class="client-profile-left">
          <div class="client-profile-avatar">${initials(c.name)}</div>
          <div>
            <h2>${c.name}</h2>
            <p>${c.dob ? `${calcAge(c.dob)} ans · ` : ""}${c.appts.length} rendez-vous${history.length ? ` · Client depuis ${fmtDateShort(history[history.length-1].createdAt)}` : ""}</p>
          </div>
        </div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>

      ${warn}

      <div class="client-info-grid">
        <div class="client-info-card"><span>Téléphone</span><strong>${c.phone}</strong></div>
        <div class="client-info-card"><span>E-mail</span><strong>${c.email || "—"}</strong></div>
        <div class="client-info-card"><span>Date de naissance</span><strong>${c.dob ? fmtDateShort(c.dob) : "—"}</strong></div>
        <div class="client-info-card"><span>Total rendez-vous</span><strong>${c.appts.length}</strong></div>
      </div>

      <div class="client-note-card">
        <div class="client-note-head">
          <div><strong>📝 Note interne</strong><span>Visible uniquement par l'équipe</span></div>
          <button class="btn btn-primary btn-sm" onclick="saveClientNote('${encodeURIComponent(c.name)}')">Enregistrer</button>
        </div>
        <textarea id="clientNote" class="client-note-textarea" placeholder="Ex : préfère les rendez-vous le matin, informations importantes, suivi particulier...">${note}</textarea>
      </div>

      <div class="client-history-head">
        <div><strong>Historique des rendez-vous</strong><span>${history.length} rendez-vous</span></div>
      </div>

      <div class="client-history-list">
        ${history.map((a) => `
          <div class="client-history-item" onclick="openRdvDetail('${a.id}')">
            <div class="client-history-date"><strong>${fmtDateShort(a.date)}</strong><span>${a.start}</span></div>
            <div class="client-history-main"><strong>${a.service}</strong><span>${proById(a.proId).name}</span></div>
            <span class="status-pill ${STATUS[a.status].cls}">${STATUS[a.status].label}</span>
          </div>`).join("")}
      </div>

      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Fermer</button>
        <button class="btn btn-primary" onclick="openNewRdv({ clientId: '${c.id}' })">${iconPlus()} Nouveau rendez-vous</button>
      </div>
    `;

    openModal(html, true);
  }

  window.toggleExportMenu
 window.toggleExportMenu = function toggleExportMenu(event) {
  event.stopPropagation();

  const menu = event.currentTarget.nextElementSibling;

  document.querySelectorAll(".export-dropdown.show").forEach((m) => {
    if (m !== menu) {
      m.classList.remove("show");
    }
  });

  menu.classList.toggle("show");
}

window.closeExportMenus = function closeExportMenus() {
  document.querySelectorAll(".export-dropdown.show").forEach((menu) => {
    menu.classList.remove("show");
  });
}

document.addEventListener("click", () => {
  closeExportMenus();
}, { signal: ac.signal });

window.getProfessionalColor = function getProfessionalColor(pro) {
    if (pro?.color) return pro.color.replace("#", "").toUpperCase();
    const text = String(pro?.id || pro?.name || "professionnel");
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
    const r = 120 + (Math.abs(hash) % 100);
    const g = 120 + (Math.abs(hash >> 8) % 100);
    const b = 120 + (Math.abs(hash >> 16) % 100);
    return [r,g,b].map((v) => v.toString(16).padStart(2,"0")).join("").toUpperCase();
  }

  window.hexToRgb = function hexToRgb(hex) {
    const clean = (hex || "8957FF").replace("#", "");
    return [0,2,4].map((i) => parseInt(clean.slice(i, i+2), 16));
  }

  window.lightenRgb = function lightenRgb(rgb, amount) {
    return rgb.map((v) => Math.round(255 - (255 - v) * amount));
  }

  window.getFilteredAppointmentsForExport = function getFilteredAppointmentsForExport(label) {
    if ((label || "").toLowerCase().includes("agenda")) {
      return APPTS.filter((a) =>
        a.date === state.agendaDate &&
        (state.proFilter === "all" || a.proId === state.proFilter)
      ).sort((a,b) => a.start.localeCompare(b.start));
    }

    const f = state.rdvFilters || {};
    return APPTS.filter((a) => {
      if (f.status && a.status !== f.status) return false;
      if (f.pro && a.proId !== f.pro) return false;
      if (f.search && !a.client.toLowerCase().includes(f.search.toLowerCase())) return false;
      return true;
    }).sort((a,b) => (b.date+b.start).localeCompare(a.date+a.start));
  }

  window.exportMock = function exportMock(label, format) {
    if (format === "Excel") return exportExcel(label);
    if (format === "PDF") return exportPDF(label);
  }

  window.exportExcel = async function exportExcel(label) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "RendezVousApp";
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet("Export");

    const isClients = (label || "").toLowerCase().includes("client");

    if (isClients) {
      const query = (state.clientSearch.query || "").trim().toLowerCase();
      const cleanQuery = query.replace(/\s/g, "");
      const clients = uniqueClients().filter((c) => !query || c.name.toLowerCase().includes(query) || (c.phone || "").replace(/\s/g,"").includes(cleanQuery) || (c.email || "").toLowerCase().includes(query));
      worksheet.columns = [
        { header:"Client", key:"client", width:26 },
        { header:"Téléphone", key:"phone", width:18 },
        { header:"E-mail", key:"email", width:30 },
        { header:"Rendez-vous", key:"count", width:14 },
        { header:"Dernier RDV", key:"last", width:16 },
      ];
      clients.forEach((c) => {
        const last = c.appts.slice().sort((a,b)=>(b.date+b.start).localeCompare(a.date+a.start))[0];
        worksheet.addRow({client:c.name, phone:c.phone, email:c.email, count:c.appts.length, last:last ? fmtDateShort(last.date) : ""});
      });
    } else {
      worksheet.columns = [
        { header:"Client", key:"client", width:26 },
        { header:"Téléphone", key:"phone", width:18 },
        { header:"Service", key:"service", width:28 },
        { header:"Professionnel", key:"professional", width:28 },
        { header:"Date", key:"date", width:15 },
        { header:"Heure", key:"time", width:18 },
        { header:"Statut", key:"status", width:16 },
      ];
      getFilteredAppointmentsForExport(label).forEach((a) => {
        const pro = proById(a.proId);
        const row = worksheet.addRow({
          client:a.client, phone:a.phone, service:a.service,
          professional:pro?.name || "Professionnel inconnu",
          date:fmtDateShort(a.date), time:`${a.start} - ${a.end}`,
          status:STATUS[a.status]?.label || a.status,
        });
        const rgb = lightenRgb(hexToRgb(getProfessionalColor(pro)), .16);
        const fillHex = rgb.map((v)=>v.toString(16).padStart(2,"0")).join("").toUpperCase();
        row.eachCell((cell) => {
          cell.fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+fillHex} };
          cell.border = { bottom:{style:"thin", color:{argb:"FFE7E3F3"}} };
          cell.alignment = { vertical:"middle" };
        });
      });
    }

    const header = worksheet.getRow(1);
    header.font = { bold:true, color:{argb:"FFFFFFFF"} };
    header.fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF8957FF"} };
    header.height = 24;
    header.alignment = { vertical:"middle" };
    worksheet.views = [{state:"frozen", ySplit:1}];
    worksheet.autoFilter = { from:{row:1,column:1}, to:{row:1,column:worksheet.columnCount} };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${isClients ? "clients" : "rendez-vous"}-${TODAY}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast(`${iconPrinter()} Export Excel terminé`);
  }

  window.exportPDF = function exportPDF(label) {
    const doc = new jsPDF({orientation:"landscape", unit:"mm", format:"a4"});
    const isClients = (label || "").toLowerCase().includes("client");
    doc.setFontSize(18);
    doc.setTextColor(27,23,48);
    doc.text(label || "Export", 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(105,101,128);
    doc.text(`Exporté le ${new Date().toLocaleString("fr-FR")}`, 14, 21);

    if (isClients) {
      const query = (state.clientSearch.query || "").trim().toLowerCase();
      const cleanQuery = query.replace(/\s/g, "");
      const clients = uniqueClients().filter((c) => !query || c.name.toLowerCase().includes(query) || (c.phone || "").replace(/\s/g,"").includes(cleanQuery) || (c.email || "").toLowerCase().includes(query));
      autoTable(doc, {
        startY:27,
        head:[["Client","Téléphone","E-mail","Rendez-vous","Dernier RDV"]],
        body:clients.map((c)=>{
          const last=c.appts.slice().sort((a,b)=>(b.date+b.start).localeCompare(a.date+a.start))[0];
          return [c.name,c.phone,c.email,String(c.appts.length),last?fmtDateShort(last.date):""];
        }),
        headStyles:{fillColor:[137,87,255], textColor:[255,255,255], fontStyle:"bold"},
        styles:{fontSize:8.5,cellPadding:2.6,valign:"middle"},
        alternateRowStyles:{fillColor:[248,246,253]},
      });
    } else {
      const rows = getFilteredAppointmentsForExport(label).map((a)=>{
        const pro=proById(a.proId);
        return {values:[a.client,a.phone,a.service,pro?.name||"Professionnel inconnu",fmtDateShort(a.date),`${a.start} - ${a.end}`,STATUS[a.status]?.label||a.status], color:hexToRgb(getProfessionalColor(pro))};
      });
      autoTable(doc, {
        startY:27,
        head:[["Client","Téléphone","Service","Professionnel","Date","Heure","Statut"]],
        body:rows.map((r)=>r.values),
        headStyles:{fillColor:[137,87,255],textColor:[255,255,255],fontStyle:"bold"},
        styles:{fontSize:8,cellPadding:2.5,valign:"middle"},
        didParseCell:(data)=>{
          if(data.section!=="body") return;
          const row=rows[data.row.index];
          if(row) data.cell.styles.fillColor=lightenRgb(row.color,.16);
        },
      });
    }

    const pages=doc.getNumberOfPages();
    for(let p=1;p<=pages;p++){
      doc.setPage(p); doc.setFontSize(8); doc.setTextColor(130,130,140);
      doc.text(`Page ${p} / ${pages}`, 278, 202, {align:"right"});
    }
    doc.save(`${isClients ? "clients" : "rendez-vous"}-${TODAY}.pdf`);
    showToast(`${iconPrinter()} Export PDF terminé`);
  }

  /* =========================================================
     ICONES
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
  window.iconGrid = function iconGrid() { return svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>', 16); }
  window.iconList = function iconList() { return svg('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>', 16); }
  window.statusIconSvg = function statusIconSvg(status) {
    if (status === "termine" || status === "arrive") return iconCheck();
    if (status === "annule" || status === "absent") return iconX();
    return iconClock();
  }

  /* Recherche globale : gérée par le bouton globalSearchBtn de la topbar. */

  /* =========================================================
     INIT
     ========================================================= */
  loadBackendData();

    // ---- end ported script ----

    return () => {
      ac.abort();

      delete (window as any).localDateISO;
      delete (window as any).todayISO;
      delete (window as any).isoPlusDays;
      delete (window as any).proById;
      delete (window as any).fmtDateLong;
      delete (window as any).fmtDateShort;
      delete (window as any).calcAge;
      delete (window as any).absentCount;
      delete (window as any).showToast;
      delete (window as any).goToPage;
      delete (window as any).renderPage;
      delete (window as any).updateNotifBadges;
      delete (window as any).renderDashboard;
      delete (window as any).nowHM;
      delete (window as any).renderAgenda;
      delete (window as any).agendaDateLabel;
      delete (window as any).capitalize;
      delete (window as any).weekStart;
      delete (window as any).agendaShift;
      delete (window as any).agendaToday;
      delete (window as any).setAgendaView;
      delete (window as any).setProFilter;
      delete (window as any).visiblePros;
      delete (window as any).renderAgendaMain;
      delete (window as any).dayViewHtml;
      delete (window as any).placeDayAppts;
      delete (window as any).handleDayColClick;
      delete (window as any).wireDayDnD;
      delete (window as any).weekViewHtml;
      delete (window as any).monthViewHtml;
      delete (window as any).jumpToDay;
      delete (window as any).miniCalHtml;
      delete (window as any).miniCalShift;
      delete (window as any).renderRdvPage;
      delete (window as any).updateRdvFilter;
      delete (window as any).renderRdvTable;
      delete (window as any).initials;
      delete (window as any).uniqueClients;
      delete (window as any).renderClientsPage;
      delete (window as any).updateClientFilter;
      delete (window as any).renderClientsTable;
      delete (window as any).renderProsPage;
      delete (window as any).openEditCreneaux;
      delete (window as any).addCreneauRow;
      delete (window as any).saveCreneaux;
      delete (window as any).renderSettingsPage;
      delete (window as any).canEditProfessionalAccount;
      delete (window as any).loadServicesForProfessional;
      delete (window as any).openProfessionalProfile;
      delete (window as any).openEditProfessional;
      delete (window as any).saveProfessionalAccount;
      delete (window as any).setAgendaViewFor;
      delete (window as any).notifRowHtml;
      delete (window as any).renderNotifsPage;
      delete (window as any).markAllRead;
      delete (window as any).addNotif;
      delete (window as any).closeModal;
      delete (window as any).openModal;
      delete (window as any).openNewRdv;
      delete (window as any).detectClient;
      delete (window as any).submitNewRdv;
      delete (window as any).openRdvDetail;
      delete (window as any).changeStatus;
      delete (window as any).cancelRdv;
      delete (window as any).openEditRdv;
      delete (window as any).saveEditRdv;
      delete (window as any).openClientFiche;
      delete (window as any).exportMock;
      delete (window as any).svg;
      delete (window as any).iconPlus;
      delete (window as any).iconCal;
      delete (window as any).iconCheck;
      delete (window as any).iconCheckCircle;
      delete (window as any).iconClock;
      delete (window as any).iconX;
      delete (window as any).iconUserX;
      delete (window as any).iconChevronLeft;
      delete (window as any).iconChevronRight;
      delete (window as any).iconPrinter;
      delete (window as any).iconEdit;
      delete (window as any).iconEye;
      delete (window as any).iconAlert;
      delete (window as any).iconPhone;
      delete (window as any).iconGrid;
      delete (window as any).iconList;
      delete (window as any).statusIconSvg;
      delete (window as any).setProView;
      delete (window as any).renderProRow;
      delete (window as any).agendaLegendHtml;
      delete (window as any).toggleDatePicker;
      delete (window as any).closeDatePicker;
      delete (window as any).shiftDatePickerMonth;
      delete (window as any).setDatePickerMonth;
      delete (window as any).setDatePickerYear;
      delete (window as any).pickDate;
      delete (window as any).renderDatePicker;
      delete (window as any).placeWeekAppts;
      delete (window as any).handleWeekColClick;
      delete (window as any).getClientNotes;
      delete (window as any).saveClientNote;
      delete (window as any).getProfessionalColor;
      delete (window as any).hexToRgb;
      delete (window as any).lightenRgb;
      delete (window as any).getFilteredAppointmentsForExport;
      delete (window as any).exportExcel;
      delete (window as any).exportPDF;

    };
  }, [logout, navigate]);

  return (
    <>
      <style>{`
  :root {
    --primary: #7350E8;
    --primary-light: #9B7CF2;
    --primary-soft: #E9E3FF;
    --primary-dark: #5B3BC7;
    --ink: #111827;
    --ink-soft: #6B7280;
    --paper: #F7F7FB;
    --card: #FFFFFF;
    --line: #ECECF3;
    --radius: 14px;
    --st-reserve: #7350E8;
    --st-arrive: #3B82F6;
    --st-encours: #F59E0B;
    --st-termine: #10B981;
    --st-absent: #9CA3AF;
    --st-annule: #EF4444;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--paper); color: var(--ink); }
  button, input, select, textarea { font-family: inherit; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: #DDD8EC; border-radius: 999px; }

  .app { min-height: 100vh; background: var(--paper); }

  /* ==================== TOPBAR ==================== */
  .topbar { height: 72px; background: #FFFFFF; border-bottom: 1px solid #F0EFF5; display: flex; align-items: center; gap: 18px; padding: 0 28px; position: sticky; top: 0; z-index: 30; }
  .tb-brand { display: flex; align-items: center; gap: 10px; flex-shrink: 0; margin-right: 8px; }
  .tb-brand-logo { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 17px; box-shadow: 0 6px 14px rgba(115,80,232,.28); }
  .tb-brand-text { font-weight: 800; font-size: 19px; color: #1A1A2E; letter-spacing: -0.4px; }
  .tb-nav { display: flex; align-items: center; gap: 2px; flex: 1; overflow-x: auto; padding: 4px 0; }
  .tb-nav::-webkit-scrollbar { display: none; }

  .nav-item { display: flex; align-items: center; gap: 8px; padding: 9px 14px; border-radius: 10px; font-size: 13.5px; font-weight: 600; color: #6B7280; cursor: pointer; white-space: nowrap; position: relative; transition: background .15s ease, color .15s ease; }
  .nav-item:hover { background: var(--primary-soft); color: var(--primary); }
  .nav-item.active { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; box-shadow: 0 6px 16px rgba(115,80,232,.28); }
  .nav-item.active svg { color: #fff; }
  .nav-item svg { color: #9CA3AF; transition: color .15s ease; }
  .nav-item:hover svg { color: var(--primary); }
  .nav-badge { background: var(--primary); color: #fff; font-size: 10.5px; font-weight: 700; border-radius: 999px; padding: 1px 7px; margin-left: 2px; min-width: 18px; text-align: center; }
  .nav-item.active .nav-badge { background: #fff; color: var(--primary); }

  .tb-right { margin-left: auto; display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .tb-icon-btn { position: relative; width: 40px; height: 40px; border-radius: 50%; border: 1px solid transparent; background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4B5563; transition: background .15s ease, color .15s ease, border-color .15s ease; }
  .tb-icon-btn:hover { background: var(--primary-soft); color: var(--primary); border-color: var(--primary-light); }
  .tb-icon-dot { position: absolute; top: 4px; right: 4px; background: var(--primary); color: #fff; font-size: 10px; font-weight: 700; border-radius: 999px; min-width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; padding: 0 4px; border: 2px solid #fff; }
  .tb-user { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 6px 10px 6px 6px; border-radius: 12px; margin-left: 6px; transition: background .15s ease; }
  .tb-user:hover { background: var(--primary-soft); }
  .tb-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-soft); }
  .tb-user-text { line-height: 1.25; }
  .tb-user-name { font-size: 13.5px; font-weight: 700; color: #1A1A2E; }
  .tb-user-role { font-size: 11.5px; color: #9CA3AF; }
  .tb-user-caret { color: #9CA3AF; transition: transform .2s ease; }
  .tb-user.open .tb-user-caret { transform: rotate(180deg); }

  .tb-profile-wrap { position: relative; }
  .profile-menu { display: none; position: absolute; top: calc(100% + 10px); right: 0; min-width: 260px; background: #fff; border: 1px solid var(--primary-soft); border-radius: 14px; box-shadow: 0 20px 40px -12px rgba(115,80,232,.22); padding: 8px; z-index: 200; animation: profileMenuIn .18s ease; }
  .profile-menu.show { display: block; }
  @keyframes profileMenuIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  .profile-menu-head { display: flex; align-items: center; gap: 12px; padding: 12px 12px 14px; border-bottom: 1px solid var(--primary-soft); margin-bottom: 6px; background: linear-gradient(135deg, var(--primary-soft), #fff); border-radius: 10px 10px 0 0; margin: -8px -8px 6px; padding: 16px 16px 16px; }
  .profile-menu-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary); flex-shrink: 0; }
  .profile-menu-info { min-width: 0; flex: 1; }
  .profile-menu-info strong { display: block; font-size: 14px; font-weight: 700; color: #1A1A2E; margin-bottom: 2px; }
  .profile-menu-info span { display: block; font-size: 11.5px; color: #9CA3AF; }
  .profile-menu-item { width: 100%; display: flex; align-items: center; gap: 11px; padding: 10px 12px; border: none; background: transparent; border-radius: 9px; font-size: 13px; font-weight: 600; color: #1A1A2E; cursor: pointer; text-align: left; transition: background .15s ease, color .15s ease; }
  .profile-menu-item svg { color: #9CA3AF; flex-shrink: 0; transition: color .15s ease; }
  .profile-menu-item:hover { background: var(--primary-soft); color: var(--primary); }
  .profile-menu-item:hover svg { color: var(--primary); }
  .profile-menu-item.danger { color: #EF4444; }
  .profile-menu-item.danger svg { color: #EF4444; }
  .profile-menu-item.danger:hover { background: #FDEDEC; color: #DC2626; }
  .profile-menu-item.danger:hover svg { color: #DC2626; }

  .page { padding: 26px 22px 60px; display: none; }
  .page.active { display: block; }
  .page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 22px; flex-wrap: wrap; }
  .page-title { font-size: 23px; font-weight: 800; margin: 0 0 4px; }
  .page-sub { font-size: 13px; color: var(--ink-soft); margin: 0; }

  .agenda-page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 22px; flex-wrap: wrap; }
  .agenda-title { font-size: 30px; font-weight: 800; color: #1A1A2E; margin: 0 0 6px; letter-spacing: -0.6px; }
  .agenda-subtitle { font-size: 13.5px; color: #6B7280; margin: 0; }

  .btn-reservio-primary { display: inline-flex; align-items: center; gap: 10px; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; border: none; border-radius: 12px; padding: 13px 22px; font-size: 13.5px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 20px rgba(115,80,232,.28); transition: transform .18s ease, box-shadow .18s ease; }
  .btn-reservio-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(115,80,232,.38); }

  .agenda-toolbar-v3 { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 16px; }
  .agenda-toolbar-left-v3, .agenda-toolbar-right-v3 { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .agenda-arrow-btn-v3 { width: 40px; height: 40px; border-radius: 10px; border: 1.5px solid var(--primary-soft); background: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: var(--primary); transition: background .15s, border-color .15s, color .15s; }
  .agenda-arrow-btn-v3:hover { background: var(--primary); border-color: var(--primary); color: #fff; }
  .agenda-today-pill-v3 { height: 40px; padding: 0 18px; border-radius: 10px; border: 1.5px solid var(--primary-soft); background: #fff; cursor: pointer; font-size: 13px; font-weight: 700; color: var(--primary); transition: background .15s, border-color .15s, color .15s; }
  .agenda-today-pill-v3:hover { background: var(--primary); border-color: var(--primary); color: #fff; }

  .view-toggle-v3 { display: inline-flex; border: 1.5px solid var(--primary-soft); border-radius: 10px; overflow: hidden; background: #fff; height: 40px; }
  .view-toggle-v3 button { width: 40px; height: 100%; border: none; background: transparent; color: var(--primary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s, color .15s; }
  .view-toggle-v3 button:hover { background: var(--primary-soft); }
  .view-toggle-v3 button.active { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; }
  .view-toggle-v3 button + button { border-left: 1.5px solid var(--primary-soft); }

  .date-picker-wrap { position: relative; }
  .agenda-date-pill-v3 { height: 40px; padding: 0 18px; border-radius: 10px; border: 1.5px solid var(--primary-soft); background: var(--primary-soft); cursor: pointer; font-size: 13.5px; font-weight: 700; color: var(--primary-dark); display: inline-flex; align-items: center; gap: 10px; min-width: 220px; transition: background .15s, border-color .15s; }
  .agenda-date-pill-v3:hover { background: var(--primary-light); color: #fff; border-color: var(--primary-light); }
  .agenda-date-pill-v3:hover svg { color: #fff; }
  .agenda-date-pill-v3 svg { color: var(--primary); transition: color .15s; }

  .date-picker-pop { display: none; position: absolute; top: calc(100% + 8px); left: 0; width: 300px; background: #fff; border: 1.5px solid var(--primary-soft); border-radius: 16px; box-shadow: 0 20px 44px -14px rgba(115,80,232,.32); padding: 14px; z-index: 150; animation: profileMenuIn .16s ease; }
  .date-picker-pop.show { display: block; }
  .date-picker-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
  .date-picker-nav { width: 32px; height: 32px; border-radius: 9px; border: 1.5px solid var(--primary-soft); background: #fff; color: var(--primary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s, color .15s; }
  .date-picker-nav:hover { background: var(--primary); color: #fff; }
  .date-picker-selects { display: flex; gap: 6px; flex: 1; }
  .date-picker-selects select { flex: 1; min-width: 0; border: 1.5px solid var(--primary-soft); border-radius: 9px; padding: 6px 8px; font-size: 12px; font-weight: 700; color: var(--primary-dark); background: var(--primary-soft); cursor: pointer; }
  .date-picker-dow-row { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px; }
  .date-picker-dow-row span { text-align: center; font-size: 10.5px; font-weight: 700; color: var(--ink-soft); padding: 4px 0; }
  .date-picker-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
  .date-picker-cell { aspect-ratio: 1; border: none; background: transparent; border-radius: 8px; font-size: 12px; font-weight: 600; color: var(--ink); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .12s, color .12s; }
  .date-picker-cell:hover { background: var(--primary-soft); color: var(--primary); }
  .date-picker-cell.muted { color: #C9C6D6; }
  .date-picker-cell.today { color: var(--primary); font-weight: 800; box-shadow: inset 0 0 0 1.5px var(--primary-light); }
  .date-picker-cell.selected { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; box-shadow: 0 4px 10px rgba(115,80,232,.35); }
  .date-picker-footer { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--primary-soft); display: flex; justify-content: center; }
  .date-picker-today-btn { border: none; background: var(--primary-soft); color: var(--primary-dark); font-size: 12px; font-weight: 700; padding: 8px 16px; border-radius: 9px; cursor: pointer; transition: background .15s, color .15s; }
  .date-picker-today-btn:hover { background: var(--primary); color: #fff; }

  .agenda-select-v3 { position: relative; }
  .agenda-select-v3 > button { height: 40px; padding: 0 16px; border-radius: 10px; border: 1.5px solid var(--primary-soft); background: #fff; cursor: pointer; font-size: 13px; font-weight: 700; color: var(--primary-dark); display: inline-flex; align-items: center; gap: 10px; transition: background .15s, border-color .15s, color .15s; }
  .agenda-select-v3 > button:hover { background: var(--primary-soft); border-color: var(--primary-light); }
  .agenda-select-menu-v3 { display: none; position: absolute; top: calc(100% + 6px); right: 0; min-width: 210px; background: #fff; border: 1.5px solid var(--primary-soft); border-radius: 12px; padding: 6px; box-shadow: 0 16px 34px rgba(115,80,232,.18); z-index: 100; }
  .agenda-select-menu-v3.show { display: block; }
  .agenda-select-menu-v3 button { width: 100%; display: block; text-align: left; padding: 9px 12px; border: none; background: transparent; border-radius: 8px; font-size: 12.5px; font-weight: 600; color: #1A1A2E; cursor: pointer; }
  .agenda-select-menu-v3 button:hover { background: var(--primary-soft); color: var(--primary); }

  .agenda-pro-row-v3 { display: flex; gap: 14px; overflow-x: auto; padding: 4px 2px 20px; margin-bottom: 14px; }
  .agenda-pro-row-v3::-webkit-scrollbar { height: 6px; }
  .pro-card-v3 { min-width: 250px; max-width: 300px; display: flex; align-items: center; gap: 14px; background: #fff; border: 1.5px solid var(--primary-soft); border-radius: 14px; padding: 14px 18px 14px 14px; cursor: pointer; transition: transform .2s, border-color .2s, box-shadow .2s; position: relative; }
  .pro-card-v3:hover { transform: translateY(-2px); border-color: var(--primary-light); box-shadow: 0 8px 20px rgba(115,80,232,.16); }
  .pro-card-v3.selected { border-color: var(--primary); border-width: 2px; padding: 13.5px 17.5px 13.5px 13.5px; background: linear-gradient(145deg, var(--primary-soft), #fff); box-shadow: 0 8px 22px rgba(115,80,232,.22); }
  .pro-photo-wrap-v3 { position: relative; flex-shrink: 0; }
  .pro-photo-v3 { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; display: block; }
  .pro-dot-v3 { position: absolute; bottom: 0; left: 0; width: 12px; height: 12px; border-radius: 50%; border: 2.5px solid #fff; }
  .pro-check-v3 { position: absolute; top: -4px; right: -6px; width: 22px; height: 22px; border-radius: 50%; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; border: 2.5px solid #fff; }
  .pro-info-v3 { min-width: 0; flex: 1; }
  .pro-info-v3 strong { display: block; font-size: 14px; font-weight: 700; color: #1A1A2E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px; }
  .pro-info-v3 > span { display: block; font-size: 12px; color: #9CA3AF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pro-service-tag { display: inline-block; font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: var(--primary-soft); color: var(--primary-dark); white-space: nowrap; }

  .pro-list-v3 { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .pro-list-item-v3 { display: grid; grid-template-columns: 44px 220px 1fr auto; align-items: center; gap: 16px; padding: 10px 16px; background: #fff; border: 1.5px solid var(--primary-soft); border-radius: 12px; cursor: pointer; transition: background .15s, border-color .15s, box-shadow .15s; }
  .pro-list-item-v3:hover { border-color: var(--primary-light); box-shadow: 0 6px 16px rgba(115,80,232,.12); }
  .pro-list-item-v3.selected { border-color: var(--primary); background: linear-gradient(90deg, var(--primary-soft), #fff); box-shadow: inset 4px 0 0 var(--primary); }
  .pro-list-photo-v3 { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
  .pro-list-info-v3 strong { display: block; font-size: 13.5px; }
  .pro-list-info-v3 span { display: block; font-size: 11px; color: var(--ink-soft); margin-top: 2px; }
  .pro-list-services-v3 { display: flex; gap: 6px; flex-wrap: wrap; }
  .pro-list-end-v3 { display: flex; align-items: center; gap: 8px; }
  .pro-list-count-v3 { font-size: 11.5px; font-weight: 700; color: var(--primary-dark); background: var(--primary-soft); padding: 4px 10px; border-radius: 999px; white-space: nowrap; }

  .agenda-grid-v3 { background: #fff; border: 1.5px solid var(--primary-soft); border-radius: 16px; overflow: hidden; display: flex; position: relative; }
  .agenda-hours-col-v3 { width: 72px; flex-shrink: 0; display: flex; flex-direction: column; background: #FCFBFF; }
  .agenda-hour-label-v3 { display: flex; align-items: flex-start; justify-content: flex-end; padding: 8px 14px 0 0; font-size: 12px; color: #6B7280; font-weight: 600; border-top: 1px solid var(--primary-soft); flex-shrink: 0; }
  .agenda-hour-label-v3:first-child { border-top: none; }
  .agenda-hour-label-last-v3 { height: 22px; align-items: center; padding-top: 0; }
  .agenda-pros-wrapper-v3 { flex: 1; display: flex; min-width: 0; }
  .agenda-pro-col-v3 { flex: 1; min-width: 0; position: relative; border-right: 1px solid var(--primary-soft); display: flex; flex-direction: column; transition: background .15s ease; }
  .agenda-pro-col-v3:last-child { border-right: none; }
  .agenda-pro-col-v3.drop-hover { background: linear-gradient(180deg, rgba(115,80,232,.08), rgba(115,80,232,.15)); box-shadow: inset 0 0 0 2px var(--primary); }
  .agenda-drop-indicator { position: absolute; left: 6px; right: 6px; height: 22px; border-radius: 8px; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 50; box-shadow: 0 4px 12px rgba(115,80,232,.4); }

  .agenda-slot-unavailable {
    background:
      repeating-linear-gradient(
        -45deg,
        rgba(148, 163, 184, .10),
        rgba(148, 163, 184, .10) 8px,
        rgba(148, 163, 184, .20) 8px,
        rgba(148, 163, 184, .20) 16px
      ) !important;
    cursor: not-allowed !important;
    filter: grayscale(.35);
    opacity: .72;
    position: relative;
  }

  .agenda-slot-unavailable::after {
    content: "";
    position: absolute;
    inset: 0;
    background: rgba(247, 247, 251, .25);
    pointer-events: none;
  }

  .agenda-slot-unavailable:hover {
    background:
      repeating-linear-gradient(
        -45deg,
        rgba(148, 163, 184, .13),
        rgba(148, 163, 184, .13) 8px,
        rgba(148, 163, 184, .24) 8px,
        rgba(148, 163, 184, .24) 16px
      ) !important;
  }

  .agenda-pro-slot-v3 { border-top: 1px solid var(--primary-soft); cursor: pointer; transition: background .15s; flex-shrink: 0; }
  .agenda-pro-slot-v3:first-child { border-top: none; }
  .agenda-pro-slot-v3:hover { background: var(--primary-soft); }
  .agenda-pro-slot-v3.lunch { background: repeating-linear-gradient(45deg, #FAFAFB, #FAFAFB 6px, #F0EDFB 6px, #F0EDFB 12px); display: flex; align-items: center; justify-content: center; font-size: 12px; color: #9CA3AF; font-weight: 600; cursor: default; }
  .agenda-pro-slot-last-v3 { height: 22px; cursor: default; background: #FCFBFF; }
  .agenda-pro-slot-last-v3:hover { background: #FCFBFF; }
  .agenda-pro-appts-v3 { position: absolute; inset: 0; pointer-events: none; }

  .appt-card-v3 { position:absolute; left:18px; right:18px; border-radius:10px; padding:5px 42px 5px 12px; pointer-events:auto; cursor:grab; overflow:hidden; transition:transform .15s,box-shadow .15s,opacity .15s; box-shadow:0 1px 2px rgba(115,80,232,.08); display:flex; align-items:center; }
  .appt-card-v3-main { display:flex; align-items:center; gap:16px; width:100%; min-width:0; }
  .appt-card-v3-time { flex-shrink:0; font-size:11.5px; font-weight:600; color:#6B7280; margin:0; white-space:nowrap; }
  .appt-card-v3-name { font-size:13px; font-weight:700; color:#1A1A2E; margin:0; line-height:1.2; white-space:nowrap; overflow:visible; flex-shrink:0; }
  .appt-card-v3-phone { display:none; }
  .appt-card-v3-service { font-size:11.5px; color:#6B7280; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }  .appt-card-v3-badge { position:absolute; top:50%; right:10px; transform:translateY(-50%); width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; }
  .appt-card-v3:hover { transform:translateY(-2px); box-shadow:0 10px 22px rgba(115,80,232,.22); z-index:5!important; }
  .appt-card-v3.appt-dragging { opacity:.35; transform:scale(.96); cursor:grabbing; }
  body.is-dragging-appt .agenda-pro-slot-v3:not(.lunch) { background: repeating-linear-gradient(45deg, #FCFBFF, #FCFBFF 10px, #F3F0FE 10px, #F3F0FE 20px); }

  .agenda-timeline-v3 { position: absolute; left: 72px; right: 0; height: 0; border-top: 2px solid #EF4444; z-index: 10; pointer-events: none; }
  .agenda-timeline-label-v3 { position: absolute; left: -60px; top: -12px; background: #EF4444; color: #fff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; box-shadow: 0 3px 8px rgba(239,68,68,.35); }

  .agenda-legend-v3 { margin-top: 16px; padding: 14px 18px; background: #fff; border: 1.5px solid var(--primary-soft); border-radius: 14px; display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
  .agenda-legend-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--primary-dark); }
  .agenda-legend-items { display: flex; gap: 20px; flex-wrap: wrap; }
  .agenda-legend-item { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: var(--ink); }
  .agenda-legend-dot { width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 2px 5px rgba(115,80,232,.2); }
  .agenda-legend-hint { margin-left: auto; font-size: 11.5px; color: var(--primary-dark); background: var(--primary-soft); padding: 6px 12px; border-radius: 999px; font-weight: 600; }

  .btn { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; border: none; border-radius: 10px; padding: 10px 16px; cursor: pointer; transition: transform .1s, opacity .15s, background .15s, box-shadow .15s; }
  .btn:hover { transform: translateY(-1px); }
  .btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }
  .btn-primary { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; box-shadow: 0 6px 16px rgba(115,80,232,.28); }
  .btn-primary:hover { background: linear-gradient(135deg, var(--primary-light), var(--primary)); box-shadow: 0 10px 22px rgba(115,80,232,.38); }
  .btn-ghost { background: var(--primary-soft); color: var(--primary-dark); border: 1.5px solid var(--primary-soft); }
  .btn-ghost:hover { background: var(--primary); border-color: var(--primary); color: #fff; }
  .btn-sm { padding: 7px 12px; font-size: 12px; }
  .btn-danger-ghost { background: #FDEDEC; color: var(--st-annule); border: 1px solid #F7D3D0; }
  .btn-dispo-granted { border-color: var(--primary) !important; color: var(--primary-dark) !important; background: var(--primary-soft) !important; }

  .card { background: var(--card); border: 1.5px solid var(--primary-soft); border-radius: var(--radius); box-shadow: 0 4px 16px rgba(115,80,232,.05); }

  .status-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
  .status-pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .st-reserve { background: var(--primary-soft); color: var(--primary); }
  .st-arrive { background: #E0EDFF; color: var(--st-arrive); }
  .st-encours { background: #FDF1E2; color: var(--st-encours); }
  .st-termine { background: #E3F5E8; color: var(--st-termine); }
  .st-absent { background: #EEEDF2; color: var(--st-absent); }
  .st-annule { background: #FDEDEC; color: var(--st-annule); }

  .avatar-sm { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 12px; flex-shrink: 0; }

  .filter-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
  .filter-row select, .filter-row input { border: 1.5px solid var(--primary-soft); border-radius: 9px; padding: 8px 12px; font-size: 12.5px; background: var(--card); color: var(--ink); }
  .filter-row select:focus, .filter-row input:focus { outline: none; border-color: var(--primary); }
  table.data-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  table.data-table th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: .04em; color: var(--primary-dark); font-weight: 800; padding: 12px 18px; border-bottom: 1.5px solid var(--primary-soft); white-space: nowrap; background: var(--primary-soft); }
  table.data-table td { padding: 13px 18px; border-bottom: 1px solid var(--primary-soft); vertical-align: middle; }
  table.data-table tr:last-child td { border-bottom: none; }
  table.data-table tr.row-clickable { cursor: pointer; transition: background .12s ease; }
  table.data-table tr.row-clickable:hover { background: var(--primary-soft); }
  .cell-client { display: flex; align-items: center; gap: 10px; }
  .cell-client-name { font-weight: 700; }
  .cell-client-sub { font-size: 11px; color: var(--ink-soft); }
  .row-actions { display: flex; gap: 6px; }
  .icon-btn { width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid var(--primary-soft); background: var(--card); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--primary); transition: background .15s, color .15s, border-color .15s; }
  .icon-btn:hover { background: var(--primary); color: #fff; border-color: var(--primary); }
  .icon-btn.accent { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; border-color: var(--primary); box-shadow: 0 4px 10px rgba(115,80,232,.28); }
  .icon-btn.accent:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(115,80,232,.35); }
  .repeat-warning { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; color: var(--st-annule); background: #FDEDEC; padding: 2px 8px; border-radius: 999px; margin-left: 6px; }
  .table-empty { padding: 40px 20px; text-align: center; color: var(--ink-soft); font-size: 13px; }

  .notif-row { display: flex; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--primary-soft); align-items: flex-start; }
  .notif-row:last-child { border-bottom: none; }
  .notif-row.unread { background: #FBFAFF; }
  .notif-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .notif-text { font-size: 12.5px; line-height: 1.5; }
  .notif-time { font-size: 11px; color: var(--ink-soft); margin-top: 2px; }
  .notif-dot-unread { width: 8px; height: 8px; border-radius: 50%; background: var(--primary); margin-left: auto; margin-top: 6px; flex-shrink: 0; }

  .modal-overlay { position: fixed; inset: 0; background: rgba(91,59,199,0.35); backdrop-filter: blur(2px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; opacity: 0; transition: opacity .2s ease; }
  .modal-overlay.open { opacity: 1; }
  .modal-box { width: 100%; max-width: 760px; max-height: 90vh; overflow-y: auto; background: var(--card); border-radius: 20px; box-shadow: 0 40px 80px -20px rgba(91,59,199,0.45); padding: 26px 30px; transform: translateY(14px) scale(.98); transition: transform .22s ease; }
  .modal-overlay.open .modal-box { transform: translateY(0) scale(1); }
  .modal-box.wide { max-width: 1080px; }
  .modal-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; }
  .modal-title { font-size: 18px; font-weight: 800; margin: 0 0 2px; }
  .modal-sub { font-size: 12.5px; color: var(--ink-soft); margin: 0; }
  .modal-close { border: none; background: var(--primary-soft); color: var(--primary); width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 18px; flex-shrink: 0; transition: background .15s, color .15s; }
  .modal-close:hover { background: var(--primary); color: #fff; }
  .field-row { margin-bottom: 13px; }
  .field-row label { display: block; font-size: 12px; font-weight: 700; color: var(--ink-soft); margin-bottom: 5px; }
  .field-row input, .field-row select, .field-row textarea { width: 100%; border: 1.5px solid var(--primary-soft); border-radius: 9px; padding: 10px 12px; font-size: 13px; color: var(--ink); background: var(--paper); }
  .field-row input:focus, .field-row select:focus, .field-row textarea:focus { outline: none; border-color: var(--primary); }
  .field-row input:disabled, .field-row select:disabled, .field-row textarea:disabled { opacity: .7; cursor: not-allowed; background: #F3F3F7; }
  .field-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; flex-wrap: wrap; }

  .detail-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px 22px; margin-bottom: 20px; }
  .detail-item-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--ink-soft); margin-bottom: 3px; }
  .detail-item-value { font-size: 13.5px; font-weight: 600; }
  .status-menu { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 20px; }
  .status-menu button { border: 1.5px solid var(--primary-soft); background: var(--card); border-radius: 9px; padding: 7px 12px; font-size: 12px; font-weight: 700; cursor: pointer; color: var(--ink-soft); transition: background .15s, border-color .15s, color .15s; }
  .status-menu button:hover { border-color: var(--primary-light); color: var(--primary); }
  .status-menu button.current { border-color: var(--primary); color: #fff; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); }

  .toast { position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%) translateY(20px); background: linear-gradient(135deg, var(--primary-dark), var(--primary)); color: #fff; font-size: 13px; font-weight: 600; padding: 12px 20px; border-radius: 10px; z-index: 200; opacity: 0; transition: opacity .25s ease, transform .25s ease; box-shadow: 0 20px 40px -14px rgba(115,80,232,.5); }
  .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

  .export-wrap { position: relative; display: inline-block; }
  .export-dropdown { display: none; position: absolute; top: calc(100% + 7px); right: 0; min-width: 150px; padding: 6px; background: var(--card); border: 1.5px solid var(--primary-soft); border-radius: 12px; box-shadow: 0 12px 30px rgba(115,80,232,.2); z-index: 1000; }
  .export-dropdown.show { display: block; }
  .export-dropdown button { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: none; border-radius: 8px; background: transparent; color: var(--ink); font-size: 12.5px; font-weight: 600; cursor: pointer; text-align: left; }
  .export-dropdown button:hover { background: var(--primary-soft); color: var(--primary); }

  /* ==================== VUE SEMAINE (type calendrier) ==================== */
  .week-calendar-v3 { background: #fff; border: 1.5px solid var(--primary-soft); border-radius: 16px; overflow: hidden; }
  .week-header-v3 { display: flex; border-bottom: 1.5px solid var(--primary-soft); background: #FCFBFF; }
  .week-header-corner-v3 { width: 72px; flex-shrink: 0; border-right: 1px solid var(--primary-soft); }
  .week-header-days-v3 { flex: 1; display: flex; min-width: 0; }
  .week-header-day-v3 { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 4px; border-right: 1px solid var(--primary-soft); cursor: pointer; transition: background .15s; }
  .week-header-day-v3:last-child { border-right: none; }
  .week-header-day-v3:hover { background: var(--primary-soft); }
  .week-header-day-v3.today { background: var(--primary-soft); }
  .week-header-dow-v3 { font-size: 11px; font-weight: 700; color: var(--ink-soft); text-transform: uppercase; letter-spacing: .04em; }
  .week-header-day-v3.today .week-header-dow-v3 { color: var(--primary-dark); }
  .week-header-num-v3 { font-size: 15px; font-weight: 800; color: var(--ink); }
  .week-header-day-v3.today .week-header-num-v3 { color: var(--primary); }

  .week-body-v3 { display: flex; position: relative; }
  .week-hours-col-v3 { width: 72px; flex-shrink: 0; display: flex; flex-direction: column; background: #FCFBFF; border-right: 1px solid var(--primary-soft); }
  .week-days-wrapper-v3 { flex: 1; display: flex; min-width: 0; }
  .week-day-col-v3 { flex: 1; min-width: 0; position: relative; border-right: 1px solid var(--primary-soft); display: flex; flex-direction: column; }
  .week-day-col-v3:last-child { border-right: none; }
  .week-day-slot-v3 { border-top: 1px solid var(--primary-soft); cursor: pointer; transition: background .15s; flex-shrink: 0; }
  .week-day-slot-v3:first-child { border-top: none; }
  .week-day-slot-v3:hover { background: var(--primary-soft); }
  .week-day-slot-last-v3 { height: 22px; cursor: default; background: #FCFBFF; }
  .week-day-slot-last-v3:hover { background: #FCFBFF; }
  .week-day-appts-v3 { position: absolute; inset: 0; pointer-events: none; }
  .week-appt-card-v3 { position: absolute; left: 3px; right: 3px; border-radius: 6px; padding: 4px 6px; pointer-events: auto; cursor: pointer; overflow: hidden; box-shadow: 0 1px 2px rgba(115,80,232,.08); transition: transform .15s, box-shadow .15s; }
  .week-appt-card-v3:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(115,80,232,.22); z-index: 5 !important; }
  .week-appt-time-v3 { font-size: 9.5px; font-weight: 700; color: #6B7280; margin-bottom: 1px; }
  .week-appt-name-v3 { font-size: 10.5px; font-weight: 700; color: #1A1A2E; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .week-appt-pro-v3 { font-size: 9.5px; color: #6B7280; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .week-timeline-v3 { position: absolute; left: 0; right: 0; height: 0; border-top: 2px solid #EF4444; z-index: 10; pointer-events: none; }

  /* ==================== VUE MOIS : cartes par semaine ==================== */
  .month-weeks-v3 { display: flex; flex-direction: column; gap: 18px; }
  .week-card-v3 { background: #fff; border: 1.5px solid var(--primary-soft); border-radius: 18px; overflow: hidden; box-shadow: 0 8px 22px rgba(115,80,232,.08); }
  .week-card-head-v3 { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 20px; background: linear-gradient(135deg, #fff, var(--primary-soft)); border-bottom: 1.5px solid var(--primary-soft); flex-wrap: wrap; }
  .week-card-title-v3 { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; min-width: 0; }
  .week-card-badge-v3 { display: inline-flex; align-items: center; font-size: 13px; font-weight: 800; color: #fff; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); padding: 6px 14px; border-radius: 999px; box-shadow: 0 4px 12px rgba(115,80,232,.28); letter-spacing: .02em; }
  .week-card-range-v3 { font-size: 12px; color: var(--ink-soft); font-weight: 600; }
  .week-card-count-v3 { font-size: 11.5px; font-weight: 800; color: var(--primary-dark); background: var(--primary-soft); padding: 5px 12px; border-radius: 999px; white-space: nowrap; }

  .week-card-days-v3 { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 1px; background: var(--primary-soft); }
  .week-card-day-v3 { background: #fff; padding: 10px 8px; min-height: 140px; display: flex; flex-direction: column; gap: 6px; }
  .week-card-day-v3.muted { background: #FAFAFB; opacity: .6; }
  .week-card-day-v3.today { background: linear-gradient(180deg, var(--primary-soft), #fff); }
  .week-card-day-head-v3 { display: flex; align-items: center; justify-content: space-between; gap: 4px; padding-bottom: 6px; border-bottom: 1px dashed var(--primary-soft); cursor: pointer; }
  .week-card-day-head-v3:hover { border-bottom-color: var(--primary); }
  .week-card-dow-v3 { font-size: 10px; font-weight: 800; color: var(--primary-dark); text-transform: uppercase; letter-spacing: .04em; }
  .week-card-num-v3 { font-size: 13px; font-weight: 800; color: var(--ink); }
  .week-card-day-v3.today .week-card-num-v3 { color: var(--primary); }
  .week-card-day-v3.today .week-card-dow-v3 { color: var(--primary); }

  .week-card-appts-v3 { display: flex; flex-direction: column; gap: 4px; flex: 1; overflow-y: auto; max-height: 220px; }
  .week-card-appt-v3 { display: flex; flex-direction: column; gap: 1px; padding: 5px 7px; border-left: 3px solid var(--primary); border-radius: 6px; cursor: pointer; transition: transform .12s, box-shadow .12s; }
  .week-card-appt-v3:hover { transform: translateX(2px); box-shadow: 0 3px 10px rgba(115,80,232,.2); }
  .week-card-appt-time-v3 { font-size: 9.5px; font-weight: 800; color: var(--primary-dark); }
  .week-card-appt-name-v3 { font-size: 10.5px; font-weight: 700; color: #1A1A2E; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .week-card-appt-pro-v3 { font-size: 9.5px; color: var(--ink-soft); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .week-card-empty-v3 { font-size: 10.5px; color: #C9C6D6; text-align: center; padding: 8px 0; }

  .client-search-panel { display:flex;align-items:center;justify-content:space-between;gap:20px;background:linear-gradient(135deg,#fff,var(--primary-soft));border:1.5px solid var(--primary-soft);border-radius:18px;padding:16px 18px;margin-bottom:18px;box-shadow:0 8px 24px rgba(115,80,232,.10); }
  .client-search-left { display:flex;align-items:center;gap:13px;flex:1; }
  .client-search-icon { width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;color:#fff;background:linear-gradient(135deg,var(--primary),var(--primary-light));box-shadow:0 8px 18px rgba(115,80,232,.28); }
  .client-search-content { flex:1; }
  .client-search-content label { display:block;font-size:10.5px;font-weight:800;margin-bottom:4px;color:var(--primary-dark);text-transform:uppercase;letter-spacing:.04em; }
  .client-search-content input { width:100%;border:none;outline:none;background:transparent;font-size:14px;color:var(--ink);padding:3px 0; }
  .client-search-actions { display:flex;align-items:center;gap:12px; }
  .client-count { font-size:12px;font-weight:700;background:var(--primary);color:#fff;padding:6px 11px;border-radius:999px; }
  .client-table-shell { overflow:hidden;background:#fff;border-radius:18px;border:1.5px solid var(--primary-soft); }
  .client-row:hover { background:linear-gradient(90deg,var(--primary-soft),rgba(115,80,232,.03)) !important;box-shadow:inset 4px 0 0 var(--primary); }
  .client-avatar { background:linear-gradient(135deg,var(--primary),var(--primary-light)); }
  .client-rdv-number { display:inline-flex;align-items:center;justify-content:center;min-width:30px;height:26px;padding:0 9px;background:var(--primary);color:#fff;border-radius:999px;font-weight:800; }
  .client-empty { min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--ink-soft); }
  .client-empty-icon { font-size:28px;margin-bottom:4px; }

  .client-profile-hero { display:flex;align-items:center;justify-content:space-between;padding:4px 2px 18px;border-bottom:1.5px solid var(--primary-soft);margin-bottom:18px; }
  .client-profile-left { display:flex;align-items:center;gap:14px; }
  .client-profile-avatar { width:58px;height:58px;border-radius:17px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:17px;background:linear-gradient(135deg,var(--primary),var(--primary-light)); }
  .client-profile-left h2 { margin:0 0 3px;font-size:20px; }
  .client-profile-left p { margin:0;font-size:12.5px;color:var(--ink-soft); }
  .client-info-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px; }
  .client-info-card { padding:14px 16px;border:1.5px solid var(--primary-soft);border-radius:13px;background:linear-gradient(145deg,#fff,var(--primary-soft)); }
  .client-info-card span { display:block;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--primary-dark);font-weight:700;margin-bottom:5px; }
  .client-info-card strong { font-size:13.5px; }
  .client-note-card { padding:16px;margin-bottom:20px;border-radius:15px;border:1.5px solid var(--primary-light);background:linear-gradient(135deg,var(--primary-soft),#fff); }
  .client-note-head { display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px; }
  .client-note-head strong { display:block;font-size:13px; }
  .client-note-textarea { width:100%;min-height:90px;resize:vertical;padding:12px 14px;border:1.5px solid var(--primary-soft);border-radius:11px;background:#fff;font-family:inherit;font-size:12.5px;outline:none; }
  .client-note-textarea:focus { border-color:var(--primary); }
  .client-history-list { border:1.5px solid var(--primary-soft);border-radius:13px;overflow:hidden;max-height:300px;overflow-y:auto; }
  .client-history-item { display:flex;align-items:center;gap:14px;padding:12px 16px;border-bottom:1px solid var(--primary-soft);cursor:pointer; }
  .client-history-item:last-child { border-bottom:none; }
  .client-history-item:hover { background:var(--primary-soft); }
  .client-history-date { width:96px;flex-shrink:0; }
  .client-history-date strong,.client-history-main strong { display:block;font-size:12px; }
  .client-history-date span,.client-history-main span { font-size:11px;color:var(--ink-soft); }
  .client-history-main { flex:1; }

  .pro-management-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px; }
  .pro-management-card { position:relative;overflow:hidden;background:linear-gradient(145deg,#FFFFFF,var(--primary-soft));border:1.5px solid var(--primary-light);border-radius:18px;padding:18px;cursor:pointer;box-shadow:0 8px 22px rgba(115,80,232,.10);transition:transform .22s, box-shadow .22s; }
  .pro-management-card:hover { transform:translateY(-4px); box-shadow:0 16px 32px rgba(115,80,232,.22); }
  .pro-management-glow { position:absolute;width:120px;height:120px;border-radius:50%;right:-55px;top:-60px;opacity:.18;filter:blur(5px);pointer-events:none; }
  .pro-management-head { position:relative;display:flex;align-items:center;gap:12px; }
  .pro-management-avatar { width:48px;height:48px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:50%;object-fit:cover;border:2px solid var(--primary-soft); }
  .pro-management-identity { min-width:0;flex:1; }
  .pro-management-identity strong { display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .pro-management-identity span { display:block;margin-top:3px;font-size:11px;color:var(--ink-soft); }
  .pro-account-state { display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:999px;background:#E9F7ED;color:#2F8B4B;font-size:10px;font-weight:800; }
  .pro-account-state::before { content:"";width:6px;height:6px;border-radius:50%;background:currentColor; }
  .pro-management-services { display:flex;flex-wrap:wrap;gap:5px;margin-top:14px; }
  .pro-management-stats { display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:17px 0; }
  .pro-management-stats > div { padding:10px 8px;text-align:center;border:1.5px solid var(--primary-soft);border-radius:12px;background:rgba(255,255,255,.85); }
  .pro-management-stats strong { display:block;font-size:17px;color:var(--primary-dark); }
  .pro-management-stats span { display:block;margin-top:2px;font-size:9.5px;line-height:1.3;color:var(--ink-soft); }
  .pro-management-actions { display:flex;gap:8px;flex-wrap:wrap;align-items:center; }
  .pro-management-actions .btn { flex:1;justify-content:center;min-width:110px; }

  .professional-profile-hero { display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-bottom:18px;margin-bottom:16px;border-bottom:1.5px solid var(--primary-soft); }
  .professional-profile-main { display:flex;align-items:center;gap:14px; }
  .professional-profile-avatar { width:58px;height:58px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-weight:800;font-size:17px; }
  .professional-profile-main h2 { margin:0 0 3px;font-size:19px; }
  .professional-profile-main p { margin:0;color:var(--ink-soft);font-size:12px; }
  .professional-profile-services { display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px; }
  .professional-profile-stats { display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px; }
  .professional-profile-stat { padding:13px;border:1.5px solid var(--primary-soft);border-radius:13px;background:linear-gradient(145deg,#fff,var(--primary-soft)); }
  .professional-profile-stat span { display:block;font-size:10px;text-transform:uppercase;letter-spacing:.03em;color:var(--primary-dark);font-weight:700; }
  .professional-profile-stat strong { display:block;margin-top:5px;font-size:17px; }
  .professional-today-list { overflow:hidden;border:1.5px solid var(--primary-soft);border-radius:13px; }
  .professional-today-rdv { display:flex;align-items:center;gap:12px;padding:11px 14px;border-bottom:1px solid var(--primary-soft);cursor:pointer; }
  .professional-today-rdv:last-child { border-bottom:none; }
  .professional-today-rdv:hover { background:var(--primary-soft); }
  .professional-today-time { width:56px;flex-shrink:0;font-size:12px;font-weight:800;color:var(--primary); }
  .professional-today-info { flex:1;min-width:0; }
  .professional-today-info strong { display:block;font-size:12.5px; }
  .professional-today-info span { display:block;margin-top:2px;font-size:10.5px;color:var(--ink-soft); }
  .professional-empty { padding:28px 16px;text-align:center;color:var(--ink-soft);font-size:12px; }

  .access-granted { display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;background:#E9F7ED;color:#2F8B4B;font-size:11px;font-weight:700;white-space:nowrap; }
  .access-locked { display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;background:#EEEDF2;color:#6B7280;font-size:11px;font-weight:700;white-space:nowrap; }
  .access-locked-btn { flex:1;justify-content:center;min-width:120px;padding:8px 12px;border-radius:10px; }

  .access-info-banner { display:flex;align-items:flex-start;gap:14px;padding:14px 18px;margin-bottom:20px;background:linear-gradient(135deg,#fff,var(--primary-soft));border:1.5px solid var(--primary-light);border-radius:14px; }
  .access-info-banner.access-info-lock { background:linear-gradient(135deg,#FDF1E2,#fff);border-color:#F5CD9A; }
  .access-info-icon { font-size:20px;flex-shrink:0;line-height:1;margin-top:2px; }
  .access-info-banner strong { display:block;font-size:13px;margin-bottom:3px;color:var(--primary-dark); }
  .access-info-banner.access-info-lock strong { color:#B56A00; }
  .access-info-banner span { font-size:12.5px;color:var(--ink-soft);line-height:1.5; }

  .dispo-list { display:flex;flex-direction:column;gap:18px; }
  .dispo-card { background:#fff;border:1.5px solid var(--primary-soft);border-radius:18px;padding:20px;box-shadow:0 8px 22px rgba(115,80,232,.08); }
  .dispo-card-head { display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding-bottom:16px;margin-bottom:16px;border-bottom:1.5px solid var(--primary-soft); }
  .dispo-card-identity { display:flex;align-items:center;gap:14px;min-width:0; }
  .dispo-card-photo { width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid var(--primary-soft);flex-shrink:0; }
  .dispo-card-identity strong { display:block;font-size:15px;font-weight:800; }
  .dispo-card-identity span { display:block;font-size:12px;color:var(--ink-soft);margin-top:3px; }
  .dispo-card-meta { display:flex;align-items:center;gap:8px;flex-wrap:wrap; }
  .dispo-pill { display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:5px 11px;border-radius:999px;background:var(--primary-soft);color:var(--primary-dark);white-space:nowrap; }
  .dispo-pill-warn { background:#FDF1E2;color:#B56A00; }
  .dispo-weekly-grid { display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:10px; }
  .dispo-day { padding:12px 10px;border:1.5px solid var(--primary-soft);border-radius:12px;background:linear-gradient(145deg,#fff,var(--primary-soft));min-height:96px; }
  .dispo-day-off { background:repeating-linear-gradient(45deg,#FAFAFB,#FAFAFB 6px,#F0EDFB 6px,#F0EDFB 12px);border-style:dashed; }
  .dispo-day-name { display:block;font-size:11px;font-weight:800;color:var(--primary-dark);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;text-align:center; }
  .dispo-day-slots { display:flex;flex-direction:column;gap:4px; }
  .dispo-slot { display:block;text-align:center;font-size:11px;font-weight:700;padding:4px 6px;border-radius:7px;background:#fff;color:var(--primary-dark);border:1px solid var(--primary-soft); }
  .dispo-slot-off { color:#9CA3AF;background:transparent;border-color:#E5E7EB; }
  .dispo-exceptions { margin-top:16px;padding:14px 16px;background:linear-gradient(135deg,#FDF1E2,#fff);border:1.5px solid #F5CD9A;border-radius:12px; }
  .dispo-exceptions-title { font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#B56A00;margin-bottom:10px; }
  .dispo-exception-row { display:grid;grid-template-columns:120px 140px 1fr;gap:12px;align-items:center;padding:8px 0;font-size:12.5px;border-bottom:1px dashed #F5CD9A; }
  .dispo-exception-row:last-child { border-bottom:none; }
  .dispo-exception-date { font-weight:800;color:#B56A00; }
  .dispo-exception-time { font-weight:600;color:var(--ink); }
  .dispo-exception-reason { color:var(--ink-soft);font-style:italic; }

  .edit-weekly-title { font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--primary-dark);margin-bottom:12px; }
  .edit-weekly { margin-bottom:22px; }
  .edit-day-row { display:grid;grid-template-columns:110px 1fr auto;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--primary-soft); }
  .edit-day-row:last-child { border-bottom:none; }
  .edit-day-label { font-size:12.5px;font-weight:700;color:var(--primary-dark); }
  .edit-day-slots { display:flex;flex-direction:column;gap:6px; }
  .edit-slot { display:flex;align-items:center;gap:8px; }
  .edit-slot input[type="time"] { border:1.5px solid var(--primary-soft);border-radius:8px;padding:6px 10px;font-size:12.5px;background:#fff;color:var(--ink); }
  .edit-slot span { color:var(--ink-soft);font-weight:700; }
  .edit-exceptions { margin-bottom:6px; }
  .edit-exception-row { display:grid;grid-template-columns:130px 160px 100px 100px 1fr 40px;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--primary-soft); }
  .edit-exception-row input[type="date"], .edit-exception-row input[type="time"], .edit-exception-row input[type="text"] { border:1.5px solid var(--primary-soft);border-radius:8px;padding:6px 10px;font-size:12.5px;background:#fff;color:var(--ink);width:100%; }
  .edit-exception-row input:focus { outline:none;border-color:var(--primary); }
  .edit-exception-row input:disabled { opacity:.45; }
  .edit-exception-allday { display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--ink-soft);cursor:pointer; }

  .settings-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px; }
  .settings-card { background:linear-gradient(145deg,#fff,var(--primary-soft));border:1.5px solid var(--primary-light);border-radius:18px;padding:22px;box-shadow:0 8px 22px rgba(115,80,232,.10); }
  .settings-card h3 { margin:0 0 16px;font-size:15px;font-weight:800;color:var(--primary-dark);padding-bottom:12px;border-bottom:1.5px solid var(--primary-soft); }
  .settings-card-wide { grid-column: 1 / -1; }
  .conditions-textarea { width: 100%; min-height: 56px; resize: vertical; }
  .plateforme-days { display:flex;gap:6px;flex-wrap:wrap; }
  .plateforme-day-chip { display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;border:1px solid var(--line);font-size:11.5px;font-weight:600;cursor:pointer;background:#fff;transition:background .15s, opacity .15s; }
  .plateforme-day-chip input[disabled] { cursor:not-allowed; }
  .plateforme-day-chip.disabled-chip { opacity:.55; cursor:not-allowed; background:#F0EFF5; }

  /* ==================== ÉTAT DES SERVICES ==================== */
  .sv-section-title { font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--primary-dark);margin-bottom:12px; }
  .sv-list { display:flex;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto;padding:4px 2px; }
  .sv-list-static { max-height:none;margin-bottom:18px; }
  .sv-list-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;max-height:none;overflow:visible; }
  .sv-item { display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--primary-soft);background:#fff;cursor:pointer;text-align:left;font:inherit;transition:border-color .15s, background .15s, transform .1s; }
  .sv-item:hover:not([disabled]) { border-color:var(--primary);background:var(--primary-soft);transform:translateY(-1px); }
  .sv-item.selected { border-color:var(--primary);background:linear-gradient(135deg,var(--primary-soft),#fff);box-shadow:0 4px 12px rgba(115,80,232,.18); }
  .sv-item[disabled] { cursor:not-allowed;opacity:.65; }
  .sv-item.sv-unavailable { background:repeating-linear-gradient(45deg,#FAFAFB,#FAFAFB 6px,#F0EDFB 6px,#F0EDFB 12px);border-style:dashed; }
  .sv-item.sv-full { background:#FDEDEC;border-color:#F7B9B4; }
  .sv-item.sv-available { border-color:#B7E4C7;background:#F1FAF3; }
  .sv-item.sv-available.selected { background:linear-gradient(135deg,var(--primary-soft),#fff);border-color:var(--primary); }
  .sv-item-static { cursor:default; }
  .sv-item-static:hover { transform:none;background:#fff;border-color:var(--primary-soft); }
  .sv-item-main { display:flex;flex-direction:column;gap:2px;min-width:0; }
  .sv-item-main strong { font-size:13px; }
  .sv-item-meta { font-size:11px;color:var(--ink-soft); }
  .sv-badge { flex-shrink:0;font-size:10.5px;font-weight:800;padding:4px 9px;border-radius:999px;white-space:nowrap; }
  .sv-badge-disponible { background:#E9F7ED;color:#2F8B4B; }
  .sv-badge-indisponible { background:#EEEDF2;color:#6B7280; }
  .sv-badge-complet { background:#FDEDEC;color:#EF4444; }
  .sv-chip { display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:999px;white-space:nowrap; }
  .sv-chip-disponible { background:#E9F7ED;color:#2F8B4B; }
  .sv-chip-indisponible { background:#EEEDF2;color:#6B7280; }
  .sv-chip-complet { background:#FDEDEC;color:#EF4444; }

  /* ==================== MODAL "CHANGER LE CRÉNEAU" ==================== */
  .move-calendar-layout { display:grid;grid-template-columns:minmax(320px,400px) 1fr;gap:22px;align-items:start;margin-top:6px; }
  .move-cal-side { background:#fff;border:1.5px solid var(--primary-soft);border-radius:16px;padding:16px; }
  .move-cal-header { display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:14px;margin-bottom:12px;border-bottom:1px solid var(--primary-soft); }
  .move-cal-nav { width:34px;height:34px;border-radius:9px;border:1.5px solid var(--primary-soft);background:var(--primary-soft);color:var(--primary-dark);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .15s, color .15s; }
  .move-cal-nav:hover { background:var(--primary);color:#fff; }
  .move-cal-month { flex:1;text-align:center;font-size:15px;font-weight:800;color:var(--primary-dark); }
  .move-cal-weekdays { display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px; }
  .move-cal-weekdays span { text-align:center;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--primary-dark);padding:4px 0; }
  .move-cal-grid { display:grid;grid-template-columns:repeat(7,1fr);gap:5px; }
  .move-day { aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;border-radius:9px;border:1.5px solid var(--primary-soft);background:var(--primary-soft);font-size:12.5px;font-weight:700;color:var(--ink);cursor:pointer;transition:background .12s, border-color .12s, color .12s, transform .1s; }
  .move-day:hover:not(.disabled):not(.empty) { border-color:var(--primary);background:#fff;transform:translateY(-1px); }
  .move-day.empty { background:transparent;border-color:transparent;cursor:default; }
  .move-day.disabled { opacity:.3;cursor:not-allowed; }
  .move-day.today { border-color:var(--primary);border-width:2px; }
  .move-day.selected { background:linear-gradient(135deg,var(--primary),var(--primary-dark));border-color:var(--primary);color:#fff;box-shadow:0 4px 10px rgba(115,80,232,.35); }

  .move-slots-side { background:#fff;border:1.5px solid var(--primary-soft);border-radius:16px;padding:18px;min-height:360px;display:flex;flex-direction:column; }
  .move-slots-head { display:flex;align-items:center;gap:12px;padding-bottom:14px;margin-bottom:14px;border-bottom:1px solid var(--primary-soft); }
  .move-slots-head-icon { width:38px;height:38px;border-radius:11px;background:var(--primary-soft);color:var(--primary);border:1px solid var(--primary-light);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0; }
  .move-slots-head strong { display:block;font-size:13.5px;color:var(--primary-dark);margin-bottom:2px; }
  .move-slots-head span { display:block;font-size:11.5px;color:var(--ink-soft); }
  .move-slots { display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:10px;align-content:start; }
  .move-slot { border:1.5px solid var(--primary-soft);border-radius:10px;background:var(--primary-soft);padding:12px 6px;text-align:center;font-size:13.5px;font-weight:700;cursor:pointer;color:var(--primary-dark);font-family:inherit;transition:background .12s, border-color .12s, color .12s, transform .1s; }
  .move-slot:hover { border-color:var(--primary);background:#fff;transform:translateY(-1px); }
  .move-slot.selected { background:linear-gradient(135deg,var(--primary),var(--primary-dark));border-color:var(--primary);color:#fff;box-shadow:0 4px 12px rgba(115,80,232,.35); }
  .move-slots-empty { flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px 20px;color:var(--ink-soft);gap:12px; }
  .move-slots-empty-icon { width:60px;height:60px;border-radius:50%;background:var(--primary-soft);color:var(--primary);border:1px solid var(--primary-light);display:inline-flex;align-items:center;justify-content:center;font-size:26px; }
  .move-slots-empty p { margin:0;font-size:13px;line-height:1.55;max-width:260px; }
  .move-current-recap { display:inline-flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink-soft);padding:8px 14px;border-radius:10px;background:var(--paper);border:1.5px dashed var(--primary-soft); }
  .move-current-dot { width:8px;height:8px;border-radius:50%;background:var(--primary);box-shadow:0 0 0 3px var(--primary-soft); }
  .move-current-recap b { color:var(--primary-dark); }
  .nr-slots { min-height:0; }

  /* 2 colonnes : Services | Créneaux dans la modale "Nouveau rendez-vous" */
  .nr-2col { display:grid; grid-template-columns:1fr 1fr; gap:18px; align-items:start; }
  .nr-2col .sv-list-grid { grid-template-columns:1fr; max-height:320px; overflow-y:auto; }
  .nr-2col .move-slots { max-height:320px; overflow-y:auto; }

  @media (max-width: 1200px) {
    .week-card-days-v3 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  }
  @media (max-width: 900px) {
    .tb-brand-text { display: none; }
    .tb-user-text { display: none; }
    .page { padding: 20px 14px 40px; }
    .agenda-title { font-size: 24px; }
    .agenda-pro-col-v3 { min-width: 200px; }
    .agenda-pros-wrapper-v3 { overflow-x: auto; }
    .date-picker-pop { width: 270px; left: -10px; }
    .modal-box { max-width: 100%; padding: 20px; }
    .detail-grid { grid-template-columns: 1fr 1fr; }
    .client-info-grid { grid-template-columns: 1fr 1fr; }
    .pro-list-item-v3 { grid-template-columns: 40px 1fr auto; }
    .pro-list-services-v3 { display: none; }
    .dispo-weekly-grid { grid-template-columns: repeat(2, 1fr); }
    .edit-day-row { grid-template-columns: 1fr; }
    .edit-exception-row { grid-template-columns: 1fr 1fr; }
    .move-calendar-layout { grid-template-columns: 1fr; }
    .nr-2col { grid-template-columns: 1fr; }
    .week-card-days-v3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .week-days-wrapper-v3 { overflow-x: auto; }
    .week-day-col-v3 { min-width: 140px; }
  }
    /* =========================================
   EDIT CLIENT / RDV SWITCH BUTTON
   ========================================= */

.edit-switch-btn {
  width: 32px;
  height: 32px;

  border: none;
  border-radius: 50%;

  background: var(--primary-soft);
  color: var(--primary);

  display: inline-flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
  flex-shrink: 0;

  transition:
    background .18s ease,
    color .18s ease,
    transform .22s cubic-bezier(.22, 1, .36, 1),
    box-shadow .18s ease;
}

.edit-switch-btn svg {
  width: 16px;
  height: 16px;

  transition:
    transform .22s cubic-bezier(.22, 1, .36, 1);
}

.edit-switch-btn:hover {
  background: var(--primary);
  color: white;

  transform: translateX(3px);

  box-shadow:
    0 5px 14px rgba(115, 80, 232, .28);
}

.edit-switch-btn:hover svg {
  transform: translateX(2px);
}

.edit-switch-btn:active {
  transform: translateX(3px) scale(.92);
}


/* BACK BUTTON */

.edit-switch-btn.back:hover {
  transform: translateX(-3px);
}

.edit-switch-btn.back:hover svg {
  transform: translateX(-2px);
}


/* =========================================
   MODAL PAGE TRANSITIONS
   ========================================= */

.edit-slide-out-left {
  animation:
    editSlideOutLeft .22s cubic-bezier(.4, 0, 1, 1)
    forwards;
}

.edit-slide-in-right {
  animation:
    editSlideInRight .32s cubic-bezier(.22, 1, .36, 1)
    both;
}

.edit-slide-out-right {
  animation:
    editSlideOutRight .22s cubic-bezier(.4, 0, 1, 1)
    forwards;
}

.edit-slide-in-left {
  animation:
    editSlideInLeft .32s cubic-bezier(.22, 1, .36, 1)
    both;
}


@keyframes editSlideOutLeft {

  from {
    opacity: 1;
    transform: translateX(0);
  }

  to {
    opacity: 0;
    transform: translateX(-55px);
  }
}


@keyframes editSlideInRight {

  from {
    opacity: 0;
    transform: translateX(65px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}


@keyframes editSlideOutRight {

  from {
    opacity: 1;
    transform: translateX(0);
  }

  to {
    opacity: 0;
    transform: translateX(55px);
  }
}


@keyframes editSlideInLeft {

  from {
    opacity: 0;
    transform: translateX(-65px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}
      `}</style>
      <div className="app">
        <header className="topbar">
          <div className="tb-brand">
            <div className="tb-brand-logo">R</div>
            <div className="tb-brand-text">Réservio</div>
          </div>

          <nav className="tb-nav">
            <div className="nav-item active" data-page="dashboard">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>Agenda</span>
            </div>
            <div className="nav-item" data-page="rdv">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              <span>Rendez-vous</span>
            </div>
            <div className="nav-item" data-page="clients">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Clients</span>
            </div>
            <div className="nav-item" data-page="pros">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
              <span>Professionnels</span>
            </div>
            <div className="nav-item" data-page="settings">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span>Paramètres</span>
            </div>
            <div className="nav-item" data-page="notifs">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              <span>Notifications</span>
              <span className="nav-badge" id="navNotifBadge">0</span>
            </div>
          </nav>

          <div className="tb-right">
            <button className="tb-icon-btn" id="globalSearchBtn" title="Rechercher">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button className="tb-icon-btn" id="notifBellBtn" title="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              <span className="tb-icon-dot" id="tbNotifDot">0</span>
            </button>

            <div className="tb-profile-wrap">
              <div className="tb-user" id="profileBtn">
                <img className="tb-avatar" src="https://i.pravatar.cc/80?img=32" alt="Imane B." />
                <div className="tb-user-text">
                  <div className="tb-user-name">Imane B.</div>
                  <div className="tb-user-role">Réceptionniste</div>
                </div>
                <svg className="tb-user-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>

              <div className="profile-menu" id="profileMenu">
                <div className="profile-menu-head">
                  <img className="profile-menu-avatar" src="https://i.pravatar.cc/120?img=32" alt="Imane B." />
                  <div className="profile-menu-info">
                    <strong>Imane B.</strong>
                    <span>imaneb@reservio.app</span>
                  </div>
                </div>

                <button className="profile-menu-item danger" id="logoutBtn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </header>

  <section
    className="page"
    id="page-dashboard"
  ></section>

  <section
    className="page active"
    id="page-agenda"
  ></section>

  <section
    className="page"
    id="page-rdv"
  ></section>

  <section
    className="page"
    id="page-clients"
  ></section>

  <section
    className="page"
    id="page-pros"
  ></section>
        <section className="page" id="page-settings"></section>


  <section
    className="page"
    id="page-notifs"
  ></section>

</div>
  
  <div id="modalRoot"></div>
  <div id="toast" className="toast"></div>



    </>
  );
}