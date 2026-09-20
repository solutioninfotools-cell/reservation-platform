// @ts-nocheck -- fichier porté depuis un script JS existant (voir note en fin de réponse)
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

export default function ReceptionnisteDashboard() {
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
       DONNÉES (mock) — conforme au cahier des charges
       ========================================================= */
    const STATUS = {
      reserve: { label: "Réservé", cls: "st-reserve", color: "#8957FF" },
      arrive: { label: "Client arrivé", cls: "st-arrive", color: "#2FA79D" },
      encours: { label: "En cours", cls: "st-encours", color: "#E2954A" },
      termine: { label: "Terminé", cls: "st-termine", color: "#3FA65C" },
      absent: { label: "Absent", cls: "st-absent", color: "#8A8496" },
      annule: { label: "Annulé", cls: "st-annule", color: "#D9483C" },
    };
    const STATUS_FLOW = ["reserve", "arrive", "encours", "termine"];

    const PROS = [
      { id: "p1", name: "Dr. Ahmed Benali", role: "Médecin généraliste", color: "#8957FF", initials: "AB" },
      { id: "p2", name: "Dr. Sara Khalfi", role: "Dermatologue", color: "#2FA79D", initials: "SK" },
      { id: "p3", name: "Dr. Karim Abid", role: "Cardiologue", color: "#E2478A", initials: "KA" },
      { id: "p4", name: "Imane Z.", role: "Psychologue", color: "#E2954A", initials: "IZ" },
    ];

    window.todayISO = function todayISO() {
      const d = new Date();
      return d.toISOString().slice(0, 10);
    }
    window.isoPlusDays = function isoPlusDays(iso, n) {
      const d = new Date(iso + "T00:00:00");
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    }
    const TODAY = todayISO();

    let uidCounter = 100;
    window.uid = function uid() { return "rdv" + (uidCounter++); }

    // Rendez-vous du jour même (réalistes) + quelques jours autour pour semaine/mois
    let APPTS = [
      { id: uid(), proId: "p1", date: TODAY, start: "09:00", end: "09:30", client: "Yasmine Hadj", phone: "0555 12 34 66", dob: "1990-04-12", email: "yasmine.hadj@mail.com", service: "Consultation générale", status: "reserve", remark: "", createdAt: "2026-08-24" },
      { id: uid(), proId: "p2", date: TODAY, start: "09:00", end: "09:45", client: "Nadia Belkacem", phone: "0552 98 76 54", dob: "1985-11-02", email: "nadia.b@mail.com", service: "Consultation dermatologie", status: "encours", remark: "", createdAt: "2026-08-20" },
      { id: uid(), proId: "p3", date: TODAY, start: "09:00", end: "10:00", client: "Rachid Aït Ali", phone: "0555 67 89 01", dob: "1972-02-19", email: "rachid.aitali@mail.com", service: "Consultation cardiaque", status: "arrive", remark: "", createdAt: "2026-08-18" },
      { id: uid(), proId: "p1", date: TODAY, start: "10:00", end: "10:45", client: "Sarah Medjdoub", phone: "0553 45 67 89", dob: "1998-07-30", email: "sarah.m@mail.com", service: "Suivi dermatologique", status: "reserve", remark: "", createdAt: "2026-08-25" },
      { id: uid(), proId: "p4", date: TODAY, start: "10:00", end: "11:00", client: "Lina Bouzid", phone: "0555 32 11 22", dob: "1995-01-08", email: "lina.bouzid@mail.com", service: "Séance de thérapie", status: "termine", remark: "", createdAt: "2026-08-19" },
      { id: uid(), proId: "p1", date: TODAY, start: "11:00", end: "11:30", client: "Karim Yacine", phone: "0555 22 33 44", dob: "1988-09-14", email: "karim.y@mail.com", service: "Consultation générale", status: "reserve", remark: "", createdAt: "2026-08-26" },
      { id: uid(), proId: "p3", date: TODAY, start: "11:00", end: "12:00", client: "Sofiane M.", phone: "0554 76 54 32", dob: "1979-03-25", email: "sofiane.m@mail.com", service: "Échographie cardiaque", status: "reserve", remark: "", createdAt: "2026-08-27" },
      { id: uid(), proId: "p2", date: TODAY, start: "12:00", end: "12:30", client: "Amel Bensalem", phone: "0555 88 77 66", dob: "2001-05-17", email: "amel.b@mail.com", service: "Consultation acné", status: "encours", remark: "", createdAt: "2026-08-21" },
      { id: uid(), proId: "p4", date: TODAY, start: "12:00", end: "13:00", client: "Yacine Kara", phone: "0555 12 98 76", dob: "1993-12-01", email: "yacine.k@mail.com", service: "Séance de thérapie", status: "reserve", remark: "", createdAt: "2026-08-22" },
      { id: uid(), proId: "p1", date: TODAY, start: "14:00", end: "14:30", client: "Meriem Salhi", phone: "0555 43 21 09", dob: "1991-06-06", email: "meriem.s@mail.com", service: "Consultation générale", status: "arrive", remark: "", createdAt: "2026-08-23" },
      { id: uid(), proId: "p3", date: TODAY, start: "14:00", end: "14:45", client: "Hamza Belkhir", phone: "0555 65 43 21", dob: "1967-08-21", email: "hamza.b@mail.com", service: "Contrôle cardiaque", status: "reserve", remark: "", createdAt: "2026-08-24" },
      { id: uid(), proId: "p2", date: TODAY, start: "15:00", end: "15:45", client: "Celia Benyahia", phone: "0555 99 12 33", dob: "1996-10-10", email: "celia.b@mail.com", service: "Peeling", status: "reserve", remark: "", createdAt: "2026-08-25" },
      { id: uid(), proId: "p4", date: TODAY, start: "15:00", end: "16:00", client: "Sarah A.", phone: "0555 76 21 43", dob: "1984-02-28", email: "sarah.a@mail.com", service: "Séance de thérapie", status: "reserve", remark: "", createdAt: "2026-08-26" },
      { id: uid(), proId: "p1", date: TODAY, start: "17:00", end: "17:30", client: "Linda Cherif", phone: "0555 66 77 88", dob: "1999-04-04", email: "linda.c@mail.com", service: "Consultation générale", status: "reserve", remark: "", createdAt: "2026-08-27" },
      { id: uid(), proId: "p3", date: TODAY, start: "16:00", end: "16:30", client: "Mourad Ben", phone: "0555 23 45 67", dob: "1975-01-30", email: "mourad.b@mail.com", service: "Consultation cardiaque", status: "reserve", remark: "", createdAt: "2026-08-27" },
      { id: uid(), proId: "p2", date: TODAY, start: "17:00", end: "17:45", client: "Nour El Houda", phone: "0555 18 44 55", dob: "2000-03-15", email: "nour.elh@mail.com", service: "Consultation dermatologie", status: "reserve", remark: "", createdAt: "2026-08-28" },
      // absences répétées : Karim Yacine a déjà 2 "absent" dans l'historique
      { id: uid(), proId: "p1", date: isoPlusDays(TODAY, -14), start: "09:00", end: "09:30", client: "Karim Yacine", phone: "0555 22 33 44", dob: "1988-09-14", email: "karim.y@mail.com", service: "Consultation générale", status: "absent", remark: "", createdAt: isoPlusDays(TODAY, -20) },
      { id: uid(), proId: "p1", date: isoPlusDays(TODAY, -30), start: "10:00", end: "10:30", client: "Karim Yacine", phone: "0555 22 33 44", dob: "1988-09-14", email: "karim.y@mail.com", service: "Consultation générale", status: "absent", remark: "", createdAt: isoPlusDays(TODAY, -35) },
      { id: uid(), proId: "p2", date: isoPlusDays(TODAY, 1), start: "09:30", end: "10:00", client: "Warda Selmi", phone: "0555 71 82 93", dob: "1994-06-19", email: "warda.s@mail.com", service: "Consultation dermatologie", status: "reserve", remark: "", createdAt: TODAY },
      { id: uid(), proId: "p3", date: isoPlusDays(TODAY, 1), start: "11:00", end: "11:45", client: "Djamel Kaci", phone: "0555 60 40 20", dob: "1969-12-09", email: "djamel.k@mail.com", service: "Consultation cardiaque", status: "reserve", remark: "", createdAt: TODAY },
      { id: uid(), proId: "p4", date: isoPlusDays(TODAY, 2), start: "14:00", end: "15:00", client: "Sabrina Ferhat", phone: "0555 30 20 10", dob: "1990-01-01", email: "sabrina.f@mail.com", service: "Séance de thérapie", status: "reserve", remark: "", createdAt: TODAY },
      { id: uid(), proId: "p1", date: isoPlusDays(TODAY, -2), start: "09:00", end: "09:30", client: "Yasmine Hadj", phone: "0555 12 34 66", dob: "1990-04-12", email: "yasmine.hadj@mail.com", service: "Consultation générale", status: "termine", remark: "", createdAt: isoPlusDays(TODAY, -10) },
      { id: uid(), proId: "p2", date: isoPlusDays(TODAY, -1), start: "16:00", end: "16:30", client: "Nadia Belkacem", phone: "0552 98 76 54", dob: "1985-11-02", email: "nadia.b@mail.com", service: "Consultation dermatologie", status: "annule", remark: "Empêchement personnel", createdAt: isoPlusDays(TODAY, -6) },
    ];

    let NOTIFS = [
      { id: 1, type: "new", text: "Nouvelle réservation en ligne — <b>Warda Selmi</b> avec Dr. Sara Khalfi demain à 09:30", time: "Il y a 12 min", unread: true },
      { id: 2, type: "cancel", text: "<b>Nadia Belkacem</b> a annulé son rendez-vous du " + isoPlusDays(TODAY, -1), time: "Il y a 40 min", unread: true },
      { id: 3, type: "conflict", text: "Conflit de planning détecté sur l'agenda de Dr. Karim Abid à 11:00", time: "Il y a 1 h", unread: true },
      { id: 4, type: "absent", text: "Dr. Sara Khalfi a signalé une absence le " + isoPlusDays(TODAY, 3), time: "Il y a 2 h", unread: false },
      { id: 5, type: "soon", text: "Rappel : <b>Rachid Aït Ali</b> est attendu dans 15 min avec Dr. Karim Abid", time: "Il y a 3 h", unread: false },
      { id: 6, type: "edit", text: "<b>Karim Yacine</b> a modifié les coordonnées de son rendez-vous", time: "Hier", unread: false },
    ];

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
      proFilter: "all",        // "all" ou id du pro
      monthCursor: TODAY.slice(0, 7), // yyyy-mm pour mini calendrier / vue mois
      sidePanelOpen: false,
      miniCalHidden: (() => { try { return localStorage.getItem("rec_mini_cal_hidden") === "true"; } catch(_) { return false; } })(),
      rdvFilters: { status: "", pro: "", search: "" },
      clientSearch: { nom: "", tel: "", email: "" },
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
      document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.page === page));
      document.querySelectorAll(".page").forEach((p) => p.classList.toggle("active", p.id === "page-" + page));
      renderPage(page);
    }
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", () => goToPage(item.dataset.page), { signal: ac.signal });
    });
    document.getElementById("collapseBtn").addEventListener("click", () => {
      document.getElementById("sidebar").classList.toggle("collapsed");
    }, { signal: ac.signal });
    document.getElementById("notifBellBtn").addEventListener("click", () => goToPage("notifs"), { signal: ac.signal });

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
      <div class="page-head">
        <button class="btn btn-primary" onclick="openNewRdv()">${iconPlus()} Nouveau rendez-vous</button>
      </div>
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
          ${todays.length ? todays.sort((a, b) => a.start.localeCompare(b.start)).map((a) => `
            <div class="dash-list-row">
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
       PAGE : AGENDA
       ========================================================= */
    window.renderAgenda = function renderAgenda() {
      let html = `
      <div class="page-head">
        <button class="btn btn-primary" onclick="openNewRdv()">${iconPlus()} Nouveau rendez-vous</button>
      </div>
      <div class="agenda-toolbar">
        <div class="date-nav">
          <button onclick="agendaShift(-1)">${iconChevronLeft()}</button>
          <span class="date-nav-label">${agendaDateLabel()}</span>
          <button onclick="agendaShift(1)">${iconChevronRight()}</button>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="agendaToday()">Aujourd'hui</button>
        <div class="view-toggle" style="margin-left:auto">
          <button class="${state.agendaView === 'day' ? 'active' : ''}" onclick="setAgendaView('day')">Vue jour</button>
          <button class="${state.agendaView === 'week' ? 'active' : ''}" onclick="setAgendaView('week')">Vue semaine</button>
          <button class="${state.agendaView === 'month' ? 'active' : ''}" onclick="setAgendaView('month')">Vue mois</button>
        </div>
        <button class="btn btn-ghost btn-sm ${state.sidePanelOpen ? 'is-on' : ''}" onclick="toggleSidePanel()" title="Calendrier et légende">${iconCal()} Calendrier & Légende</button>
        <button class="btn btn-ghost btn-sm" onclick="exportMock('Planning / Agenda')">${iconPrinter()} Exporter</button>
      </div>
      <div class="pro-filter-row">
        <div class="pro-chip ${state.proFilter === 'all' ? 'active' : ''}" onclick="setProFilter('all')">
          <div class="avatar-sm" style="background:var(--ink-soft)">TP</div>
          <div><div class="pro-chip-name">Tous les professionnels</div></div>
        </div>
        ${PROS.map((p) => `
          <div class="pro-chip ${state.proFilter === p.id ? 'active' : ''}" onclick="setProFilter('${p.id}')">
            <div class="avatar-sm" style="background:${p.color}">${p.initials}</div>
            <div><div class="pro-chip-name">${p.name}</div><div class="pro-chip-role">${p.role}</div></div>
          </div>`).join("")}
      </div>
      <div class="agenda-body">
        <div id="agendaMain"></div>
      </div>

      <button class="agenda-side-tab ${state.sidePanelOpen ? 'active' : ''}" onclick="toggleSidePanel()" title="Ouvrir Calendrier & Légende">
        ${iconCal(18)}
        <span style="writing-mode:vertical-rl;font-size:11px;font-weight:700;letter-spacing:.5px;margin-top:4px;">Légende</span>
      </button>
      <div class="agenda-side-drawer-backdrop ${state.sidePanelOpen ? 'open' : ''}" onclick="toggleSidePanel()"></div>
      <div class="agenda-side-drawer ${state.sidePanelOpen ? 'open' : ''}">
        <div class="agenda-side-drawer-header">
          <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;color:var(--ink);">${iconCal(18)} Calendrier & Légende</div>
          <button class="icon-btn" onclick="toggleSidePanel()" title="Fermer">${iconX()}</button>
        </div>
        <div class="agenda-side-drawer-body">
          ${miniCalHtml()}
          <div class="card" style="margin-top:16px;padding:14px 16px;">
            <div style="font-size:12px;font-weight:700;margin-bottom:10px;">Légende des statuts</div>
            <div class="legend-row" style="margin-top:0;">
              ${Object.entries(STATUS).map(([k, v]) => `<span class="legend-item"><span class="legend-dot" style="background:${v.color}"></span>${v.label}</span>`).join("")}
            </div>
          </div>
        </div>
      </div>
    `;
      document.getElementById("page-agenda").innerHTML = html;
      renderAgendaMain();
    }
    window.toggleSidePanel = function toggleSidePanel() { state.sidePanelOpen = !state.sidePanelOpen; renderAgenda(); }

    window.agendaDateLabel = function agendaDateLabel() {
      if (state.agendaView === "day") return capitalize(fmtDateLong(state.agendaDate));
      if (state.agendaView === "week") {
        const start = weekStart(state.agendaDate);
        const end = isoPlusDays(start, 6);
        return fmtDateShort(start) + " – " + fmtDateShort(end);
      }
      const d = new Date(state.monthCursor + "-01T00:00:00");
      return capitalize(d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));
    }
    window.capitalize = function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    window.weekStart = function weekStart(iso) {
      const d = new Date(iso + "T00:00:00");
      const day = (d.getDay() + 6) % 7; // lundi = 0
      d.setDate(d.getDate() - day);
      return d.toISOString().slice(0, 10);
    }
    window.agendaShift = function agendaShift(dir) {
      if (state.agendaView === "day") state.agendaDate = isoPlusDays(state.agendaDate, dir);
      else if (state.agendaView === "week") state.agendaDate = isoPlusDays(state.agendaDate, dir * 7);
      else {
        const d = new Date(state.monthCursor + "-01T00:00:00");
        d.setMonth(d.getMonth() + dir);
        state.monthCursor = d.toISOString().slice(0, 7);
      }
      renderAgenda();
    }
    window.agendaToday = function agendaToday() { state.agendaDate = TODAY; state.monthCursor = TODAY.slice(0, 7); renderAgenda(); }
    window.setAgendaView = function setAgendaView(v) { state.agendaView = v; renderAgenda(); }
    window.setProFilter = function setProFilter(id) { state.proFilter = id; renderAgenda(); }

    window.visiblePros = function visiblePros() { return state.proFilter === "all" ? PROS : PROS.filter((p) => p.id === state.proFilter); }

    window.renderAgendaMain = function renderAgendaMain() {
      const el = document.getElementById("agendaMain");
      if (state.agendaView === "day") {
        el.innerHTML = dayViewHtml();
        placeDayAppts();
        wireDayDnD();
      } else if (state.agendaView === "week") {
        el.innerHTML = weekViewHtml();
      } else {
        el.innerHTML = monthViewHtml();
      }
    }

    const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i); // 8..18

    window.dayViewHtml = function dayViewHtml() {
      const pros = visiblePros();
      const cols = pros.length || 1;
      let head = `<div class="day-grid-head" style="grid-template-columns:44px repeat(${cols},1fr)"><div></div>` +
        pros.map((p) => `<div class="day-col-head"><div class="avatar-sm" style="background:${p.color};margin:0 auto 4px;">${p.initials}</div><div class="day-col-head-name">${p.name}</div><div class="day-col-head-role">${p.role}</div></div>`).join("") + `</div>`;
      let body = `<div class="day-grid-body" style="grid-template-columns:44px repeat(${cols},1fr)">`;
      HOURS.forEach((h) => {
        body += `<div class="hour-label">${h}:00</div>`;
        pros.forEach((p) => {
          body += `<div class="day-col" data-pro="${p.id}" data-hour="${h}" style="grid-row: span 1;" onclick="handleDayColClick(event,'${p.id}',${h})"></div>`;
        });
      });
      body += `</div>`;
      return `<div class="day-grid">${head}${body}</div>`;
    }

    window.placeDayAppts = function placeDayAppts() {
      const pros = visiblePros();
      const grid = document.querySelector(".day-grid-body");
      if (!grid) return;
      const rowH = grid.querySelector(".day-col") ? grid.querySelector(".day-col").offsetHeight : 46;
      const dayAppts = APPTS.filter((a) => a.date === state.agendaDate && (state.proFilter === "all" || a.proId === state.proFilter) && a.status !== "annule");
      dayAppts.forEach((a) => {
        const colIndex = pros.findIndex((p) => p.id === a.proId);
        if (colIndex === -1) return;
        const col = grid.querySelectorAll(`.day-col[data-pro="${a.proId}"]`)[0];
        if (!col) return;
        const [sh, sm] = a.start.split(":").map(Number);
        const [eh, em] = a.end.split(":").map(Number);
        const startMin = (sh - HOURS[0]) * 60 + sm;
        const durMin = Math.max(20, (eh * 60 + em) - (sh * 60 + sm));
        const top = (startMin / 60) * rowH;
        const height = (durMin / 60) * rowH - 4;
        const block = document.createElement("div");
        block.className = "appt-block";
        block.style.top = top + "px";
        block.style.height = Math.max(24, height) + "px";
        block.style.background = STATUS[a.status].color + "22";
        block.style.borderLeftColor = STATUS[a.status].color;
        block.style.color = "#1B1730";
        block.draggable = true;
        block.dataset.id = a.id;
        block.innerHTML = `<b>${a.client}</b><span>${a.start} · ${a.service}</span>`;
        block.onclick = (e) => { e.stopPropagation(); openRdvDetail(a.id); };
        block.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", a.id); block.classList.add("appt-dragging"); });
        block.addEventListener("dragend", () => block.classList.remove("appt-dragging"));
        col.style.position = "relative";
        col.appendChild(block);
      });
    }
    window.handleDayColClick = function handleDayColClick(e, proId, hour) {
      if (e.target.closest(".appt-block")) return;
      openNewRdv({ proId, date: state.agendaDate, start: hour + ":00" });
    }
    window.wireDayDnD = function wireDayDnD() {
      document.querySelectorAll(".day-col").forEach((col) => {
        col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("drop-hover"); });
        col.addEventListener("dragleave", () => col.classList.remove("drop-hover"));
        col.addEventListener("drop", (e) => {
          e.preventDefault(); col.classList.remove("drop-hover");
          const id = e.dataTransfer.getData("text/plain");
          const appt = APPTS.find((a) => a.id === id);
          if (!appt) return;
          const newHour = parseInt(col.dataset.hour, 10);
          const newPro = col.dataset.pro;
          const [, sm] = appt.start.split(":").map(Number);
          const durMin = (function () { const [sh, smm] = appt.start.split(":").map(Number); const [eh, em] = appt.end.split(":").map(Number); return (eh * 60 + em) - (sh * 60 + smm); })();
          const newStart = String(newHour).padStart(2, "0") + ":" + String(sm).padStart(2, "0");
          const endTotal = newHour * 60 + sm + durMin;
          const newEnd = String(Math.floor(endTotal / 60)).padStart(2, "0") + ":" + String(endTotal % 60).padStart(2, "0");
          appt.proId = newPro; appt.start = newStart; appt.end = newEnd;
          showToast(`Rendez-vous de <b>${appt.client}</b> déplacé à ${newStart}`);
          renderAgendaMain();
          addNotif("edit", `<b>${appt.client}</b> déplacé au ${newStart} avec ${proById(newPro).name}`);
        });
      });
    }

    window.weekViewHtml = function weekViewHtml() {
      const start = weekStart(state.agendaDate);
      const days = Array.from({ length: 7 }, (_, i) => isoPlusDays(start, i));
      return `<div class="week-grid">` + days.map((d) => {
        const dayAppts = APPTS.filter((a) => a.date === d && (state.proFilter === 'all' || a.proId === state.proFilter) && a.status !== 'annule').sort((a, b) => a.start.localeCompare(b.start));
        const dow = new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
        return `<div class="week-day-col">
        <div class="week-day-head ${d === TODAY ? 'today' : ''}">${capitalize(dow)}</div>
        ${dayAppts.length ? dayAppts.map((a) => `<div class="week-appt-chip" style="background:${STATUS[a.status].color}18;border-color:${STATUS[a.status].color}" onclick="openRdvDetail('${a.id}')"><b>${a.start}</b> ${a.client}</div>`).join("") : `<div style="font-size:10.5px;color:var(--ink-soft);text-align:center;padding-top:10px;">—</div>`}
      </div>`;
      }).join("") + `</div>`;
    }

    window.monthViewHtml = function monthViewHtml() {
      const first = new Date(state.monthCursor + "-01T00:00:00");
      const startOffset = (first.getDay() + 6) % 7;
      const gridStart = new Date(first); gridStart.setDate(first.getDate() - startOffset);
      const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return d.toISOString().slice(0, 10); });
      const dows = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
      let html = `<div class="month-grid">` + dows.map((d) => `<div class="month-dow">${d}</div>`).join("");
      cells.forEach((iso) => {
        const inMonth = iso.slice(0, 7) === state.monthCursor;
        const count = APPTS.filter((a) => a.date === iso && (state.proFilter === 'all' || a.proId === state.proFilter) && a.status !== 'annule').length;
        const num = parseInt(iso.slice(8, 10), 10);
        html += `<div class="month-cell ${inMonth ? '' : 'muted'} ${iso === TODAY ? 'today' : ''}" onclick="jumpToDay('${iso}')">
        <div class="month-cell-num">${num}</div>
        ${count ? `<span class="month-cell-count">${count} RDV</span>` : ""}
      </div>`;
      });
      html += `</div>`;
      return html;
    }
    window.jumpToDay = function jumpToDay(iso) { state.agendaDate = iso; state.agendaView = "day"; renderAgenda(); }

    window.miniCalHtml = function miniCalHtml() {
      const first = new Date(state.monthCursor + "-01T00:00:00");
      const startOffset = (first.getDay() + 6) % 7;
      const gridStart = new Date(first); gridStart.setDate(first.getDate() - startOffset);
      const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return d.toISOString().slice(0, 10); });
      const dows = ["L", "M", "M", "J", "V", "S", "D"];
      let html = `<div class="mini-cal"><div class="mini-cal-head">
      <button onclick="miniCalShift(-1)">${iconChevronLeft()}</button>
      <span>${capitalize(first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }))}</span>
      <button onclick="miniCalShift(1)">${iconChevronRight()}</button>
    </div><div class="mini-cal-grid">`;
      dows.forEach((d) => html += `<div class="mini-cal-dow">${d}</div>`);
      cells.forEach((iso) => {
        const inMonth = iso.slice(0, 7) === state.monthCursor;
        const hasAppt = APPTS.some((a) => a.date === iso && a.status !== "annule");
        const num = parseInt(iso.slice(8, 10), 10);
        html += `<div class="mini-cal-day ${inMonth ? '' : 'muted'} ${iso === TODAY ? 'today' : ''} ${iso === state.agendaDate ? 'selected' : ''} ${hasAppt ? 'has-appt' : ''}" onclick="jumpToDay('${iso}')">${num}</div>`;
      });
      html += `</div></div>`;
      return html;
    }
    window.miniCalShift = function miniCalShift(dir) {
      const d = new Date(state.monthCursor + "-01T00:00:00");
      d.setMonth(d.getMonth() + dir);
      state.monthCursor = d.toISOString().slice(0, 7);
      renderAgenda();
    }

    /* =========================================================
       PAGE : RENDEZ-VOUS (liste complète, filtres, export)
       ========================================================= */
    window.renderRdvPage = function renderRdvPage() {
      let html = `
      <div class="page-head">
        <button class="btn btn-primary" onclick="openNewRdv()">${iconPlus()} Nouveau rendez-vous</button>
      </div>
      <div class="filter-row">
        <input type="text" id="rdvSearchInput" placeholder="Rechercher un client…" value="${state.rdvFilters.search}" oninput="updateRdvFilter('search', this.value)" style="min-width:220px" />
        <select onchange="updateRdvFilter('status', this.value)">
          <option value="">Tous les statuts</option>
          ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${state.rdvFilters.status === k ? 'selected' : ''}>${v.label}</option>`).join("")}
        </select>
        <select onchange="updateRdvFilter('pro', this.value)">
          <option value="">Tous les professionnels</option>
          ${PROS.map((p) => `<option value="${p.id}" ${state.rdvFilters.pro === p.id ? 'selected' : ''}>${p.name}</option>`).join("")}
        </select>
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="exportMock('Liste des rendez-vous')">${iconPrinter()} Exporter PDF / Excel</button>
      </div>
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
      }).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
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
    window.initials = function initials(name) { return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(); }

    /* =========================================================
       PAGE : CLIENTS
       ========================================================= */
    window.uniqueClients = function uniqueClients() {
      const map = new Map();
      APPTS.forEach((a) => {
        if (!map.has(a.client)) map.set(a.client, { name: a.client, phone: a.phone, email: a.email, dob: a.dob, appts: [] });
        map.get(a.client).appts.push(a);
      });
      return Array.from(map.values());
    }
    window.renderClientsPage = function renderClientsPage() {
      let html = `

      <div class="filter-row">
        <input type="text" placeholder="Nom, prénom…" oninput="updateClientFilter('nom', this.value)" />
        <input type="text" placeholder="Téléphone…" oninput="updateClientFilter('tel', this.value)" />
        <input type="text" placeholder="E-mail…" oninput="updateClientFilter('email', this.value)" />
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="exportMock('Liste des clients')">${iconPrinter()} Exporter</button>
      </div>
      <div class="card">
        <table class="data-table">
          <thead><tr><th>Client</th><th>Téléphone</th><th>E-mail</th><th>Rendez-vous</th><th>Dernier RDV</th><th></th></tr></thead>
          <tbody id="clientsTableBody"></tbody>
        </table>
      </div>
    `;
      document.getElementById("page-clients").innerHTML = html;
      renderClientsTable();
    }
    window.updateClientFilter = function updateClientFilter(key, val) { state.clientSearch[key] = val; renderClientsTable(); }
    window.renderClientsTable = function renderClientsTable() {
      const f = state.clientSearch;
      let clients = uniqueClients().filter((c) => {
        if (f.nom && !c.name.toLowerCase().includes(f.nom.toLowerCase())) return false;
        if (f.tel && !c.phone.includes(f.tel)) return false;
        if (f.email && !c.email.toLowerCase().includes(f.email.toLowerCase())) return false;
        return true;
      });
      const body = document.getElementById("clientsTableBody");
      if (!clients.length) { body.innerHTML = `<tr><td colspan="6"><div class="table-empty">Aucun client trouvé</div></td></tr>`; return; }
      body.innerHTML = clients.map((c) => {
        const last = c.appts.slice().sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start))[0];
        const warn = absentCount(c.name) >= 2 ? `<span class="repeat-warning">${iconAlert()} absences répétées</span>` : "";
        return `<tr class="row-clickable" onclick="openClientFiche('${encodeURIComponent(c.name)}')">
        <td><div class="cell-client"><div class="avatar-sm" style="background:var(--primary)">${initials(c.name)}</div><div><div class="cell-client-name">${c.name}${warn}</div><div class="cell-client-sub">${calcAge(c.dob)} ans</div></div></div></td>
        <td>${c.phone}</td>
        <td>${c.email}</td>
        <td>${c.appts.length}</td>
        <td>${fmtDateShort(last.date)}</td>
        <td><div class="row-actions" onclick="event.stopPropagation()"><button class="icon-btn" title="Voir la fiche" onclick="openClientFiche('${encodeURIComponent(c.name)}')">${iconEye()}</button></div></td>
      </tr>`;
      }).join("");
    }

    /* =========================================================
       PAGE : PROFESSIONNELS
       ========================================================= */
    window.renderProsPage = function renderProsPage() {
      let html = `

      <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
        ${PROS.map((p) => {
        const todays = APPTS.filter((a) => a.proId === p.id && a.date === TODAY && a.status !== "annule");
        const clientsCount = new Set(APPTS.filter((a) => a.proId === p.id).map((a) => a.client)).size;
        return `<div class="card" style="padding:18px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
              <div class="avatar-sm" style="width:44px;height:44px;font-size:15px;background:${p.color}">${p.initials}</div>
              <div><div style="font-weight:800;font-size:14.5px;">${p.name}</div><div style="font-size:12px;color:var(--ink-soft)">${p.role}</div></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink-soft);margin-bottom:4px;"><span>RDV aujourd'hui</span><b style="color:var(--ink)">${todays.length}</b></div>
            <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink-soft);margin-bottom:14px;"><span>Clients suivis</span><b style="color:var(--ink)">${clientsCount}</b></div>
            <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;" onclick="setAgendaViewFor('${p.id}')">Voir son agenda</button>
          </div>`;
      }).join("")}
      </div>
    `;
      document.getElementById("page-pros").innerHTML = html;
    }
    window.setAgendaViewFor = function setAgendaViewFor(proId) { state.proFilter = proId; state.agendaView = "day"; state.agendaDate = TODAY; goToPage("agenda"); }

    /* =========================================================
       PAGE : NOTIFICATIONS
       ========================================================= */
    window.notifRowHtml = function notifRowHtml(n) {
      const ic = NOTIF_ICONS[n.type];
      return `<div class="notif-row ${n.unread ? 'unread' : ''}">
      <div class="notif-icon" style="background:${ic.bg};color:${ic.color}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ic.svg}</svg></div>
      <div class="notif-text"><span>${n.text}</span><div class="notif-time">${n.time}</div></div>
      ${n.unread ? `<span class="notif-dot-unread"></span>` : ""}
    </div>`;
    }
    window.renderNotifsPage = function renderNotifsPage() {
      let html = `
      <div class="page-head">
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
      document.getElementById("modalRoot").innerHTML = `<div class="modal-overlay" id="activeOverlay"><div class="modal-box ${wide ? 'wide' : ''}">${innerHtml}</div></div>`;
      const ov = document.getElementById("activeOverlay");
      requestAnimationFrame(() => ov.classList.add("open"));
      ov.addEventListener("click", (e) => { if (e.target === ov) closeModal(); });
    }

    /* ---- Nouveau rendez-vous (réservation rapide + détection client) ---- */
    window.openNewRdv = function openNewRdv(prefill) {
      prefill = prefill || {};
      const html = `
      <div class="modal-head">
        <div><p class="modal-title">Nouveau rendez-vous</p><p class="modal-sub">Réservation rapide — client au téléphone ou à l'accueil</p></div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="detect-banner" id="detectBanner"></div>
      <div class="field-2col">
        <div class="field-row"><label>Nom</label><input type="text" id="nrNom" oninput="detectClient()" placeholder="Bensalem" /></div>
        <div class="field-row"><label>Prénom</label><input type="text" id="nrPrenom" oninput="detectClient()" placeholder="Amel" /></div>
      </div>
      <div class="field-2col">
        <div class="field-row"><label>Date de naissance</label><input type="date" id="nrDob" oninput="detectClient()" /></div>
        <div class="field-row"><label>Téléphone</label><input type="tel" id="nrTel" oninput="detectClient()" placeholder="0555 00 00 00" /></div>
      </div>
      <div class="field-row"><label>Service / motif</label>
        <select id="nrService"><option value="Consultation générale">Consultation générale</option><option value="Consultation dermatologie">Consultation dermatologie</option><option value="Consultation cardiaque">Consultation cardiaque</option><option value="Séance de thérapie">Séance de thérapie</option><option value="Suivi">Suivi</option></select>
      </div>
      <div class="field-2col">
        <div class="field-row"><label>Professionnel</label>
          <select id="nrPro">${PROS.map((p) => `<option value="${p.id}" ${prefill.proId === p.id ? 'selected' : ''}>${p.name} — ${p.role}</option>`).join("")}</select>
        </div>
        <div class="field-row"><label>Date</label><input type="date" id="nrDate" value="${prefill.date || state.agendaDate}" /></div>
      </div>
      <div class="field-row"><label>Créneau</label><input type="time" id="nrTime" value="${prefill.start || '09:00'}" /></div>
      <div class="field-error" id="nrError">Merci de renseigner au minimum le nom, le téléphone, le service et le créneau.</div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
        <button class="btn btn-primary" onclick="submitNewRdv()">${iconCheck()} Créer le rendez-vous</button>
      </div>
    `;
      openModal(html);
    }
    window.detectClient = function detectClient() {
      const nom = document.getElementById("nrNom").value.trim();
      const prenom = document.getElementById("nrPrenom").value.trim();
      const dob = document.getElementById("nrDob").value;
      const tel = document.getElementById("nrTel").value.trim();
      const fullName = (prenom + " " + nom).trim();
      const banner = document.getElementById("detectBanner");
      const existing = uniqueClients().find((c) => (dob && c.dob === dob && c.name.toLowerCase() === fullName.toLowerCase()) || (tel.length >= 6 && c.phone.replace(/\s/g, "") === tel.replace(/\s/g, "")));
      if (existing) {
        const warn = absentCount(existing.name) >= 2 ? ` — ⚠️ absences répétées (${absentCount(existing.name)})` : "";
        banner.innerHTML = `${iconCheck()} Client existant détecté : <b>${existing.name}</b> (${existing.appts.length} rendez-vous précédents)${warn}`;
        banner.classList.add("show");
      } else {
        banner.classList.remove("show");
      }
    }
    window.submitNewRdv = function submitNewRdv() {
      const nom = document.getElementById("nrNom").value.trim();
      const prenom = document.getElementById("nrPrenom").value.trim();
      const dob = document.getElementById("nrDob").value;
      const tel = document.getElementById("nrTel").value.trim();
      const service = document.getElementById("nrService").value;
      const proId = document.getElementById("nrPro").value;
      const date = document.getElementById("nrDate").value;
      const start = document.getElementById("nrTime").value;
      if (!nom || !tel || !service || !date || !start) { document.getElementById("nrError").classList.add("show"); return; }
      const fullName = (prenom + " " + nom).trim();
      const [sh, sm] = start.split(":").map(Number);
      const endTotal = sh * 60 + sm + 30;
      const end = String(Math.floor(endTotal / 60)).padStart(2, "0") + ":" + String(endTotal % 60).padStart(2, "0");
      const existing = uniqueClients().find((c) => c.name.toLowerCase() === fullName.toLowerCase());
      const appt = {
        id: uid(), proId, date, start, end, client: fullName, phone: tel,
        dob: dob || (existing ? existing.dob : "1990-01-01"),
        email: existing ? existing.email : (fullName.toLowerCase().replace(/\s/g, ".") + "@mail.com"),
        service, status: "reserve", remark: "", createdAt: TODAY,
      };
      APPTS.push(appt);
      closeModal();
      showToast(`Rendez-vous créé pour <b>${fullName}</b> le ${fmtDateShort(date)} à ${start}`);
      addNotif("new", `Nouveau rendez-vous créé pour <b>${fullName}</b> avec ${proById(proId).name}`);
      renderPage(state.page);
    }

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
        <div><div class="detail-item-label">Date de naissance</div><div class="detail-item-value">${fmtDateShort(a.dob)} (${calcAge(a.dob)} ans)</div></div>
        <div><div class="detail-item-label">Téléphone</div><div class="detail-item-value">${a.phone}</div></div>
        <div><div class="detail-item-label">E-mail</div><div class="detail-item-value">${a.email}</div></div>
        <div><div class="detail-item-label">Professionnel</div><div class="detail-item-value">${p.name}</div></div>
        <div><div class="detail-item-label">Date</div><div class="detail-item-value">${fmtDateShort(a.date)}</div></div>
        <div><div class="detail-item-label">Heure</div><div class="detail-item-value">${a.start} – ${a.end}</div></div>
        <div><div class="detail-item-label">Créé le</div><div class="detail-item-value">${fmtDateShort(a.createdAt)}</div></div>
        <div><div class="detail-item-label">Statut actuel</div><div class="detail-item-value"><span class="status-pill ${STATUS[a.status].cls}">${STATUS[a.status].label}</span></div></div>
      </div>
      <div class="field-row"><label>Remarques</label><textarea id="rdvRemark" rows="2" placeholder="Aucune remarque">${a.remark}</textarea></div>
      <div class="detail-item-label" style="margin-bottom:8px;">Changer le statut</div>
      <div class="status-menu">
        ${Object.entries(STATUS).map(([k, v]) => `<button class="${a.status === k ? 'current' : ''}" onclick="changeStatus('${a.id}','${k}')">${v.label}</button>`).join("")}
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
    window.changeStatus = function changeStatus(id, status) {
      const a = APPTS.find((x) => x.id === id);
      if (!a) return;
      a.status = status;
      a.remark = document.getElementById("rdvRemark") ? document.getElementById("rdvRemark").value : a.remark;
      showToast(`Statut mis à jour : <b>${STATUS[status].label}</b> pour ${a.client}`);
      openRdvDetail(id);
      renderPage(state.page);
    }
    window.cancelRdv = function cancelRdv(id) {
      const a = APPTS.find((x) => x.id === id);
      if (!a) return;
      if (!confirm(`Annuler le rendez-vous de ${a.client} ?`)) return;
      a.status = "annule";
      closeModal();
      showToast(`Rendez-vous de <b>${a.client}</b> annulé`);
      addNotif("cancel", `Rendez-vous de <b>${a.client}</b> annulé`);
      renderPage(state.page);
    }
    window.openEditRdv = function openEditRdv(id) {
      const a = APPTS.find((x) => x.id === id);
      if (!a) return;
      const p = proById(a.proId);
      const html = `
      <div class="modal-head"><div><p class="modal-title">Modifier le rendez-vous</p><p class="modal-sub">${a.client}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-2col">
        <div class="field-row"><label>Nom du client</label><input type="text" id="erName" value="${a.client}" /></div>
        <div class="field-row"><label>Téléphone</label><input type="tel" id="erPhone" value="${a.phone}" /></div>
      </div>
      <div class="field-row"><label>Service</label><input type="text" id="erService" value="${a.service}" /></div>
      <div class="field-2col">
        <div class="field-row"><label>Professionnel</label><select id="erPro">${PROS.map((pp) => `<option value="${pp.id}" ${pp.id === a.proId ? 'selected' : ''}>${pp.name}</option>`).join("")}</select></div>
        <div class="field-row"><label>Date</label><input type="date" id="erDate" value="${a.date}" /></div>
      </div>
      <div class="field-row"><label>Heure</label><input type="time" id="erTime" value="${a.start}" /></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="openRdvDetail('${a.id}')">Retour</button>
        <button class="btn btn-primary" onclick="saveEditRdv('${a.id}')">${iconCheck()} Enregistrer</button>
      </div>
    `;
      openModal(html);
    }
    window.saveEditRdv = function saveEditRdv(id) {
      const a = APPTS.find((x) => x.id === id);
      if (!a) return;
      a.client = document.getElementById("erName").value.trim() || a.client;
      a.phone = document.getElementById("erPhone").value.trim() || a.phone;
      a.service = document.getElementById("erService").value.trim() || a.service;
      a.proId = document.getElementById("erPro").value;
      a.date = document.getElementById("erDate").value;
      const start = document.getElementById("erTime").value;
      const [sh, sm] = start.split(":").map(Number);
      const endTotal = sh * 60 + sm + 30;
      a.start = start;
      a.end = String(Math.floor(endTotal / 60)).padStart(2, "0") + ":" + String(endTotal % 60).padStart(2, "0");
      closeModal();
      showToast(`Rendez-vous de <b>${a.client}</b> modifié`);
      addNotif("edit", `Rendez-vous de <b>${a.client}</b> modifié`);
      renderPage(state.page);
    }

    /* ---- Fiche client ---- */
    window.openClientFiche = function openClientFiche(encodedName) {
      const name = decodeURIComponent(encodedName);
      const clients = uniqueClients();
      const c = clients.find((x) => x.name === name);
      if (!c) return;
      const history = c.appts.slice().sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
      const warn = absentCount(c.name) >= 2 ? `<div class="repeat-warning" style="margin-bottom:12px;">${iconAlert()} ${absentCount(c.name)} absences enregistrées — seuil d'alerte atteint</div>` : "";
      const html = `
      <div class="modal-head">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="avatar-sm" style="width:42px;height:42px;font-size:15px;background:var(--primary)">${initials(c.name)}</div>
          <div><p class="modal-title">${c.name}</p><p class="modal-sub">${calcAge(c.dob)} ans · Client depuis ${fmtDateShort(history[history.length - 1].createdAt)}</p></div>
        </div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      ${warn}
      <div class="detail-grid">
        <div><div class="detail-item-label">Téléphone</div><div class="detail-item-value">${c.phone}</div></div>
        <div><div class="detail-item-label">E-mail</div><div class="detail-item-value">${c.email}</div></div>
        <div><div class="detail-item-label">Date de naissance</div><div class="detail-item-value">${fmtDateShort(c.dob)}</div></div>
        <div><div class="detail-item-label">Total rendez-vous</div><div class="detail-item-value">${c.appts.length}</div></div>
      </div>
      <div class="field-row"><label>Note interne (visible par l'équipe uniquement)</label><textarea id="clientNote" rows="2" placeholder="Ajouter une note…"></textarea></div>
      <div class="detail-item-label" style="margin:16px 0 8px;">Historique des rendez-vous</div>
      <div style="max-height:220px;overflow-y:auto;border:1px solid var(--line);border-radius:10px;">
        ${history.map((a) => `<div class="dash-list-row" style="padding:10px 14px;">
          <span class="dash-list-time" style="width:auto;">${fmtDateShort(a.date)}</span>
          <div style="flex:1"><div class="dash-list-name" style="font-size:12.5px;">${a.service}</div><div class="dash-list-sub">${proById(a.proId).name}</div></div>
          <span class="status-pill ${STATUS[a.status].cls}">${STATUS[a.status].label}</span>
        </div>`).join("")}
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Fermer</button>
        <button class="btn btn-primary" onclick="openNewRdv({date: TODAY}); "> ${iconPlus()} Nouveau RDV pour ce client</button>
      </div>
    `;
      openModal(html, true);
    }

    window.exportMock = function exportMock(label) {
      showToast(`${iconPrinter()} Export « ${label} » généré (PDF / Excel)`);
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

    /* =========================================================
       GLOBAL SEARCH (barre du haut)
       ========================================================= */
    document.getElementById("globalSearch").addEventListener("input", function () {
      const q = this.value.trim();
      if (q.length < 2) return;
      goToPage("clients");
      setTimeout(() => { state.clientSearch.nom = q; renderClientsTable(); }, 0);
    }, { signal: ac.signal });

    /* =========================================================
       INIT
       ========================================================= */
    renderPage("dashboard");

    // ---- end ported script ----

    return () => {
      ac.abort();

      delete (window as any).todayISO;
      delete (window as any).isoPlusDays;
      delete (window as any).uid;
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
      delete (window as any).toggleSidePanel;
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
  .page-head { display: flex; align-items: flex-start; justify-content: flex-end; gap: 16px; margin-bottom: 22px; flex-wrap: wrap; }
  .page-head:empty { display: none; margin: 0; }

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

  .agenda-body { display: block; width: 100%; }

  /* Volet latéral rétractable pour le calendrier et la légende */
  .agenda-side-tab {
    position: fixed;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    background: var(--card);
    border: 1px solid var(--line);
    border-right: none;
    border-radius: 12px 0 0 12px;
    padding: 12px 8px;
    box-shadow: -3px 4px 14px rgba(18, 36, 47, 0.08);
    cursor: pointer;
    z-index: 90;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    color: var(--primary);
    transition: all .2s ease;
  }
  .agenda-side-tab:hover {
    background: var(--primary);
    color: #fff;
    padding-left: 12px;
  }
  .agenda-side-drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(18, 36, 47, 0.28);
    backdrop-filter: blur(2px);
    z-index: 998;
    opacity: 0;
    pointer-events: none;
    transition: opacity .25s ease;
  }
  .agenda-side-drawer-backdrop.open {
    opacity: 1;
    pointer-events: auto;
  }
  .agenda-side-drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 320px;
    max-width: 90vw;
    background: var(--card);
    box-shadow: -8px 0 28px rgba(18, 36, 47, 0.14);
    z-index: 999;
    transform: translateX(100%);
    transition: transform .28s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .agenda-side-drawer.open {
    transform: translateX(0);
  }
  .agenda-side-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    border-bottom: 1px solid var(--line);
  }
  .agenda-side-drawer-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

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
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
              <span className="nav-label">Tableau de bord</span>
            </div>
            <div className="nav-item" data-page="agenda">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              <span className="nav-label">Agenda</span>
            </div>
            <div className="nav-item" data-page="rdv">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
              <span className="nav-label">Rendez-vous</span>
            </div>
            <div className="nav-item" data-page="clients">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              <span className="nav-label">Clients</span>
            </div>
            <div className="nav-item" data-page="pros">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.9A9 9 0 1 0 9.1 3.5" /><path d="M12 8v4l3 3" /></svg>
              <span className="nav-label">Professionnels</span>
            </div>
            <div className="nav-item" data-page="notifs">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
              <span className="nav-label">Notifications</span>
              <span className="nav-badge" id="navNotifBadge">0</span>
            </div>
          </nav>
          <button className="sb-collapse-btn" id="collapseBtn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="collapseIcon"><polyline points="15 18 9 12 15 6" /></svg>
            <span className="nav-label">Réduire le menu</span>
          </button>
          <button className="sb-collapse-btn" id="logoutBtn" style={{ marginTop: 6, color: '#D9483C' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            <span className="nav-label">Déconnexion</span>
          </button>
        </aside>


        <div className="main">
          <header className="topbar">
            <div className="tb-search">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input type="text" id="globalSearch" placeholder="Rechercher un client, un professionnel, un rendez-vous…" />
            </div>
            <div className="tb-right">
              <button className="tb-icon-btn" id="notifBellBtn">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
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