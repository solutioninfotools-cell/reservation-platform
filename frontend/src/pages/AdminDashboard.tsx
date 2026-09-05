// @ts-nocheck -- fichier porté depuis un script JS existant (voir note en fin de réponse)
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

export default function AdminDashboard() {
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
     DONNÉES (mock) — Espace Administrateur, conforme au cahier des charges
     ========================================================= */
  window.todayISO = function todayISO() { return new Date().toISOString().slice(0,10); }
  window.isoPlusDays = function isoPlusDays(iso,n) { const d = new Date(iso+"T00:00:00"); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
  const TODAY = todayISO();
  let uidCounter = 100;
  window.uid = function uid(p) { return (p||"id")+(uidCounter++); }
  window.fmtDateShort = function fmtDateShort(iso) { const d = new Date(iso+"T00:00:00"); return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"}); }
  window.initials = function initials(name) { return name.split(" ").map((w)=>w[0]).slice(0,2).join("").toUpperCase(); }
  window.showToast = function showToast(msg) { const t=document.getElementById("toast"); t.innerHTML=msg; t.classList.add("show"); clearTimeout(showToast._t); showToast._t=setTimeout(()=>t.classList.remove("show"),2600); }

  const DOMAINES = ["Médical","Juridique","Coiffure/Beauté","Prestataire de service général","Centre de formation","Salle de sport/Coach"];
  const STATUS_COMPTE = {
    attente: { label: "En attente", cls: "st-encours" },
    actif: { label: "Actif", cls: "st-termine" },
    refuse: { label: "Refusé", cls: "st-annule" },
    desactive: { label: "Désactivé", cls: "st-absent" },
  };

  let PROS = [
    { id: "p1", name: "Dr. Ahmed Benali", email: "ahmed.benali@rendezvousapp.com", phone: "0555 10 20 30", domaine: "Médical", role: "Médecin généraliste", color: "#8957FF", statut: "actif", createdAt: "2026-02-14", lastLogin: "Il y a 2 h", nbServices: 4, nbRdv: 210, nbClients: 86, nbReceptionnistes: 2 },
    { id: "p2", name: "Dr. Sara Khalfi", email: "sara.khalfi@rendezvousapp.com", phone: "0555 22 33 11", domaine: "Médical", role: "Dermatologue", color: "#2FA79D", statut: "actif", createdAt: "2026-03-02", lastLogin: "Il y a 5 h", nbServices: 3, nbRdv: 158, nbClients: 64, nbReceptionnistes: 1 },
    { id: "p3", name: "Dr. Karim Abid", email: "karim.abid@rendezvousapp.com", phone: "0555 44 55 66", domaine: "Médical", role: "Cardiologue", color: "#E2478A", statut: "actif", createdAt: "2026-01-20", lastLogin: "Hier", nbServices: 5, nbRdv: 302, nbClients: 121, nbReceptionnistes: 2 },
    { id: "p4", name: "Imane Z.", email: "imane.z@rendezvousapp.com", phone: "0555 77 88 99", domaine: "Prestataire de service général", role: "Psychologue", color: "#E2954A", statut: "actif", createdAt: "2026-04-11", lastLogin: "Il y a 1 j", nbServices: 2, nbRdv: 95, nbClients: 40, nbReceptionnistes: 1 },
    { id: "p5", name: "Maître Yacine Ferhat", email: "yacine.ferhat@rendezvousapp.com", phone: "0555 12 90 00", domaine: "Juridique", role: "Avocat", color: "#3FA65C", statut: "attente", createdAt: TODAY, lastLogin: "—", nbServices: 0, nbRdv: 0, nbClients: 0, nbReceptionnistes: 0 },
    { id: "p6", name: "Salon Beauté Lys", email: "contact@beautelys.com", phone: "0555 33 44 22", domaine: "Coiffure/Beauté", role: "Salon de coiffure", color: "#8A8496", statut: "desactive", createdAt: "2025-11-05", lastLogin: "Il y a 3 sem.", nbServices: 6, nbRdv: 412, nbClients: 180, nbReceptionnistes: 1 },
  ];

  let RECEPTIONNISTES = [
    { id: "r1", name: "Imane B.", email: "imane.b@rendezvousapp.com", phone: "0555 90 10 20", statut: "actif", createdAt: "2026-02-20", pros: ["p1","p3"] },
    { id: "r2", name: "Feriel N.", email: "feriel.n@rendezvousapp.com", phone: "0555 40 50 60", statut: "actif", createdAt: "2026-03-15", pros: ["p2"] },
    { id: "r3", name: "Nesrine H.", email: "nesrine.h@rendezvousapp.com", phone: "0555 60 70 80", statut: "attente", createdAt: TODAY, pros: [] },
  ];

  let CLIENTS = [
    { name: "Yasmine Hadj", email: "yasmine.hadj@mail.com", phone: "0555 12 34 66", pro: "Dr. Ahmed Benali", nbRdv: 4, createdAt: "2025-12-01", statut: "actif" },
    { name: "Karim Yacine", email: "karim.y@mail.com", phone: "0555 22 33 44", pro: "Dr. Ahmed Benali", nbRdv: 3, createdAt: "2026-01-15", statut: "actif" },
    { name: "Nadia Belkacem", email: "nadia.b@mail.com", phone: "0552 98 76 54", pro: "Dr. Sara Khalfi", nbRdv: 6, createdAt: "2025-10-22", statut: "actif" },
    { name: "Rachid Aït Ali", email: "rachid.aitali@mail.com", phone: "0555 67 89 01", pro: "Dr. Karim Abid", nbRdv: 9, createdAt: "2025-08-05", statut: "actif" },
    { name: "Lina Bouzid", email: "lina.bouzid@mail.com", phone: "0555 32 11 22", pro: "Imane Z.", nbRdv: 12, createdAt: "2025-09-18", statut: "actif" },
  ];

  let SERVICES = [
    { id: "s1", name: "Consultation générale", pro: "Dr. Ahmed Benali", statut: "actif", nbRdv: 210 },
    { id: "s2", name: "Consultation dermatologie", pro: "Dr. Sara Khalfi", statut: "actif", nbRdv: 158 },
    { id: "s3", name: "Échographie cardiaque", pro: "Dr. Karim Abid", statut: "actif", nbRdv: 88 },
    { id: "s4", name: "Séance de thérapie", pro: "Imane Z.", statut: "actif", nbRdv: 95 },
    { id: "s5", name: "Coloration", pro: "Salon Beauté Lys", statut: "désactivé", nbRdv: 140 },
  ];

  let RESERVATIONS = [
    { id: uid("res"), client: "Yasmine Hadj", pro: "Dr. Ahmed Benali", service: "Consultation générale", date: TODAY, heure: "09:00", etat: "reserve", createdAt: "2026-08-24", modifiedAt: "2026-08-24" },
    { id: uid("res"), client: "Nadia Belkacem", pro: "Dr. Sara Khalfi", service: "Consultation dermatologie", date: isoPlusDays(TODAY,-1), heure: "16:00", etat: "annule", motif: "Empêchement personnel", createdAt: isoPlusDays(TODAY,-6), modifiedAt: isoPlusDays(TODAY,-1) },
    { id: uid("res"), client: "Rachid Aït Ali", pro: "Dr. Karim Abid", service: "Consultation cardiaque", date: TODAY, heure: "09:00", etat: "reserve", createdAt: "2026-08-18", modifiedAt: "2026-08-18" },
    { id: uid("res"), client: "Lina Bouzid", pro: "Imane Z.", service: "Séance de thérapie", date: isoPlusDays(TODAY,-2), heure: "10:00", etat: "termine", createdAt: isoPlusDays(TODAY,-10), modifiedAt: isoPlusDays(TODAY,-2) },
    { id: uid("res"), client: "Karim Yacine", pro: "Dr. Ahmed Benali", service: "Consultation générale", date: isoPlusDays(TODAY,-14), heure: "09:00", etat: "termine", createdAt: isoPlusDays(TODAY,-20), modifiedAt: isoPlusDays(TODAY,-14) },
  ];

  let PLATFORM = {
    name: "RendezVousApp", logo: "", desc: "", address: "", phone: "", email: "",
    joursOuvrables: ["Lundi","Mardi","Mercredi","Jeudi","Vendredi"], horaires: "09:00 – 18:00",
    conditions: "", slogan: "",
  };

  let NOTIFS = [
    { id: 1, type: "new", text: "Nouvelle inscription en attente — <b>Maître Yacine Ferhat</b> (Juridique)", time: "Il y a 30 min", unread: true },
    { id: 2, type: "new", text: "Nouvelle inscription en attente — <b>Nesrine H.</b> (Réceptionniste)", time: "Il y a 1 h", unread: true },
    { id: 3, type: "warn", text: "Le compte <b>Salon Beauté Lys</b> a été désactivé", time: "Il y a 3 sem.", unread: false },
  ];
  const NOTIF_ICONS = {
    new: { bg: "#F1ECFF", color: "#8957FF", svg: '<path d="M12 5v14M5 12h14"/>' },
    warn: { bg: "#FDF1E2", color: "#E2954A", svg: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
  };

  let state = { page: "dashboard", proFilter: {statut:"",domaine:"",search:""}, recFilter:{search:""}, rdvFilter:{etat:"",pro:""}, servicesFilter:{search:""} };

  /* =========================================================
     NAVIGATION
     ========================================================= */
  window.goToPage = function goToPage(page) {
    state.page = page;
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.page===page));
    document.querySelectorAll(".page").forEach((p) => p.classList.toggle("active", p.id==="page-"+page));
    renderPage(page);
  }
  document.querySelectorAll(".nav-item").forEach((item) => item.addEventListener("click", () => goToPage(item.dataset.page), { signal: ac.signal }));
  document.getElementById("collapseBtn").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("collapsed"), { signal: ac.signal });
  document.getElementById("notifBellBtn").addEventListener("click", () => goToPage("notifs"), { signal: ac.signal });

  window.renderPage = function renderPage(page) {
    if (page==="dashboard") renderDashboard();
    else if (page==="pros") renderProsPage();
    else if (page==="receptionnistes") renderRecPage();
    else if (page==="users") renderUsersPage();
    else if (page==="clients") renderClientsPage();
    else if (page==="rdv") renderRdvPage();
    else if (page==="services") renderServicesPage();
    else if (page==="agendas") renderAgendasPage();
    else if (page==="params") renderParamsPage();
    else if (page==="notifs") renderNotifsPage();
    updateBadges();
  }
  window.updateBadges = function updateBadges() {
    document.getElementById("navProBadge").textContent = PROS.filter((p)=>p.statut==="attente").length;
    document.getElementById("navProBadge").style.display = PROS.some((p)=>p.statut==="attente") ? "inline-block":"none";
    document.getElementById("navRecBadge").textContent = RECEPTIONNISTES.filter((r)=>r.statut==="attente").length;
    document.getElementById("navRecBadge").style.display = RECEPTIONNISTES.some((r)=>r.statut==="attente") ? "inline-block":"none";
    const n = NOTIFS.filter((x)=>x.unread).length;
    document.getElementById("navNotifBadge").textContent = n; document.getElementById("navNotifBadge").style.display = n?"inline-block":"none";
    document.getElementById("tbNotifDot").textContent = n; document.getElementById("tbNotifDot").style.display = n?"flex":"none";
  }

  /* =========================================================
     ICONES
     ========================================================= */
  window.svg = function svg(inner,w) { w=w||15; return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`; }
  window.iconCheck = function iconCheck() { return svg('<polyline points="20 6 9 17 4 12"/>'); }
  window.iconX = function iconX() { return svg('<circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'); }
  window.iconEye = function iconEye() { return svg('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>',14); }
  window.iconEdit = function iconEdit() { return svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',14); }
  window.iconPrinter = function iconPrinter() { return svg('<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'); }
  window.iconUsers = function iconUsers() { return svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'); }
  window.iconBriefcase = function iconBriefcase() { return svg('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'); }
  window.iconCal = function iconCal() { return svg('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'); }
  window.iconAlert = function iconAlert() { return svg('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',13); }
  window.iconChevronLeft = function iconChevronLeft() { return svg('<polyline points="15 18 9 12 15 6"/>',14); }

  /* =========================================================
     PAGE : TABLEAU DE BORD ADMIN
     ========================================================= */
  window.renderDashboard = function renderDashboard() {
    const nbPros = PROS.length;
    const proActifs = PROS.filter((p)=>p.statut==="actif").length;
    const proDesactives = PROS.filter((p)=>p.statut==="desactive").length;
    const nbRec = RECEPTIONNISTES.length;
    const recEnAttente = RECEPTIONNISTES.filter((r)=>r.statut==="attente").length;
    const nbClients = CLIENTS.length;
    const nouvelles = RESERVATIONS.filter((r)=>r.etat==="reserve").length;
    const terminees = RESERVATIONS.filter((r)=>r.etat==="termine").length;
    const annulees = RESERVATIONS.filter((r)=>r.etat==="annule").length;

    const platformIncomplete = !PLATFORM.desc || !PLATFORM.address || !PLATFORM.phone;

    const statCards = [
      { label:"Professionnels au total", value:nbPros, icon:iconBriefcase(), bg:"#F1ECFF", color:"#8957FF" },
      { label:"Professionnels actifs", value:proActifs, icon:iconCheck(), bg:"#E9F7ED", color:"#3FA65C" },
      { label:"Professionnels désactivés", value:proDesactives, icon:iconX(), bg:"#EEEDF2", color:"#8A8496" },
      { label:"Réceptionnistes", value:nbRec, icon:iconUsers(), bg:"#E6F7F5", color:"#2FA79D" },
      { label:"Clients (au moins 1 RDV)", value:nbClients, icon:iconUsers(), bg:"#FDF1E2", color:"#E2954A" },
    ];
    const resCards = [
      { label:"Nouvelles réservations", value:nouvelles, cls:"st-reserve" },
      { label:"Terminées", value:terminees, cls:"st-termine" },
      { label:"Annulées", value:annulees, cls:"st-annule" },
    ];

    const serviceCounts = {};
    RESERVATIONS.forEach((r)=>{ if(r.etat!=="annule") serviceCounts[r.service]=(serviceCounts[r.service]||0)+1; });
    const topServices = Object.entries(serviceCounts).sort((a,b)=>b[1]-a[1]);
    const maxSv = topServices.length ? topServices[0][1] : 1;

    document.getElementById("page-dashboard").innerHTML = `
      <div class="page-head"><div><h1 class="page-title">Tableau de bord — Administration</h1><p class="page-sub">Supervision et statistiques globales de la plateforme</p></div></div>
      ${platformIncomplete ? `<div class="card" style="background:#FDF1E2;border-color:#F3D9AE;padding:14px 18px;display:flex;align-items:center;gap:10px;margin-bottom:18px;font-size:12.5px;color:#8A5A1E;">
        ${iconAlert()} Complétez les paramètres généraux de votre plateforme pour une meilleure présentation auprès de vos clients.
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="goToPage('params')">Compléter</button>
      </div>` : ""}
      <div class="stat-grid">${statCards.map((s)=>`<div class="stat-card"><div class="stat-icon" style="background:${s.bg};color:${s.color}">${s.icon}</div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`).join("")}</div>
      <div class="dash-grid">
        <div class="card">
          <div class="card-head"><h3>Réservations — répartition par état</h3><button class="btn btn-ghost btn-sm" onclick="goToPage('rdv')">Voir tout</button></div>
          <div style="display:flex;gap:14px;padding:18px 20px;flex-wrap:wrap;">
            ${resCards.map((c)=>`<div style="flex:1;min-width:120px;text-align:center;padding:14px;border:1px solid var(--line);border-radius:12px;"><span class="status-pill ${c.cls}" style="margin-bottom:8px;">${c.label}</span><div style="font-size:22px;font-weight:800;margin-top:8px;">${c.value}</div></div>`).join("")}
          </div>
          <div style="padding:0 20px 20px;">
            <div class="detail-item-label" style="margin-bottom:8px;">Services les plus réservés (tous domaines)</div>
            ${topServices.slice(0,5).map(([name,count]) => `<div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span>${name}</span><b>${count}</b></div><div style="background:var(--paper);border-radius:999px;height:7px;overflow:hidden;"><div style="width:${(count/maxSv)*100}%;background:var(--primary);height:100%;"></div></div></div>`).join("")}
          </div>
        </div>
        <div>
          <div class="card" style="margin-bottom:14px;">
            <div class="card-head"><h3>Inscriptions en attente</h3></div>
            ${[...PROS.filter(p=>p.statut==="attente").map(p=>({...p,type:"Professionnel"})), ...RECEPTIONNISTES.filter(r=>r.statut==="attente").map(r=>({...r,type:"Réceptionniste"}))].map((x) => `
              <div class="dash-list-row">
                <div class="avatar-sm" style="background:var(--ink-soft)">${initials(x.name)}</div>
                <div style="flex:1"><div class="dash-list-name">${x.name}</div><div class="dash-list-sub">${x.type}</div></div>
                <button class="btn btn-ghost btn-sm" onclick="goToPage('${x.type==='Professionnel'?'pros':'receptionnistes'}')">Examiner</button>
              </div>`).join("") || `<div class="table-empty">Aucune inscription en attente</div>`}
          </div>
          <div class="card">
            <div class="card-head"><h3>Activité récente</h3><button class="btn btn-ghost btn-sm" onclick="goToPage('notifs')">Tout voir</button></div>
            ${NOTIFS.slice(0,3).map((n) => notifRowHtml(n)).join("")}
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
      <div class="page-head"><div><h1 class="page-title">Professionnels</h1><p class="page-sub">Validation des inscriptions, activation des comptes, consultation de l'activité</p></div><button class="btn btn-ghost btn-sm" onclick="exportMock('Liste des professionnels')">${iconPrinter()} Exporter</button></div>
      <div class="filter-row">
        <input type="text" placeholder="Rechercher un nom, un e-mail…" oninput="updateProFilter('search', this.value)" style="min-width:220px" />
        <select onchange="updateProFilter('statut', this.value)"><option value="">Tous les statuts</option>${Object.entries(STATUS_COMPTE).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join("")}</select>
        <select onchange="updateProFilter('domaine', this.value)"><option value="">Tous les domaines</option>${DOMAINES.map((d)=>`<option value="${d}">${d}</option>`).join("")}</select>
      </div>
      <div class="card"><table class="data-table"><thead><tr><th>Professionnel</th><th>Domaine</th><th>Statut</th><th>Créé le</th><th>Dernière connexion</th><th></th></tr></thead><tbody id="prosTableBody"></tbody></table></div>
    `;
    renderProsTable();
  }
  window.updateProFilter = function updateProFilter(k,v){ state.proFilter[k]=v; renderProsTable(); }
  window.renderProsTable = function renderProsTable() {
    const f = state.proFilter;
    let rows = PROS.filter((p) => (!f.statut||p.statut===f.statut) && (!f.domaine||p.domaine===f.domaine) && (!f.search||p.name.toLowerCase().includes(f.search.toLowerCase())||p.email.toLowerCase().includes(f.search.toLowerCase())));
    const body = document.getElementById("prosTableBody");
    if (!rows.length) { body.innerHTML = `<tr><td colspan="6"><div class="table-empty">Aucun professionnel trouvé</div></td></tr>`; return; }
    body.innerHTML = rows.map((p) => `<tr class="row-clickable" onclick="openProFiche('${p.id}')">
      <td><div class="cell-client"><div class="avatar-sm" style="background:${p.color}">${initials(p.name)}</div><div><div class="cell-client-name">${p.name}</div><div class="cell-client-sub">${p.role}</div></div></div></td>
      <td>${p.domaine}</td>
      <td><span class="status-pill ${STATUS_COMPTE[p.statut].cls}">${STATUS_COMPTE[p.statut].label}</span></td>
      <td>${fmtDateShort(p.createdAt)}</td><td>${p.lastLogin}</td>
      <td><div class="row-actions" onclick="event.stopPropagation()"><button class="icon-btn" onclick="openProFiche('${p.id}')">${iconEye()}</button></div></td>
    </tr>`).join("");
  }
  window.openProFiche = function openProFiche(id) {
    const p = PROS.find((x)=>x.id===id); if (!p) return;
    const recs = RECEPTIONNISTES.filter((r) => r.pros.includes(p.id));
    const html = `
      <div class="modal-head">
        <div style="display:flex;align-items:center;gap:12px;"><div class="avatar-sm" style="width:42px;height:42px;font-size:15px;background:${p.color}">${initials(p.name)}</div><div><p class="modal-title">${p.name}</p><p class="modal-sub">${p.role} · ${p.domaine}</p></div></div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="detail-grid">
        <div><div class="detail-item-label">E-mail</div><div class="detail-item-value">${p.email}</div></div>
        <div><div class="detail-item-label">Téléphone</div><div class="detail-item-value">${p.phone}</div></div>
        <div><div class="detail-item-label">Statut du compte</div><div class="detail-item-value"><span class="status-pill ${STATUS_COMPTE[p.statut].cls}">${STATUS_COMPTE[p.statut].label}</span></div></div>
        <div><div class="detail-item-label">Créé le</div><div class="detail-item-value">${fmtDateShort(p.createdAt)}</div></div>
        <div><div class="detail-item-label">Dernière connexion</div><div class="detail-item-value">${p.lastLogin}</div></div>
        <div><div class="detail-item-label">Réceptionnistes affectées</div><div class="detail-item-value">${recs.length}</div></div>
      </div>
      <div class="stat-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px;">
        <div class="stat-card" style="padding:12px;"><div class="stat-value" style="font-size:17px;">${p.nbServices}</div><div class="stat-label">Services</div></div>
        <div class="stat-card" style="padding:12px;"><div class="stat-value" style="font-size:17px;">${p.nbRdv}</div><div class="stat-label">Rendez-vous</div></div>
        <div class="stat-card" style="padding:12px;"><div class="stat-value" style="font-size:17px;">${p.nbClients}</div><div class="stat-label">Clients</div></div>
        <div class="stat-card" style="padding:12px;"><div class="stat-value" style="font-size:17px;">${p.nbReceptionnistes}</div><div class="stat-label">Réceptionnistes</div></div>
      </div>
      ${recs.length ? `<div class="detail-item-label" style="margin-bottom:8px;">Réceptionnistes associées</div><div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px;">${recs.map((r)=>`<div class="dash-list-row" style="padding:8px 0;"><div class="avatar-sm" style="background:#E2478A">${initials(r.name)}</div><div style="flex:1"><div class="dash-list-name" style="font-size:12.5px;">${r.name}</div></div></div>`).join("")}</div>` : ""}
      <div class="modal-actions" style="justify-content:space-between;flex-wrap:wrap;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${p.statut==="attente" ? `<button class="btn btn-primary btn-sm" onclick="setProStatut('${p.id}','actif')">${iconCheck()} Valider l'inscription</button><button class="btn btn-danger-ghost btn-sm" onclick="setProStatut('${p.id}','refuse')">${iconX()} Refuser</button>` : ""}
          ${p.statut==="actif" ? `<button class="btn btn-ghost btn-sm" onclick="setProStatut('${p.id}','desactive')">${iconX()} Désactiver le compte</button>` : ""}
          ${p.statut==="desactive" ? `<button class="btn btn-primary btn-sm" onclick="setProStatut('${p.id}','actif')">${iconCheck()} Réactiver le compte</button>` : ""}
        </div>
        <button class="btn btn-ghost btn-sm" onclick="closeModal()">Fermer</button>
      </div>
    `;
    openModal(html, true);
  }
  window.setProStatut = function setProStatut(id, statut) {
    const p = PROS.find((x)=>x.id===id); if (!p) return;
    p.statut = statut; closeModal(); renderProsTable(); updateBadges();
    showToast(`${p.name} — statut mis à jour : <b>${STATUS_COMPTE[statut].label}</b>`);
  }

  /* =========================================================
     PAGE : RÉCEPTIONNISTES
     ========================================================= */
  window.renderRecPage = function renderRecPage() {
    document.getElementById("page-receptionnistes").innerHTML = `
      <div class="page-head"><div><h1 class="page-title">Réceptionnistes</h1><p class="page-sub">Validation, activation et affectation aux professionnels</p></div></div>
      <div class="filter-row"><input type="text" placeholder="Rechercher…" oninput="updateRecFilter(this.value)" style="min-width:220px" /></div>
      <div class="card"><table class="data-table"><thead><tr><th>Réceptionniste</th><th>E-mail</th><th>Statut</th><th>Professionnels affectés</th><th></th></tr></thead><tbody id="recTableBody"></tbody></table></div>
    `;
    renderRecTable();
  }
  window.updateRecFilter = function updateRecFilter(v) { state.recFilter.search=v; renderRecTable(); }
  window.renderRecTable = function renderRecTable() {
    const q = state.recFilter.search.toLowerCase();
    let rows = RECEPTIONNISTES.filter((r) => !q || r.name.toLowerCase().includes(q));
    const body = document.getElementById("recTableBody");
    if (!rows.length) { body.innerHTML = `<tr><td colspan="5"><div class="table-empty">Aucune réceptionniste trouvée</div></td></tr>`; return; }
    body.innerHTML = rows.map((r) => `<tr>
      <td><div class="cell-client"><div class="avatar-sm" style="background:#E2478A">${initials(r.name)}</div><div class="cell-client-name">${r.name}</div></div></td>
      <td>${r.email}</td>
      <td><span class="status-pill ${STATUS_COMPTE[r.statut].cls}">${STATUS_COMPTE[r.statut].label}</span></td>
      <td>${r.pros.map((pid) => PROS.find((p)=>p.id===pid)?.name).filter(Boolean).join(", ") || "Aucun"}</td>
      <td><div class="row-actions">
        <button class="btn btn-ghost btn-sm" onclick="openAffectForm('${r.id}')">${iconEdit()} Affecter</button>
        ${r.statut==="attente" ? `<button class="icon-btn" title="Valider" onclick="setRecStatut('${r.id}','actif')">${iconCheck()}</button>` : `<button class="icon-btn" title="${r.statut==='actif'?'Désactiver':'Activer'}" onclick="setRecStatut('${r.id}','${r.statut==='actif'?'desactive':'actif'}')">${r.statut==='actif'?iconX():iconCheck()}</button>`}
      </div></td>
    </tr>`).join("");
  }
  window.setRecStatut = function setRecStatut(id, statut) { const r=RECEPTIONNISTES.find((x)=>x.id===id); if(!r) return; r.statut=statut; renderRecTable(); updateBadges(); showToast(`${r.name} — statut : ${STATUS_COMPTE[statut].label}`); }
  window.openAffectForm = function openAffectForm(id) {
    const r = RECEPTIONNISTES.find((x)=>x.id===id); if (!r) return;
    const html = `
      <div class="modal-head"><div><p class="modal-title">Affecter — ${r.name}</p><p class="modal-sub">Sélectionnez un ou plusieurs professionnels</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      ${PROS.filter(p=>p.statut==="actif").map((p) => `<label style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);font-size:13px;"><input type="checkbox" id="aff_${p.id}" ${r.pros.includes(p.id)?'checked':''} /> ${p.name} — ${p.role}</label>`).join("")}
      <div class="field-hint">Dès l'affectation, le professionnel obtient automatiquement le droit de gérer cette réceptionniste (activer/désactiver, autorisations).</div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveAffect('${id}')">${iconCheck()} Enregistrer</button></div>
    `;
    openModal(html);
  }
  window.saveAffect = function saveAffect(id) {
    const r = RECEPTIONNISTES.find((x)=>x.id===id); if (!r) return;
    r.pros = PROS.filter(p=>p.statut==="actif").filter((p) => document.getElementById("aff_"+p.id).checked).map((p)=>p.id);
    closeModal(); renderRecTable();
    showToast(`Affectations mises à jour pour ${r.name}`);
  }

  /* =========================================================
     PAGE : UTILISATEURS (recherche globale)
     ========================================================= */
  window.renderUsersPage = function renderUsersPage() {
    document.getElementById("page-users").innerHTML = `
      <div class="page-head"><div><h1 class="page-title">Utilisateurs</h1><p class="page-sub">Recherche globale — Professionnels, Réceptionnistes, Clients</p></div></div>
      <div class="filter-row">
        <input type="text" id="userSearchInput" placeholder="Nom, e-mail…" oninput="renderUsersTable()" style="min-width:220px" />
        <select id="userRoleFilter" onchange="renderUsersTable()"><option value="">Tous les rôles</option><option value="Professionnel">Professionnel</option><option value="Réceptionniste">Réceptionniste</option><option value="Client">Client</option></select>
      </div>
      <div class="card"><table class="data-table"><thead><tr><th>Nom</th><th>Rôle</th><th>E-mail</th><th>Statut</th><th>Créé le</th></tr></thead><tbody id="usersTableBody"></tbody></table></div>
    `;
    renderUsersTable();
  }
  window.renderUsersTable = function renderUsersTable() {
    const q = (document.getElementById("userSearchInput")?.value || "").toLowerCase();
    const roleF = document.getElementById("userRoleFilter")?.value || "";
    let all = [
      ...PROS.map((p) => ({ name:p.name, role:"Professionnel", email:p.email, statut:p.statut, createdAt:p.createdAt })),
      ...RECEPTIONNISTES.map((r) => ({ name:r.name, role:"Réceptionniste", email:r.email, statut:r.statut, createdAt:r.createdAt })),
      ...CLIENTS.map((c) => ({ name:c.name, role:"Client", email:c.email, statut:c.statut, createdAt:c.createdAt })),
    ];
    let rows = all.filter((u) => (!roleF||u.role===roleF) && (!q||u.name.toLowerCase().includes(q)||u.email.toLowerCase().includes(q)));
    const body = document.getElementById("usersTableBody");
    if (!rows.length) { body.innerHTML = `<tr><td colspan="5"><div class="table-empty">Aucun utilisateur trouvé</div></td></tr>`; return; }
    body.innerHTML = rows.map((u) => `<tr>
      <td><div class="cell-client"><div class="avatar-sm" style="background:var(--ink-soft)">${initials(u.name)}</div><div class="cell-client-name">${u.name}</div></div></td>
      <td>${u.role}</td><td>${u.email}</td>
      <td><span class="status-pill ${STATUS_COMPTE[u.statut]?.cls||'st-termine'}">${STATUS_COMPTE[u.statut]?.label||'Actif'}</span></td>
      <td>${fmtDateShort(u.createdAt)}</td>
    </tr>`).join("");
  }

  /* =========================================================
     PAGE : CLIENTS (global)
     ========================================================= */
  window.renderClientsPage = function renderClientsPage() {
    document.getElementById("page-clients").innerHTML = `
      <div class="page-head"><div><h1 class="page-title">Clients</h1><p class="page-sub">Vue globale, tous professionnels confondus</p></div><button class="btn btn-ghost btn-sm" onclick="exportMock('Liste des clients')">${iconPrinter()} Exporter</button></div>
      <div class="filter-row"><input type="text" placeholder="Nom, e-mail, téléphone…" oninput="renderClientsTable(this.value)" style="min-width:240px" /></div>
      <div class="card"><table class="data-table"><thead><tr><th>Client</th><th>Téléphone</th><th>Professionnel associé</th><th>Rendez-vous</th><th>Créé le</th></tr></thead><tbody id="clientsTableBody"></tbody></table></div>
    `;
    renderClientsTable("");
  }
  window.renderClientsTable = function renderClientsTable(q) {
    q = (q||"").toLowerCase();
    let rows = CLIENTS.filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q));
    const body = document.getElementById("clientsTableBody");
    if (!rows.length) { body.innerHTML = `<tr><td colspan="5"><div class="table-empty">Aucun client trouvé</div></td></tr>`; return; }
    body.innerHTML = rows.map((c) => `<tr>
      <td><div class="cell-client"><div class="avatar-sm" style="background:var(--primary)">${initials(c.name)}</div><div><div class="cell-client-name">${c.name}</div><div class="cell-client-sub">${c.email}</div></div></div></td>
      <td>${c.phone}</td><td>${c.pro}</td><td>${c.nbRdv}</td><td>${fmtDateShort(c.createdAt)}</td>
    </tr>`).join("");
  }

  /* =========================================================
     PAGE : RÉSERVATIONS (global)
     ========================================================= */
  const ETAT_LABELS = { reserve:{label:"Réservé",cls:"st-reserve"}, termine:{label:"Terminé",cls:"st-termine"}, annule:{label:"Annulé",cls:"st-annule"} };
  window.renderRdvPage = function renderRdvPage() {
    document.getElementById("page-rdv").innerHTML = `
      <div class="page-head"><div><h1 class="page-title">Réservations</h1><p class="page-sub">Vue globale, tous professionnels confondus</p></div><button class="btn btn-ghost btn-sm" onclick="exportMock('Liste des réservations')">${iconPrinter()} Exporter</button></div>
      <div class="filter-row">
        <select onchange="updateRdvFilter('etat', this.value)"><option value="">Tous les états</option>${Object.entries(ETAT_LABELS).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join("")}</select>
        <select onchange="updateRdvFilter('pro', this.value)"><option value="">Tous les professionnels</option>${PROS.map((p)=>`<option value="${p.name}">${p.name}</option>`).join("")}</select>
      </div>
      <div class="card"><table class="data-table"><thead><tr><th>Client</th><th>Professionnel</th><th>Service</th><th>Date</th><th>Heure</th><th>État</th><th></th></tr></thead><tbody id="rdvTableBody"></tbody></table></div>
    `;
    renderRdvTable();
  }
  window.updateRdvFilter = function updateRdvFilter(k,v) { state.rdvFilter[k]=v; renderRdvTable(); }
  window.renderRdvTable = function renderRdvTable() {
    const f = state.rdvFilter;
    let rows = RESERVATIONS.filter((r) => (!f.etat||r.etat===f.etat) && (!f.pro||r.pro===f.pro)).sort((a,b)=>(b.date+b.heure).localeCompare(a.date+a.heure));
    const body = document.getElementById("rdvTableBody");
    if (!rows.length) { body.innerHTML = `<tr><td colspan="7"><div class="table-empty">Aucune réservation ne correspond à ces filtres</div></td></tr>`; return; }
    body.innerHTML = rows.map((r) => `<tr class="row-clickable" onclick='openRdvFiche(${JSON.stringify(r.id)})'>
      <td>${r.client}</td><td>${r.pro}</td><td>${r.service}</td><td>${fmtDateShort(r.date)}</td><td>${r.heure}</td>
      <td><span class="status-pill ${ETAT_LABELS[r.etat].cls}">${ETAT_LABELS[r.etat].label}</span></td>
      <td><div class="row-actions" onclick="event.stopPropagation()"><button class="icon-btn">${iconEye()}</button></div></td>
    </tr>`).join("");
  }
  window.openRdvFiche = function openRdvFiche(id) {
    const r = RESERVATIONS.find((x) => x.id===id); if (!r) return;
    const html = `
      <div class="modal-head"><div><p class="modal-title">${r.client}</p><p class="modal-sub">${r.service} · ${r.pro}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="detail-grid">
        <div><div class="detail-item-label">Date</div><div class="detail-item-value">${fmtDateShort(r.date)}</div></div>
        <div><div class="detail-item-label">Heure</div><div class="detail-item-value">${r.heure}</div></div>
        <div><div class="detail-item-label">État</div><div class="detail-item-value"><span class="status-pill ${ETAT_LABELS[r.etat].cls}">${ETAT_LABELS[r.etat].label}</span></div></div>
        <div><div class="detail-item-label">Créée le</div><div class="detail-item-value">${fmtDateShort(r.createdAt)}</div></div>
        <div><div class="detail-item-label">Dernière modification</div><div class="detail-item-value">${fmtDateShort(r.modifiedAt)}</div></div>
        ${r.motif ? `<div><div class="detail-item-label">Motif d'annulation</div><div class="detail-item-value">${r.motif}</div></div>` : ""}
      </div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Fermer</button></div>
    `;
    openModal(html);
  }

  /* =========================================================
     PAGE : SERVICES (global)
     ========================================================= */
  window.renderServicesPage = function renderServicesPage() {
    document.getElementById("page-services").innerHTML = `
      <div class="page-head"><div><h1 class="page-title">Services</h1><p class="page-sub">Consultation des services créés par les professionnels</p></div></div>
      <div class="filter-row"><input type="text" placeholder="Rechercher un service…" oninput="renderServicesTable(this.value)" style="min-width:220px" /></div>
      <div class="card"><table class="data-table"><thead><tr><th>Service</th><th>Professionnel</th><th>Statut</th><th>Rendez-vous</th><th></th></tr></thead><tbody id="servicesTableBody"></tbody></table></div>
    `;
    renderServicesTable("");
  }
  window.renderServicesTable = function renderServicesTable(q) {
    q = (q||"").toLowerCase();
    let rows = SERVICES.filter((s) => !q || s.name.toLowerCase().includes(q) || s.pro.toLowerCase().includes(q));
    const body = document.getElementById("servicesTableBody");
    if (!rows.length) { body.innerHTML = `<tr><td colspan="5"><div class="table-empty">Aucun service trouvé</div></td></tr>`; return; }
    body.innerHTML = rows.map((s) => `<tr>
      <td>${s.name}</td><td>${s.pro}</td>
      <td><span class="status-pill ${s.statut==='actif'?'st-termine':'st-absent'}">${s.statut==='actif'?'Actif':'Désactivé'}</span></td>
      <td>${s.nbRdv}</td>
      <td><div class="row-actions"><button class="icon-btn" title="${s.statut==='actif'?'Désactiver':'Activer'}" onclick="toggleServiceStatut('${s.id}')">${s.statut==='actif'?iconX():iconCheck()}</button></div></td>
    </tr>`).join("");
  }
  window.toggleServiceStatut = function toggleServiceStatut(id) { const s=SERVICES.find(x=>x.id===id); if(!s) return; s.statut = s.statut==="actif"?"désactivé":"actif"; renderServicesTable(""); showToast(`Service « ${s.name} » ${s.statut==='actif'?'activé':'désactivé'}`); }

  /* =========================================================
     PAGE : AGENDAS (vue admin — consultation seule)
     ========================================================= */
  window.renderAgendasPage = function renderAgendasPage() {
    document.getElementById("page-agendas").innerHTML = `
      <div class="page-head"><div><h1 class="page-title">Agendas</h1><p class="page-sub">Consultation des disponibilités et créneaux par professionnel</p></div></div>
      <div class="stat-grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">
        ${PROS.filter(p=>p.statut==="actif").map((p) => {
          const rdvCount = RESERVATIONS.filter((r) => r.pro===p.name && r.etat==="reserve").length;
          return `<div class="card" style="padding:16px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;"><div class="avatar-sm" style="background:${p.color}">${initials(p.name)}</div><div><div style="font-weight:800;font-size:13.5px;">${p.name}</div><div style="font-size:11.5px;color:var(--ink-soft)">${p.role}</div></div></div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink-soft);margin-bottom:10px;"><span>Créneaux réservés</span><b style="color:var(--ink)">${rdvCount}</b></div>
            <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;" onclick="showToast('Agenda détaillé de ${p.name} — consultation seule pour l\\'Admin')">${iconEye()} Consulter l'agenda</button>
          </div>`;
        }).join("")}
      </div>
    `;
  }

  /* =========================================================
     PAGE : PARAMÈTRES GÉNÉRAUX
     ========================================================= */
  window.renderParamsPage = function renderParamsPage() {
    document.getElementById("page-params").innerHTML = `
      <div class="page-head"><div><h1 class="page-title">Paramètres généraux</h1><p class="page-sub">Ces informations sont affichées côté Client, dans l'interface publique</p></div></div>
      <div class="card" style="padding:22px;max-width:640px;">
        <div class="field-row"><label>Nom de la plateforme / de l'entreprise</label><input type="text" id="plName" value="${PLATFORM.name}" /></div>
        <div class="field-row"><label>Description</label><textarea id="plDesc" rows="2" placeholder="À propos...">${PLATFORM.desc}</textarea></div>
        <div class="field-2col">
          <div class="field-row"><label>Téléphone de contact</label><input type="text" id="plPhone" value="${PLATFORM.phone}" /></div>
          <div class="field-row"><label>E-mail de contact</label><input type="email" id="plEmail" value="${PLATFORM.email}" /></div>
        </div>
        <div class="field-row"><label>Adresse</label><input type="text" id="plAddress" value="${PLATFORM.address}" /></div>
        <div class="field-row"><label>Jours ouvrables par défaut</label>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"].map((d) => `<label style="display:flex;align-items:center;gap:5px;font-size:11.5px;border:1px solid var(--line);padding:6px 10px;border-radius:8px;"><input type="checkbox" id="jour_${d}" ${PLATFORM.joursOuvrables.includes(d)?'checked':''} /> ${d}</label>`).join("")}
          </div>
        </div>
        <div class="field-row"><label>Horaires généraux par défaut</label><input type="text" id="plHoraires" value="${PLATFORM.horaires}" /></div>
        <div class="field-row"><label>Slogan principal</label><input type="text" id="plSlogan" value="${PLATFORM.slogan}" placeholder="Votre rendez-vous, simplifié." /></div>
        <div class="field-row"><label>Conditions de réservation</label><textarea id="plConditions" rows="2">${PLATFORM.conditions}</textarea></div>
        <div class="field-row"><label>Logo</label><div style="border:1.5px dashed var(--line);border-radius:10px;padding:18px;text-align:center;font-size:12px;color:var(--ink-soft);">Glissez une image ou cliquez pour téléverser</div></div>
        <button class="btn btn-primary" onclick="savePlatform()">${iconCheck()} Enregistrer</button>
      </div>
      <div class="card" style="padding:22px;max-width:640px;margin-top:18px;">
        <h3 style="margin:0 0 12px;font-size:14.5px;">Domaines d'activité de la plateforme</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">${DOMAINES.map((d) => `<span class="status-pill st-reserve">${d}</span>`).join("")}</div>
        <button class="btn btn-ghost btn-sm" onclick="openAddDomaine()">Ajouter un domaine d'activité</button>
      </div>
    `;
  }
  window.savePlatform = function savePlatform() {
    PLATFORM.name = document.getElementById("plName").value;
    PLATFORM.desc = document.getElementById("plDesc").value;
    PLATFORM.phone = document.getElementById("plPhone").value;
    PLATFORM.email = document.getElementById("plEmail").value;
    PLATFORM.address = document.getElementById("plAddress").value;
    PLATFORM.horaires = document.getElementById("plHoraires").value;
    PLATFORM.slogan = document.getElementById("plSlogan").value;
    PLATFORM.conditions = document.getElementById("plConditions").value;
    PLATFORM.joursOuvrables = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"].filter((d) => document.getElementById("jour_"+d).checked);
    showToast("Paramètres généraux enregistrés");
    renderDashboard();
  }
  window.openAddDomaine = function openAddDomaine() {
    const html = `
      <div class="modal-head"><div><p class="modal-title">Ajouter un domaine d'activité</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-row"><label>Nom du domaine</label><input type="text" id="newDomaine" placeholder="Ex. Vétérinaire" /></div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveDomaine()">${iconCheck()} Ajouter</button></div>
    `;
    openModal(html);
  }
  window.saveDomaine = function saveDomaine() {
    const v = document.getElementById("newDomaine").value.trim();
    if (!v) return;
    DOMAINES.push(v); closeModal(); renderParamsPage();
    showToast(`Domaine « ${v} » ajouté à la plateforme`);
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
      <div class="page-head"><div><h1 class="page-title">Notifications</h1><p class="page-sub">Inscriptions en attente et événements de la plateforme</p></div><button class="btn btn-ghost btn-sm" onclick="markAllRead()">Tout marquer comme lu</button></div>
      <div class="card">${NOTIFS.map((n) => notifRowHtml(n)).join("")}</div>
    `;
  }
  window.markAllRead = function markAllRead() { NOTIFS.forEach((n)=>n.unread=false); renderNotifsPage(); updateBadges(); }

  window.exportMock = function exportMock(label) { showToast(`${iconPrinter()} Export « ${label} » généré (PDF / Excel)`); }

  /* =========================================================
     MODALS génériques
     ========================================================= */
  window.closeModal = function closeModal() {
    const root = document.getElementById("modalRoot");
    const ov = root.querySelector(".modal-overlay");
    if (ov) { ov.classList.remove("open"); setTimeout(() => root.innerHTML="", 200); }
  }
  window.openModal = function openModal(innerHtml, wide) {
    document.getElementById("modalRoot").innerHTML = `<div class="modal-overlay" id="activeOverlay"><div class="modal-box ${wide?'wide':''}">${innerHtml}</div></div>`;
    const ov = document.getElementById("activeOverlay");
    requestAnimationFrame(() => ov.classList.add("open"));
    ov.addEventListener("click", (e) => { if (e.target===ov) closeModal(); });
  }

  /* =========================================================
     GLOBAL SEARCH + INIT
     ========================================================= */
  document.getElementById("globalSearch").addEventListener("input", function() {
    const q = this.value.trim(); if (q.length<2) return;
    goToPage("users"); setTimeout(() => { document.getElementById("userSearchInput").value = q; renderUsersTable(); }, 0);
  }, { signal: ac.signal });
  renderPage("dashboard");

    // ---- end ported script ----

    return () => {
      ac.abort();

      delete (window as any).todayISO;
      delete (window as any).isoPlusDays;
      delete (window as any).uid;
      delete (window as any).fmtDateShort;
      delete (window as any).initials;
      delete (window as any).showToast;
      delete (window as any).goToPage;
      delete (window as any).renderPage;
      delete (window as any).updateBadges;
      delete (window as any).svg;
      delete (window as any).iconCheck;
      delete (window as any).iconX;
      delete (window as any).iconEye;
      delete (window as any).iconEdit;
      delete (window as any).iconPrinter;
      delete (window as any).iconUsers;
      delete (window as any).iconBriefcase;
      delete (window as any).iconCal;
      delete (window as any).iconAlert;
      delete (window as any).iconChevronLeft;
      delete (window as any).renderDashboard;
      delete (window as any).renderProsPage;
      delete (window as any).updateProFilter;
      delete (window as any).renderProsTable;
      delete (window as any).openProFiche;
      delete (window as any).setProStatut;
      delete (window as any).renderRecPage;
      delete (window as any).updateRecFilter;
      delete (window as any).renderRecTable;
      delete (window as any).setRecStatut;
      delete (window as any).openAffectForm;
      delete (window as any).saveAffect;
      delete (window as any).renderUsersPage;
      delete (window as any).renderUsersTable;
      delete (window as any).renderClientsPage;
      delete (window as any).renderClientsTable;
      delete (window as any).renderRdvPage;
      delete (window as any).updateRdvFilter;
      delete (window as any).renderRdvTable;
      delete (window as any).openRdvFiche;
      delete (window as any).renderServicesPage;
      delete (window as any).renderServicesTable;
      delete (window as any).toggleServiceStatut;
      delete (window as any).renderAgendasPage;
      delete (window as any).renderParamsPage;
      delete (window as any).savePlatform;
      delete (window as any).openAddDomaine;
      delete (window as any).saveDomaine;
      delete (window as any).notifRowHtml;
      delete (window as any).renderNotifsPage;
      delete (window as any).markAllRead;
      delete (window as any).exportMock;
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
      <section className="page" id="page-notifs"></section>
    </div>
  </div>

  
  <div id="modalRoot"></div>
  <div id="toast" className="toast"></div>



    </>
  );
}