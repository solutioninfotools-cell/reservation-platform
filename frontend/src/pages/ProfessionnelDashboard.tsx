// @ts-nocheck -- fichier porté depuis un script JS existant (voir note en fin de réponse)
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ProNavbar } from '../components/pro/ProNavbar';
import { AssistantWidget } from '../components/ui/AssistantWidget';
import { pathForPage, resolveSlug } from '../components/pro/proNav';
import { io } from 'socket.io-client';
import { professionnelApi, notificationsApi, appointmentsApi } from '../api/professionnel.api';
import { useAuthStore } from '../stores/auth.store';
import * as M from './pro/proMappers';
import * as C from './pro/proCharts';

export default function ProfessionnelDashboard() {
  const navigate = useNavigate();
  const { page: slug } = useParams();

  // Le moteur d'affichage vit dans un effet à dépendances vides : il capturerait
  // un `navigate` périmé. On le lit donc à travers une ref rafraîchie à chaque
  // rendu, ce qui permet aux `onclick="goToPage('…')"` déjà présents dans le
  // HTML généré de piloter le routeur.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  // Socket temps réel, fermé au démontage du composant.
  const socketRef = useRef(null);

  // Le moteur impératif publie le profil chargé via « pro:profile » ; on ne
  // s'en sert ici que pour saluer le professionnel par son prénom.
  const [prenomPro, setPrenomPro] = useState('');
  useEffect(() => {
    const surProfil = (e) => {
      const nom = String(e.detail?.name || '').replace(/^(Dr\.?|M\.|Mme|Mlle)\s+/i, '').split(' ')[0];
      setPrenomPro(nom || '');
    };
    window.addEventListener('pro:profile', surProfil);
    return () => window.removeEventListener('pro:profile', surProfil);
  }, []);

  const route = resolveSlug(slug);

  useEffect(() => {
    const ac = new AbortController();

    // ---- begin ported script (identique à la version HTML d'origine) ----
    /* =========================================================
       DONNÉES (mock) — Espace Professionnel, conforme au cahier des charges
       ========================================================= */
    // Les 6 statuts du CDC (RESERVE → CLIENT_ARRIVE → EN_COURS → TERMINE, plus
    // ABSENT et ANNULE), et les transitions que le backend accepte réellement.
    const STATUS = M.STATUTS;
    const TRANSITIONS = M.TRANSITIONS;
    const ME = { id: "", name: "", role: "", color: "#8957FF", initials: "" };

    // Types de champs personnalisés disponibles pour le constructeur de formulaire par service
    const FIELD_TYPES = [
      { value: "texte_court", label: "Texte court" },
      { value: "texte_long", label: "Texte long" },
      { value: "nombre", label: "Nombre" },
      { value: "liste", label: "Liste déroulante" },
      { value: "radio", label: "Boutons radio" },
      { value: "checkbox", label: "Cases à cocher" },
      { value: "switch", label: "Oui / Non" },
      { value: "date", label: "Date" },
      { value: "fichier", label: "Upload fichier / photo" },
    ];
    const HAS_OPTIONS_TYPES = ["liste", "radio", "checkbox"];

    /**
     * Formate une Date en AAAA-MM-JJ dans le fuseau LOCAL.
     *
     * `toISOString()` convertit en UTC : sur un fuseau en avance (UTC+1), minuit
     * local devient 23:00 la veille et la date reculait d'un jour — un rendez-vous
     * du lendemain apparaissait dans l'agenda du jour.
     */
    window.isoLocal = function isoLocal(d) {
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }
    window.todayISO = function todayISO() { return isoLocal(new Date()); }
    window.isoPlusDays = function isoPlusDays(iso, n) { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return isoLocal(d); }
    const TODAY = todayISO();
    let uidCounter = 100;
    window.uid = function uid(p) { return (p || "id") + (uidCounter++); }

    /* =========================================================
       DONNÉES — alimentées par l'API (plus aucune donnée simulée).
       Ces caches conservent volontairement la forme attendue par les fonctions
       de rendu ; la conversion depuis le backend est faite par proMappers.
       ========================================================= */
    let SERVICES = [];
    let APPTS = [];
    let CLIENTS = [];            // fiches clients réelles, avec leur id
    let NOTES = {};              // clientId -> [{ id, text, date }]
    let RECEPTIONNISTES = [];
    let AVAILABILITY = M.disposVersUI([]);
    let INDISPOS = [];
    let PARAMS = M.parametresVersUI(null);
    let PROFILE = { name: "", desc: "", address: "", phone: "", email: "", photoUrl: "" };
    let PROFIL_ETAT = { complet: true, champsManquants: [] };
    let MODE_SUPERVISION = null;
    let NOTIFS = [];
    let HISTORIQUE = [];
    let STATS = null;
    let CHARGEMENT = true;       // pilote l'affichage "Chargement…" au premier rendu

    const NOTIF_ICONS = {
      new: { bg: "#F1ECFF", color: "#8957FF", svg: '<path d="M12 5v14M5 12h14"/>' },
      cancel: { bg: "#FDEDEC", color: "#D9483C", svg: '<circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' },
      agenda: { bg: "#FDF1E2", color: "#E2954A", svg: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
      receptionniste: { bg: "#E6F7F5", color: "#2FA79D", svg: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>' },
      perms: { bg: "#F1ECFF", color: "#8957FF", svg: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>' },
    };

    let state = {
      page: "agenda", agendaView: "day", agendaDate: TODAY, monthCursor: TODAY.slice(0, 7),
      sidePanelOpen: false,
      // L'Agenda est désormais l'écran unifié du planning : il porte la bascule
      // Calendrier/Liste (ex-page « Réservations ») et le panneau de gestion des
      // disponibilités et indisponibilités (ex-page « Disponibilités »).
      agendaMode: "calendrier", dispoPanelOpen: false, addMenuOpen: false,
      rdvFilters: { status: "", search: "", serviceId: "", dateFrom: "", dateTo: "" },
      clientsView: "list", clientsFilters: { search: "", upcoming: "" },
      servicesView: "grid", servicesFilters: { search: "", status: "" },
      receptionnistesView: "list", receptionnistesFilters: { search: "", status: "" },
      histoFilters: { action: "", search: "" },
      statsFilters: { periode: "mois", du: "", au: "" },
    };

    /* =========================================================
       CHARGEMENT DEPUIS L'API
       Frontend → API → Controller → Service → Database.
       ========================================================= */

    /** Exécute une mutation, affiche l'erreur serveur telle quelle, puis rafraîchit. */
    window.appel = async function appel(promesse, messageSucces, apresSucces) {
      try {
        const res = await promesse;
        if (messageSucces) showToast(messageSucces);
        if (apresSucces) await apresSucces(res);
        return res;
      } catch (err) {
        // Le backend est l'autorité : on montre son message plutôt qu'un texte générique.
        showToast(M.messageErreur(err));
        throw err;
      }
    };

    window.chargerProfil = async function chargerProfil() {
      const moi = await professionnelApi.moi();
      ME.id = moi.id;
      ME.name = moi.nom;
      ME.role = moi.specialite || 'Professionnel';
      ME.initials = (moi.nom || '')
        .replace(/^(Dr\.?|M\.|Mme|Mlle)\s+/i, '')
        .split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
      PROFILE = {
        name: moi.nom ?? '',
        desc: moi.description ?? '',
        address: moi.adresse ?? '',
        phone: moi.telephone ?? '',
        email: moi.user?.email ?? '',
        photoUrl: moi.photoUrl ?? '',
        specialite: moi.specialite ?? '',
      };
      PROFIL_ETAT = moi.profil ?? { complet: true, champsManquants: [] };
      MODE_SUPERVISION = moi.modeSupervision ?? null;
      publishProfile();
    };

    window.chargerServices = async function chargerServices() {
      SERVICES = (await professionnelApi.listServices()).map(M.serviceVersUI);
    };
    window.chargerRdv = async function chargerRdv() {
      APPTS = (await professionnelApi.listRendezVous()).map(M.rdvVersUI);
    };
    window.chargerDispos = async function chargerDispos() {
      AVAILABILITY = M.disposVersUI(await professionnelApi.listDisponibilites());
    };
    window.chargerIndispos = async function chargerIndispos() {
      INDISPOS = (await professionnelApi.listIndisponibilites()).map(M.indispoVersUI);
    };
    window.chargerClients = async function chargerClients() {
      CLIENTS = await professionnelApi.listClients();
    };
    window.chargerEquipe = async function chargerEquipe() {
      RECEPTIONNISTES = (await professionnelApi.listReceptionnistes()).map(M.affectationVersUI);
    };
    window.chargerNotifs = async function chargerNotifs() {
      NOTIFS = (await notificationsApi.list()).map(M.notifVersUI);
      updateNotifBadges();
    };
    window.chargerParams = async function chargerParams() {
      PARAMS = M.parametresVersUI(await professionnelApi.getParametres());
    };
    window.chargerHistorique = async function chargerHistorique() {
      HISTORIQUE = await professionnelApi.historique({ take: 200 });
    };
    window.chargerStats = async function chargerStats(periode, du, au) {
      STATS = await professionnelApi.stats({ periode, du, au });
    };

    /** Chargement initial : tout en parallèle, puis premier rendu. */
    window.chargerTout = async function chargerTout() {
      try {
        await chargerProfil();
        await Promise.all([
          chargerServices(), chargerRdv(), chargerDispos(), chargerIndispos(),
          chargerClients(), chargerEquipe(), chargerNotifs(), chargerParams(),
        ]);
        CHARGEMENT = false;
      } catch (err) {
        CHARGEMENT = false;
        console.error('[RendezVousApp] Chargement de l\'espace impossible', err);
        showToast(M.messageErreur(err, "Impossible de charger votre espace."));
      }
      renderActivePage(state.page);
    };

    // Brouillon de travail pour le constructeur de champs personnalisés d'un service
    let CF_DRAFT = [];
    let CF_SERVICE_ID = null;
    let CF_EDIT_DRAFT = null;

    window.fmtDateLong = function fmtDateLong(iso) { const d = new Date(iso + "T00:00:00"); return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
    window.fmtDateShort = function fmtDateShort(iso) { const d = new Date(iso + "T00:00:00"); return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }); }
    window.capitalize = function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    window.calcAge = function calcAge(dob) { const d = new Date(dob); const now = new Date(); let age = now.getFullYear() - d.getFullYear(); if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--; return age; }
    window.initials = function initials(name) { return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(); }
    window.showToast = function showToast(msg) {
      const t = document.getElementById("toast");
      if (!t) return;
      t.innerHTML = msg; t.classList.add("show");
      clearTimeout(showToast._t); showToast._t = setTimeout(() => t.classList.remove("show"), 2600);
    }

    /* =========================================================
       NAVIGATION
       ========================================================= */
    /**
     * `goToPage` délègue désormais au routeur : tous les `onclick="goToPage('…')"`
     * déjà présents dans le HTML généré continuent de fonctionner et changent en
     * plus l'URL. C'est l'effet d'URL (déclaré après celui-ci) qui rappelle
     * ensuite `renderActivePage` pour effectuer le rendu réel.
     */
    window.goToPage = function goToPage(page) {
      // Déjà sur la page visée (ex. depuis une URL alias) : l'URL ne changerait
      // pas, donc l'effet ne se redéclencherait pas — on rend directement.
      if (state.page === page) { renderActivePage(page); return; }
      navigateRef.current(pathForPage(page));
    }
    /** Ancien corps de `goToPage` — bascule la section visible puis rend la page. */
    window.renderActivePage = function renderActivePage(page) {
      state.page = page;
      document.querySelectorAll(".page").forEach((p) => p.classList.toggle("active", p.id === "page-" + page));
      renderPage(page);
    }

    window.renderPage = function renderPage(page) {
      try {
        renderPageHead(page);
        // Tant que les données ne sont pas revenues du serveur, on affiche un état
        // d'attente plutôt qu'un écran vide trompeur.
        if (CHARGEMENT) {
          const el = document.getElementById("page-" + page);
          if (el) el.innerHTML = `<div class="card"><div class="ecran-chargement">${iconClock()} Chargement de votre espace…</div></div>`;
          return;
        }
        // Le profil incomplet est rappelé sur toutes les pages (CDC II.4).
        injecterAlerteProfil(page);
        if (page === "agenda") renderAgenda();
        else if (page === "clients") renderClientsPage();
        else if (page === "services") renderServicesPage();
        else if (page === "receptionnistes") renderReceptionnistesPage();
        else if (page === "stats") renderStatsPage();
        else if (page === "historique") renderHistoriquePage();
        else if (page === "params") renderParamsPage();
          else if (page === "notifs") renderNotifsPage();
        else if (page === "profil") renderProfilPage();
      } catch (err) {
        console.error("[RendezVousApp] Erreur d'affichage de la page", page, err);
        showToast("Une erreur est survenue lors de l'affichage de cette page");
      }
      updateNotifBadges();
    }
    /**
     * Bandeau « profil incomplet » (CDC II.4). Placé dans l'en-tête de page
     * commun : visible partout, sans dupliquer de code dans chaque écran, et sans
     * bloquer l'usage de l'espace.
     */
    window.injecterAlerteProfil = function injecterAlerteProfil(page) {
      const head = document.getElementById("pageHeadGlobal");
      if (!head) return;
      const existant = document.getElementById("alerteProfil");
      if (existant) existant.remove();
      if (PROFIL_ETAT.complet !== false || page === "profil") return;
      head.insertAdjacentHTML(
        "afterend",
        `<div class="page" style="display:block;padding-bottom:0;" id="alerteProfil">
        <div class="profil-alerte">${iconAlert()}
          <span>Complétez votre profil professionnel pour une meilleure présentation auprès de vos clients.</span>
          <button class="btn btn-ghost btn-sm" style="margin-left:auto;" onclick="goToPage('profil')">Compléter</button>
        </div>
      </div>`,
      );
    }

    /** Le compteur est consommé par la navbar React, via événement. */
    window.updateNotifBadges = function updateNotifBadges() {
      const n = NOTIFS.filter((x) => x.unread).length;
      window.dispatchEvent(new CustomEvent("pro:notif-count", { detail: n }));
    }
    window.publishProfile = function publishProfile() {
      window.dispatchEvent(new CustomEvent("pro:profile", {
        detail: {
          name: PROFILE.name,
          role: ME.role,
          // Bouton « Espace Administrateur » du CDC II.2 : réservé au superviseur
          // en mode Prestataire. Le backend revérifie le rôle à chaque action.
          estSuperviseur: MODE_SUPERVISION === 'PRESTATAIRE',
          profilComplet: PROFIL_ETAT.complet !== false,
        },
      }));
    }

    /* =========================================================
       ICONES
       ========================================================= */
    window.svg = function svg(inner, w) { w = w || 15; return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`; }
    window.iconPlus = function iconPlus() { return svg('<path d="M12 5v14M5 12h14"/>'); }
    window.iconImage = function iconImage() { return svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>', 14); }
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
    window.iconBot = function iconBot(w) { return svg('<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="8.5" cy="16" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.5" cy="16" r="1.2" fill="currentColor" stroke="none"/><path d="M12 11V7"/><circle cx="12" cy="5" r="2"/>', w); }
    /** Icône robot détaillé pour la bulle flottante. */
    window.iconRobot = function iconRobot() {
      return `<svg viewBox="0 0 64 64" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- antenne -->
        <line x1="32" y1="6" x2="32" y2="14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <circle cx="32" cy="4" r="3.5" fill="currentColor"/>
        <!-- tête -->
        <rect x="12" y="14" width="40" height="28" rx="9" fill="currentColor" opacity="0.15"/>
        <rect x="12" y="14" width="40" height="28" rx="9" stroke="currentColor" stroke-width="3"/>
        <!-- yeux -->
        <circle cx="23" cy="27" r="5" fill="currentColor"/>
        <circle cx="25" cy="25" r="1.5" fill="white"/>
        <circle cx="41" cy="27" r="5" fill="currentColor"/>
        <circle cx="43" cy="25" r="1.5" fill="white"/>
        <!-- bouche -->
        <rect x="24" y="34" width="16" height="3" rx="1.5" fill="currentColor" opacity="0.6"/>
        <!-- oreilles / boutons -->
        <rect x="6" y="20" width="6" height="12" rx="3" fill="currentColor" opacity="0.5"/>
        <rect x="52" y="20" width="6" height="12" rx="3" fill="currentColor" opacity="0.5"/>
        <!-- corps -->
        <rect x="18" y="44" width="28" height="14" rx="6" fill="currentColor" opacity="0.15"/>
        <rect x="18" y="44" width="28" height="14" rx="6" stroke="currentColor" stroke-width="3"/>
        <!-- boutons corps -->
        <circle cx="26" cy="51" r="2.5" fill="currentColor" opacity="0.5"/>
        <circle cx="32" cy="51" r="2.5" fill="currentColor" opacity="0.5"/>
        <circle cx="38" cy="51" r="2.5" fill="currentColor" opacity="0.5"/>
      </svg>`;
    }
    window.iconGrid = function iconGrid() { return svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>', 14); }
    window.iconList = function iconList() { return svg('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>', 14); }

    /* =========================================================
       EN-TÊTE DE PAGE UNIQUE (actions globales)
       ========================================================= */
    const PAGE_META = {
      agenda: {},
      clients: {},
      services: { action: { label: "Ajouter un service", onClick: "openServiceForm()", icon: true } },
      receptionnistes: {},
      stats: {},
      historique: {},
      params: {},
      assistant: {},
      notifs: { action: { label: "Tout marquer comme lu", onClick: "markAllRead()", ghost: true } },
      profil: {},
    };
    window.renderPageHead = function renderPageHead(page) {
      const meta = PAGE_META[page];
      const headEl = document.getElementById("pageHeadGlobal");
      const actionsEl = document.getElementById("pageActionsMain");
      if (!headEl || !actionsEl) return;
      if (meta && meta.action) {
        const a = meta.action;
        actionsEl.innerHTML = `<button class="btn ${a.ghost ? 'btn-ghost btn-sm' : 'btn-primary'}" onclick="${a.onClick}">${a.icon ? iconPlus() : ''}${a.label}</button>`;
        headEl.style.display = "flex";
      } else {
        actionsEl.innerHTML = "";
        headEl.style.display = "none";
      }
    }

    /* =========================================================
       PAGE : TABLEAU DE BORD
       ========================================================= */
    /* =========================================================
       PAGE : AGENDA (mono-professionnel)
       ========================================================= */
    /**
     * Indicateurs du CDC II.3. Le tableau de bord n'existe plus comme page :
     * l'Agenda est l'écran d'accueil, et ces chiffres l'accompagnent au lieu
     * d'occuper un écran séparé qu'il fallait quitter pour travailler.
     */
    window.indicateursJour = function indicateursJour() {
      // Le premier indicateur suit le jour AFFICHÉ : « Aujourd'hui 0 » en face de
      // seize rendez-vous à l'écran se lit comme une panne, pas comme une mesure.
      const jour = state.agendaDate;
      const estAujourdhui = jour === TODAY;
      const duJour = APPTS.filter((a) => a.date === jour && a.status !== "ANNULE");
      const aVenir = APPTS.filter((a) => a.date > TODAY && a.status === "RESERVE");
      const termines = APPTS.filter((a) => a.status === "TERMINE").length;
      return [
        [estAujourdhui ? "Aujourd'hui" : "Le " + fmtDateShort(jour), duJour.length, iconCal()],
        ["À venir", aVenir.length, iconClock()],
        ["Terminés", termines, iconCheckCircle()],
        ["Clients", CLIENTS.length, iconUsers()],
        ["Services actifs", SERVICES.filter((s) => s.status === "active").length, iconCheck()],
      ];
    }

    /** Compteurs par statut sur la journée affichée (rail de droite). */
    window.statutsDuJour = function statutsDuJour() {
      const duJour = APPTS.filter((a) => a.date === state.agendaDate);
      return Object.entries(STATUS).map(([cle, v]) => ({
        cle, label: v.label, color: v.color, cls: v.cls,
        n: duJour.filter((a) => a.status === cle).length,
      }));
    }

    /** Prochains rendez-vous, façon « rappels à venir ». */
    window.prochainsRdv = function prochainsRdv(n) {
      const maintenant = new Date();
      return APPTS
        .filter((a) => ["RESERVE", "CLIENT_ARRIVE", "EN_COURS"].includes(a.status))
        .filter((a) => new Date(a.date + "T" + a.start + ":00") >= maintenant)
        .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
        .slice(0, n || 4);
    }

    window.renderAgenda = function renderAgenda() {
      const cal = state.agendaMode === "calendrier";
      const statuts = statutsDuJour().filter((s) => s.n > 0);
      const prochains = prochainsRdv(4);

      document.getElementById("page-agenda").innerHTML = `
      <div class="agenda-toolbar">
        ${cal ? `<div class="date-nav"><button onclick="agendaShift(-1)" title="Précédent">${iconChevronLeft()}</button><span class="date-nav-label">${agendaDateLabel()}</span><button onclick="agendaShift(1)" title="Suivant">${iconChevronRight()}</button></div>
        <button class="btn btn-ghost btn-sm" onclick="agendaToday()">Aujourd'hui</button>
        <div class="view-toggle">
          <button class="${state.agendaView === 'day' ? 'active' : ''}" onclick="setAgendaView('day')">Jour</button>
          <button class="${state.agendaView === 'week' ? 'active' : ''}" onclick="setAgendaView('week')">Semaine</button>
          <button class="${state.agendaView === 'month' ? 'active' : ''}" onclick="setAgendaView('month')">Mois</button>
        </div>` : `<div class="date-nav-label" style="min-width:auto;">Toutes les réservations</div>`}

        <div class="agenda-toolbar-right">
          <div class="view-toggle">
            <button class="${cal ? 'active' : ''}" onclick="setAgendaMode('calendrier')">${iconCal()} Calendrier</button>
            <button class="${!cal ? 'active' : ''}" onclick="setAgendaMode('liste')">${iconList()} Liste</button>
          </div>
          <button class="btn btn-ghost btn-sm ${state.dispoPanelOpen ? 'is-on' : ''}" onclick="toggleDispoPanel()">${iconClock()} Gérer les disponibilités</button>
          <div class="agenda-add">
            <button class="btn btn-primary" onclick="toggleAddMenu(event)">${iconPlus()} Ajouter ${svg('<polyline points="6 9 12 15 18 9"/>', 13)}</button>
            ${state.addMenuOpen ? `<div class="agenda-add-menu">
              <button onclick="addMenuPick('rdv')">${iconCheck()}<div><b>Réservation</b><span>Créer un rendez-vous pour un client</span></div></button>
              <button onclick="addMenuPick('dispo')">${iconClock()}<div><b>Disponibilité</b><span>Ouvrir une plage horaire à la réservation</span></div></button>
              <button onclick="addMenuPick('indispo')">${iconX()}<div><b>Indisponibilité</b><span>Bloquer un créneau, un jour ou une période</span></div></button>
            </div>` : ""}
          </div>
        </div>
      </div>

      <div id="agendaDispoPanel">${state.dispoPanelOpen ? dispoPanelHtml() : ""}</div>

      <div class="agenda-layout ${cal ? '' : 'is-list'}">
        <div class="agenda-centre">
          ${cal ? `<div class="agenda-kpis">
            ${indicateursJour().map(([l, v, ic]) => `<div class="agenda-kpi"><span class="agenda-kpi-ic">${ic}</span><span class="agenda-kpi-val">${v}</span><span class="agenda-kpi-lab">${l}</span></div>`).join("")}
          </div>` : ""}

          <div id="agendaMain"></div>

          ${cal ? `<div class="agenda-legende">
            ${Object.entries(STATUS).map(([k, v]) => `<span class="legend-item"><span class="legend-dot" style="background:${v.color}"></span>${v.label}</span>`).join("")}
            <span class="legend-item"><span class="legend-dot legend-dot-off"></span>Hors disponibilité</span>
            <span class="legend-item"><span class="legend-dot legend-dot-blocked"></span>Indisponible</span>
          </div>` : ""}
        </div>

        ${cal ? `<aside class="agenda-rail ${state.sidePanelOpen ? 'open' : ''}">
          <div class="agenda-rail-tete">
            <span>Calendrier &amp; suivi</span>
            <button class="icon-btn" onclick="toggleSidePanel()" title="Fermer">${iconX()}</button>
          </div>

          ${miniCalHtml()}

          <div class="card rail-bloc">
            <div class="rail-titre">Statut des rendez-vous</div>
            ${statuts.length ? statuts.map((s) => `
              <div class="rail-statut">
                <span class="legend-dot" style="background:${s.color}"></span>
                <span class="rail-statut-label">${s.label}</span>
                <b class="rail-statut-n">${s.n}</b>
              </div>`).join("") : `<div class="rail-vide">Aucun rendez-vous ce jour</div>`}
          </div>

          <div class="card rail-bloc">
            <div class="rail-titre">Prochains rendez-vous</div>
            ${prochains.length ? prochains.map((a) => `
              <button class="rail-rdv" onclick="openRdvDetail('${a.id}')">
                <span class="avatar-sm" style="background:${STATUS[a.status].color}">${initials(a.client || "?")}</span>
                <span class="rail-rdv-txt">
                  <b>${a.client}</b>
                  <span>${fmtDateShort(a.date)} · ${a.start} — ${a.service}</span>
                </span>
                ${iconChevronRight()}
              </button>`).join("") : `<div class="rail-vide">Aucun rendez-vous à venir</div>`}
          </div>
        </aside>` : ""}
      </div>

      ${cal ? `<button class="agenda-side-tab ${state.sidePanelOpen ? 'active' : ''}" onclick="toggleSidePanel()" title="Calendrier et suivi">
        ${iconCal(18)}
        <span style="writing-mode:vertical-rl;font-size:11px;font-weight:700;letter-spacing:.5px;margin-top:4px;">Suivi</span>
      </button>
      <div class="agenda-rail-fond ${state.sidePanelOpen ? 'open' : ''}" onclick="toggleSidePanel()"></div>` : ""}
    `;
      renderAgendaMain();
    }
    window.setAgendaMode = function setAgendaMode(m) { state.agendaMode = m; state.addMenuOpen = false; renderAgenda(); }
    // Préréglages appliqués par les URLs alias, juste avant le rendu de la page :
    // ils ne déclenchent volontairement aucun rendu.
    window.setAgendaModeSilent = function setAgendaModeSilent(m) { state.agendaMode = m; }
    window.setDispoPanelSilent = function setDispoPanelSilent(v) { state.dispoPanelOpen = !!v; }
    window.toggleDispoPanel = function toggleDispoPanel() { state.dispoPanelOpen = !state.dispoPanelOpen; state.addMenuOpen = false; renderAgenda(); }
    window.toggleAddMenu = function toggleAddMenu(e) {
      if (e) e.stopPropagation();
      state.addMenuOpen = !state.addMenuOpen;
      renderAgenda();
    }
    window.addMenuPick = function addMenuPick(what) {
      state.addMenuOpen = false;
      renderAgenda();
      if (what === "rdv") openNewRdv();
      else if (what === "dispo") openDispoQuickForm();
      else openIndispoForm();
    }
    /** Raccourcis utilisés par les accès rapides du tableau de bord. */
    window.openAgendaListe = function openAgendaListe() { state.agendaMode = "liste"; state.dispoPanelOpen = false; goToPage("agenda"); }
    window.openAgendaDispos = function openAgendaDispos() { state.agendaMode = "calendrier"; state.dispoPanelOpen = true; goToPage("agenda"); }
    window.agendaDateLabel = function agendaDateLabel() {
      if (state.agendaView === "day") return capitalize(fmtDateLong(state.agendaDate));
      if (state.agendaView === "week") { const start = weekStart(state.agendaDate); return fmtDateShort(start) + " – " + fmtDateShort(isoPlusDays(start, 6)); }
      const d = new Date(state.monthCursor + "-01T00:00:00");
      return capitalize(d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));
    }
    window.weekStart = function weekStart(iso) { const d = new Date(iso + "T00:00:00"); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return isoLocal(d); }
    window.agendaShift = function agendaShift(dir) {
      if (state.agendaView === "day") state.agendaDate = isoPlusDays(state.agendaDate, dir);
      else if (state.agendaView === "week") state.agendaDate = isoPlusDays(state.agendaDate, dir * 7);
      else { const d = new Date(state.monthCursor + "-01T00:00:00"); d.setMonth(d.getMonth() + dir); state.monthCursor = isoLocal(d).slice(0, 7); }
      renderAgenda();
    }
    window.agendaToday = function agendaToday() { state.agendaDate = TODAY; state.monthCursor = TODAY.slice(0, 7); renderAgenda(); }
    window.setAgendaView = function setAgendaView(v) { state.agendaView = v; renderAgenda(); }

    const HOURS = Array.from({ length: 14 }, (_, i) => 7 + i);
    // Une heure = 168 px, de sorte qu'un rendez-vous de 30 minutes — le cas le
    // plus courant — dispose des 80 px nécessaires à ses quatre lignes sans
    // empiéter sur le créneau suivant.
    const DAY_ROW_H = 168;
    // Au-dessous de ces hauteurs, la carte retire des lignes au lieu de tronquer.
    const APPT_SEUIL_MOYEN = 76;
    const APPT_SEUIL_PETIT = 46;
    const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

    /** Nom de jour FR (clé de AVAILABILITY) pour une date ISO. */
    window.dayNameOf = function dayNameOf(iso) { const d = new Date(iso + "T00:00:00"); return DAY_NAMES[(d.getDay() + 6) % 7]; }
    /** Vrai si l'heure pleine est couverte par une plage de disponibilité du jour. */
    window.isHourOpen = function isHourOpen(iso, hour) {
      const info = AVAILABILITY[dayNameOf(iso)];
      if (!info || !info.on) return false;
      return (info.ranges || []).some((r) => {
        const s = parseInt(r.start.slice(0, 2), 10), e = parseInt(r.end.slice(0, 2), 10) * 60 + parseInt(r.end.slice(3, 5), 10);
        return hour >= s && (hour * 60) < e;
      });
    }
    /** Indisponibilité couvrant la date, s'il y en a une. */
    window.indispoOn = function indispoOn(iso) { return INDISPOS.find((i) => iso >= i.start && iso <= i.end) || null; }

    /**
     * Un pictogramme par état, en plus de la couleur.
     *
     * Les six couleurs d'état ne se distinguent pas toutes en vision des
     * couleurs déficiente (« Terminé » vert contre « En cours » orange :
     * ΔE 2,5 en protanopie). La forme porte donc le sens, la couleur ne fait
     * que le renforcer — et l'infobulle donne le libellé en toutes lettres.
     */
    const ICONES_STATUT = {
      RESERVE: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
      CLIENT_ARRIVE: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
      EN_COURS: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/>',
      TERMINE: '<polyline points="20 6 9 17 4 12"/>',
      ABSENT: '<circle cx="12" cy="12" r="9"/><line x1="8" y1="12" x2="16" y2="12"/>',
      ANNULE: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    };

    /**
     * Carte d'un rendez-vous dans la grille horaire.
     * Le téléphone est repris du CDC II.14 : pouvoir rappeler un client sans
     * ouvrir sa fiche est le premier réflexe depuis un planning.
     */
    window.apptCardHtml = function apptCardHtml(a) {
      const st = STATUS[a.status] || STATUS.RESERVE;
      const picto = ICONES_STATUT[a.status] || ICONES_STATUT.RESERVE;
      return `<span class="appt-etat" style="background:${st.color}" aria-hidden="true">${svg(picto, 13)}</span>`
        + `<span class="appt-heure">${a.start} – ${a.end}</span>`
        + `<span class="appt-client">${a.client}</span>`
        + (a.phone ? `<span class="appt-tel">${a.phone}</span>` : "")
        + `<span class="appt-service">${a.service}</span>`;
    }

    window.renderAgendaMain = function renderAgendaMain() {
      const el = document.getElementById("agendaMain");
      if (!el) return;
      if (state.agendaMode === "liste") { el.innerHTML = agendaListHtml(); renderRdvTable(); return; }
      if (state.agendaView === "day") { el.innerHTML = dayViewHtml(); placeDayAppts(); }
      else if (state.agendaView === "week") { el.innerHTML = weekViewHtml(); placeDayAppts(); }
      else el.innerHTML = monthViewHtml();
    }
    window.dayViewHtml = function dayViewHtml() {
      const iso = state.agendaDate;
      const blocked = indispoOn(iso);
      let head = `<div class="day-grid-head" style="grid-template-columns:52px 1fr"><div></div><div class="day-col-head"><div class="avatar-sm" style="background:${ME.color};margin:0 auto 4px;">${ME.initials}</div><div class="day-col-head-name">${ME.name}</div><div class="day-col-head-role">${ME.role}</div></div></div>`;
      let banner = blocked ? `<div class="day-blocked-banner">${iconAlert()} Journée indisponible — ${blocked.motif}</div>` : "";
      let body = `<div class="day-grid-body" style="grid-template-columns:52px 1fr">`;
      HOURS.forEach((h) => {
        const open = !blocked && isHourOpen(iso, h);
        body += `<div class="hour-label">${String(h).padStart(2, "0")}:00</div><div class="day-col ${blocked ? 'blocked' : (open ? '' : 'off')}" data-iso="${iso}" data-hour="${h}" onclick="handleDayColClick(event,${h})" title="${blocked ? 'Indisponible' : (open ? 'Créneau disponible — cliquez pour réserver' : 'Hors de vos disponibilités')}"></div>`;
      });
      body += `</div>`;
      return `<div class="day-grid">${head}${banner}${body}</div>`;
    }
    /** Vue Liste de l'Agenda — reprend les filtres et le tableau des réservations. */
    // CDC II.9 : recherche et filtres par client, date, service et état — combinables.
    window.agendaListHtml = function agendaListHtml() {
      const f = state.rdvFilters;
      return `
      <div class="filter-row">
        <input type="text" placeholder="Rechercher un client…" value="${f.search}" oninput="updateRdvFilter('search', this.value)" style="min-width:200px" />
        <select onchange="updateRdvFilter('status', this.value)">
          <option value="">Tous les états</option>
          ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${f.status === k ? 'selected' : ''}>${v.label}</option>`).join("")}
        </select>
        <select onchange="updateRdvFilter('serviceId', this.value)">
          <option value="">Tous les services</option>
          ${SERVICES.map((s) => `<option value="${s.id}" ${f.serviceId === s.id ? 'selected' : ''}>${s.name}</option>`).join("")}
        </select>
        <input type="date" value="${f.dateFrom || ''}" title="Du" onchange="updateRdvFilter('dateFrom', this.value)" />
        <input type="date" value="${f.dateTo || ''}" title="Au" onchange="updateRdvFilter('dateTo', this.value)" />
        ${(f.search || f.status || f.serviceId || f.dateFrom || f.dateTo) ? `<button class="btn btn-ghost btn-sm" onclick="resetRdvFilters()">Réinitialiser</button>` : ""}
      </div>
      <div class="card"><table class="data-table"><thead><tr><th>Client</th><th>Service</th><th>Date</th><th>Heure</th><th>Origine</th><th>Statut</th><th></th></tr></thead><tbody id="rdvTableBody"></tbody></table></div>
    `;
    }
    /**
     * Plages fermées AU MILIEU d'une journée ouverte : entre 12:00 et 14:00 quand
     * le professionnel déclare « 09:00–12:00 / 14:00–17:00 » (CDC II.7.2). Elles
     * se lisent comme une pause, et non comme un simple créneau hors horaires.
     */
    window.pausesDuJour = function pausesDuJour(iso) {
      const info = AVAILABILITY[dayNameOf(iso)];
      if (!info || !info.on || info.ranges.length < 2) return [];
      const tri = [...info.ranges].sort((a, b) => a.start.localeCompare(b.start));
      const pauses = [];
      for (let i = 0; i < tri.length - 1; i++) {
        if (tri[i].end < tri[i + 1].start) pauses.push({ start: tri[i].end, end: tri[i + 1].start });
      }
      return pauses;
    }

    /**
     * Pose pauses, rendez-vous et repère d'heure courante dans la grille.
     *
     * La même fonction sert la vue Jour et la vue Semaine : chaque colonne porte
     * sa date en `data-iso`, il n'y a donc pas deux moteurs de placement à tenir
     * en phase. Le repère de l'heure courante, lui, est posé une seule fois sur
     * le corps de la grille et la traverse de bout en bout.
     */
    window.placeDayAppts = function placeDayAppts() {
      const grid = document.querySelector(".day-grid-body");
      if (!grid) return;
      const premiere = grid.querySelector(".day-col");
      if (!premiere) return;
      const rowH = premiere.offsetHeight || DAY_ROW_H;
      const minutesVersY = (h, m) => (((h - HOURS[0]) * 60 + m) / 60) * rowH;

      // Une colonne par date affichée : on ne place qu'une fois par journée,
      // même si la grille répète la colonne à chaque rangée horaire.
      const dates = [];
      grid.querySelectorAll(".day-col[data-iso]").forEach((c) => {
        if (!dates.includes(c.dataset.iso)) dates.push(c.dataset.iso);
      });

      dates.forEach((iso) => {
        // La première cellule de la journée accueille tout ce qui se positionne :
        // elle est étirée sur toute la hauteur par `placerSurToute`.
        const col = grid.querySelector('.day-col[data-iso="' + iso + '"]');
        if (!col) return;
        const piste = document.createElement("div");
        piste.className = "day-piste";
        piste.style.height = (HOURS.length * rowH) + "px";
        col.appendChild(piste);

        // --- Bandes de pause (CDC II.7.2) ---
        pausesDuJour(iso).forEach((pause) => {
          const [sh, sm] = pause.start.split(":").map(Number);
          const [eh, em] = pause.end.split(":").map(Number);
          const top = minutesVersY(sh, sm);
          const haut = minutesVersY(eh, em) - top;
          if (haut <= 0) return;
          const bande = document.createElement("div");
          bande.className = "day-pause";
          bande.style.top = top + "px";
          bande.style.height = haut + "px";
          bande.textContent = pause.start + " – " + pause.end + "  ·  Pause";
          piste.appendChild(bande);
        });

        // --- Rendez-vous ---
        const dayAppts = APPTS
          .filter((a) => a.date === iso && a.status !== "ANNULE")
          .sort((a, b) => a.start.localeCompare(b.start));

        // Chaque carte occupe exactement sa durée : deux rendez-vous qui se
        // suivent ne se recouvrent donc jamais. Le partage de largeur ci-dessous
        // ne sert plus qu'aux vrais chevauchements d'horaires.
        const rects = dayAppts.map((a) => {
          const [sh, sm] = a.start.split(":").map(Number);
          const [eh, em] = a.end.split(":").map(Number);
          const top = minutesVersY(sh, sm);
          const dureeMin = Math.max(10, (eh * 60 + em) - (sh * 60 + sm));
          const haut = Math.max(30, (dureeMin / 60) * rowH - 4);
          return { a, top, haut, bas: top + haut, colonne: 0, colonnes: 1 };
        });

        // Deux rendez-vous qui se recouvrent se partagent la largeur, sinon le
        // second serait invisible sous le premier.
        let grappe = [];
        let finGrappe = -1;
        const cloturer = () => {
          if (!grappe.length) return;
          const pistes = [];
          grappe.forEach((r) => {
            let i = 0;
            while (i < pistes.length && pistes[i] > r.top + 1) i++;
            pistes[i] = r.bas;
            r.colonne = i;
          });
          grappe.forEach((r) => { r.colonnes = pistes.length; });
          grappe = [];
        };
        rects.forEach((r) => {
          if (grappe.length && r.top >= finGrappe - 1) { cloturer(); finGrappe = -1; }
          grappe.push(r);
          finGrappe = Math.max(finGrappe, r.bas);
        });
        cloturer();

        rects.forEach((r) => {
          const st = STATUS[r.a.status] || STATUS.RESERVE;
          const largeur = 100 / r.colonnes;
          const bloc = document.createElement("div");
          bloc.className = "appt-block";
          bloc.style.top = r.top + "px";
          bloc.style.height = r.haut + "px";
          bloc.style.left = "calc(" + (r.colonne * largeur) + "% + 4px)";
          bloc.style.width = "calc(" + largeur + "% - 8px)";
          bloc.style.background = st.color + "1A";
          bloc.style.borderColor = st.color + "40";
          // Trois densités : complète, moyenne (sans téléphone), réduite
          // (heure et nom sur une ligne). Mieux vaut montrer moins que tronquer.
          if (r.haut < APPT_SEUIL_PETIT) bloc.classList.add("appt-petit");
          else if (r.haut < APPT_SEUIL_MOYEN) bloc.classList.add("appt-moyen");
          bloc.innerHTML = apptCardHtml(r.a);
          bloc.title = r.a.client + " — " + r.a.service + " (" + st.label + ")";
          bloc.onclick = (e) => { e.stopPropagation(); openRdvDetail(r.a.id); };
          piste.appendChild(bloc);
        });
      });

      // --- Repère de l'heure courante, posé une fois pour toute la grille ---
      const aujourdhui = todayISO();
      if (dates.includes(aujourdhui)) {
        const now = new Date();
        const h = now.getHours(), m = now.getMinutes();
        if (h >= HOURS[0] && h <= HOURS[HOURS.length - 1]) {
          const y = minutesVersY(h, m);
          const trait = document.createElement("div");
          trait.className = "day-now";
          trait.style.top = y + "px";
          grid.appendChild(trait);

          const etiquette = document.createElement("div");
          etiquette.className = "day-now-heure";
          etiquette.style.top = y + "px";
          etiquette.textContent = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
          grid.appendChild(etiquette);
        }
      }
    }

    window.handleDayColClick = function handleDayColClick(e, hour) {
      if (e.target.closest(".appt-block")) return;
      const blocked = indispoOn(state.agendaDate);
      if (blocked) { showToast(`Journée indisponible — ${blocked.motif}`); return; }
      openNewRdv({ date: state.agendaDate, start: String(hour).padStart(2, "0") + ":00" });
    }
    /**
     * Vue Semaine : même grille horaire que la vue Jour, avec une colonne par
     * journée. On voit ainsi où sont les trous d'une semaine, ce qu'une liste
     * par colonne ne montrait pas — et la ligne d'heure courante traverse la
     * semaine entière.
     */
    window.weekViewHtml = function weekViewHtml() {
      const start = weekStart(state.agendaDate);
      const days = Array.from({ length: 7 }, (_, i) => isoPlusDays(start, i));
      const colonnes = "52px repeat(7, minmax(0,1fr))";

      const tetes = days.map((d) => {
        const dt = new Date(d + "T00:00:00");
        const jour = dt.toLocaleDateString("fr-FR", { weekday: "short" });
        const num = dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
        const blocked = indispoOn(d);
        const info = AVAILABILITY[dayNameOf(d)];
        const closed = !blocked && (!info || !info.on);
        const etat = blocked ? blocked.motif : (closed ? "Fermé" : "");
        return `<div class="day-col-head ${d === TODAY ? 'today' : ''}">`
          + `<div class="day-col-head-name">${capitalize(jour)}</div>`
          + `<div class="day-col-head-role">${num}${etat ? " · " + etat : ""}</div>`
          + `</div>`;
      }).join("");

      let body = `<div class="day-grid-body" style="grid-template-columns:${colonnes}">`;
      HOURS.forEach((h) => {
        body += `<div class="hour-label">${String(h).padStart(2, "0")}:00</div>`;
        days.forEach((d) => {
          const blocked = indispoOn(d);
          const open = !blocked && isHourOpen(d, h);
          body += `<div class="day-col ${blocked ? 'blocked' : (open ? '' : 'off')}" data-iso="${d}" data-hour="${h}"`
            + ` onclick="handleWeekColClick(event,'${d}',${h})"`
            + ` title="${blocked ? 'Indisponible — ' + blocked.motif : (open ? 'Créneau disponible — cliquez pour réserver' : 'Hors de vos disponibilités')}"></div>`;
        });
      });
      body += `</div>`;

      return `<div class="day-grid week-mode">`
        + `<div class="day-grid-head" style="grid-template-columns:${colonnes}"><div></div>${tetes}</div>`
        + body
        + `</div>`;
    }

    window.handleWeekColClick = function handleWeekColClick(e, iso, hour) {
      if (e.target.closest(".appt-block")) return;
      const blocked = indispoOn(iso);
      if (blocked) { showToast(`Journée indisponible — ${blocked.motif}`); return; }
      openNewRdv({ date: iso, start: String(hour).padStart(2, "0") + ":00" });
    }

    window.monthViewHtml = function monthViewHtml() {
      const first = new Date(state.monthCursor + "-01T00:00:00");
      const startOffset = (first.getDay() + 6) % 7;
      const gridStart = new Date(first); gridStart.setDate(first.getDate() - startOffset);
      const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return isoLocal(d); });
      const dows = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
      let html = `<div class="month-grid">` + dows.map((d) => `<div class="month-dow">${d}</div>`).join("");
      cells.forEach((iso) => {
        const inMonth = iso.slice(0, 7) === state.monthCursor;
        const dayAppts = APPTS.filter((a) => a.date === iso && a.status !== 'ANNULE').sort((a, b) => a.start.localeCompare(b.start));
        const num = parseInt(iso.slice(8, 10), 10);
        const blocked = indispoOn(iso);
        const info = AVAILABILITY[dayNameOf(iso)];
        const closed = !blocked && (!info || !info.on);
        html += `<div class="month-cell ${inMonth ? '' : 'muted'} ${iso === TODAY ? 'today' : ''} ${blocked ? 'blocked' : ''} ${closed ? 'closed' : ''}" onclick="jumpToDay('${iso}')" title="${blocked ? 'Indisponible — ' + blocked.motif : (closed ? 'Fermé' : fmtDateShort(iso))}">
        <div class="month-cell-num">${num}</div>
        ${dayAppts.slice(0, 2).map((a) => `<span class="month-cell-appt" style="border-color:${STATUS[a.status].color}"><b>${a.start}</b> ${a.client}</span>`).join("")}
        ${dayAppts.length > 2 ? `<span class="month-cell-count">+${dayAppts.length - 2} autre${dayAppts.length - 2 > 1 ? 's' : ''}</span>` : ""}
      </div>`;
      });
      return html + `</div>`;
    }
    window.jumpToDay = function jumpToDay(iso) { state.agendaDate = iso; state.agendaView = "day"; renderAgenda(); }
    window.miniCalHtml = function miniCalHtml() {
      const first = new Date(state.monthCursor + "-01T00:00:00");
      const startOffset = (first.getDay() + 6) % 7;
      const gridStart = new Date(first); gridStart.setDate(first.getDate() - startOffset);
      const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return isoLocal(d); });
      const dows = ["L", "M", "M", "J", "V", "S", "D"];
      let html = `<div class="mini-cal"><div class="mini-cal-head"><button onclick="miniCalShift(-1)">${iconChevronLeft()}</button><span>${capitalize(first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }))}</span><button onclick="miniCalShift(1)">${iconChevronRight()}</button></div><div class="mini-cal-grid">`;
      dows.forEach((d) => html += `<div class="mini-cal-dow">${d}</div>`);
      cells.forEach((iso) => {
        const inMonth = iso.slice(0, 7) === state.monthCursor;
        const hasAppt = APPTS.some((a) => a.date === iso && a.status !== "ANNULE");
        const num = parseInt(iso.slice(8, 10), 10);
        html += `<div class="mini-cal-day ${inMonth ? '' : 'muted'} ${iso === TODAY ? 'today' : ''} ${iso === state.agendaDate ? 'selected' : ''} ${hasAppt ? 'has-appt' : ''}" onclick="jumpToDay('${iso}')">${num}</div>`;
      });
      return html + `</div></div>`;
    }
    window.miniCalShift = function miniCalShift(dir) { const d = new Date(state.monthCursor + "-01T00:00:00"); d.setMonth(d.getMonth() + dir); state.monthCursor = isoLocal(d).slice(0, 7); renderAgenda(); }

    /* =========================================================
       RÉSERVATIONS — désormais la vue « Liste » de l'Agenda
       (le tableau et ses filtres sont inchangés, seul le conteneur a changé)
       ========================================================= */
    window.updateRdvFilter = function updateRdvFilter(key, val) {
      state.rdvFilters[key] = val;
      // Les filtres date/service changent la barre d'outils : on redessine la vue.
      if (["serviceId", "dateFrom", "dateTo"].includes(key)) renderAgendaMain(); else renderRdvTable();
    }
    window.resetRdvFilters = function resetRdvFilters() {
      state.rdvFilters = { status: "", search: "", serviceId: "", dateFrom: "", dateTo: "" };
      renderAgendaMain();
    }
    window.renderRdvTable = function renderRdvTable() {
      const f = state.rdvFilters;
      let rows = APPTS.filter((a) =>
        (!f.status || a.status === f.status) &&
        (!f.serviceId || a.serviceId === f.serviceId) &&
        (!f.dateFrom || a.date >= f.dateFrom) &&
        (!f.dateTo || a.date <= f.dateTo) &&
        (!f.search || a.client.toLowerCase().includes(f.search.toLowerCase()) || (a.phone || "").includes(f.search))
      ).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
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
    /**
     * Fiches clients réelles (avec leur id serveur), enrichies des rendez-vous
     * déjà chargés. L'ancienne version agrégeait par NOM ; on s'appuie désormais
     * sur `clientId`, seule clé fiable — deux homonymes ne fusionnent plus.
     */
    window.uniqueClients = function uniqueClients() {
      return CLIENTS.map((c) => ({
        id: c.id,
        name: `${c.prenom} ${c.nom}`.trim(),
        phone: c.telephone ?? "",
        email: c.email ?? "",
        dob: c.dateNaissance ? M.isoLocalDate(new Date(c.dateNaissance)) : "",
        absences: c.absences ?? 0,
        absencesRepetees: !!c.absencesRepetees,
        appts: APPTS.filter((a) => a.clientId === c.id),
      }));
    }
    window.renderClientsPage = function renderClientsPage() {
      document.getElementById("page-clients").innerHTML = `
      <div class="filter-row">
        <input type="text" placeholder="Rechercher un client…" value="${state.clientsFilters.search}" oninput="updateClientsFilter('search', this.value)" style="min-width:220px" />
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
    window.updateClientsFilter = function updateClientsFilter(key, val) { state.clientsFilters[key] = val; renderClientsContainer(); }
    window.setClientsView = function setClientsView(v) {
      state.clientsView = v;
      const toggle = document.getElementById("clientsViewToggle");
      if (toggle) toggle.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", (i === 0 && v === "list") || (i === 1 && v === "grid")));
      renderClientsContainer();
    }
    window.filteredClients = function filteredClients() {
      const f = state.clientsFilters;
      return uniqueClients().filter((c) => {
        if (f.search && !c.name.toLowerCase().includes(f.search.toLowerCase())) return false;
        const hasUpcoming = c.appts.some((a) => a.date >= TODAY && a.status === "RESERVE");
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
        const upcoming = c.appts.filter((a) => a.date >= TODAY && a.status === "RESERVE").length;
        const past = c.appts.filter((a) => a.status === "TERMINE").length;
        return `<tr class="row-clickable" onclick="openClientFiche('${c.id}')">
        <td><div class="cell-client"><div class="avatar-sm" style="background:var(--primary)">${initials(c.name)}</div><div><div class="cell-client-name">${c.name}</div><div class="cell-client-sub">${calcAge(c.dob)} ans</div></div></div></td>
        <td>${c.phone}</td><td>${c.email}</td><td>${upcoming}</td><td>${past}</td>
        <td><div class="row-actions" onclick="event.stopPropagation()"><button class="icon-btn" onclick="openClientFiche('${c.id}')">${iconEye()}</button></div></td>
      </tr>`;
      }).join("");
    }
    window.renderClientsGrid = function renderClientsGrid(clients) {
      const grid = document.getElementById("clientsGrid");
      if (!grid) return;
      if (!clients.length) { grid.innerHTML = `<div class="table-empty">Aucun client ne correspond à ces filtres</div>`; return; }
      grid.innerHTML = clients.map((c) => {
        const upcoming = c.appts.filter((a) => a.date >= TODAY && a.status === "RESERVE").length;
        const past = c.appts.filter((a) => a.status === "TERMINE").length;
        return `<div class="card" style="padding:16px;cursor:pointer;" onclick="openClientFiche('${c.id}')">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;"><div class="avatar-sm" style="width:40px;height:40px;font-size:14px;background:var(--primary)">${initials(c.name)}</div><div><div style="font-weight:700;font-size:13.5px;">${c.name}</div><div style="font-size:11px;color:var(--ink-soft)">${calcAge(c.dob)} ans</div></div></div>
        <div style="font-size:12px;color:var(--ink-soft);margin-bottom:3px;">${c.phone}</div>
        <div style="font-size:12px;color:var(--ink-soft);margin-bottom:10px;">${c.email}</div>
        <div style="display:flex;justify-content:space-between;font-size:11.5px;"><span>${upcoming} à venir</span><span>${past} passés</span></div>
      </div>`;
      }).join("");
    }
    /**
     * Fiche client (CDC II.11.2). Ouverte par identifiant serveur — l'ancienne
     * version passait par le nom, ce qui fusionnait les homonymes. Les notes
     * internes sont chargées depuis l'API à l'ouverture.
     */
    window.openClientFiche = function openClientFiche(clientId) {
      const c = uniqueClients().find((x) => x.id === clientId);
      if (!c) return;
      // La modale s'ouvre tout de suite ; les notes arrivent ensuite et remplacent
      // l'état d'attente. Attendre le réseau avant d'afficher donnait l'impression
      // que le clic n'avait rien déclenché.
      NOTES[clientId] = NOTES[clientId] || [];
      const enAttenteNotes = true;

      const history = c.appts.slice().sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
      const upcoming = history.filter((a) => a.date >= TODAY && ["RESERVE", "CLIENT_ARRIVE", "EN_COURS"].includes(a.status));
      const past = history.filter((a) => a.status === "TERMINE");
      const cancelled = history.filter((a) => a.status === "ANNULE" || a.status === "ABSENT");
      const servicesReserves = [...new Set(history.map((a) => a.service))].filter(Boolean);
      const notes = NOTES[clientId] || [];
      const prenom = c.name.split(" ")[0] || "";
      const nom = c.name.split(" ").slice(1).join(" ");
      const html = `
      <div class="modal-head">
        <div style="display:flex;align-items:center;gap:12px;"><div class="avatar-sm" style="width:42px;height:42px;font-size:15px;background:var(--primary)">${initials(c.name)}</div><div><p class="modal-title">${c.name}</p><p class="modal-sub">${c.dob ? calcAge(c.dob) + " ans · " : ""}${c.phone}</p></div></div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      ${c.absencesRepetees ? `<div class="detect-banner show" style="background:#FDEDEC;color:var(--st-annule);">${iconAlert()} Ce client totalise ${c.absences} absence(s) — information indicative.</div>` : ""}
      <div class="modal-tabs">
        <button class="active" onclick="switchClientTab(this,'rdv')">Rendez-vous</button>
        <button onclick="switchClientTab(this,'notes')">Notes internes</button>
        <button onclick="switchClientTab(this,'fiche')">Coordonnées</button>
      </div>
      <div id="clientTabRdv">
        <div class="detail-item-label" style="margin-bottom:6px;">À venir (${upcoming.length})</div>
        ${upcoming.length ? upcoming.map(rdvMiniRow).join("") : `<div class="table-empty" style="padding:14px;">Aucun</div>`}
        <div class="detail-item-label" style="margin:14px 0 6px;">Passés (${past.length})</div>
        ${past.length ? past.map(rdvMiniRow).join("") : `<div class="table-empty" style="padding:14px;">Aucun</div>`}
        <div class="detail-item-label" style="margin:14px 0 6px;">Annulés / absences (${cancelled.length})</div>
        ${cancelled.length ? cancelled.map(rdvMiniRow).join("") : `<div class="table-empty" style="padding:14px;">Aucun</div>`}
        ${servicesReserves.length ? `<div class="detail-item-label" style="margin:14px 0 6px;">Services réservés</div><div class="legend-row" style="margin-top:0;">${servicesReserves.map((sv) => `<span class="dispo-range">${sv}</span>`).join("")}</div>` : ""}
      </div>
      <div id="clientTabNotes" style="display:none">
        <div class="field-row"><textarea id="newNoteText" rows="2" placeholder="Ajouter une note interne (visible uniquement par vous)…"></textarea></div>
        <button class="btn btn-primary btn-sm" onclick="addClientNote('${clientId}')">${iconPlus()} Ajouter la note</button>
        <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px;" id="notesList">
          ${enAttenteNotes ? `<div class="table-empty">Chargement des notes…</div>` : (notes.length ? notes.map((n) => noteRowHtml(n, clientId)).join("") : `<div class="table-empty">Aucune note pour ce client</div>`)}
        </div>
      </div>
      <div id="clientTabFiche" style="display:none">
        <div class="field-2col">
          <div class="field-row"><label>Prénom</label><input type="text" id="clPrenom" value="${prenom}" /></div>
          <div class="field-row"><label>Nom</label><input type="text" id="clNom" value="${nom}" /></div>
        </div>
        <div class="field-2col">
          <div class="field-row"><label>Téléphone</label><input type="tel" id="clTel" value="${c.phone}" /></div>
          <div class="field-row"><label>E-mail</label><input type="email" id="clEmail" value="${c.email}" /></div>
        </div>
        <div class="field-row"><label>Date de naissance</label><input type="date" id="clDob" value="${c.dob}" /></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" onclick="saveClient('${clientId}')">${iconCheck()} Enregistrer</button>
          <button class="btn btn-ghost btn-sm" onclick="programmerClient('${clientId}')">${iconCal()} Programmer un rendez-vous</button>
        </div>
      </div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Fermer</button></div>
    `;
      openModal(html, true);
      rafraichirNotes(clientId).catch(() => {
        const el = document.getElementById("notesList");
        if (el) el.innerHTML = `<div class="table-empty">Notes indisponibles</div>`;
      });
    }

    /** CDC II.11.1 : « Modifier les informations d'un client ». */
    window.saveClient = async function saveClient(clientId) {
      const charge = {
        prenom: document.getElementById("clPrenom").value.trim(),
        nom: document.getElementById("clNom").value.trim(),
        telephone: document.getElementById("clTel").value.trim(),
        email: document.getElementById("clEmail").value.trim() || undefined,
        dateNaissance: document.getElementById("clDob").value || undefined,
      };
      await appel(
        professionnelApi.updateClient(clientId, charge),
        "Coordonnées du client mises à jour",
        async () => {
          await Promise.all([chargerClients(), chargerRdv()]);
          closeModal();
          renderPage(state.page);
        },
      );
    }

    /** CDC II.11.1 : « Programmer un client pour une date ». */
    window.programmerClient = function programmerClient(clientId) {
      const c = uniqueClients().find((x) => x.id === clientId);
      closeModal();
      setTimeout(() => openNewRdv(c ? { client: c } : {}), 220);
    }
    window.rdvMiniRow = function rdvMiniRow(a) { return `<div class="dash-list-row" style="padding:8px 4px;cursor:pointer;" onclick="openRdvDetail('${a.id}')"><span class="dash-list-time" style="width:auto;">${fmtDateShort(a.date)}</span><div style="flex:1"><div class="dash-list-name" style="font-size:12.5px;">${a.service}</div></div><span class="status-pill ${STATUS[a.status].cls}">${STATUS[a.status].label}</span></div>`; }
    // Trois onglets depuis le CDC II.11.2 : rendez-vous, notes internes, coordonnées.
    window.switchClientTab = function switchClientTab(btn, tab) {
      btn.parentElement.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const onglets = { rdv: "clientTabRdv", notes: "clientTabNotes", fiche: "clientTabFiche" };
      Object.entries(onglets).forEach(([cle, id]) => {
        const el = document.getElementById(id);
        if (el) el.style.display = tab === cle ? "block" : "none";
      });
    }
    window.noteRowHtml = function noteRowHtml(n, clientId) {
      return `<div class="card" style="padding:10px 14px;" data-note="${n.id}">
      <div style="font-size:12.5px;">${n.text}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
        <span style="font-size:10.5px;color:var(--ink-soft)">${n.date}</span>
        <div class="row-actions">
          <button class="icon-btn" title="Modifier" onclick="editClientNote('${clientId}','${n.id}')">${iconEdit()}</button>
          <button class="icon-btn" title="Supprimer" onclick="deleteClientNote('${clientId}','${n.id}')">${iconTrash()}</button>
        </div>
      </div>
    </div>`;
    }
    window.rafraichirNotes = async function rafraichirNotes(clientId) {
      NOTES[clientId] = (await professionnelApi.listNotes(clientId)).map((n) => ({
        id: n.id, text: n.texte, date: fmtDateShort(M.isoLocalDate(new Date(n.createdAt))),
      }));
      const el = document.getElementById("notesList");
      if (!el) return;
      el.innerHTML = NOTES[clientId].length
        ? NOTES[clientId].map((n) => noteRowHtml(n, clientId)).join("")
        : `<div class="table-empty">Aucune note pour ce client</div>`;
    }
    window.addClientNote = async function addClientNote(clientId) {
      const text = document.getElementById("newNoteText").value.trim();
      if (!text) return;
      await appel(professionnelApi.addNote(clientId, text), "Note interne ajoutée", async () => {
        document.getElementById("newNoteText").value = "";
        await rafraichirNotes(clientId);
      });
    }
    /** CDC II.12 : « Modifier une note » — édition en place, sans quitter la fiche. */
    window.editClientNote = function editClientNote(clientId, noteId) {
      const note = (NOTES[clientId] || []).find((n) => n.id === noteId);
      const carte = document.querySelector(`[data-note="${noteId}"]`);
      if (!note || !carte) return;
      carte.innerHTML = `
      <div class="field-row" style="margin-bottom:8px;"><textarea id="editNoteText" rows="2">${note.text}</textarea></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button class="btn btn-ghost btn-sm" onclick="rafraichirNotes('${clientId}')">Annuler</button>
        <button class="btn btn-primary btn-sm" onclick="saveClientNote('${clientId}','${noteId}')">${iconCheck()} Enregistrer</button>
      </div>`;
    }
    window.saveClientNote = async function saveClientNote(clientId, noteId) {
      const text = document.getElementById("editNoteText").value.trim();
      if (!text) return;
      await appel(professionnelApi.updateNote(noteId, text), "Note modifiée", () => rafraichirNotes(clientId));
    }
    window.deleteClientNote = async function deleteClientNote(clientId, noteId) {
      await appel(professionnelApi.deleteNote(noteId), "Note supprimée", () => rafraichirNotes(clientId));
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
          <button class="${state.servicesView === 'grid' ? 'active' : ''}" onclick="setServicesView('grid')" title="Vue grille">${iconGrid()}</button>
          <button class="${state.servicesView === 'list' ? 'active' : ''}" onclick="setServicesView('list')" title="Vue liste">${iconList()}</button>
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
      if (toggle) toggle.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", (i === 0 && v === "grid") || (i === 1 && v === "list")));
      renderServicesContainer();
    }
    window.filteredServices = function filteredServices() {
      const f = state.servicesFilters;
      return SERVICES.filter((s) => (!f.status || s.status === f.status) && (!f.search || s.name.toLowerCase().includes(f.search.toLowerCase())));
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
      <div class="card service-carte" style="padding:16px;">
        ${s.imageUrl ? `<div class="service-vignette"><img src="${C.esc(M.urlImage(s.imageUrl))}" alt="" loading="lazy" onerror="this.closest('.service-vignette').remove()" /></div>` : ""}
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <div style="font-weight:800;font-size:14px;">${s.name}</div>
          <span class="status-pill ${s.status === 'active' ? 'st-termine' : 'st-absent'}">${s.status === 'active' ? 'Actif' : 'Inactif'}</span>
        </div>
        <div style="font-size:12px;color:var(--ink-soft);margin-bottom:10px;min-height:32px;">${s.desc}</div>
        <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:8px;"><span>${s.duration} min</span><b>${s.price.toLocaleString('fr-FR')} DA</b></div>
        ${(s.customFields && s.customFields.length) ? `<div style="font-size:11px;color:var(--primary-dark);background:var(--primary-tint);display:inline-block;padding:2px 8px;border-radius:999px;margin-bottom:10px;">${s.customFields.length} champ${s.customFields.length > 1 ? 's' : ''} personnalisé${s.customFields.length > 1 ? 's' : ''}</div>` : `<div style="margin-bottom:10px;"></div>`}
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" style="flex:1;justify-content:center;" onclick="openServiceForm('${s.id}')">${iconEdit()} Modifier</button>
          <button class="icon-btn" title="${s.status === 'active' ? 'Désactiver' : 'Activer'}" onclick="toggleServiceStatus('${s.id}')">${s.status === 'active' ? iconX() : iconCheck()}</button>
          <button class="icon-btn" title="Supprimer" onclick="deleteService('${s.id}')">${iconTrash()}</button>
        </div>
      </div>`).join("");
    }
    window.renderServicesListBody = function renderServicesListBody(list) {
      const body = document.getElementById("servicesListBody");
      if (!body) return;
      if (!list.length) { body.innerHTML = `<tr><td colspan="6"><div class="table-empty">Aucun service ne correspond à ces filtres</div></td></tr>`; return; }
      body.innerHTML = list.map((s) => `<tr>
      <td><div class="cell-service">
        ${s.imageUrl ? `<span class="service-vignette-mini"><img src="${C.esc(M.urlImage(s.imageUrl))}" alt="" loading="lazy" onerror="this.closest('.service-vignette-mini').remove()" /></span>` : ""}
        <span><div class="cell-client-name">${s.name}</div><div class="cell-client-sub">${s.desc}</div></span>
      </div></td>
      <td>${s.duration} min</td>
      <td>${s.price.toLocaleString('fr-FR')} DA</td>
      <td>${(s.customFields && s.customFields.length) ? s.customFields.length : '—'}</td>
      <td><span class="status-pill ${s.status === 'active' ? 'st-termine' : 'st-absent'}">${s.status === 'active' ? 'Actif' : 'Inactif'}</span></td>
      <td><div class="row-actions">
        <button class="icon-btn" title="Modifier" onclick="openServiceForm('${s.id}')">${iconEdit()}</button>
        <button class="icon-btn" title="${s.status === 'active' ? 'Désactiver' : 'Activer'}" onclick="toggleServiceStatus('${s.id}')">${s.status === 'active' ? iconX() : iconCheck()}</button>
        <button class="icon-btn" title="Supprimer" onclick="deleteService('${s.id}')">${iconTrash()}</button>
      </div></td>
    </tr>`).join("");
    }
    window.toggleServiceStatus = async function toggleServiceStatus(id) {
      const s = SERVICES.find((x) => x.id === id); if (!s) return;
      const actif = s.status !== "active";
      await appel(
        professionnelApi.updateService(id, { actif }),
        `Service « ${s.name} » ${actif ? 'activé' : 'désactivé'}`,
        async () => { await chargerServices(); renderServicesContainer(); },
      );
    }
    window.deleteService = async function deleteService(id) {
      const s = SERVICES.find((x) => x.id === id); if (!s) return;
      if (!confirm(`Supprimer le service « ${s.name} » ? Les rendez-vous passés associés resteront conservés dans l'historique.`)) return;
      // Le serveur archive au lieu de supprimer si le service porte des rendez-vous
      // (CDC II.5.4) : on relaie son message plutôt que d'annoncer une suppression.
      await appel(
        professionnelApi.deleteService(id),
        null,
        async (res) => {
          showToast(res?.message || 'Service supprimé');
          await chargerServices();
          renderServicesContainer();
        },
      );
    }

    /* ---- Formulaire de service (Détails + Champs personnalisés) ---- */

    /**
     * Brouillon de l'onglet « Détails ».
     *
     * Ajouter un champ personnalisé remplace la modale, puis y revient en la
     * reconstruisant : sans ce brouillon, la saisie en cours (nom, prix, image…)
     * était perdue à chaque aller-retour.
     */
    let SV_DRAFT = null;
    window.capturerBrouillonService = function capturerBrouillonService() {
      const nom = document.getElementById("svName");
      if (!nom) return; // l'onglet Détails n'est pas monté
      SV_DRAFT = {
        name: nom.value,
        desc: document.getElementById("svDesc").value,
        duration: document.getElementById("svDuration").value,
        price: document.getElementById("svPrice").value,
        status: document.getElementById("svStatus").value,
        imageUrl: document.getElementById("svImage").value,
      };
    }

    window.openServiceForm = function openServiceForm(id, initialTab) {
      const s = id ? SERVICES.find((x) => x.id === id) : null;
      const bucket = id || "__new__";
      if (CF_SERVICE_ID !== bucket) {
        CF_DRAFT = s ? JSON.parse(JSON.stringify(s.customFields || [])) : [];
        CF_SERVICE_ID = bucket;
        SV_DRAFT = null;
      }
      // Le brouillon prime sur les valeurs enregistrées : c'est la saisie en cours.
      const v = SV_DRAFT || {
        name: s ? s.name : "",
        desc: s ? s.desc : "",
        duration: s ? s.duration : 30,
        price: s && s.price ? s.price : "",
        status: s ? s.status : "active",
        imageUrl: s ? s.imageUrl || "" : "",
      };
      const tab = initialTab === "champs" ? "champs" : "details";
      const html = `
      <div class="modal-head"><div><p class="modal-title">${s ? 'Modifier le service' : 'Ajouter un service'}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="modal-tabs">
        <button class="${tab === 'details' ? 'active' : ''}" onclick="switchServiceTab(this,'details')">Détails</button>
        <button class="${tab === 'champs' ? 'active' : ''}" onclick="switchServiceTab(this,'champs')">Champs personnalisés${CF_DRAFT.length ? ` (${CF_DRAFT.length})` : ""}</button>
      </div>
      <div id="svTabDetails" style="display:${tab === 'details' ? 'block' : 'none'}">
        <div class="field-row"><label>Nom du service</label><input type="text" id="svName" value="${v.name}" placeholder="Consultation générale" /></div>
        <div class="field-row"><label>Description</label><textarea id="svDesc" rows="2" placeholder="Description courte">${v.desc}</textarea></div>
        <div class="field-2col">
          <div class="field-row"><label>Durée (minutes)</label><input type="number" id="svDuration" value="${v.duration}" /></div>
          <div class="field-row"><label>Prix (DA)</label><input type="number" id="svPrice" value="${v.price}" placeholder="Si applicable" /></div>
        </div>
        <div class="field-row"><label>Statut</label><select id="svStatus"><option value="active" ${v.status === 'active' ? 'selected' : ''}>Actif</option><option value="inactive" ${v.status === 'inactive' ? 'selected' : ''}>Inactif</option></select></div>
        <div class="field-row">
          <label>Image du service</label>
          <div class="img-choix">
            <div class="img-apercu vide" id="svImageApercu"></div>
            <div class="img-choix-actions">
              <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('svImageFile').click()">${iconImage()} Choisir une image</button>
              <button type="button" class="btn btn-ghost btn-sm" onclick="retirerImageService()">Retirer</button>
            </div>
          </div>
          <input type="file" id="svImageFile" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none" onchange="televerserImageService(this)" />
          <input type="url" id="svImage" value="${v.imageUrl}" placeholder="https://… ou choisissez un fichier" oninput="rafraichirApercuService()" />
          <div class="field-hint">JPEG, PNG, WebP ou GIF, 4 Mo maximum. Vous pouvez aussi coller l'adresse d'une image hébergée ailleurs.</div>
        </div>
      </div>
      <div id="svTabChamps" style="display:${tab === 'champs' ? 'block' : 'none'}">
        <div class="field-hint" style="margin-bottom:12px;">Ces champs apparaissent dans le formulaire de réservation du client, à l'étape « Options spécifiques ». Ce que vous configurez ici est ce que le client voit.</div>
        <div id="cfList"></div>
        <button class="btn btn-ghost btn-sm" style="margin-top:4px;" onclick="openFieldEditor()">${iconPlus()} Ajouter un champ</button>
      </div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveService('${id || ''}')">${iconCheck()} Enregistrer</button></div>
    `;
      openModal(html, true);
      renderCFList();
      rafraichirApercuService();
    }

    /**
     * Aperçu de l'image du service. Construit par le DOM et non par une chaîne :
     * l'adresse vient de l'utilisateur, l'insérer dans du HTML la laisserait
     * s'échapper de l'attribut.
     */
    window.rafraichirApercuService = function rafraichirApercuService() {
      const boite = document.getElementById("svImageApercu");
      if (!boite) return;
      const adresse = (document.getElementById("svImage")?.value || "").trim();
      boite.innerHTML = "";
      boite.classList.toggle("vide", !adresse);
      if (!adresse) return;
      const img = document.createElement("img");
      img.alt = "";
      img.addEventListener("error", () => { boite.innerHTML = ""; boite.classList.add("vide", "cassee"); });
      img.addEventListener("load", () => boite.classList.remove("cassee"));
      img.src = M.urlImage(adresse);
      boite.appendChild(img);
    }

    /**
     * Téléverse le fichier choisi et renseigne l'adresse renvoyée par le serveur.
     * La taille est contrôlée avant l'envoi : inutile de faire monter 20 Mo pour
     * se faire refuser à l'arrivée.
     */
    window.televerserImageService = async function televerserImageService(champFichier) {
      const fichier = champFichier.files && champFichier.files[0];
      champFichier.value = "";           // pour pouvoir re-choisir le même fichier
      if (!fichier) return;
      if (fichier.size > 4 * 1024 * 1024) { showToast("Image trop lourde : 4 Mo maximum"); return; }

      const boite = document.getElementById("svImageApercu");
      boite?.classList.add("chargement");
      try {
        const { url } = await professionnelApi.uploadImage(fichier);
        const champ = document.getElementById("svImage");
        if (champ) champ.value = url;
        rafraichirApercuService();
        showToast("Image ajoutée");
      } catch (err) {
        showToast(M.messageErreur(err, "Le téléversement de l'image a échoué."));
      } finally {
        boite?.classList.remove("chargement");
      }
    }

    window.retirerImageService = function retirerImageService() {
      const champ = document.getElementById("svImage");
      if (champ) champ.value = "";
      rafraichirApercuService();
    }

    window.switchServiceTab = function switchServiceTab(btn, tab) {
      btn.parentElement.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("svTabDetails").style.display = tab === "details" ? "block" : "none";
      document.getElementById("svTabChamps").style.display = tab === "champs" ? "block" : "none";
    }

    /* ---- Liste des champs personnalisés du service en cours d'édition ---- */
    window.cfFieldLabel = function cfFieldLabel(f) { return (f && f.label) ? f.label : "(Sans nom)"; }
    window.cfTypeLabel = function cfTypeLabel(t) { const ft = FIELD_TYPES.find((x) => x.value === t); return ft ? ft.label : t; }
    window.renderCFList = function renderCFList() {
      const el = document.getElementById("cfList");
      if (!el) return;
      if (!CF_DRAFT.length) { el.innerHTML = `<div class="table-empty">Aucun champ personnalisé — le client ne voit que le formulaire standard.</div>`; return; }
      el.innerHTML = CF_DRAFT.map((f) => {
        const condCount = (f.conditions || []).length;
        return `<div class="card" style="padding:12px 14px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div>
            <div style="font-weight:700;font-size:13px;">${cfFieldLabel(f)} ${f.required ? '<span class="status-pill st-annule" style="margin-left:6px;">Obligatoire</span>' : ''}</div>
            <div style="font-size:11.5px;color:var(--ink-soft);margin-top:3px;">${cfTypeLabel(f.type)}${condCount ? ` · Condition${condCount > 1 ? 's' : ''} (${f.conditionLogic || 'ET'})` : ' · Toujours visible'}</div>
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
      CF_DRAFT.forEach((f) => { f.conditions = (f.conditions || []).filter((c) => c.fieldId !== fieldId); });
      renderCFList();
      const badgeTabBtn = document.querySelector(".modal-tabs button:nth-child(2)");
      if (badgeTabBtn) badgeTabBtn.textContent = `Champs personnalisés${CF_DRAFT.length ? ` (${CF_DRAFT.length})` : ""}`;
    }
    window.returnToServiceForm = function returnToServiceForm() {
      openServiceForm(CF_SERVICE_ID === "__new__" ? undefined : CF_SERVICE_ID, "champs");
    }

    /* ---- Éditeur d'un champ (label, type, obligatoire, options, condition) ---- */
    window.openFieldEditor = function openFieldEditor(fieldId) {
      // On quitte la modale du service : mémoriser la saisie avant qu'elle disparaisse.
      capturerBrouillonService();
      const existing = fieldId ? CF_DRAFT.find((x) => x.id === fieldId) : null;
      CF_EDIT_DRAFT = existing ? JSON.parse(JSON.stringify(existing)) : {
        id: uid("cf"), label: "", type: "texte_court", required: false, options: [], defaultValue: "", helpText: "",
        conditions: [], conditionLogic: "ET", requiredIfCondition: false,
      };
      renderFieldEditorModal();
    }
    window.renderFieldEditorModal = function renderFieldEditorModal() {
      const f = CF_EDIT_DRAFT;
      const isEditing = CF_DRAFT.some((x) => x.id === f.id);
      const otherFields = CF_DRAFT.filter((x) => x.id !== f.id);
      const conditions = f.conditions || [];
      const html = `
      <div class="modal-head"><div><p class="modal-title">${isEditing ? 'Modifier le champ' : 'Nouveau champ'}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-row"><label>Label (nom affiché au client)</label><input type="text" id="cfLabel" value="${f.label}" oninput="updateCFDraft('label', this.value)" placeholder="Ex. Type de véhicule" /></div>
      <div class="field-2col">
        <div class="field-row"><label>Type de champ</label><select id="cfType" onchange="onCFTypeChange(this.value)">${FIELD_TYPES.map((t) => `<option value="${t.value}" ${f.type === t.value ? 'selected' : ''}>${t.label}</option>`).join("")}</select></div>
        <div class="field-row"><label>Obligatoire</label><select onchange="updateCFDraft('required', this.value==='oui')"><option value="non" ${!f.required ? 'selected' : ''}>Facultatif</option><option value="oui" ${f.required ? 'selected' : ''}>Obligatoire</option></select></div>
      </div>
      <div id="cfOptionsWrap" style="display:${HAS_OPTIONS_TYPES.includes(f.type) ? 'block' : 'none'}">
        <div class="field-row"><label>Options (une par ligne, définies librement)</label><textarea id="cfOptions" rows="3" oninput="updateCFDraft('options', this.value.split('\\n').map(s=>s.trim()).filter(Boolean))" placeholder="Option A">${(f.options || []).join("\n")}</textarea></div>
      </div>
      <div class="field-row"><label>Valeur par défaut (optionnel)</label><input type="text" value="${f.defaultValue || ''}" oninput="updateCFDraft('defaultValue', this.value)" /></div>
      <div class="field-row"><label>Texte d'aide (optionnel)</label><input type="text" value="${f.helpText || ''}" oninput="updateCFDraft('helpText', this.value)" /></div>
      <div class="card" style="padding:14px;margin-top:6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${conditions.length ? '10px' : '0'};">
          <div style="font-weight:700;font-size:12.5px;">Condition d'affichage (facultatif)</div>
          <button class="btn btn-ghost btn-sm" onclick="addCFCondition()" ${!otherFields.length ? 'disabled title="Créez d\'abord un autre champ pour ce service"' : ''}>${iconPlus()} Ajouter une condition</button>
        </div>
        ${conditions.length > 1 ? `<div class="field-row" style="margin:8px 0;"><label>Logique entre les conditions</label><select onchange="updateCFDraft('conditionLogic', this.value)"><option value="ET" ${f.conditionLogic !== 'OU' ? 'selected' : ''}>ET — toutes les conditions</option><option value="OU" ${f.conditionLogic === 'OU' ? 'selected' : ''}>OU — au moins une condition</option></select></div>` : ""}
        <div id="cfConditionsList">${conditions.length ? conditions.map((c, i) => cfConditionRowHtml(c, i, otherFields)).join("") : `<div class="field-hint">Sans condition, ce champ est toujours visible côté client.</div>`}</div>
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
      const refField = otherFields.find((x) => x.id === c.fieldId) || otherFields[0];
      let valueInput;
      if (refField && refField.type === "switch") {
        valueInput = `<select onchange="updateCFCondition(${i},'value',this.value)"><option value="oui" ${c.value === 'oui' ? 'selected' : ''}>Oui</option><option value="non" ${c.value === 'non' ? 'selected' : ''}>Non</option></select>`;
      } else if (refField && HAS_OPTIONS_TYPES.includes(refField.type)) {
        valueInput = `<select onchange="updateCFCondition(${i},'value',this.value)">${(refField.options || []).map((o) => `<option value="${o}" ${c.value === o ? 'selected' : ''}>${o}</option>`).join("")}</select>`;
      } else {
        valueInput = `<input type="text" value="${c.value || ''}" oninput="updateCFCondition(${i},'value',this.value)" placeholder="Valeur" />`;
      }
      return `<div class="field-2col" style="margin-bottom:8px;align-items:end;">
      <div class="field-row" style="margin-bottom:0"><label>Si</label><select onchange="updateCFCondition(${i},'fieldId',this.value)">${otherFields.map((o) => `<option value="${o.id}" ${(c.fieldId === o.id) ? 'selected' : ''}>${cfFieldLabel(o)}</option>`).join("")}</select></div>
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
      CF_EDIT_DRAFT.conditions.push({ fieldId: ref.id, value: ref.type === "switch" ? "oui" : ((ref.options || [])[0] || "") });
      renderFieldEditorModal();
    }
    window.removeCFCondition = function removeCFCondition(i) { CF_EDIT_DRAFT.conditions.splice(i, 1); renderFieldEditorModal(); }
    window.updateCFCondition = function updateCFCondition(i, key, val) {
      CF_EDIT_DRAFT.conditions[i][key] = val;
      if (key === "fieldId") {
        const otherFields = CF_DRAFT.filter((x) => x.id !== CF_EDIT_DRAFT.id);
        const ref = otherFields.find((x) => x.id === val);
        CF_EDIT_DRAFT.conditions[i].value = ref && ref.type === "switch" ? "oui" : ((ref && ref.options && ref.options[0]) || "");
        renderFieldEditorModal();
      }
    }
    window.saveCFField = function saveCFField() {
      if (!CF_EDIT_DRAFT.label || !CF_EDIT_DRAFT.label.trim()) { showToast("Le label du champ est requis"); return; }
      if (HAS_OPTIONS_TYPES.includes(CF_EDIT_DRAFT.type) && !(CF_EDIT_DRAFT.options || []).length) { showToast("Ajoutez au moins une option pour ce type de champ"); return; }
      const idx = CF_DRAFT.findIndex((x) => x.id === CF_EDIT_DRAFT.id);
      if (idx >= 0) CF_DRAFT[idx] = CF_EDIT_DRAFT; else CF_DRAFT.push(CF_EDIT_DRAFT);
      showToast(`Champ « ${CF_EDIT_DRAFT.label} » enregistré`);
      returnToServiceForm();
    }

    /** Un id venu du serveur est un UUID ; ceux du brouillon local ne le sont pas. */
    window.estIdServeur = function estIdServeur(id) {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ""));
    }

    /**
     * Synchronise les champs personnalisés du brouillon avec le backend :
     * création, modification, suppression. Les conditions référencent des ids de
     * champs — pour un champ tout juste créé, l'id local doit être remplacé par
     * l'id serveur, d'où la seconde passe.
     */
    window.syncChampsPersonnalises = async function syncChampsPersonnalises(serviceId) {
      const existants = await professionnelApi.listChamps(serviceId);
      const gardes = new Set(CF_DRAFT.map((f) => f.id));

      for (const c of existants) {
        if (!gardes.has(c.id)) await professionnelApi.deleteChamp(c.id);
      }

      const idsLocaux = {};
      for (let i = 0; i < CF_DRAFT.length; i++) {
        const f = { ...CF_DRAFT[i], ordre: i };
        // Les conditions sont posées à la seconde passe, une fois tous les ids connus.
        const charge = M.champVersAPI({ ...f, conditions: [] }, serviceId);
        if (estIdServeur(f.id)) {
          await professionnelApi.updateChamp(f.id, charge);
          idsLocaux[f.id] = f.id;
        } else {
          const cree = await professionnelApi.createChamp(charge);
          idsLocaux[f.id] = cree.id;
        }
      }

      for (const f of CF_DRAFT) {
        if (!(f.conditions || []).length) continue;
        const conditions = f.conditions
          .map((c) => ({ fieldId: idsLocaux[c.fieldId] ?? c.fieldId, value: c.value }))
          .filter((c) => estIdServeur(c.fieldId));
        await professionnelApi.updateChamp(idsLocaux[f.id], {
          conditions: conditions.map((c) => ({ champId: c.fieldId, valeur: String(c.value ?? "") })),
          conditionLogique: f.conditionLogic ?? "ET",
          requisSiCondition: !!f.requiredIfCondition,
        });
      }
    }

    window.saveService = async function saveService(id) {
      const nameEl = document.getElementById("svName");
      const name = nameEl ? nameEl.value.trim() : "";
      if (!name) {
        showToast("Le nom du service est requis");
        const tabBtn = document.querySelector(".modal-tabs button");
        if (tabBtn) switchServiceTab(tabBtn, "details");
        return;
      }
      const duration = parseInt(document.getElementById("svDuration").value, 10) || 30;
      if (duration < 5) { showToast("La durée minimale d'un service est de 5 minutes"); return; }

      const data = M.serviceVersAPI({
        name,
        desc: document.getElementById("svDesc").value.trim(),
        duration,
        price: parseInt(document.getElementById("svPrice").value, 10) || 0,
        imageUrl: (document.getElementById("svImage")?.value || "").trim(),
        status: document.getElementById("svStatus").value,
      });

      // Enregistrer un service synchronise aussi ses champs personnalisés : la
      // suite d'appels peut durer quelques secondes. On verrouille le bouton pour
      // éviter un double envoi et signaler que le traitement est en cours.
      const bouton = document.querySelector('.modal-actions .btn-primary');
      const libelle = bouton ? bouton.innerHTML : null;
      if (bouton) { bouton.disabled = true; bouton.innerHTML = 'Enregistrement…'; }
      try {
        const service = id
          ? await professionnelApi.updateService(id, data)
          : await professionnelApi.createService(data);
        await syncChampsPersonnalises(service.id);
        CF_DRAFT = []; CF_SERVICE_ID = null; SV_DRAFT = null;
        await chargerServices();
        closeModal();
        renderServicesContainer();
        showToast(`Service « ${name} » ${id ? 'modifié' : 'ajouté'}`);
      } catch (err) {
        if (bouton) { bouton.disabled = false; bouton.innerHTML = libelle; }
        showToast(M.messageErreur(err));
      }
    }

    /* =========================================================
       DISPONIBILITÉS & INDISPONIBILITÉS — panneau intégré à l'Agenda
       (plus de page séparée : même contenu, même logique, autre emplacement)
       ========================================================= */
    window.dispoPanelHtml = function dispoPanelHtml() {
      const days = Object.keys(AVAILABILITY);
      return `
      <div class="card agenda-dispo-panel">
        <div class="card-head">
          <h3>${iconClock()} Disponibilités &amp; indisponibilités</h3>
          <button class="icon-btn" title="Fermer le panneau" onclick="toggleDispoPanel()">${svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', 15)}</button>
        </div>
        <div class="dispo-panel-body">
          <div>
            <div class="dispo-panel-title">Jours et horaires disponibles</div>
            ${days.map((d) => {
        const info = AVAILABILITY[d];
        return `<div class="dispo-day-row">
                <label class="dispo-day-label">
                  <input type="checkbox" ${info.on ? 'checked' : ''} onchange="toggleDayOn('${d}', this.checked)" /> ${d}
                </label>
                <div class="dispo-day-ranges">
                  ${info.on ? (info.ranges.map((r) => `<span class="dispo-range">${r.start} – ${r.end}</span>`).join("") || `<span class="dispo-none">Aucun horaire défini</span>`) : `<span class="dispo-none">Fermé</span>`}
                </div>
                ${info.on ? `<button class="btn btn-ghost btn-sm" onclick="editDayRanges('${d}')">${iconEdit()} Modifier</button>` : ""}
              </div>`;
      }).join("")}
            <button class="btn btn-ghost btn-sm" style="margin-top:12px;" onclick="openDispoQuickForm()">${iconPlus()} Ajouter une disponibilité</button>
          </div>
          <div>
            <div class="dispo-panel-title">Indisponibilités</div>
            <button class="btn btn-ghost btn-sm" style="margin-bottom:12px;" onclick="openIndispoForm()">${iconPlus()} Bloquer une période</button>
            <table class="data-table"><thead><tr><th>Type</th><th>Du</th><th>Au</th><th>Motif</th><th>Notifiés</th><th></th></tr></thead>
            <tbody>${INDISPOS.length ? INDISPOS.map((i) => `<tr><td style="text-transform:capitalize">${i.type}</td><td>${fmtDateShort(i.start)}</td><td>${fmtDateShort(i.end)}</td><td>${i.motif}</td><td>${i.notified ? `<span class="status-pill st-termine">Oui</span>` : `<button class="btn btn-ghost btn-sm" onclick="notifyClientsIndispo('${i.id}')">Notifier</button>`}</td><td><button class="icon-btn" title="Rouvrir la période" onclick="removeIndispo('${i.id}')">${iconTrash()}</button></td></tr>`).join("") : `<tr><td colspan="6"><div class="table-empty">Aucune indisponibilité programmée</div></td></tr>`}</tbody></table>
          </div>
        </div>
      </div>`;
    }
    /** Recharge le planning depuis le serveur puis rafraîchit panneau et calendrier. */
    window.refreshDispoPanel = async function refreshDispoPanel() {
      await Promise.all([chargerDispos(), chargerIndispos(), chargerRdv()]);
      if (state.page === "agenda") renderAgenda();
    }

    /**
     * Ouvrir/fermer un jour. Le backend n'a pas de notion de « jour actif » :
     * fermer un jour revient à supprimer ses plages, l'ouvrir à en créer une par
     * défaut que le professionnel ajuste ensuite.
     */
    window.toggleDayOn = async function toggleDayOn(day, checked) {
      const jour = M.JOURS.indexOf(day);
      const info = AVAILABILITY[day];
      try {
        if (checked) {
          if (!info.ranges.length) {
            await professionnelApi.addDisponibilite({ jourSemaine: jour, heureDebut: "09:00", heureFin: "17:00" });
          }
        } else {
          for (const r of info.ranges) await professionnelApi.removeDisponibilite(r.id);
        }
        await refreshDispoPanel();
        showToast(`${day} ${checked ? 'ouvert (09:00 – 17:00)' : 'fermé'}`);
      } catch (err) {
        showToast(M.messageErreur(err));
        await refreshDispoPanel();
      }
    }
    /** Ajout rapide d'une disponibilité depuis le menu « + Ajouter » de l'Agenda. */
    window.openDispoQuickForm = function openDispoQuickForm() {
      const days = Object.keys(AVAILABILITY);
      const suggested = dayNameOf(state.agendaDate);
      const html = `
      <div class="modal-head"><div><p class="modal-title">Ajouter une disponibilité</p><p class="modal-sub">Ouvrez une plage horaire à la réservation en ligne</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-row"><label>Jour</label><select id="qdDay">${days.map((d) => `<option value="${d}" ${d === suggested ? 'selected' : ''}>${d}</option>`).join("")}</select></div>
      <div class="field-2col">
        <div class="field-row"><label>Heure de début</label><input type="time" id="qdStart" value="09:00" /></div>
        <div class="field-row"><label>Heure de fin</label><input type="time" id="qdEnd" value="12:00" /></div>
      </div>
      <div class="field-error" id="qdError">L'heure de fin doit être postérieure à l'heure de début.</div>
      <div class="field-hint">La plage s'ajoute à celles déjà définies pour ce jour ; vous pouvez en ajouter plusieurs par journée.</div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveDispoQuick()">${iconCheck()} Ajouter la disponibilité</button></div>
    `;
      openModal(html);
    }
    window.saveDispoQuick = async function saveDispoQuick() {
      const day = document.getElementById("qdDay").value;
      const start = document.getElementById("qdStart").value;
      const end = document.getElementById("qdEnd").value;
      if (!start || !end || end <= start) { document.getElementById("qdError").classList.add("show"); return; }
      try {
        await professionnelApi.addDisponibilite({ jourSemaine: M.JOURS.indexOf(day), heureDebut: start, heureFin: end });
        state.dispoPanelOpen = true;
        closeModal();
        await refreshDispoPanel();
        showToast(`Disponibilité ajoutée — ${day} ${start} à ${end}`);
      } catch (err) {
        showToast(M.messageErreur(err));
      }
    }
    window.editDayRanges = function editDayRanges(day) {
      const info = AVAILABILITY[day];
      const html = `
      <div class="modal-head"><div><p class="modal-title">Horaires — ${day}</p><p class="modal-sub">Modifiez, ajoutez ou supprimez les plages de ce jour</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div id="rangesList">${info.ranges.map((r, i) => rangeRowHtml(r, i)).join("") || `<div class="field-hint" id="noRangeHint">Aucun horaire — ajoutez une plage.</div>`}</div>
      <button class="btn btn-ghost btn-sm" style="margin-top:8px;" onclick="addRangeRow('${day}')">${iconPlus()} Ajouter une plage</button>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="saveDayRanges('${day}')">${iconCheck()} Enregistrer</button></div>
    `;
      openModal(html);
    }
    // `data-id` porte l'identifiant serveur de la plage : c'est lui qui permet de
    // distinguer une modification d'un ajout au moment d'enregistrer.
    window.rangeRowHtml = function rangeRowHtml(r, i) { return `<div class="range-row" data-idx="${i}" data-id="${r.id || ''}"><input type="time" value="${r.start}" class="rangeStart" /><span class="range-sep">à</span><input type="time" value="${r.end}" class="rangeEnd" /><button class="icon-btn" title="Supprimer cette plage" onclick="removeRangeRow(this)">${iconTrash()}</button></div>`; }
    window.addRangeRow = function addRangeRow(day) {
      const hint = document.getElementById("noRangeHint"); if (hint) hint.remove();
      document.getElementById("rangesList").insertAdjacentHTML("beforeend", rangeRowHtml({ start: "09:00", end: "12:00" }, 99));
    }
    window.removeRangeRow = function removeRangeRow(btn) {
      const row = btn.closest(".range-row"); if (row) row.remove();
      const list = document.getElementById("rangesList");
      if (list && !list.querySelector(".range-row")) list.innerHTML = `<div class="field-hint" id="noRangeHint">Aucun horaire — ajoutez une plage.</div>`;
    }
    window.saveDayRanges = async function saveDayRanges(day) {
      const jour = M.JOURS.indexOf(day);
      const rows = Array.from(document.querySelectorAll("#rangesList .range-row"))
        .map((r) => ({
          id: r.dataset.id || null,
          start: r.querySelector(".rangeStart").value,
          end: r.querySelector(".rangeEnd").value,
        }))
        .filter((r) => r.start && r.end && r.end > r.start);

      const avant = AVAILABILITY[day].ranges;
      const gardes = new Set(rows.map((r) => r.id).filter(Boolean));
      try {
        for (const r of avant) {
          if (!gardes.has(r.id)) await professionnelApi.removeDisponibilite(r.id);
        }
        for (const r of rows) {
          if (r.id) {
            const initial = avant.find((x) => x.id === r.id);
            if (!initial || initial.start !== r.start || initial.end !== r.end) {
              await professionnelApi.updateDisponibilite(r.id, { heureDebut: r.start, heureFin: r.end });
            }
          } else {
            await professionnelApi.addDisponibilite({ jourSemaine: jour, heureDebut: r.start, heureFin: r.end });
          }
        }
        closeModal();
        await refreshDispoPanel();
        showToast(`Horaires du ${day} mis à jour`);
      } catch (err) {
        showToast(M.messageErreur(err));
        await refreshDispoPanel();
      }
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
    window.saveIndispo = async function saveIndispo() {
      const TYPES = { creneau: "CRENEAU", jour: "JOURNEE", periode: "PERIODE" };
      const type = TYPES[document.getElementById("inType").value] || "PERIODE";
      const start = document.getElementById("inStart").value;
      const end = document.getElementById("inEnd").value;
      const motif = document.getElementById("inMotif").value;
      if (!start || !end || end < start) { showToast("La date de fin doit suivre la date de début"); return; }
      try {
        // Le serveur annule lui-même les rendez-vous couverts et renvoie leur nombre.
        const res = await professionnelApi.addIndisponibilite({
          type,
          dateDebut: new Date(start + "T00:00:00").toISOString(),
          dateFin: new Date(end + "T00:00:00").toISOString(),
          motif,
        });
        state.dispoPanelOpen = true;
        closeModal();
        await Promise.all([refreshDispoPanel(), chargerNotifs()]);
        showToast(`Période fermée${res.rendezVousAnnules ? ` — ${res.rendezVousAnnules} rendez-vous annulé(s)` : ""}`);
      } catch (err) {
        showToast(M.messageErreur(err));
      }
    }
    window.notifyClientsIndispo = async function notifyClientsIndispo(id) {
      await appel(
        professionnelApi.notifierIndisponibilite(id),
        null,
        async (res) => { showToast(res?.message || "Clients notifiés"); await refreshDispoPanel(); },
      );
    }
    window.removeIndispo = async function removeIndispo(id) {
      const i = INDISPOS.find((x) => x.id === id);
      if (i && !confirm(`Rouvrir la période du ${fmtDateShort(i.start)} au ${fmtDateShort(i.end)} ?`)) return;
      await appel(
        professionnelApi.removeIndisponibilite(id),
        "Période rouverte à la réservation",
        async () => { await refreshDispoPanel(); },
      );
    }

    /* =========================================================
       PAGE : RÉCEPTIONNISTES
       ========================================================= */
    window.renderReceptionnistesPage = function renderReceptionnistesPage() {
      document.getElementById("page-receptionnistes").innerHTML = `
      <div class="section-tabs"><span class="section-tab active">${iconUsers()} Réceptionnistes (${RECEPTIONNISTES.length})</span></div>
      <div class="filter-row">
        <input type="text" placeholder="Rechercher une réceptionniste…" oninput="updateReceptionnistesFilter('search', this.value)" style="min-width:220px" />
        <select onchange="updateReceptionnistesFilter('status', this.value)">
          <option value="">Tous les statuts</option>
          <option value="active">Active</option>
          <option value="inactive">Désactivée</option>
        </select>
        <div class="view-toggle" id="receptionnistesViewToggle" style="margin-left:auto">
          <button class="${state.receptionnistesView === 'list' ? 'active' : ''}" onclick="setReceptionnistesView('list')" title="Vue liste">${iconList()}</button>
          <button class="${state.receptionnistesView === 'grid' ? 'active' : ''}" onclick="setReceptionnistesView('grid')" title="Vue grille">${iconGrid()}</button>
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
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;"><div class="avatar-sm" style="width:40px;height:40px;font-size:14px;background:#E2478A">${initials(r.name)}</div><div><div style="font-weight:700;font-size:13.5px;">${r.name}</div><span class="status-pill ${r.active ? 'st-termine' : 'st-absent'}">${r.active ? 'Active' : 'Désactivée'}</span></div></div>
          <div style="font-size:12px;color:var(--ink-soft);margin-bottom:3px;">${r.email}</div>
          <div style="font-size:12px;color:var(--ink-soft);margin-bottom:10px;">${r.phone}</div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm" style="flex:1;justify-content:center;" onclick="openPermsForm('${r.id}')">${iconEdit()} Autorisations</button>
            <button class="icon-btn" title="${r.active ? 'Désactiver son accès à votre espace' : 'Réactiver son accès'}" onclick="toggleReceptionniste('${r.id}')">${r.active ? iconX() : iconCheck()}</button>
            <button class="icon-btn" title="Retirer de votre espace" onclick="retirerReceptionniste('${r.id}')">${iconTrash()}</button>
          </div>
        </div>`).join("") : `<div class="table-empty">Aucune réceptionniste ne correspond à ces filtres</div>`}</div>`;
      } else {
        wrap.innerHTML = `<div class="card"><table class="data-table">
        <thead><tr><th>Réceptionniste</th><th>E-mail</th><th>Téléphone</th><th>Statut</th><th>Autorisations</th><th></th></tr></thead>
        <tbody>${list.length ? list.map((r) => `<tr>
          <td><div class="cell-client"><div class="avatar-sm" style="background:#E2478A">${initials(r.name)}</div><div class="cell-client-name">${r.name}</div></div></td>
          <td>${r.email}</td><td>${r.phone}</td>
          <td><span class="status-pill ${r.active ? 'st-termine' : 'st-absent'}">${r.active ? 'Active' : 'Désactivée'}</span></td>
          <td style="font-size:11px;color:var(--ink-soft);">${Object.entries(r.perms).filter(([, v]) => v).map(([k]) => permLabel(k)).join(", ") || "Aucune"}</td>
          <td><div class="row-actions">
            <button class="btn btn-ghost btn-sm" onclick="openPermsForm('${r.id}')">${iconEdit()} Autorisations</button>
            <button class="icon-btn" title="${r.active ? 'Désactiver son accès à votre espace' : 'Réactiver son accès'}" onclick="toggleReceptionniste('${r.id}')">${r.active ? iconX() : iconCheck()}</button>
            <button class="icon-btn" title="Retirer de votre espace" onclick="retirerReceptionniste('${r.id}')">${iconTrash()}</button>
          </div></td>
        </tr>`).join("") : `<tr><td colspan="6"><div class="table-empty">Aucune réceptionniste ne correspond à ces filtres</div></td></tr>`}</tbody>
      </table></div>`;
      }
    }
    window.permLabel = function permLabel(k) { return { agenda: "Consulter l'agenda", gererRdv: "Gérer les rendez-vous", gererPlanning: "Gérer le planning détaillé", gererParametres: "Gérer les paramètres" }[k] || k; }
    window.toggleReceptionniste = async function toggleReceptionniste(id) {
      const r = RECEPTIONNISTES.find((x) => x.id === id); if (!r) return;
      await appel(
        professionnelApi.setReceptionnisteActive(id, !r.active),
        `${r.name} ${!r.active ? 'activée' : 'désactivée'}`,
        async () => { await chargerEquipe(); renderReceptionnistesContainer(); },
      );
    }
    /** CDC II.13.1 : retirer une réceptionniste de son espace (le compte est conservé). */
    window.retirerReceptionniste = async function retirerReceptionniste(id) {
      const r = RECEPTIONNISTES.find((x) => x.id === id); if (!r) return;
      if (!confirm(`Retirer ${r.name} de votre espace ? Son compte est conservé, mais elle n'aura plus accès à votre agenda.`)) return;
      await appel(
        professionnelApi.retirerReceptionniste(id),
        `${r.name} retirée de votre espace`,
        async () => { await chargerEquipe(); renderReceptionnistesContainer(); },
      );
    }
    window.openPermsForm = function openPermsForm(id) {
      const r = RECEPTIONNISTES.find((x) => x.id === id); if (!r) return;
      const perms = ["agenda", "gererRdv", "gererPlanning", "gererParametres"];
      const html = `
      <div class="modal-head"><div><p class="modal-title">Autorisations — ${r.name}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      ${perms.map((k) => `<label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);font-size:13px;"><input type="checkbox" id="perm_${k}" ${r.perms[k] ? 'checked' : ''} /> ${permLabel(k)}</label>`).join("")}
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="savePerms('${id}')">${iconCheck()} Enregistrer</button></div>
    `;
      openModal(html);
    }
    window.savePerms = async function savePerms(id) {
      const r = RECEPTIONNISTES.find((x) => x.id === id); if (!r) return;
      const charge = {};
      ["agenda", "gererRdv", "gererPlanning", "gererParametres"].forEach((k) => {
        charge[M.PERM_VERS_API[k]] = document.getElementById("perm_" + k).checked;
      });
      await appel(
        professionnelApi.updatePermissions(id, charge),
        "Autorisations mises à jour",
        async () => { closeModal(); await chargerEquipe(); renderReceptionnistesContainer(); },
      );
    }

    /* =========================================================
       PAGE : STATISTIQUES
       ========================================================= */
    /**
     * Statistiques calculées par le serveur (CDC II.18), avec les périodes jour /
     * semaine / mois / année / personnalisée. Le taux d'occupation est le rapport
     * minutes réservées / minutes ouvertes — non plus un ratio de terminés.
     */
    window.renderStatsPage = async function renderStatsPage() {
      const cible = document.getElementById("page-stats");
      const p = state.statsFilters;
      cible.innerHTML = `<div class="card"><div class="table-empty">Calcul des statistiques…</div></div>`;
      try { await chargerStats(p.periode, p.du, p.au); }
      catch (err) { cible.innerHTML = `<div class="card"><div class="table-empty">${M.messageErreur(err)}</div></div>`; return; }

      const s = STATS;
      const serie = s.serie || { pas: "jour", points: [] };
      const PERIODES = [["jour", "Aujourd'hui"], ["semaine", "Cette semaine"], ["mois", "Ce mois"], ["annee", "Cette année"], ["toutes", "Toutes périodes"], ["personnalisee", "Période personnalisée"]];

      // Les compteurs sont des nombres de tête : des tuiles, pas un graphique.
      const TUILES = [
        ["Rendez-vous", s.total], ["Terminés", s.termines], ["Annulés", s.annules],
        ["Absences", s.absents], ["Nouveaux clients", s.nouveauxClients], ["Clients total", s.nbClients],
      ];

      cible.innerHTML = `
      <div class="filter-row">
        <select onchange="setStatsPeriode(this.value)">
          ${PERIODES.map(([v, l]) => `<option value="${v}" ${p.periode === v ? 'selected' : ''}>${l}</option>`).join("")}
        </select>
        ${p.periode === 'personnalisee' ? `
          <input type="date" value="${p.du || ''}" onchange="setStatsBorne('du', this.value)" />
          <input type="date" value="${p.au || ''}" onchange="setStatsBorne('au', this.value)" />` : ""}
      </div>

      <div class="stat-grid">
        ${TUILES.map(([l, v]) => `<div class="stat-card"><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div>`).join("")}
      </div>

      <div class="gr-grille">
        <div class="card gr-carte">
          <div class="card-head"><h3>Évolution des rendez-vous</h3>
            <span class="gr-sous-titre">${serie.pas === "mois" ? "par mois" : "par jour"}</span></div>
          <div class="gr-corps">
            ${C.aireEvolution(serie.points, serie.pas)}
            ${C.tableauDonnees(["Période", "Rendez-vous", "Terminés"],
              serie.points.map((pt) => [C.libelleDate(pt.date, serie.pas), pt.total, pt.termines]))}
          </div>
        </div>

        <div class="card gr-carte">
          <div class="card-head"><h3>Taux d'occupation</h3>
            <span class="gr-sous-titre">disponibilités utilisées</span></div>
          <div class="gr-corps">${C.jaugeOccupation(s.tauxOccupation)}</div>
        </div>

        <div class="card gr-carte gr-pleine">
          <div class="card-head"><h3>Services les plus réservés</h3>
            <span class="gr-sous-titre">hors rendez-vous annulés</span></div>
          <div class="gr-corps">
            ${C.barresServices(s.parService)}
            ${C.tableauDonnees(["Service", "Réservations"], s.parService.map((x) => [x.nom, x.count]))}
          </div>
        </div>
      </div>

      <div class="field-hint" style="margin-top:12px;">Les rendez-vous annulés ne sont pas comptés comme terminés.</div>
    `;
      brancherSurvolGraphiques(cible);
    }

    /**
     * Couche de survol commune aux graphiques : elle ne fait qu'enrichir, jamais
     * conditionner — chaque valeur reste lisible dans le tableau de données.
     * Le clavier reçoit exactement le même retour que la souris.
     */
    window.brancherSurvolGraphiques = function brancherSurvolGraphiques(racine) {
      racine.querySelectorAll(".gr-wrap").forEach((wrap) => {
        const bulle = wrap.querySelector(".gr-tooltip");
        const repere = wrap.querySelector(".gr-repere");
        const point = wrap.querySelector(".gr-point");
        if (!bulle) return;

        const montrer = (cible, ev) => {
          const info = (cible.dataset.info || "").split("|");
          // `textContent` : les noms de services viennent de l'API, jamais de innerHTML.
          bulle.textContent = "";
          const val = document.createElement("strong");
          val.textContent = info[1] ?? "";
          const nom = document.createElement("span");
          nom.textContent = info[0] ?? "";
          bulle.append(val, nom);
          if (info[2] !== undefined && info[2] !== "") {
            const sec = document.createElement("em");
            sec.textContent = `${info[2]} terminé(s)`;
            bulle.append(sec);
          }
          bulle.hidden = false;

          const boite = wrap.getBoundingClientRect();
          const cb = cible.getBoundingClientRect();
          const cx = ev && ev.clientX ? ev.clientX : cb.left + cb.width / 2;
          bulle.style.left = Math.max(8, Math.min(boite.width - 8, cx - boite.left)) + "px";
          bulle.style.top = Math.max(0, cb.top - boite.top - 8) + "px";

          if (repere && cible.dataset.x) {
            repere.setAttribute("x1", cible.dataset.x);
            repere.setAttribute("x2", cible.dataset.x);
            repere.setAttribute("opacity", "0.5");
          }
          if (point && cible.dataset.x && cible.dataset.y) {
            point.setAttribute("cx", cible.dataset.x);
            point.setAttribute("cy", cible.dataset.y);
            point.setAttribute("opacity", "1");
          }
        };
        const cacher = () => {
          bulle.hidden = true;
          if (repere) repere.setAttribute("opacity", "0");
          if (point) point.setAttribute("opacity", "0");
        };

        wrap.querySelectorAll("[data-info]").forEach((el) => {
          el.addEventListener("pointermove", (ev) => montrer(el, ev));
          el.addEventListener("pointerleave", cacher);
          el.addEventListener("focus", () => montrer(el, null));
          el.addEventListener("blur", cacher);
        });
        wrap.addEventListener("pointerleave", cacher);
      });
    }

    window.setStatsPeriode = function setStatsPeriode(v) { state.statsFilters.periode = v; renderStatsPage(); }
    window.setStatsBorne = function setStatsBorne(k, v) {
      state.statsFilters[k] = v;
      if (state.statsFilters.du && state.statsFilters.au) renderStatsPage();
    }

    /* =========================================================
       PAGE : HISTORIQUE DES ACTIONS (CDC II.17)
       Journal d'audit réellement enregistré côté serveur : création et
       modification de réservations, terminaison, annulation avec motif,
       modification de créneaux, CRUD service, gestion de l'équipe, autorisations,
       modification d'un client. Chaque ligne indique QUI a agi (CDC II.13.3).
       ========================================================= */
    window.renderHistoriquePage = async function renderHistoriquePage() {
      const cible = document.getElementById("page-historique");
      cible.innerHTML = `<div class="card"><div class="table-empty">Chargement de l'historique…</div></div>`;
      try { await chargerHistorique(); } catch (err) { cible.innerHTML = `<div class="card"><div class="table-empty">${M.messageErreur(err)}</div></div>`; return; }

      const familles = [...new Set(HISTORIQUE.map((h) => h.action))].sort();
      cible.innerHTML = `
      <div class="filter-row">
        <input type="text" placeholder="Rechercher (client, service, acteur…)" value="${state.histoFilters.search}" oninput="updateHistoFilter('search', this.value)" style="min-width:240px" />
        <select onchange="updateHistoFilter('action', this.value)">
          <option value="">Toutes les actions</option>
          ${familles.map((a) => `<option value="${a}" ${state.histoFilters.action === a ? 'selected' : ''}>${M.LIBELLE_ACTION[a] || a}</option>`).join("")}
        </select>
      </div>
      <div class="card"><table class="data-table"><thead><tr><th>Date</th><th>Action</th><th>Détail</th><th>Effectuée par</th></tr></thead><tbody id="histoTableBody"></tbody></table></div>
    `;
      renderHistoTable();
    }
    window.updateHistoFilter = function updateHistoFilter(key, val) { state.histoFilters[key] = val; renderHistoTable(); }

    /** Résumé lisible d'une entrée, à partir des détails enregistrés. */
    window.detailAction = function detailAction(h) {
      const d = h.details || {};
      const bouts = [];
      if (d.client) bouts.push(d.client);
      if (d.nom) bouts.push(d.nom);
      if (d.service) bouts.push(d.service);
      if (d.receptionniste) bouts.push(d.receptionniste);
      if (d.label) bouts.push(d.label);
      if (d.from && d.to && typeof d.from === "string" && STATUS[d.from]) {
        bouts.push(`${STATUS[d.from].label} → ${STATUS[d.to] ? STATUS[d.to].label : d.to}`);
      }
      if (d.motif) bouts.push(`motif : ${d.motif}`);
      if (d.count) bouts.push(`${d.count} rendez-vous`);
      if (d.envoyes !== undefined) bouts.push(`${d.envoyes} e-mail(s) envoyé(s)`);
      return bouts.length ? bouts.join(" · ") : "—";
    }

    window.renderHistoTable = function renderHistoTable() {
      const f = state.histoFilters;
      const rows = HISTORIQUE.filter((h) => {
        if (f.action && h.action !== f.action) return false;
        if (!f.search) return true;
        const q = f.search.toLowerCase();
        return (
          (M.LIBELLE_ACTION[h.action] || h.action).toLowerCase().includes(q) ||
          detailAction(h).toLowerCase().includes(q) ||
          (h.auteur?.nom || "").toLowerCase().includes(q)
        );
      });
      const body = document.getElementById("histoTableBody");
      if (!body) return;
      if (!rows.length) { body.innerHTML = `<tr><td colspan="4"><div class="table-empty">Aucune action enregistrée pour ces filtres</div></td></tr>`; return; }
      const ROLES = { PROFESSIONNEL: "Vous", RECEPTIONNISTE: "Réceptionniste", ADMIN: "Admin", CLIENT: "Client" };
      body.innerHTML = rows.map((h) => `<tr>
      <td style="white-space:nowrap;">${new Date(h.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
      <td><b>${M.LIBELLE_ACTION[h.action] || h.action}</b></td>
      <td style="font-size:11.5px;color:var(--ink-soft);">${detailAction(h)}</td>
      <td><span class="status-pill ${h.auteur?.role === 'PROFESSIONNEL' ? 'st-reserve' : 'st-arrive'}">${ROLES[h.auteur?.role] || h.auteur?.role || '—'}</span> <span style="font-size:11.5px;">${h.auteur?.nom || ''}</span></td>
    </tr>`).join("");
    }

    /* =========================================================
       PAGE : PARAMÈTRES DE RÉSERVATION
       Expose l'objet PARAMS, qui existait déjà en mémoire sans interface.
       ========================================================= */
    window.renderParamsPage = function renderParamsPage() {
      document.getElementById("page-params").innerHTML = `
      <div class="card" style="padding:22px;max-width:620px;">
        <div class="field-2col">
          <div class="field-row"><label>Intervalle minimum entre deux rendez-vous (minutes)</label><input type="number" id="paMinGap" min="0" value="${PARAMS.minGap}" /></div>
          <div class="field-row"><label>Délai minimum avant réservation (heures)</label><input type="number" id="paMinLead" min="0" value="${PARAMS.minLead}" /></div>
        </div>
        <div class="field-2col">
          <div class="field-row"><label>Réservation possible jusqu'à (jours à l'avance)</label><input type="number" id="paMaxLead" min="1" value="${PARAMS.maxLead}" /></div>
          <div class="field-row"><label>Rendez-vous maximum par client et par jour</label><input type="number" id="paMaxPerDay" min="1" value="${PARAMS.maxRdvPerClientDay}" /></div>
        </div>
        <div class="field-row"><label>Seuil d'absences répétées avant signalement</label><input type="number" id="paAbsence" min="1" value="${PARAMS.absenceThreshold}" /></div>
        <div class="field-hint" style="margin-bottom:16px;">Ces règles s'appliquent aux réservations effectuées par vos clients depuis votre page publique.</div>
        <button class="btn btn-primary" onclick="saveParams()">${iconCheck()} Enregistrer les paramètres</button>
      </div>
    `;
    }
    window.saveParams = async function saveParams() {
      const num = (id, fallback) => { const v = parseInt(document.getElementById(id).value, 10); return Number.isFinite(v) ? v : fallback; };
      const charge = M.parametresVersAPI({
        minGap: num("paMinGap", PARAMS.minGap),
        minLead: num("paMinLead", PARAMS.minLead),
        maxLead: num("paMaxLead", PARAMS.maxLead),
        maxRdvPerClientDay: num("paMaxPerDay", PARAMS.maxRdvPerClientDay),
        absenceThreshold: num("paAbsence", PARAMS.absenceThreshold),
      });
      await appel(
        professionnelApi.updateParametres(charge),
        "Paramètres de réservation enregistrés",
        async () => {
          // Ces règles pilotent le moteur de créneaux : on recharge le planning.
          await Promise.all([chargerParams(), chargerClients()]);
          renderParamsPage();
        },
      );
    }

    /* =========================================================
       PAGE : NOTIFICATIONS
       ========================================================= */
    window.notifRowHtml = function notifRowHtml(n) {
      const ic = NOTIF_ICONS[n.type] || NOTIF_ICONS.agenda;
      return `<div class="notif-row ${n.unread ? 'unread' : ''}"><div class="notif-icon" style="background:${ic.bg};color:${ic.color}">${svg(ic.svg, 16)}</div><div class="notif-text"><span>${n.text}</span><div class="notif-time">${n.time}</div></div>${n.unread ? `<span class="notif-dot-unread"></span>` : ""}</div>`;
    }
    window.renderNotifsPage = function renderNotifsPage() {
      document.getElementById("page-notifs").innerHTML = NOTIFS.length
        ? `<div class="card">${NOTIFS.map((n) => notifRowHtml(n)).join("")}</div>`
        : `<div class="card"><div class="table-empty">Aucune notification pour le moment</div></div>`;
    }
    window.markAllRead = async function markAllRead() {
      await appel(notificationsApi.markAllRead(), "Notifications marquées comme lues", async () => {
        await chargerNotifs();
        renderNotifsPage();
      });
    }

    /* =========================================================
       PAGE : PROFIL
       ========================================================= */
    const LIBELLE_CHAMP_PROFIL = { nom: "le nom", description: "la description", adresse: "l'adresse", telephone: "le téléphone" };

    window.renderProfilPage = function renderProfilPage() {
      const manquants = (PROFIL_ETAT.champsManquants || []).map((c) => LIBELLE_CHAMP_PROFIL[c] || c);
      document.getElementById("page-profil").innerHTML = `
      ${manquants.length ? `<div class="profil-alerte">${iconAlert()} <span>Complétez votre profil pour que vos clients disposent de toutes les informations : il manque ${manquants.join(", ")}.</span></div>` : ""}
      <div class="card" style="padding:22px;max-width:620px;">
        <div class="field-row"><label>Nom du professionnel / bureau</label><input type="text" id="prName" value="${PROFILE.name}" /></div>
        <div class="field-row"><label>Spécialité / activité</label><input type="text" id="prSpecialite" value="${PROFILE.specialite || ""}" /></div>
        <div class="field-row"><label>Description</label><textarea id="prDesc" rows="3">${PROFILE.desc}</textarea></div>
        <div class="field-row"><label>Adresse</label><input type="text" id="prAddress" value="${PROFILE.address}" /></div>
        <div class="field-2col">
          <div class="field-row"><label>Téléphone</label><input type="text" id="prPhone" value="${PROFILE.phone}" /></div>
          <div class="field-row"><label>E-mail de connexion</label><input type="email" value="${PROFILE.email}" disabled /><div class="field-hint">Modifiable depuis votre compte.</div></div>
        </div>
        <div class="field-row">
          <label>Photo du bureau</label>
          <input type="url" id="prPhoto" value="${PROFILE.photoUrl || ""}" placeholder="https://…" />
          <div class="field-hint">Adresse de l'image. Le téléversement direct nécessitera un service de stockage de fichiers.</div>
        </div>
        ${PROFILE.photoUrl ? `<img src="${PROFILE.photoUrl}" alt="Photo du bureau" style="max-width:220px;border-radius:10px;border:1px solid var(--line);margin-bottom:14px;" />` : ""}
        <button class="btn btn-primary" onclick="saveProfile()">${iconCheck()} Enregistrer les modifications</button>
      </div>
    `;
    }
    window.saveProfile = async function saveProfile() {
      const charge = {
        nom: document.getElementById("prName").value.trim(),
        specialite: document.getElementById("prSpecialite").value.trim(),
        description: document.getElementById("prDesc").value.trim(),
        adresse: document.getElementById("prAddress").value.trim(),
        telephone: document.getElementById("prPhone").value.trim(),
        photoUrl: document.getElementById("prPhoto").value.trim(),
      };
      await appel(
        professionnelApi.updateProfil(charge),
        "Profil mis à jour",
        async () => { await chargerProfil(); renderProfilPage(); },
      );
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

    /* ---- Nouveau rendez-vous (créé directement par le Pro depuis l'agenda) ----
       Parcours du CDC II.14 : date → créneau disponible → client → service →
       confirmation. Les créneaux proposés viennent du moteur serveur, qui tient
       déjà compte des disponibilités, des indisponibilités, des rendez-vous
       existants et des règles de réservation. */
    window.openNewRdv = function openNewRdv(prefill) {
      prefill = prefill || {};
      const actifs = SERVICES.filter((s) => s.status === 'active');
      if (!actifs.length) { showToast("Créez d'abord un service actif pour pouvoir réserver"); return; }
      const c = prefill.client || {};
      const html = `
      <div class="modal-head"><div><p class="modal-title">Nouveau rendez-vous</p><p class="modal-sub">Choisissez le service et la date, puis un créneau disponible</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="detect-banner" id="detectBanner"></div>
      <div class="field-2col">
        <div class="field-row"><label>Prénom du client</label><input type="text" id="nrPrenom" value="${c.name ? (c.name.split(' ')[0] || '') : ''}" oninput="detectClient()" placeholder="Karim" /></div>
        <div class="field-row"><label>Nom</label><input type="text" id="nrNom" value="${c.name ? c.name.split(' ').slice(1).join(' ') : ''}" oninput="detectClient()" placeholder="Yacine" /></div>
      </div>
      <div class="field-2col">
        <div class="field-row"><label>Téléphone</label><input type="tel" id="nrTel" value="${c.phone || ''}" oninput="detectClient()" placeholder="0555 00 00 00" /></div>
        <div class="field-row"><label>E-mail (optionnel)</label><input type="email" id="nrEmail" value="${c.email || ''}" placeholder="client@mail.com" /></div>
      </div>
      <div class="field-row"><label>Date de naissance (optionnel)</label><input type="date" id="nrDob" value="${c.dob || ''}" /></div>
      <div class="field-2col">
        <div class="field-row"><label>Service</label><select id="nrService" onchange="chargerCreneauxRdv()">${actifs.map((s) => `<option value="${s.id}">${s.name} — ${s.duration} min</option>`).join("")}</select></div>
        <div class="field-row"><label>Date</label><input type="date" id="nrDate" value="${prefill.date || state.agendaDate}" onchange="chargerCreneauxRdv()" /></div>
      </div>
      <div class="field-row"><label>Créneau disponible</label><select id="nrSlot"><option>Chargement…</option></select><div class="field-hint" id="nrSlotHint"></div></div>
      <div class="field-row"><label>Remarque (optionnel)</label><input type="text" id="nrRemarque" placeholder="Information utile pour ce rendez-vous" /></div>
      <div class="field-error" id="nrError">Merci de renseigner le prénom, le nom, le téléphone et un créneau.</div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Annuler</button><button class="btn btn-primary" onclick="submitNewRdv()">${iconCheck()} Confirmer le rendez-vous</button></div>
    `;
      openModal(html);
      chargerCreneauxRdv(prefill.start);
      if (c.id) detectClient();
    }

    /**
     * Interroge le moteur de créneaux du serveur pour le service et la date choisis.
     *
     * Changer de date relance la requête alors que la précédente peut être encore
     * en vol : sans ce numéro de séquence, une réponse tardive portant sur
     * l'ancienne date écrase la liste affichée et vide la sélection.
     */
    let seqCreneaux = 0;
    window.chargerCreneauxRdv = async function chargerCreneauxRdv(heureSouhaitee) {
      const sel = document.getElementById("nrSlot");
      const hint = document.getElementById("nrSlotHint");
      if (!sel) return;
      const monTour = ++seqCreneaux;
      const serviceId = document.getElementById("nrService").value;
      const date = document.getElementById("nrDate").value;
      sel.innerHTML = `<option value="">Chargement…</option>`;
      try {
        const res = await professionnelApi.creneaux(serviceId, date);
        if (monTour !== seqCreneaux) return; // une requête plus récente a pris le relais
        const creneaux = res.creneaux || [];
        if (!creneaux.length) {
          sel.innerHTML = `<option value="">Aucun créneau disponible</option>`;
          if (hint) hint.textContent = "Ce jour est fermé, complet, ou hors de vos délais de réservation.";
          return;
        }
        sel.innerHTML = creneaux
          .map((iso) => {
            const h = M.heureLocale(new Date(iso));
            const choisi = heureSouhaitee && h === heureSouhaitee ? ' selected' : '';
            return `<option value="${iso}"${choisi}>${h}</option>`;
          })
          .join("");
        if (hint) hint.textContent = `${creneaux.length} créneau(x) disponible(s).`;
      } catch (err) {
        if (monTour !== seqCreneaux) return;
        sel.innerHTML = `<option value="">Créneaux indisponibles</option>`;
        if (hint) hint.textContent = M.messageErreur(err);
      }
    }

    /** Détection du client existant (CDC II.14), côté serveur. */
    window.detectClient = async function detectClient() {
      const prenom = document.getElementById("nrPrenom")?.value.trim();
      const nom = document.getElementById("nrNom")?.value.trim();
      const tel = document.getElementById("nrTel")?.value.trim();
      const banner = document.getElementById("detectBanner");
      if (!banner) return;
      if ((!tel || tel.length < 6) && !(nom && prenom)) { banner.classList.remove("show"); return; }
      try {
        const existant = await professionnelApi.detectClient({ telephone: tel || undefined, nom: nom || undefined, prenom: prenom || undefined });
        if (existant) {
          const local = uniqueClients().find((c) => c.id === existant.id);
          const nb = local ? local.appts.length : 0;
          const alerte = local && local.absencesRepetees ? ` — ${local.absences} absence(s) enregistrée(s)` : "";
          banner.innerHTML = `${iconCheck()} Fiche existante réutilisée : <b>${existant.prenom} ${existant.nom}</b> (${nb} rendez-vous)${alerte}`;
          banner.classList.add("show");
        } else banner.classList.remove("show");
      } catch { banner.classList.remove("show"); }
    }

    window.submitNewRdv = async function submitNewRdv() {
      const prenom = document.getElementById("nrPrenom").value.trim();
      const nom = document.getElementById("nrNom").value.trim();
      const telephone = document.getElementById("nrTel").value.trim();
      const email = document.getElementById("nrEmail").value.trim();
      const dateNaissance = document.getElementById("nrDob").value;
      const serviceId = document.getElementById("nrService").value;
      const dateDebut = document.getElementById("nrSlot").value;
      const remarque = document.getElementById("nrRemarque").value.trim();
      if (!prenom || !nom || !telephone || !dateDebut) { document.getElementById("nrError").classList.add("show"); return; }

      try {
        const cree = await professionnelApi.creerRendezVous({
          serviceId, dateDebut, nom, prenom, telephone,
          email: email || undefined,
          dateNaissance: dateNaissance ? new Date(dateNaissance).toISOString() : undefined,
          remarque: remarque || undefined,
        });
        closeModal();
        await Promise.all([chargerRdv(), chargerClients(), chargerNotifs()]);
        const d = new Date(cree.dateDebut);
        showToast(`Rendez-vous créé pour <b>${prenom} ${nom}</b> le ${fmtDateShort(M.isoLocalDate(d))} à ${M.heureLocale(d)}`);
        renderPage(state.page);
      } catch (err) {
        // 409 = créneau pris ou quota atteint, 400 = règle de réservation non respectée.
        showToast(M.messageErreur(err));
      }
    }

    /* ---- Consulter / annuler un rendez-vous ---- */
    window.openRdvDetail = function openRdvDetail(id) {
      const a = APPTS.find((x) => x.id === id); if (!a) return;
      const suites = TRANSITIONS[a.status] || [];
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
      ${a.remark ? `<div class="field-row"><label>${a.status === "ANNULE" ? "Motif d'annulation" : "Remarque"}</label><div style="font-size:12.5px;color:var(--ink-soft)">${a.remark}</div></div>` : ""}
      ${suites.length ? `<div class="detail-item-label" style="margin-bottom:6px;">Faire évoluer le statut</div>
      <div class="status-menu">
        ${suites.filter((s) => s !== "ANNULE").map((s) => `<button onclick="changerStatut('${a.id}','${s}')">${STATUS[s].label}</button>`).join("")}
      </div>` : `<div class="field-hint">Ce rendez-vous est clôturé : son statut ne peut plus évoluer.</div>`}
      <div class="modal-actions" style="justify-content:space-between;">
        <div style="display:flex;gap:8px;">
          ${a.date >= TODAY && a.status === "RESERVE" ? `<button class="btn btn-ghost btn-sm" onclick="openRescheduleForm('${a.id}')">${iconCal()} Déplacer</button>` : ""}
        </div>
        ${suites.includes("ANNULE") ? `<button class="btn btn-danger-ghost btn-sm" onclick="openCancelForm('${a.id}')">${iconX()} Annuler</button>` : ""}
      </div>
    `;
      openModal(html);
    }

    /** Applique une transition de statut ; le serveur refuse les transitions invalides. */
    window.changerStatut = async function changerStatut(id, statut) {
      await appel(
        appointmentsApi.updateStatus(id, statut),
        `Statut mis à jour : ${STATUS[statut].label}`,
        async () => {
          closeModal();
          await Promise.all([chargerRdv(), chargerClients(), chargerNotifs()]);
          renderPage(state.page);
        },
      );
    }

    /** Déplacement d'un rendez-vous vers un autre créneau disponible. */
    window.openRescheduleForm = function openRescheduleForm(id) {
      const a = APPTS.find((x) => x.id === id); if (!a) return;
      const svc = SERVICES.find((s) => s.name === a.service);
      const html = `
      <div class="modal-head"><div><p class="modal-title">Déplacer le rendez-vous</p><p class="modal-sub">${a.client} — ${a.service}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-row"><label>Nouvelle date</label><input type="date" id="rsDate" value="${a.date}" onchange="chargerCreneauxReschedule('${svc ? svc.id : ''}')" /></div>
      <div class="field-row"><label>Nouveau créneau</label><select id="rsSlot"><option>Chargement…</option></select><div class="field-hint" id="rsHint"></div></div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="openRdvDetail('${a.id}')">Retour</button><button class="btn btn-primary" onclick="confirmReschedule('${a.id}')">${iconCheck()} Déplacer</button></div>
    `;
      openModal(html);
      chargerCreneauxReschedule(svc ? svc.id : '');
    }
    let seqReschedule = 0;
    window.chargerCreneauxReschedule = async function chargerCreneauxReschedule(serviceId) {
      const sel = document.getElementById("rsSlot");
      const hint = document.getElementById("rsHint");
      if (!sel || !serviceId) { if (sel) sel.innerHTML = `<option value="">Service introuvable</option>`; return; }
      const monTour = ++seqReschedule;
      const date = document.getElementById("rsDate").value;
      sel.innerHTML = `<option value="">Chargement…</option>`;
      try {
        const res = await professionnelApi.creneaux(serviceId, date);
        if (monTour !== seqReschedule) return;
        const creneaux = res.creneaux || [];
        sel.innerHTML = creneaux.length
          ? creneaux.map((iso) => `<option value="${iso}">${M.heureLocale(new Date(iso))}</option>`).join("")
          : `<option value="">Aucun créneau disponible</option>`;
        if (hint) hint.textContent = creneaux.length ? `${creneaux.length} créneau(x) disponible(s).` : "Aucun créneau libre ce jour-là.";
      } catch (err) {
        if (monTour !== seqReschedule) return;
        sel.innerHTML = `<option value="">Créneaux indisponibles</option>`;
        if (hint) hint.textContent = M.messageErreur(err);
      }
    }
    window.confirmReschedule = async function confirmReschedule(id) {
      const dateDebut = document.getElementById("rsSlot").value;
      if (!dateDebut) { showToast("Choisissez un créneau disponible"); return; }
      await appel(
        appointmentsApi.reschedule(id, dateDebut),
        "Rendez-vous déplacé",
        async () => {
          closeModal();
          await Promise.all([chargerRdv(), chargerNotifs()]);
          renderPage(state.page);
        },
      );
    }
    window.openCancelForm = function openCancelForm(id) {
      const a = APPTS.find((x) => x.id === id); if (!a) return;
      const html = `
      <div class="modal-head"><div><p class="modal-title">Annuler le rendez-vous</p><p class="modal-sub">${a.client}</p></div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="field-row"><label>Motif (obligatoire)</label><select id="cancelMotif" onchange="document.getElementById('cancelMotifLibreRow').style.display = this.value === 'Autre motif' ? 'block' : 'none'"><option>Indisponibilité exceptionnelle</option><option>Fermeture du bureau</option><option>Problème professionnel</option><option>Modification du planning</option><option>Erreur de réservation</option><option>Autre motif</option></select></div>
      <div class="field-row" id="cancelMotifLibreRow" style="display:none"><label>Précisez le motif</label><input type="text" id="cancelMotifLibre" placeholder="Motif communiqué au client" /></div>
      <div class="field-hint">Le client sera informé de l'annulation par e-mail, avec le motif.</div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="openRdvDetail('${a.id}')">Retour</button><button class="btn btn-danger-ghost" onclick="confirmCancel('${a.id}')">${iconCheck()} Confirmer l'annulation</button></div>
    `;
      openModal(html);
    }
    window.confirmCancel = async function confirmCancel(id) {
      let motif = document.getElementById("cancelMotif").value;
      if (motif === "Autre motif") {
        const libre = (document.getElementById("cancelMotifLibre")?.value || "").trim();
        if (!libre) { showToast("Précisez le motif de l'annulation"); return; }
        motif = libre;
      }
      // Le serveur enregistre le motif et envoie l'e-mail au client (CDC II.10.2).
      await appel(
        appointmentsApi.updateStatus(id, "ANNULE", motif),
        `Rendez-vous annulé — le client est informé par e-mail (motif : ${motif})`,
        async () => {
          closeModal();
          await Promise.all([chargerRdv(), chargerNotifs()]);
          renderPage(state.page);
        },
      );
    }

    /* =========================================================
       GLOBAL SEARCH + INIT
       ========================================================= */
    // La navigation passe désormais par le routeur (asynchrone) : on pose le
    // filtre AVANT de changer de page, pour que `renderClientsPage` le reprenne.
    document.getElementById("globalSearch")?.addEventListener("input", function () {
      const q = this.value.trim(); if (q.length < 2) return;
      state.clientsFilters.search = q;
      goToPage("clients");
    }, { signal: ac.signal });

  // Le menu « + Ajouter » de l'Agenda se ferme au clic extérieur.
    document.addEventListener("click", (e) => {
      if (!state.addMenuOpen) return;
      if (e.target.closest(".agenda-add")) return;
      state.addMenuOpen = false;
      if (state.page === "agenda") renderAgenda();
    }, { signal: ac.signal });

    /* ---- Temps réel : l'agenda se rafraîchit sans rechargement (CDC I.22) ----
       Le gateway émet vers la room `pro:<id>` ; l'adhésion est authentifiée par
       le jeton, que le serveur vérifie avant de laisser entrer. */
    window.brancherTempsReel = function brancherTempsReel() {
      const token = useAuthStore.getState().accessToken;
      if (!token || socketRef.current) return;
      const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000/events');
      socketRef.current = socket;
      socket.on('connect', () => socket.emit('join', { token }));
      const rafraichir = async () => {
        await Promise.all([chargerRdv(), chargerNotifs()]);
        if (["agenda", "clients", "historique"].includes(state.page)) renderPage(state.page);
      };
      ['rdv:created', 'rdv:updated', 'rdv:status-changed'].forEach((e) => socket.on(e, rafraichir));
    };

    chargerTout().then(() => { brancherTempsReel(); });

    // ---- end ported script ----

    return () => {
      ac.abort();

      delete (window as any).isoLocal;
      delete (window as any).todayISO;
      delete (window as any).isoPlusDays;
      delete (window as any).uid;
      delete (window as any).appel;
      delete (window as any).chargerProfil;
      delete (window as any).chargerServices;
      delete (window as any).chargerRdv;
      delete (window as any).chargerDispos;
      delete (window as any).chargerIndispos;
      delete (window as any).chargerClients;
      delete (window as any).chargerEquipe;
      delete (window as any).chargerNotifs;
      delete (window as any).chargerParams;
      delete (window as any).chargerHistorique;
      delete (window as any).chargerStats;
      delete (window as any).chargerTout;
      delete (window as any).fmtDateLong;
      delete (window as any).fmtDateShort;
      delete (window as any).capitalize;
      delete (window as any).calcAge;
      delete (window as any).initials;
      delete (window as any).showToast;
      delete (window as any).goToPage;
      delete (window as any).renderActivePage;
      delete (window as any).renderPage;
      delete (window as any).injecterAlerteProfil;
      delete (window as any).updateNotifBadges;
      delete (window as any).publishProfile;
      delete (window as any).svg;
      delete (window as any).iconPlus;
      delete (window as any).iconImage;
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
      delete (window as any).iconRobot;
      delete (window as any).iconGrid;
      delete (window as any).iconList;
      delete (window as any).renderPageHead;
      delete (window as any).indicateursJour;
      delete (window as any).statutsDuJour;
      delete (window as any).prochainsRdv;
      delete (window as any).renderAgenda;
      delete (window as any).setAgendaMode;
      delete (window as any).setAgendaModeSilent;
      delete (window as any).setDispoPanelSilent;
      delete (window as any).toggleDispoPanel;
      delete (window as any).toggleAddMenu;
      delete (window as any).addMenuPick;
      delete (window as any).openAgendaListe;
      delete (window as any).openAgendaDispos;
      delete (window as any).agendaDateLabel;
      delete (window as any).weekStart;
      delete (window as any).agendaShift;
      delete (window as any).agendaToday;
      delete (window as any).setAgendaView;
      delete (window as any).dayNameOf;
      delete (window as any).isHourOpen;
      delete (window as any).indispoOn;
      delete (window as any).renderAgendaMain;
      delete (window as any).dayViewHtml;
      delete (window as any).agendaListHtml;
      delete (window as any).pausesDuJour;
      delete (window as any).placeDayAppts;
      delete (window as any).apptCardHtml;
      delete (window as any).handleWeekColClick;
      delete (window as any).handleDayColClick;
      delete (window as any).weekViewHtml;
      delete (window as any).monthViewHtml;
      delete (window as any).jumpToDay;
      delete (window as any).miniCalHtml;
      delete (window as any).miniCalShift;
      delete (window as any).updateRdvFilter;
      delete (window as any).resetRdvFilters;
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
      delete (window as any).saveClient;
      delete (window as any).programmerClient;
      delete (window as any).rdvMiniRow;
      delete (window as any).switchClientTab;
      delete (window as any).noteRowHtml;
      delete (window as any).rafraichirNotes;
      delete (window as any).addClientNote;
      delete (window as any).editClientNote;
      delete (window as any).saveClientNote;
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
      delete (window as any).capturerBrouillonService;
      delete (window as any).openServiceForm;
      delete (window as any).rafraichirApercuService;
      delete (window as any).televerserImageService;
      delete (window as any).retirerImageService;
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
      delete (window as any).estIdServeur;
      delete (window as any).syncChampsPersonnalises;
      delete (window as any).saveService;
      delete (window as any).dispoPanelHtml;
      delete (window as any).refreshDispoPanel;
      delete (window as any).toggleDayOn;
      delete (window as any).openDispoQuickForm;
      delete (window as any).saveDispoQuick;
      delete (window as any).editDayRanges;
      delete (window as any).rangeRowHtml;
      delete (window as any).addRangeRow;
      delete (window as any).removeRangeRow;
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
      delete (window as any).retirerReceptionniste;
      delete (window as any).openPermsForm;
      delete (window as any).savePerms;
      delete (window as any).renderStatsPage;
      delete (window as any).brancherSurvolGraphiques;
      delete (window as any).setStatsPeriode;
      delete (window as any).setStatsBorne;
      delete (window as any).renderHistoriquePage;
      delete (window as any).updateHistoFilter;
      delete (window as any).detailAction;
      delete (window as any).renderHistoTable;
      delete (window as any).renderParamsPage;
      delete (window as any).saveParams;
      delete (window as any).notifRowHtml;
      delete (window as any).renderNotifsPage;
      delete (window as any).markAllRead;
      delete (window as any).renderProfilPage;
      delete (window as any).saveProfile;
      delete (window as any).closeModal;
      delete (window as any).openModal;
      delete (window as any).openNewRdv;
      delete (window as any).chargerCreneauxRdv;
      delete (window as any).detectClient;
      delete (window as any).submitNewRdv;
      delete (window as any).openRdvDetail;
      delete (window as any).changerStatut;
      delete (window as any).openRescheduleForm;
      delete (window as any).chargerCreneauxReschedule;
      delete (window as any).confirmReschedule;
      delete (window as any).openCancelForm;
      delete (window as any).confirmCancel;
      delete (window as any).brancherTempsReel;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  /**
   * Pilotage par l'URL. Déclaré APRÈS l'effet du moteur : l'ordre d'exécution
   * des effets garantit que `renderActivePage` existe déjà au premier montage.
   * Les URLs alias (`/reservations`, `/disponibilites`) préréglent l'Agenda
   * avant son rendu.
   */
  useEffect(() => {
    if (!route) return;
    const w = window as any;
    if (typeof w.renderActivePage !== 'function') return;
    if (route.agenda) {
      if (route.agenda.mode) w.setAgendaModeSilent?.(route.agenda.mode);
      if (route.agenda.dispoPanel !== undefined) w.setDispoPanelSilent?.(route.agenda.dispoPanel);
    }
    w.renderActivePage(route.page);
    // L'ancienne URL de l'assistant reste valide : elle deploie la bulle.
    // L'assistant est désormais un composant React : on le prévient par événement.
    if (route.assistant) window.dispatchEvent(new CustomEvent('assistant:ouvrir'));
  }, [route?.slug]);

  // Segment d'URL inconnu : on revient à l'accueil de l'espace.
  if (!route) return <Navigate to="/professionnel" replace />;

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
  html, body { margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; background: var(--paper); color: var(--ink); }
  button, input, select, textarea { font-family: inherit; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: var(--line); border-radius: 999px; }

  .app { display: flex; flex-direction: column; min-height: 100vh; }
  .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

  /* ---------- Navbar horizontale ---------- */
  .pro-navbar { background: var(--card); border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 40; }
  .pro-navbar-inner { display: flex; align-items: center; gap: 10px; padding: 0 24px; height: 64px; max-width: 1680px; margin: 0 auto; }

  .pro-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--ink); flex-shrink: 0; margin-right: 8px; }
  .pro-brand-logo { width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; }
  .pro-brand-text { font-weight: 800; font-size: 15.5px; white-space: nowrap; }

  .pro-nav-links { display: flex; align-items: center; gap: 2px; min-width: 0; }
  .pro-nav-link {
    display: inline-flex; align-items: center; gap: 7px; padding: 8px 12px; border-radius: 10px;
    color: var(--ink-soft); font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap;
    text-decoration: none; border: none; background: none; font-family: inherit;
    transition: background .15s ease, color .15s ease;
  }
  .pro-nav-link:hover { background: var(--paper); color: var(--ink); }
  .pro-nav-link.active, .pro-nav-link.open { background: var(--primary-soft); color: var(--primary); }
  .pro-nav-link svg { flex-shrink: 0; }

  .pro-navbar-right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
  .pro-search { position: relative; width: 260px; }
  .pro-search input {
    width: 100%; border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px 8px 34px;
    font-size: 12.5px; background: var(--paper); color: var(--ink); outline: none; transition: border-color .15s ease;
  }
  .pro-search input:focus { border-color: var(--primary); }
  .pro-search svg { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--ink-soft); pointer-events: none; }

  .pro-icon-btn { position: relative; width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--line); background: var(--card); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--ink-soft); text-decoration: none; flex-shrink: 0; transition: background .15s ease; }
  .pro-icon-btn:hover { background: var(--paper); color: var(--ink); }
  .pro-icon-btn.active { background: var(--primary-tint); color: var(--primary-dark); border-color: var(--primary-tint); }
  .pro-icon-badge { position: absolute; top: -5px; right: -5px; background: var(--st-annule); color: #fff; font-size: 10px; font-weight: 700; border-radius: 999px; min-width: 17px; height: 17px; display: flex; align-items: center; justify-content: center; padding: 0 3px; border: 2px solid var(--card); }

  .pro-user-btn { display: flex; align-items: center; gap: 9px; padding: 4px 8px 4px 4px; border-radius: 999px; border: 1px solid var(--line); background: var(--card); cursor: pointer; font-family: inherit; color: var(--ink); transition: background .15s ease; }
  .pro-user-btn:hover, .pro-user-btn.open { background: var(--paper); }
  .pro-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 12.5px; flex-shrink: 0; }
  .pro-user-text { display: flex; flex-direction: column; line-height: 1.25; text-align: left; max-width: 150px; }
  .pro-user-name { font-size: 12.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pro-user-role { font-size: 10.5px; color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* ---------- Menus déroulants ---------- */
  .pro-dropdown { position: relative; }
  .pro-menu {
    position: absolute; top: calc(100% + 8px); left: 0; min-width: 250px; background: var(--card);
    border: 1px solid var(--line); border-radius: 13px; box-shadow: 0 20px 40px -14px rgba(10,10,26,.28);
    padding: 6px; z-index: 60;
  }
  .pro-menu-right { left: auto; right: 0; }
  .pro-menu-head { padding: 8px 10px 10px; border-bottom: 1px solid var(--line); margin-bottom: 5px; }
  .pro-menu-head-name { font-size: 13px; font-weight: 700; }
  .pro-menu-head-mail { font-size: 11px; color: var(--ink-soft); word-break: break-all; }
  .pro-menu-item {
    display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 11px; border-radius: 9px;
    font-size: 13px; font-weight: 600; color: var(--ink); text-decoration: none; cursor: pointer;
    border: none; background: none; font-family: inherit; text-align: left;
  }
  .pro-menu-item:hover { background: var(--paper); }
  .pro-menu-item.active { background: var(--primary-soft); color: var(--primary); }
  .pro-menu-item.danger { color: var(--st-annule); }
  .pro-menu-item.danger:hover { background: #FDEDEC; }
  .pro-menu-item svg { flex-shrink: 0; color: var(--ink-soft); }
  .pro-menu-item.active svg, .pro-menu-item.danger svg { color: currentColor; }
  .pro-menu-badge { margin-left: auto; background: var(--st-annule); color: #fff; font-size: 10px; font-weight: 700; border-radius: 999px; padding: 1px 7px; }
  .pro-menu-section { font-size: 10.5px; font-weight: 700; color: var(--ink-soft); text-transform: uppercase; letter-spacing: .07em; padding: 14px 11px 6px; }

  /* ---------- Responsive : hamburger ---------- */
  .pro-burger { display: none; width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--line); background: var(--card); align-items: center; justify-content: center; cursor: pointer; color: var(--ink); flex-shrink: 0; }
  .pro-mobile-panel { display: none; border-top: 1px solid var(--line); padding: 6px 14px 16px; max-height: calc(100vh - 64px); overflow-y: auto; }

  @media (max-width: 1180px) {
    .pro-search { width: 190px; }
    .pro-user-text { display: none; }
  }
  @media (max-width: 900px) {
    .pro-navbar-inner { padding: 0 16px; gap: 8px; }
    .pro-burger { display: flex; order: 3; }
    .pro-nav-links { display: none; }
    .pro-search { display: none; }
    .pro-navbar-right { gap: 8px; }
    .pro-mobile-panel { display: block; }
  }

  /* En-tête de page unique — actions globales */
  .page-head-global { display: flex; align-items: flex-start; justify-content: flex-end; gap: 16px; padding: 18px 30px 4px; flex-wrap: wrap; max-width: 1680px; margin: 0 auto; width: 100%; }
  .page-head-global:empty { display: none; padding: 0; }

  .page { padding: 24px 40px 80px; display: none; max-width: 1680px; margin: 0 auto; width: 100%; background: var(--paper); }
  .page.active { display: block; }

  /* Rappel de complétion du profil (CDC II.4) et écrans de chargement */
  .profil-alerte { display: flex; align-items: center; gap: 10px; background: #FDF1E2; color: #8a5a1a; border: 1px solid #F3DCBB; border-radius: 12px; padding: 12px 16px; font-size: 12.5px; font-weight: 600; margin-bottom: 16px; }
  .profil-alerte svg { flex-shrink: 0; }
  .pro-avatar-alerte { position: absolute; top: -1px; right: -1px; width: 10px; height: 10px; border-radius: 50%; background: #E2954A; border: 2px solid var(--card); }
  .pro-avatar { position: relative; }
  .ecran-chargement { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 60px 20px; color: var(--ink-soft); font-size: 13px; font-weight: 600; }

  .section-tabs { display: flex; gap: 6px; margin-bottom: 16px; border-bottom: 1px solid var(--line); }
  .section-tab { display: inline-flex; align-items: center; gap: 7px; padding: 9px 4px; margin-bottom: -1px; font-size: 13px; font-weight: 700; color: var(--ink-soft); border-bottom: 2px solid transparent; }
  .section-tab.active { color: var(--primary-dark); border-bottom-color: var(--primary); }

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
  .stat-card { background: var(--card); border: 1px solid var(--line); border-radius: 18px; box-shadow: 0 2px 12px rgba(43, 38, 80, 0.04); padding: 20px 22px; }
  .stat-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
  .stat-value { font-size: 22px; font-weight: 800; line-height: 1; margin-bottom: 4px; }
  .stat-label { font-size: 11.5px; color: var(--ink-soft); font-weight: 600; }

  .card { background: var(--card); border: 1px solid var(--line); border-radius: 18px; box-shadow: 0 2px 12px rgba(43, 38, 80, 0.04); }
  .card-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--line); }
  .card-head h3 { font-size: 14.5px; margin: 0; }

  /* ---------- Accordéons (sections secondaires/facultatives) ---------- */
  .accordion-toggle { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: none; border: none; cursor: pointer; font: inherit; text-align: left; }
  .accordion-toggle:hover { background: var(--paper); }
  .accordion-chevron { display: inline-flex; color: var(--ink-soft); transition: transform .2s ease; transform: rotate(90deg); }
  .accordion-chevron.open { transform: rotate(-90deg); }

  .status-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
  .status-pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .st-reserve { background: var(--primary-soft); color: var(--primary); }
  .st-arrive { background: #E6F7F5; color: var(--st-arrive); }
  .st-encours { background: #FFF1D8; color: #B45309; }
  .st-termine { background: #DDF4E8; color: #15803D; }
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
  .agenda-toolbar-right { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .view-toggle { display: flex; background: var(--paper); border-radius: 10px; padding: 3px; gap: 2px; }
  .view-toggle button { border: none; background: none; padding: 7px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 700; color: var(--ink-soft); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
  .view-toggle button.active { background: var(--card); color: var(--primary-dark); box-shadow: 0 1px 3px rgba(18,36,47,0.12); }
  .btn-ghost.is-on { border-color: var(--primary); color: var(--primary-dark); background: var(--primary-tint); }
  .date-nav { display: flex; align-items: center; gap: 6px; }
  .date-nav button { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--line); background: var(--card); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--ink-soft); }
  .date-nav-label { font-size: 13.5px; font-weight: 700; padding: 0 4px; min-width: 150px; text-align: center; }

  /* Menu « + Ajouter » : réservation / disponibilité / indisponibilité */
  .agenda-add { position: relative; }
  .agenda-add-menu {
    position: absolute; top: calc(100% + 8px); right: 0; width: 300px; background: var(--card);
    border: 1px solid var(--line); border-radius: 13px; box-shadow: 0 20px 40px -14px rgba(10,10,26,.28);
    padding: 6px; z-index: 30;
  }
  .agenda-add-menu button { display: flex; align-items: flex-start; gap: 11px; width: 100%; padding: 10px 11px; border: none; background: none; border-radius: 9px; cursor: pointer; font-family: inherit; text-align: left; color: var(--ink); }
  .agenda-add-menu button:hover { background: var(--paper); }
  .agenda-add-menu button > svg { color: var(--primary); margin-top: 2px; flex-shrink: 0; }
  .agenda-add-menu b { display: block; font-size: 13px; }
  .agenda-add-menu span { display: block; font-size: 11px; color: var(--ink-soft); margin-top: 1px; }

  /* Panneau Disponibilités & indisponibilités, intégré à l'Agenda */
  .agenda-dispo-panel { margin-bottom: 18px; }
  .agenda-dispo-panel .card-head h3 { display: inline-flex; align-items: center; gap: 8px; }
  .dispo-panel-body { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 18px 20px 20px; align-items: start; }
  @media (max-width: 980px) { .dispo-panel-body { grid-template-columns: 1fr; gap: 22px; } }
  .dispo-panel-title { font-size: 12px; font-weight: 700; color: var(--ink-soft); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
  .dispo-day-row { display: flex; align-items: center; gap: 14px; padding: 10px 0; border-top: 1px solid var(--line); flex-wrap: wrap; }
  .dispo-day-label { display: flex; align-items: center; gap: 8px; width: 118px; font-size: 13px; font-weight: 700; cursor: pointer; }
  .dispo-day-ranges { flex: 1; display: flex; flex-wrap: wrap; gap: 6px; min-width: 120px; }
  .dispo-range { font-size: 11.5px; font-weight: 700; color: var(--primary-dark); background: var(--primary-tint); padding: 3px 9px; border-radius: 999px; }
  .dispo-none { font-size: 12px; color: var(--ink-soft); }
  .range-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .range-row input { flex: 1; border: 1px solid var(--line); border-radius: 9px; padding: 9px 12px; font-size: 13px; color: var(--ink); background: var(--paper); }
  .range-sep { font-size: 12px; color: var(--ink-soft); }

  .pro-filter-row { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 18px; }
  .pro-chip { display: flex; align-items: center; gap: 9px; background: var(--card); border: 1.5px solid var(--line); border-radius: 12px; padding: 8px 14px 8px 8px; cursor: pointer; flex-shrink: 0; transition: border-color .15s ease, background .15s ease; }
  .pro-chip.active { border-color: var(--primary); background: var(--primary-tint); }
  .pro-chip-name { font-size: 12.5px; font-weight: 700; line-height: 1.3; }
  .pro-chip-role { font-size: 10.5px; color: var(--ink-soft); }
  .pro-chip-dot { width: 8px; height: 8px; border-radius: 50%; margin-left: 4px; }

  /* L'agenda prend toute la largeur de la page */
  .agenda-body { display: block; width: 100%; }
  .agenda-body.is-list { display: block; }

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
  .day-blocked-banner { display: flex; align-items: center; gap: 8px; padding: 9px 16px; background: #FDEDEC; color: var(--st-annule); font-size: 12px; font-weight: 700; border-bottom: 1px solid var(--line); }
  .day-grid-body { display: grid; position: relative; }
  .day-hour-row { display: contents; }
  .hour-label { font-size: 11px; color: var(--ink-soft); padding: 2px 10px 0 0; text-align: right; border-top: 1px solid var(--line); position: relative; top: -7px; }
  /* Hauteur d'une heure. À garder en phase avec DAY_ROW_H côté script. */
  .day-col { border-left: 1px solid var(--line); border-top: 1px solid var(--line); min-height: 168px; position: relative; cursor: pointer; transition: background .12s ease; }
  .day-col:hover { background: var(--primary-tint); }
  /* Hors des plages de disponibilité du jour : le créneau n'est pas réservable en ligne. */
  .day-col.off { background: repeating-linear-gradient(45deg, #FAFAFC, #FAFAFC 6px, #F2F1F7 6px, #F2F1F7 12px); }
  .day-col.off:hover { background: var(--paper); }
  .day-col.blocked { background: #FDF4F3; cursor: not-allowed; }
  .day-col.blocked:hover { background: #FDEDEC; }
  /* Piste de placement : couvre toute la hauteur de la journée sans intercepter
     les clics, pour que les cases vides restent cliquables (créer un rendez-vous). */
  .day-piste { position: absolute; top: 0; left: 0; right: 0; pointer-events: none; z-index: 2; }
  .day-piste > * { pointer-events: auto; }

  /* Carte d'un rendez-vous : heure, client, téléphone, service, pastille d'état. */
  .appt-block {
    position: absolute; border-radius: 12px; padding: 9px 11px; overflow: hidden;
    border: 1px solid; cursor: pointer; box-shadow: 0 1px 3px rgba(18,36,47,0.06);
    display: flex; flex-direction: column; gap: 2px; min-width: 0;
    transition: transform .1s ease, box-shadow .1s ease;
  }
  .appt-block:hover { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(18,36,47,0.16); z-index: 5; }
  .appt-block > span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .appt-heure { font-size: 11px; color: var(--ink-soft); font-variant-numeric: tabular-nums; padding-right: 26px; }
  .appt-block .appt-client { font-size: 13px; font-weight: 700; color: var(--ink); padding-right: 26px; }
  .appt-block .appt-tel { font-size: 11.5px; color: var(--ink-soft); font-variant-numeric: tabular-nums; }
  .appt-block .appt-service { font-size: 11.5px; color: var(--ink-soft); }

  /* Pastille d'état : la forme porte le sens, la couleur ne fait que l'appuyer. */
  /* En vue Jour la colonne fait toute la largeur : on cadre la carte pour
     qu'elle reste une carte, et le reste de la ligne demeure cliquable. */
  .day-grid:not(.week-mode) .appt-block { max-width: 360px; }

  .appt-etat {
    position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0;
  }

  /* Cartes courtes : on retire des lignes plutôt que de les tronquer. */
  .appt-moyen { padding: 6px 10px; }
  .appt-moyen .appt-tel { display: none; }
  .appt-petit { padding: 4px 10px; flex-direction: row; align-items: baseline; gap: 6px; }
  .appt-petit .appt-tel, .appt-petit .appt-service { display: none; }
  .appt-petit .appt-heure { padding-right: 0; flex-shrink: 0; }
  .appt-petit .appt-client { padding-right: 22px; font-size: 12px; min-width: 0; }
  .appt-petit .appt-etat { top: 50%; transform: translateY(-50%); width: 18px; height: 18px; }
  .appt-petit .appt-etat svg { width: 11px; height: 11px; }

  /* Colonnes resserrées : on sacrifie le téléphone avant le nom et le service. */
  @media (max-width: 1280px) {
    .week-mode .appt-block .appt-tel { display: none; }
  }
  @media (max-width: 900px) {
    .appt-block .appt-tel { display: none; }
  }

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
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .legend-dot-off { background: repeating-linear-gradient(45deg, #FAFAFC, #FAFAFC 2px, #DEDCE8 2px, #DEDCE8 4px); border: 1px solid var(--line); }
  .legend-dot-blocked { background: #F7D3D0; border: 1px solid #E9B5B1; }

  /* La vue Semaine partage la grille horaire de la vue Jour : seules les
     en-têtes de colonne changent. Sous 900 px on défile latéralement plutôt que
     d'écraser sept colonnes dans un écran de téléphone. */
  .day-col-head.today .day-col-head-name { color: var(--primary-dark); }
  .day-col-head.today .day-col-head-role { color: var(--primary); }
  .day-col-head.today { background: var(--primary-tint); }

  @media (max-width: 900px) {
    .week-mode { overflow-x: auto; }
    .week-mode .day-grid-head, .week-mode .day-grid-body { min-width: 760px; }
  }

  .month-grid { display: grid; grid-template-columns: repeat(7, minmax(0,1fr)); gap: 8px; }
  .month-dow { font-size: 11px; font-weight: 700; color: var(--ink-soft); text-align: center; padding-bottom: 4px; }
  .month-cell { background: var(--card); border: 1px solid var(--line); border-radius: 10px; min-height: 108px; padding: 7px 8px; cursor: pointer; font-size: 11.5px; overflow: hidden; }
  .month-cell:hover { border-color: var(--primary); }
  .month-cell.muted { opacity: .4; }
  .month-cell.today { border-color: var(--primary); border-width: 1.5px; }
  .month-cell.blocked { background: #FDF4F3; border-color: #F2D9D6; }
  .month-cell.closed { background: var(--paper); }
  .month-cell-num { font-weight: 700; margin-bottom: 4px; }
  .month-cell-appt { display: block; font-size: 10px; padding: 2px 5px; margin-bottom: 3px; border-left: 2.5px solid; background: var(--paper); border-radius: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .month-cell-count { display: inline-block; background: var(--primary-tint); color: var(--primary-dark); font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 999px; }
  @media (max-width: 720px) { .month-cell { min-height: 64px; } .month-cell-appt { display: none; } }

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


  /* ---------- Images des services ----------
     Le format est imposé (ratio fixe + object-fit: cover) : sans cela, une
     photo en portrait et une en paysage donneraient deux cartes de hauteurs
     différentes, et la grille perdrait son alignement. */
  .service-vignette {
    height: 132px; margin: -16px -16px 12px; overflow: hidden;
    border-radius: 12px 12px 0 0; background: var(--paper);
  }
  .service-vignette img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .service-carte:hover .service-vignette img { transform: scale(1.03); }
  .service-vignette img { transition: transform .35s ease; }
  @media (prefers-reduced-motion: reduce) { .service-vignette img { transition: none; } }

  .cell-service { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .service-vignette-mini {
    width: 38px; height: 38px; border-radius: 9px; overflow: hidden; flex-shrink: 0;
    background: var(--paper); border: 1px solid var(--line); display: block;
  }
  .service-vignette-mini img { width: 100%; height: 100%; object-fit: cover; display: block; }

  /* ---------- Choix de l'image dans le formulaire ---------- */
  .img-choix { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .img-apercu {
    width: 104px; height: 74px; flex-shrink: 0; overflow: hidden;
    border: 1px solid var(--line); border-radius: 10px; background: var(--paper);
    display: flex; align-items: center; justify-content: center;
  }
  .img-apercu img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .img-apercu.vide::after {
    content: "Aucune image"; font-size: 10.5px; color: var(--ink-soft);
    text-align: center; padding: 0 8px; line-height: 1.35;
  }
  .img-apercu.cassee::after { content: "Image introuvable"; color: var(--st-annule); }
  .img-apercu.chargement { opacity: .45; }
  .img-choix-actions { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }

  /* ---------- Assistant IA : pastille flottante (CDC II.20) ----------
     Le composant AssistantWidget n'apporte aucune couleur : tout le style de
     l'Espace Professionnel est ici. Sur le site public, les memes classes
     portent une etiquette large ; ici, une pastille ronde qui flotte. */
  .assistant-fab {
    position: fixed; right: 24px; bottom: 24px; z-index: 90;
    width: 62px; height: 62px; padding: 0; border-radius: 50%; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(145deg, var(--primary), var(--primary-dark));
    color: #fff;
    box-shadow: 0 14px 30px -10px rgba(137, 87, 255, .55);
    animation: robot-idle-float 3s ease-in-out infinite;
    transition: box-shadow .18s ease, filter .18s ease;
  }
  .assistant-fab:hover { box-shadow: 0 18px 38px -10px rgba(137, 87, 255, .7); filter: brightness(1.06); }
  .assistant-fab:active { animation: robot-wiggle .4s ease; }
  .assistant-fab:focus-visible { outline: 3px solid var(--primary-tint); outline-offset: 3px; }
  .assistant-fab.est-ouvert { animation: none; background: var(--ink); box-shadow: 0 10px 24px -10px rgba(27, 23, 48, .6); }

  /* L'etiquette du site public n'a pas de place ici : la pastille se suffit. */
  .assistant-fab-label { display: none; }
  .assistant-fab-avatar { display: flex; align-items: center; justify-content: center; }
  .assistant-fab-avatar svg { width: 28px; height: 28px; }

  .assistant-fab-badge {
    position: absolute; top: 4px; right: 4px; width: 12px; height: 12px;
    border-radius: 50%; background: var(--st-annule); border: 2px solid var(--card);
  }

  @media (prefers-reduced-motion: reduce) {
    .assistant-fab { animation: none; transition: none; }
    .assistant-fab:active { animation: none; }
  }

  /* ---------- Panneau de discussion ---------- */
  .assistant-panel {
    position: fixed; right: 24px; bottom: 100px; z-index: 91;
    width: 384px; max-width: calc(100vw - 48px);
    height: 560px; max-height: calc(100vh - 150px);
    display: flex; flex-direction: column; overflow: hidden;
    background: var(--card); border: 1px solid var(--line); border-radius: 18px;
    box-shadow: 0 30px 60px -24px rgba(27, 23, 48, .45);
    animation: assistant-apparition .18s ease-out;
  }
  @keyframes assistant-apparition { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .assistant-panel { animation: none; } }

  .assistant-panel-header {
    display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    padding: 13px 14px; border-bottom: 1px solid var(--line);
  }
  .assistant-panel-avatar {
    width: 34px; height: 34px; border-radius: 11px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--primary-tint); color: var(--primary-dark);
  }
  .assistant-panel-avatar svg { width: 19px; height: 19px; }
  .assistant-panel-ident { min-width: 0; flex: 1; }
  .assistant-panel-title { margin: 0; font-size: 14px; font-weight: 800; color: var(--ink); }
  .assistant-panel-subtitle { margin: 0; font-size: 11px; color: var(--ink-soft); }
  .assistant-panel-action, .assistant-panel-close {
    width: 30px; height: 30px; flex-shrink: 0; padding: 0; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    background: none; border: 1px solid transparent; border-radius: 9px; color: var(--ink-soft);
  }
  .assistant-panel-action svg, .assistant-panel-close svg { width: 15px; height: 15px; }
  .assistant-panel-action:hover, .assistant-panel-close:hover { background: var(--paper); color: var(--ink); border-color: var(--line); }

  /* ---------- Messages ---------- */
  .assistant-panel-body {
    flex: 1; min-height: 0; overflow-y: auto; padding: 16px;
    display: flex; flex-direction: column; gap: 12px;
  }
  .assistant-msg-row { display: flex; gap: 9px; align-items: flex-start; }
  .assistant-msg-row-user { flex-direction: row-reverse; }
  .assistant-msg-avatar {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: var(--primary); color: #fff;
  }
  .assistant-msg-avatar svg { width: 15px; height: 15px; }
  .assistant-msg-bubble {
    background: var(--paper); border-radius: 12px; padding: 9px 13px;
    font-size: 12.5px; line-height: 1.55; max-width: 78%; color: var(--ink);
    overflow-wrap: anywhere;
  }
  .assistant-msg-user { background: var(--primary-tint); color: var(--primary-dark); }
  .assistant-msg-bubble strong { font-weight: 700; }
  .assistant-msg-para { margin: 0 0 6px; }
  .assistant-msg-para:last-child { margin-bottom: 0; }
  .assistant-msg-list { margin: 0 0 6px; padding-left: 17px; }
  .assistant-msg-list:last-child { margin-bottom: 0; }
  .assistant-msg-list li { margin-bottom: 3px; }

  /* Attente : trois points. Pas de barre de progression, la duree est inconnue. */
  .assistant-msg-attente { display: flex; gap: 4px; align-items: center; padding: 12px 13px; }
  .assistant-msg-attente span {
    width: 6px; height: 6px; border-radius: 50%; background: var(--ink-soft);
    animation: assistant-point 1.2s infinite ease-in-out;
  }
  .assistant-msg-attente span:nth-child(2) { animation-delay: .15s; }
  .assistant-msg-attente span:nth-child(3) { animation-delay: .3s; }
  @keyframes assistant-point { 0%, 60%, 100% { opacity: .25; } 30% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .assistant-msg-attente span { animation: none; opacity: .5; } }

  /* ---------- Questions rapides ---------- */
  .assistant-suggestions {
    display: flex; gap: 6px; overflow-x: auto; flex-shrink: 0;
    padding: 10px 16px; border-top: 1px solid var(--line);
  }
  .assistant-suggestions button {
    white-space: nowrap; font-family: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer;
    padding: 6px 11px; border-radius: 999px;
    background: var(--card); border: 1px solid var(--line); color: var(--ink-soft);
  }
  .assistant-suggestions button:hover:not(:disabled) { border-color: var(--primary); color: var(--primary-dark); }
  .assistant-suggestions button:disabled { opacity: .5; cursor: default; }

  /* ---------- Saisie ---------- */
  .assistant-panel-input {
    display: flex; gap: 8px; flex-shrink: 0;
    padding: 12px 14px; border-top: 1px solid var(--line);
  }
  .assistant-panel-input input {
    flex: 1; min-width: 0; padding: 10px 13px; font-family: inherit; font-size: 12.5px;
    border: 1px solid var(--line); border-radius: 999px; background: var(--card); color: var(--ink);
  }
  .assistant-panel-input input:focus { outline: none; border-color: var(--primary); }
  .assistant-panel-input button {
    width: 38px; height: 38px; flex-shrink: 0; border: none; border-radius: 50%; cursor: pointer;
    background: var(--primary); color: #fff;
    display: flex; align-items: center; justify-content: center;
  }
  .assistant-panel-input button:hover:not(:disabled) { background: var(--primary-dark); }
  .assistant-panel-input button:disabled { opacity: .45; cursor: default; }

  /* Sur mobile, le panneau occupe l'ecran plutot que de flotter a l'etroit. */
  @media (max-width: 560px) {
    .assistant-fab { right: 16px; bottom: 16px; width: 54px; height: 54px; }
    .assistant-fab-avatar svg { width: 25px; height: 25px; }
    .assistant-panel {
      right: 12px; left: 12px; bottom: 80px; width: auto; max-width: none;
      height: calc(100vh - 110px); max-height: none;
    }
  }

  /* ---------- Agenda : mise en page centre + rail permanent ---------- */
  .agenda-layout { display: grid; grid-template-columns: minmax(0, 1fr) 306px; gap: 16px; align-items: start; }
  .agenda-layout.is-list { grid-template-columns: minmax(0, 1fr); }
  .agenda-centre { min-width: 0; }

  /* Indicateurs du CDC II.3, ramenés au-dessus du planning. */
  .agenda-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)); gap: 10px; margin-bottom: 14px; }
  .agenda-kpi {
    background: var(--card); border: 1px solid var(--line); border-radius: 12px;
    padding: 10px 14px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .agenda-kpi-ic { display: inline-flex; color: var(--primary); flex-shrink: 0; }
  .agenda-kpi-val { font-size: 19px; font-weight: 800; line-height: 1; }
  .agenda-kpi-lab { font-size: 11px; color: var(--ink-soft); font-weight: 600; width: 100%; }

  .agenda-legende {
    display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; padding: 12px 16px;
    background: var(--card); border: 1px solid var(--line); border-radius: 12px;
  }

  .agenda-rail { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 80px; }
  .agenda-rail-tete { display: none; align-items: center; justify-content: space-between; font-weight: 700; font-size: 14px; }
  .rail-bloc { padding: 14px 16px; }
  .rail-titre { font-size: 12px; font-weight: 700; margin-bottom: 10px; }
  .rail-statut { display: flex; align-items: center; gap: 9px; padding: 6px 0; font-size: 12.5px; }
  .rail-statut-label { color: var(--ink-soft); }
  .rail-statut-n { margin-left: auto; font-variant-numeric: tabular-nums; }
  .rail-vide { font-size: 12px; color: var(--ink-soft); padding: 4px 0; }
  .rail-rdv {
    display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 0;
    background: none; border: none; border-top: 1px solid var(--line); cursor: pointer;
    font-family: inherit; text-align: left; color: var(--ink);
  }
  .rail-bloc .rail-rdv:first-of-type { border-top: none; }
  .rail-rdv:hover { color: var(--primary-dark); }
  .rail-rdv-txt { display: flex; flex-direction: column; min-width: 0; flex: 1; }
  .rail-rdv-txt b { font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rail-rdv-txt span { font-size: 11px; color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rail-rdv svg { color: var(--ink-soft); flex-shrink: 0; }

  .agenda-side-tab { display: none; }
  .agenda-rail-fond { display: none; }

  /* Sous 1200 px le rail redevient un tiroir : le planning garde toute la largeur. */
  @media (max-width: 1200px) {
    .agenda-layout { grid-template-columns: minmax(0, 1fr); }
    .agenda-rail {
      position: fixed; top: 0; right: 0; bottom: 0; width: 320px; max-width: 88vw; z-index: 70;
      background: var(--paper); border-left: 1px solid var(--line); padding: 16px;
      overflow-y: auto; transform: translateX(105%); transition: transform .25s ease;
    }
    .agenda-rail.open { transform: translateX(0); }
    .agenda-rail-tete { display: flex; }
    .agenda-side-tab {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      position: fixed; right: 0; top: 50%; transform: translateY(-50%); z-index: 60;
      background: var(--card); color: var(--ink-soft); border: 1px solid var(--line); border-right: none;
      border-radius: 12px 0 0 12px; padding: 14px 8px; cursor: pointer;
    }
    .agenda-side-tab.active, .agenda-side-tab:hover { color: var(--primary-dark); background: var(--primary-tint); }
    .agenda-rail-fond.open {
      display: block; position: fixed; inset: 0; z-index: 65; background: rgba(27, 23, 48, .35);
    }
  }

  /* ---------- Vue Jour : pause, heure courante, bloc enrichi ---------- */
  .day-pause {
    position: absolute; left: 0; right: 0; z-index: 1; pointer-events: none;
    background: repeating-linear-gradient(45deg, #F7F6FB, #F7F6FB 8px, #EFEDF6 8px, #EFEDF6 16px);
    border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; color: var(--ink-soft); letter-spacing: .02em;
  }
  /* Le repère traverse toute la grille : en vue Semaine, l'heure courante vaut
     pour les sept colonnes, pas seulement pour celle du jour affiché. */
  .day-now { position: absolute; left: 52px; right: 0; height: 2px; background: var(--st-annule); z-index: 6; pointer-events: none; }
  .day-now::before {
    content: ""; position: absolute; left: -4px; top: -3px; width: 8px; height: 8px;
    border-radius: 50%; background: var(--st-annule);
  }
  .day-now-heure {
    position: absolute; left: 6px; transform: translateY(-50%); z-index: 7; pointer-events: none;
    background: var(--st-annule); color: #fff; font-size: 10px; font-weight: 700;
    padding: 2px 6px; border-radius: 6px; font-variant-numeric: tabular-nums;
  }
  .appt-block .appt-tel { font-size: 10.5px; color: var(--ink-soft); font-variant-numeric: tabular-nums; white-space: nowrap; }
  @media (max-width: 1100px) { .appt-block .appt-tel { display: none; } }

  /* ---------- Graphiques (CDC II.18) ---------- */
  .gr-grille { display: grid; grid-template-columns: 1.6fr 1fr; gap: 16px; align-items: start; margin-top: 18px; }
  .gr-grille .gr-pleine { grid-column: 1 / -1; }
  @media (max-width: 1000px) { .gr-grille { grid-template-columns: 1fr; } }

  .gr-carte .card-head { align-items: baseline; }
  .gr-sous-titre { font-size: 11.5px; color: var(--ink-soft); font-weight: 600; }
  /* La carte englobe le graphique ET son axe : pas de mini-ascenseur interne. */
  .gr-corps { padding: 16px 18px 18px; }

  .gr-wrap { position: relative; }
  .gr-svg { width: 100%; height: auto; display: block; overflow: visible; }
  .gr-zone { cursor: crosshair; }
  .gr-zone:focus, .gr-barre:focus { outline: none; }
  .gr-zone:focus-visible, .gr-barre:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  .gr-barre { cursor: default; }
  .gr-barre:hover .gr-barre-marque, .gr-barre:focus-visible .gr-barre-marque { opacity: .82; }

  /* La valeur mène, le libellé suit : ici le lecteur a la catégorie, il veut le nombre. */
  .gr-tooltip[hidden] { display: none; }
  .gr-tooltip {
    position: absolute; transform: translate(-50%, -100%); pointer-events: none; z-index: 5;
    background: var(--ink); color: #fff; border-radius: 9px; padding: 7px 11px;
    display: flex; flex-direction: column; gap: 1px; white-space: nowrap;
    box-shadow: 0 10px 24px -10px rgba(10, 10, 26, .55);
  }
  .gr-tooltip strong { font-size: 14px; font-weight: 800; line-height: 1.1; }
  .gr-tooltip span { font-size: 11px; opacity: .8; }
  .gr-tooltip em { font-size: 10.5px; font-style: normal; opacity: .65; }


  .gr-bars { display: flex; flex-direction: column; gap: 14px; }
  .gr-bar { display: grid; grid-template-columns: minmax(90px, 190px) 1fr auto; align-items: center; gap: 14px; }
  .gr-bar:focus { outline: none; }
  .gr-bar:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; border-radius: 6px; }
  .gr-bar-nom { font-size: 12.5px; color: var(--ink); text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gr-bar-piste { height: 20px; background: var(--paper); border-radius: 5px; overflow: hidden; }
  /* Extrémité arrondie côté valeur, carrée sur la ligne de base. */
  .gr-bar-marque { display: block; height: 100%; background: var(--primary); border-radius: 0 5px 5px 0; transition: width .35s ease; }
  .gr-bar:hover .gr-bar-marque, .gr-bar:focus-visible .gr-bar-marque { opacity: .82; }
  .gr-bar-val { font-size: 12px; font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; min-width: 28px; }
  @media (max-width: 720px) { .gr-bar { grid-template-columns: minmax(70px, 120px) 1fr auto; gap: 10px; } }
  .gr-jauge { display: flex; flex-direction: column; gap: 14px; }
  .gr-jauge-tete { display: flex; flex-direction: column; gap: 2px; }
  /* Chiffres proportionnels : tabular-nums ferait respirer ce grand nombre à tort. */
  .gr-jauge-valeur { font-size: 42px; font-weight: 800; line-height: 1; color: var(--ink); }
  .gr-jauge-unite { font-size: 20px; font-weight: 700; color: var(--ink-soft); margin-left: 2px; }
  .gr-jauge-legende { font-size: 12px; color: var(--ink-soft); }
  /* Piste = teinte claire de la même rampe, pour que l'état se lise sur toute la barre. */
  .gr-jauge-piste { height: 12px; border-radius: 999px; background: var(--primary-tint); overflow: hidden; }
  .gr-jauge-remplissage { height: 100%; background: var(--primary); border-radius: 999px; transition: width .4s ease; }

  .gr-tableau { margin-top: 14px; border-top: 1px solid var(--line); padding-top: 10px; }
  .gr-tableau summary { font-size: 12px; font-weight: 700; color: var(--ink-soft); cursor: pointer; }
  .gr-tableau summary:hover { color: var(--ink); }
  .gr-tableau table { margin-top: 10px; }
  .gr-tableau td, .gr-tableau th { padding: 7px 12px; }

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
    .field-2col { grid-template-columns: 1fr; }
    .detail-grid { grid-template-columns: 1fr; }
    .page-head-global { padding: 20px 16px 4px; }
    .page { padding: 14px 16px 60px; }
    .agenda-toolbar-right { margin-left: 0; width: 100%; }
    .agenda-add, .agenda-add > .btn { width: 100%; justify-content: center; }
    .agenda-add-menu { width: 100%; }
    .date-nav-label { min-width: 0; flex: 1; }
    .dispo-day-label { width: 100%; }
    /* Les tableaux larges défilent dans leur carte, jamais la page entière. */
    .card > table.data-table { display: block; overflow-x: auto; white-space: nowrap; }
  }

      `}</style>
      <div className="app">
        <ProNavbar />

        <div className="main">

          <div className="page-head-global" id="pageHeadGlobal" style={{ display: "none" }}>
            <div id="pageActionsMain"></div>
          </div>

          {/* Agenda unifié : calendrier, liste des réservations, disponibilités et
          indisponibilités. Remplace les anciennes sections « rdv » et « dispo ». */}
          <section className="page active" id="page-agenda"></section>

          <section className="page" id="page-clients"></section>
          <section className="page" id="page-services"></section>
          <section className="page" id="page-receptionnistes"></section>

          {/* Accès secondaires — menu « Plus » */}
          <section className="page" id="page-stats"></section>
          <section className="page" id="page-historique"></section>
          <section className="page" id="page-params"></section>
    
          <section className="page" id="page-notifs"></section>
          <section className="page" id="page-profil"></section>
        </div>
      </div>


      {/* Assistant IA : bulle flottante disponible sur tous les écrans (CDC II.20) */}
      <AssistantWidget
        mode="pro"
        icone="robot"
        title="Mon Assistant"
        greeting={`Bonjour${prenomPro ? ' ' + prenomPro : ''}. Je peux résumer votre agenda, retrouver un client ou un rendez-vous, ou faire le point sur votre activité. Que souhaitez-vous savoir ?`}
        suggestions={[
          "Rendez-vous aujourd'hui",
          'Mes prochains rendez-vous',
          'Mes créneaux disponibles',
          'Services les plus réservés',
          'Clients à absences répétées',
          'Bilan de mon activité',
        ]}
      />

  <div id="modalRoot"></div>
      <div id="toast" className="toast"></div>



    </>
  );
}