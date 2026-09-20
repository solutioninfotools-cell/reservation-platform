// @ts-nocheck -- vue portée depuis un script JS existant, branchée sur l'API publique réelle (/api/public)
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicApi, assistantApi } from '../api/public.api';

export default function CrenoPagePublique() {
  const navigate = useNavigate();

  useEffect(() => {
    const ac = new AbortController();
    const __intervals: number[] = [];
    const __timeouts: number[] = [];
    const __observers: IntersectionObserver[] = [];
    (window as any).__intervals = __intervals;
    (window as any).__timeouts = __timeouts;
    (window as any).__observers = __observers;

    /* =========================================================
       DONNÉES — l'espace, les professionnels, les services et les
       créneaux proviennent tous de l'API publique. Aucune donnée
       n'est simulée : ce qui n'est pas configuré n'est pas affiché.
       ========================================================= */
    let ESPACE = null;
    let PROS = [];
    let SERVICES = [];
    let SELECTED_PRO = null;

    const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

    window.esc = function esc(value) {
      if (value === null || value === undefined) return "";
      return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }
    window.fmtPrix = function fmtPrix(centimes) {
      return centimes === null || centimes === undefined ? null : (centimes / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DA";
    }
    window.fmtDateLong = function fmtDateLong(date) {
      return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    }
    window.toDateInput = function toDateInput(date) {
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }
    window.toHM = function toHM(value) {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? "" : String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    }
    window.setText = function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }

    /* ---------------------------------------------------------
       Chargement de l'espace et de ses services
       --------------------------------------------------------- */
    window.loadEspace = async function loadEspace() {
      try {
        ESPACE = await publicApi.getEspace();
      } catch (e) {
        // Espace non configuré ou serveur indisponible : on le dit, on n'invente rien.
        document.getElementById("services-grid").innerHTML = `<p class="cr-empty">Cet espace n'est pas encore configuré. Revenez bientôt.</p>`;
        setText("hours-list", "");
        return;
      }
      PROS = ESPACE.professionnels || [];
      SELECTED_PRO = PROS[0] || null;
      renderEspaceInfos();
      renderHours();
      renderProSelector();
      await loadServices();
    }

    window.renderEspaceInfos = function renderEspaceInfos() {
      const nom = ESPACE.platformName || "Réservation en ligne";
      const domaine = [ESPACE.domaine, ESPACE.address].filter(Boolean).join(" · ");
      setText("brandName", nom);
      setText("brandDomain", domaine || "Prise de rendez-vous");
      document.title = nom;

      const heroTitle = document.getElementById("heroTitle");
      if (heroTitle) heroTitle.innerHTML = ESPACE.slogan ? esc(ESPACE.slogan) : `Prenez rendez-vous avec <span class="accent">${esc(nom)}</span> en ligne.`;
      setText("heroDesc", ESPACE.description || "Choisissez un service, une date et un créneau réellement disponible.");

      const eyebrow = document.getElementById("heroEyebrowText");
      if (eyebrow) eyebrow.textContent = [ESPACE.domaine, ESPACE.address].filter(Boolean).join(" · ") || nom;

      // Bandeau d'informations : seules les valeurs renseignées sont affichées.
      const infos = [
        ESPACE.address ? { icon: "pin", text: ESPACE.address } : null,
        ESPACE.phone ? { icon: "phone", text: ESPACE.phone } : null,
        ESPACE.horairesGeneraux ? { icon: "clock", text: ESPACE.horairesGeneraux } : null,
        ESPACE.email ? { icon: "mail", text: ESPACE.email } : null,
      ].filter(Boolean);
      const ICONS = {
        pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
        phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>',
        clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
        mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
      };
      const row = document.getElementById("heroInfoRow");
      if (row) {
        row.innerHTML = infos.map((i) => `<span class="cr-info-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[i.icon]}</svg>${esc(i.text)}</span>`).join("");
      }
      const joursLabel = (ESPACE.joursOuvrables || []).join(", ");
      setText("heroHoursTitle", [joursLabel, ESPACE.horairesGeneraux].filter(Boolean).join(" · ") || "Horaires non renseignés");
      setText("footerName", [nom, ESPACE.address].filter(Boolean).join(" — "));
    }

    // Les jours ouvrables et les horaires viennent de la configuration de l'espace.
    window.renderHours = function renderHours() {
      const list = document.getElementById("hours-list");
      if (!list) return;
      const ouverts = ESPACE.joursOuvrables || [];
      if (!ouverts.length && !ESPACE.horairesGeneraux) {
        list.innerHTML = `<p class="cr-empty">Horaires non renseignés.</p>`;
        return;
      }
      list.innerHTML = JOURS.map((j) => {
        const ouvert = ouverts.includes(j);
        return `<div class="hours-row${ouvert ? "" : " closed"}"><span>${j}</span><span class="hours-value">${ouvert ? esc(ESPACE.horairesGeneraux || "Ouvert") : "Fermé"}</span></div>`;
      }).join("");
    }

    // Un espace peut réunir plusieurs praticiens : on ne choisit pour le client
    // que s'il n'y en a qu'un.
    window.renderProSelector = function renderProSelector() {
      const wrap = document.getElementById("proSelector");
      if (!wrap) return;
      if (PROS.length <= 1) { wrap.innerHTML = ""; wrap.style.display = "none"; return; }
      wrap.style.display = "flex";
      wrap.innerHTML = PROS.map((p) => `<button type="button" class="pro-chip${SELECTED_PRO && p.id === SELECTED_PRO.id ? " active" : ""}" onclick="selectPro('${esc(p.id)}')">${esc(p.nom)}${p.specialite ? ` · ${esc(p.specialite)}` : ""}</button>`).join("");
    }
    window.selectPro = async function selectPro(id) {
      SELECTED_PRO = PROS.find((p) => p.id === id) || SELECTED_PRO;
      renderProSelector();
      await loadServices();
    }

    window.loadServices = async function loadServices() {
      const grid = document.getElementById("services-grid");
      if (!grid) return;
      if (!SELECTED_PRO) {
        grid.innerHTML = `<p class="cr-empty">Aucun professionnel n'est encore actif sur cet espace.</p>`;
        return;
      }
      grid.innerHTML = `<p class="cr-empty">Chargement des services…</p>`;
      try {
        SERVICES = await publicApi.getServices(SELECTED_PRO.id);
      } catch (e) {
        grid.innerHTML = `<p class="cr-empty">Les services n'ont pas pu être chargés.</p>`;
        return;
      }
      if (!SERVICES.length) {
        grid.innerHTML = `<p class="cr-empty">Aucun service n'est proposé à la réservation pour le moment.</p>`;
        return;
      }
      grid.innerHTML = "";
      SERVICES.forEach((s, i) => {
        const prix = fmtPrix(s.prix);
        const card = document.createElement("div");
        card.className = "service-card reveal visible";
        card.style.transitionDelay = (i * 0.08) + "s";
        // Pas d'image de remplacement : seules les images réellement renseignées s'affichent.
        card.innerHTML = `
          ${s.imageUrl ? `<div class="service-image-wrap">
            <img class="service-image" src="${esc(s.imageUrl)}" alt="${esc(s.nom)}" loading="lazy" />
            <span class="service-image-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${s.dureeMinutes} min
            </span>
          </div>` : ""}
          <div class="service-body">
            <div class="service-top">
              <div>
                <p class="service-name">${esc(s.nom)}</p>
                ${s.description ? `<p class="service-note">${esc(s.description)}</p>` : ""}
              </div>
              ${prix ? `<div class="service-price">${esc(prix)}</div>` : ""}
            </div>
            <div class="service-bottom">
              <span class="service-duration">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ${s.dureeMinutes} min
              </span>
              ${s.statut === "DISPONIBLE"
                ? `<button class="service-cta" onclick="openBooking('${esc(s.id)}')">Réserver
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>`
                : `<span class="service-unavailable">${s.statut === "COMPLET" ? "Complet" : "Indisponible"}</span>`}
            </div>
          </div>`;
        grid.appendChild(card);
      });
    }

    /* ---- Animations au scroll (fade + montée) ---- */
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
    __observers.push(revealObserver);
    document.querySelectorAll(".cr-floating, .cr-trust-item, .info-card").forEach((el, i) => {
      el.classList.add("reveal");
      el.style.transitionDelay = (i * 0.06) + "s";
      revealObserver.observe(el);
    });

    /* ---- Parallaxe souris sur la photo du hero (décor seul) ---- */
    const heroSection = document.querySelector(".cr-hero-photo");
    const heroImgs = document.querySelectorAll(".cr-hero-bg");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (heroSection && heroImgs.length && !prefersReducedMotion) {
      heroSection.addEventListener("mousemove", (e) => {
        const rect = heroSection.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width - 0.5;
        const relY = (e.clientY - rect.top) / rect.height - 0.5;
        heroImgs.forEach((img) => {
          img.style.setProperty("--px", (relX * -20) + "px");
          img.style.setProperty("--py", (relY * -14) + "px");
        });
      }, { signal: ac.signal });
      heroSection.addEventListener("mouseleave", () => {
        heroImgs.forEach((img) => {
          img.style.setProperty("--px", "0px");
          img.style.setProperty("--py", "0px");
        });
      }, { signal: ac.signal });
    }

    /* =========================================================
       Réservation : calendrier → créneaux réels → formulaire → confirmation
       ========================================================= */
    const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

    const booking = {
      serviceId: null,
      step: 1,
      days: [],
      selectedDay: null,    // objet Date
      slots: [],            // créneaux ISO renvoyés par le backend
      slotsLoading: false,
      selectedSlot: null,   // ISO exact du créneau retenu
      patient: { nom: "", prenom: "", telephone: "", email: "", note: "" },
      submitting: false,
      error: "",
    };
    let confirmed = null;   // rendez-vous réellement créé (réponse du backend)

    window.currentService = function currentService() { return SERVICES.find((s) => s.id === booking.serviceId) || null; }

    window.buildDays = function buildDays() {
      const days = [];
      const today = new Date();
      for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        days.push(d);
      }
      booking.days = days;
    }

    window.openBooking = function openBooking(serviceId) {
      const service = SERVICES.find((s) => s.id === serviceId) || SERVICES.find((s) => s.statut === "DISPONIBLE");
      if (!service) { alert("Aucun service n'est disponible à la réservation."); return; }
      booking.serviceId = service.id;
      booking.step = 1;
      booking.selectedDay = null;
      booking.slots = [];
      booking.selectedSlot = null;
      booking.error = "";
      confirmed = null;
      buildDays();
      const overlay = document.getElementById("bookingOverlay");
      overlay.classList.add("open");
      requestAnimationFrame(() => overlay.classList.add("visible"));
      document.body.style.overflow = "hidden";
      renderBookingStep();
    }

    window.closeBooking = function closeBooking() {
      const overlay = document.getElementById("bookingOverlay");
      overlay.classList.remove("visible");
      document.body.style.overflow = "";
      setTimeout(() => overlay.classList.remove("open"), 200);
    }

    window.updateProgress = function updateProgress() {
      [1, 2, 3].forEach((n) => {
        const dot = document.getElementById("dot" + n);
        if (!dot) return;
        dot.classList.toggle("active", n === booking.step);
        dot.classList.toggle("done", n < booking.step);
      });
    }

    // Les créneaux affichés sont exactement ceux calculés par le backend :
    // disponibilités du professionnel, fermetures et rendez-vous déjà pris.
    window.loadSlots = async function loadSlots() {
      if (!booking.selectedDay || !booking.serviceId || !SELECTED_PRO) return;
      booking.slotsLoading = true;
      booking.slots = [];
      booking.selectedSlot = null;
      renderBookingStep();
      try {
        const res = await publicApi.getSlots(SELECTED_PRO.id, booking.serviceId, toDateInput(booking.selectedDay));
        booking.slots = res.creneaux || [];
        booking.error = "";
      } catch (e) {
        booking.slots = [];
        booking.error = "Les créneaux n'ont pas pu être chargés pour cette date.";
      }
      booking.slotsLoading = false;
      renderBookingStep();
    }

    window.renderBookingStep = function renderBookingStep() {
      updateProgress();
      const service = currentService();
      const titleEl = document.getElementById("bookingTitle");
      const zone = document.getElementById("bookingStepContent");
      if (!zone) return;
      zone.innerHTML = "";
      const panel = document.createElement("div");
      panel.className = "booking-panel";

      if (booking.step === 1) {
        titleEl.textContent = "Choisissez un créneau";
        const calGrid = document.createElement("div");
        calGrid.className = "booking-cal-grid";
        booking.days.forEach((d, i) => {
          const cell = document.createElement("div");
          cell.className = "booking-day" + (booking.selectedDay && d.toDateString() === booking.selectedDay.toDateString() ? " selected" : "");
          cell.style.animationDelay = (i * 0.025) + "s";
          cell.innerHTML = `<span class="dow">${DAY_NAMES[d.getDay()]}</span><span class="num">${d.getDate()}</span>`;
          cell.onclick = () => { booking.selectedDay = d; loadSlots(); };
          calGrid.appendChild(cell);
        });
        panel.appendChild(calGrid);

        if (booking.selectedDay) {
          const label = document.createElement("p");
          label.className = "booking-slots-label";
          label.textContent = `Créneaux disponibles — ${fmtDateLong(booking.selectedDay)}`;
          panel.appendChild(label);

          if (booking.slotsLoading) {
            const p = document.createElement("p");
            p.className = "cr-empty";
            p.textContent = "Chargement des créneaux…";
            panel.appendChild(p);
          } else if (!booking.slots.length) {
            const p = document.createElement("p");
            p.className = "cr-empty";
            p.textContent = booking.error || "Aucun créneau disponible ce jour-là. Choisissez une autre date.";
            panel.appendChild(p);
          } else {
            const slotsWrap = document.createElement("div");
            slotsWrap.className = "booking-slots";
            booking.slots.forEach((iso, i) => {
              const slot = document.createElement("div");
              slot.className = "booking-slot" + (booking.selectedSlot === iso ? " selected" : "");
              slot.style.animationDelay = (i * 0.02) + "s";
              slot.textContent = toHM(iso);
              slot.onclick = () => { booking.selectedSlot = iso; renderBookingStep(); };
              slotsWrap.appendChild(slot);
            });
            panel.appendChild(slotsWrap);
          }
        }

        const nav = document.createElement("div");
        nav.className = "booking-nav";
        nav.innerHTML = `<span></span>`;
        const nextBtn = document.createElement("button");
        nextBtn.className = "booking-btn booking-btn-primary";
        nextBtn.textContent = "Continuer";
        nextBtn.disabled = !booking.selectedSlot;
        nextBtn.onclick = () => { booking.step = 2; renderBookingStep(); };
        nav.appendChild(nextBtn);
        panel.appendChild(nav);

      } else if (booking.step === 2) {
        titleEl.textContent = "Vos coordonnées";
        const formBox = document.createElement("div");
        const prix = fmtPrix(service?.prix);
        const recap = document.createElement("div");
        recap.className = "booking-recap";
        recap.innerHTML = `<span><b>${esc(service?.nom || "")}</b> · ${service?.dureeMinutes || 0} min${prix ? ` · ${esc(prix)}` : ""}</span><span>${fmtDateLong(booking.selectedDay)} à ${toHM(booking.selectedSlot)}</span>`;
        formBox.appendChild(recap);

        formBox.innerHTML += `
          <div class="booking-field-2col">
            <div class="booking-field">
              <label>Prénom *</label>
              <input type="text" id="pPrenom" value="${esc(booking.patient.prenom)}" />
            </div>
            <div class="booking-field">
              <label>Nom *</label>
              <input type="text" id="pNom" value="${esc(booking.patient.nom)}" />
            </div>
          </div>
          <div class="booking-field">
            <label>Téléphone *</label>
            <input type="tel" id="pPhone" value="${esc(booking.patient.telephone)}" />
          </div>
          <div class="booking-field">
            <label>E-mail (pour recevoir votre lien de gestion)</label>
            <input type="email" id="pEmail" value="${esc(booking.patient.email)}" />
          </div>
          <div class="booking-field">
            <label>Motif / note (optionnel)</label>
            <textarea id="pNote">${esc(booking.patient.note)}</textarea>
          </div>
          <div class="booking-error${booking.error ? " show" : ""}" id="formError">${esc(booking.error || "Merci de renseigner votre prénom, votre nom et votre téléphone.")}</div>
        `;
        panel.appendChild(formBox);

        const nav = document.createElement("div");
        nav.className = "booking-nav";
        const backBtn = document.createElement("button");
        backBtn.className = "booking-btn booking-btn-ghost";
        backBtn.textContent = "Retour";
        backBtn.onclick = () => { booking.error = ""; booking.step = 1; renderBookingStep(); };
        const nextBtn = document.createElement("button");
        nextBtn.className = "booking-btn booking-btn-primary";
        nextBtn.textContent = booking.submitting ? "Envoi en cours…" : "Confirmer le rendez-vous";
        nextBtn.disabled = booking.submitting;
        nextBtn.onclick = submitBooking;
        nav.appendChild(backBtn);
        nav.appendChild(nextBtn);
        panel.appendChild(nav);

      } else if (booking.step === 3 && confirmed) {
        titleEl.textContent = "C'est confirmé";
        const lien = manageUrl(confirmed.manageToken);
        const prix = fmtPrix(confirmed.service?.prix);

        const head = document.createElement("div");
        head.className = "booking-confirm-head";
        head.innerHTML = `
          <div class="booking-check">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#8957FF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <h4 class="booking-confirm-title display">Rendez-vous confirmé</h4>
          <p class="booking-confirm-sub">Conservez le lien ci-dessous : il vous permet de consulter ou d'annuler votre rendez-vous.</p>
        `;
        panel.appendChild(head);

        const ticket = document.createElement("div");
        ticket.className = "ticket";
        ticket.style.animation = "none";
        ticket.style.margin = "0 auto 4px";
        ticket.innerHTML = ticketHtml(confirmed);
        panel.appendChild(ticket);

        const lienBox = document.createElement("div");
        lienBox.className = "booking-link-box";
        lienBox.innerHTML = `<label>Votre lien de gestion</label><input type="text" id="manageLink" readonly value="${esc(lien)}" /><button type="button" class="booking-btn booking-btn-ghost" onclick="copyManageLink()">Copier le lien</button>`;
        panel.appendChild(lienBox);

        const nav = document.createElement("div");
        nav.className = "booking-nav";
        nav.innerHTML = `<span></span>`;
        const doneBtn = document.createElement("button");
        doneBtn.className = "booking-btn booking-btn-primary";
        doneBtn.textContent = "Terminer";
        doneBtn.onclick = () => { closeBooking(); showRealTicket(); };
        nav.appendChild(doneBtn);
        panel.appendChild(nav);
      }

      zone.appendChild(panel);
    }

    window.manageUrl = function manageUrl(token) {
      return `${window.location.origin}/rdv/${token}`;
    }
    window.copyManageLink = function copyManageLink() {
      const el = document.getElementById("manageLink");
      if (!el) return;
      el.select();
      navigator.clipboard?.writeText(el.value);
    }

    window.ticketHtml = function ticketHtml(rdv) {
      const debut = new Date(rdv.dateDebut);
      const prix = fmtPrix(rdv.service?.prix);
      return `
        <div class="ticket-top">
          <div class="ticket-top-row">
            <div><div class="ticket-label">Client</div><div class="ticket-value">${esc(`${rdv.client?.prenom || ""} ${rdv.client?.nom || ""}`.trim())}</div></div>
            <div><div class="ticket-label">Professionnel</div><div class="ticket-value">${esc(rdv.professionnel?.nom || SELECTED_PRO?.nom || "—")}</div></div>
          </div>
        </div>
        <div class="ticket-divider-wrap"><span class="ticket-notch left"></span><span class="ticket-notch right"></span></div>
        <div class="ticket-dashes"></div>
        <div class="ticket-bottom">
          <div class="ticket-service">
            <div class="ticket-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div><div class="ticket-service-name">${esc(rdv.service?.nom || "—")}</div><div class="ticket-service-sub">${rdv.service?.dureeMinutes || 0} min${prix ? ` · ${esc(prix)}` : ""}</div></div>
          </div>
          <div class="ticket-meta">
            <div class="ticket-meta-block"><div class="ticket-label">Créneau</div><div class="ticket-value">${fmtDateLong(debut)}, ${toHM(rdv.dateDebut)}</div></div>
          </div>
        </div>`;
    }

    window.submitBooking = async function submitBooking() {
      const prenom = (document.getElementById("pPrenom")?.value || "").trim();
      const nom = (document.getElementById("pNom")?.value || "").trim();
      const telephone = (document.getElementById("pPhone")?.value || "").trim().replace(/\s/g, "");
      const email = (document.getElementById("pEmail")?.value || "").trim();
      const note = (document.getElementById("pNote")?.value || "").trim();
      booking.patient = { prenom, nom, telephone, email, note };
      if (!prenom || !nom || !telephone) {
        booking.error = "Merci de renseigner votre prénom, votre nom et votre téléphone.";
        renderBookingStep();
        return;
      }
      booking.submitting = true;
      booking.error = "";
      renderBookingStep();
      try {
        confirmed = await publicApi.createRdv({
          professionnelId: SELECTED_PRO.id,
          serviceId: booking.serviceId,
          dateDebut: booking.selectedSlot,
          nom, prenom, telephone,
          email: email || undefined,
          remarque: note || undefined,
        });
        booking.submitting = false;
        booking.step = 3;
        renderBookingStep();
      } catch (e) {
        booking.submitting = false;
        const msg = e?.response?.data?.message || "La réservation n'a pas pu être enregistrée.";
        booking.error = Array.isArray(msg) ? msg.join(", ") : msg;
        // Conflit : le créneau vient d'être pris, on revient au calendrier rafraîchi.
        if (e?.response?.status === 409) {
          booking.step = 1;
          renderBookingStep();
          loadSlots();
        } else {
          renderBookingStep();
        }
      }
    }

    // Le ticket du hero n'affiche que le rendez-vous réellement créé dans cette session.
    window.showRealTicket = function showRealTicket() {
      const heroTicket = document.getElementById("realTicket");
      if (!heroTicket || !confirmed) return;
      heroTicket.innerHTML = ticketHtml(confirmed);
      heroTicket.classList.remove("dw-hidden");
      const placeholder = document.getElementById("ticketPlaceholder");
      if (placeholder) placeholder.classList.add("dw-hidden");
    }

    /* -------- Gérer mon rendez-vous : recherche par lien de gestion -------- */
    window.openLookup = function openLookup() {
      document.getElementById("lookupResultZone").innerHTML = "";
      document.getElementById("lookupError").classList.remove("show");
      document.getElementById("lookupToken").value = confirmed ? manageUrl(confirmed.manageToken) : "";
      const overlay = document.getElementById("lookupOverlay");
      overlay.classList.add("open");
      requestAnimationFrame(() => overlay.classList.add("visible"));
      document.body.style.overflow = "hidden";
    }
    window.closeLookup = function closeLookup() {
      const overlay = document.getElementById("lookupOverlay");
      overlay.classList.remove("visible");
      document.body.style.overflow = "";
      setTimeout(() => overlay.classList.remove("open"), 200);
    }
    // Le rendez-vous est retrouvé côté serveur par son jeton : aucune recherche
    // par téléphone n'est possible sans compte, et c'est voulu (confidentialité).
    window.doLookup = async function doLookup() {
      const saisie = document.getElementById("lookupToken").value.trim();
      const errEl = document.getElementById("lookupError");
      const zone = document.getElementById("lookupResultZone");
      const token = saisie.split("/").filter(Boolean).pop() || "";
      if (!token) { errEl.textContent = "Collez le lien reçu lors de la confirmation."; errEl.classList.add("show"); zone.innerHTML = ""; return; }
      errEl.classList.remove("show");
      zone.innerHTML = `<div class="lookup-result">Recherche en cours…</div>`;
      try {
        const rdv = await publicApi.getByToken(token);
        renderLookupResult(rdv);
      } catch (e) {
        zone.innerHTML = "";
        errEl.textContent = "Aucun rendez-vous ne correspond à ce lien.";
        errEl.classList.add("show");
      }
    }
    window.renderLookupResult = function renderLookupResult(rdv) {
      const zone = document.getElementById("lookupResultZone");
      const STATUTS = { RESERVE: "Réservé", CLIENT_ARRIVE: "Client arrivé", EN_COURS: "En cours", TERMINE: "Terminé", ABSENT: "Absent", ANNULE: "Annulé" };
      zone.innerHTML = `<div class="lookup-result">
        <b>${esc(rdv.service?.nom || "—")}</b><br>
        ${fmtDateLong(new Date(rdv.dateDebut))} à ${toHM(rdv.dateDebut)}<br>
        ${esc(rdv.professionnel?.nom || "")}<br>
        Client : ${esc(`${rdv.client?.prenom || ""} ${rdv.client?.nom || ""}`.trim())}<br>
        Statut : <b style="color:var(--primary-dark)">${esc(STATUTS[rdv.statut] || rdv.statut)}</b>
        ${rdv.statut === "RESERVE" ? `<div style="margin-top:12px;"><button class="booking-btn booking-btn-ghost" onclick="cancelLookup('${esc(rdv.manageToken)}')">Annuler ce rendez-vous</button></div>` : ""}
      </div>`;
    }
    window.cancelLookup = async function cancelLookup(token) {
      if (!confirm("Annuler définitivement ce rendez-vous ?")) return;
      try {
        await publicApi.cancelByToken(token);
        const rdv = await publicApi.getByToken(token);
        renderLookupResult(rdv);
      } catch (e) {
        const errEl = document.getElementById("lookupError");
        const msg = e?.response?.data?.message || "L'annulation n'a pas pu être effectuée.";
        errEl.textContent = Array.isArray(msg) ? msg.join(", ") : msg;
        errEl.classList.add("show");
      }
    }

    /* -------- Assistant : les réponses viennent du backend -------- */
    let ASSISTANT_LOG = [];
    window.toggleAssistant = function toggleAssistant() {
      const panel = document.getElementById("assistant-panel");
      panel.classList.toggle("open");
      if (panel.classList.contains("open")) renderAssistantLog();
    }
    window.renderAssistantLog = function renderAssistantLog() {
      const log = document.getElementById("assistantLog");
      if (!log) return;
      log.innerHTML = ASSISTANT_LOG.length
        ? ASSISTANT_LOG.map((m) => `<div class="assistant-msg ${m.role}">${esc(m.text)}</div>`).join("")
        : `<div class="assistant-msg bot">Posez une question sur les services, les horaires ou l'adresse — je réponds à partir des informations enregistrées.</div>`;
      log.scrollTop = log.scrollHeight;
    }
    window.sendAssistant = async function sendAssistant() {
      const input = document.getElementById("assistantInput");
      if (!input) return;
      const q = input.value.trim();
      if (!q) return;
      ASSISTANT_LOG.push({ role: "user", text: q });
      input.value = "";
      renderAssistantLog();
      try {
        const res = await assistantApi.ask(q, SELECTED_PRO?.id);
        ASSISTANT_LOG.push({ role: "bot", text: res.answer });
      } catch (e) {
        ASSISTANT_LOG.push({ role: "bot", text: "La réponse n'a pas pu être obtenue. Réessayez dans un instant." });
      }
      renderAssistantLog();
    }

    // Fermer les modales en cliquant sur l'arrière-plan ou avec Échap
    document.getElementById("bookingOverlay").addEventListener("click", (e) => {
      if (e.target.id === "bookingOverlay") closeBooking();
    }, { signal: ac.signal });
    document.getElementById("lookupOverlay").addEventListener("click", (e) => {
      if (e.target.id === "lookupOverlay") closeLookup();
    }, { signal: ac.signal });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeBooking(); closeLookup(); }
    }, { signal: ac.signal });

    loadEspace();

    // ---- end ported script ----

    return () => {
      ac.abort();
      __intervals.forEach((i) => clearInterval(i));
      __timeouts.forEach((t) => clearTimeout(t));
      __observers.forEach((o) => o.disconnect());

      [
        "esc", "fmtPrix", "fmtDateLong", "toDateInput", "toHM", "setText",
        "loadEspace", "renderEspaceInfos", "renderHours", "renderProSelector", "selectPro",
        "loadServices", "currentService", "buildDays", "openBooking", "closeBooking",
        "updateProgress", "loadSlots", "renderBookingStep", "manageUrl", "copyManageLink",
        "ticketHtml", "submitBooking", "showRealTicket", "openLookup", "closeLookup", "doLookup",
        "renderLookupResult", "cancelLookup", "toggleAssistant", "renderAssistantLog", "sendAssistant",
      ].forEach((k) => { delete (window as any)[k]; });
    };
  }, []);

  return (
    <>
      <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
  :root {
    --ink: #1B1730;
    --ink-soft: #5B5670;
    --primary: #8957FF;
    --primary-dark: #6B3FD9;
    --primary-tint: #F1ECFF;
    --paper: #F7F6FB;
    --card: #FFFFFF;
    --line: #E6E2F2;
    --radius: 16px;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--paper);
    color: var(--ink);
  }
  .display { font-family: 'Poppins', sans-serif; font-weight: 700; }
  a { text-decoration: none; }
  button { font-family: inherit; }
  svg { display: block; }

  /* ---------- Header ---------- */
  .cr-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 22px 6vw; border-bottom: 1px solid var(--line); background: var(--card);
  }
  .cr-brand { display: flex; align-items: center; gap: 12px; }
  .cr-logo {
    width: 44px; height: 44px; border-radius: 12px;
    background: linear-gradient(135deg, var(--primary), var(--primary-dark));
    display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;
  }
  .cr-brand-name { font-size: 17px; font-weight: 700; line-height: 1.1; }
  .cr-brand-domain {
    font-size: 12px; color: var(--ink-soft); font-weight: 500;
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  .cr-pro-link {
    font-size: 13px; font-weight: 600; color: var(--primary-dark);
    border: 1px solid var(--line); padding: 9px 16px; border-radius: 999px;
    white-space: nowrap; transition: border-color .15s ease, background .15s ease;
  }
  .cr-pro-link:hover { border-color: var(--primary); background: var(--primary-tint); }
  button.cr-pro-link { background: transparent; font-family: inherit; cursor: pointer; }
  .cr-footer button.cr-footer-pro-link { background: none; border: none; padding: 0; color: var(--primary-dark); font-weight: 600; font-family: inherit; font-size: inherit; cursor: pointer; }

  /* ---------- Hero photo plein cadre (animé + parallaxe souris) ---------- */
  .cr-hero-photo { position: relative; min-height: 62vh; overflow: hidden; isolation: isolate; }
  .cr-hero-bg {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; object-position: center 30%;
    --px: 0px; --py: 0px;
    animation: cr-kenburns 16s ease-in-out infinite alternate;
    transition: transform .2s ease-out;
    will-change: transform;
    z-index: 0;
  }
  .cr-hero-overlay {
    position: absolute; inset: 0; z-index: 1;
    background: linear-gradient(180deg, rgba(11,28,36,0.72) 0%, rgba(11,28,36,0.42) 42%, rgba(11,28,36,0.88) 100%);
  }
  .cr-hero-content { position: relative; z-index: 2; padding: 84px 6vw 150px; max-width: 680px; color: #fff; }
  .cr-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 12.5px; font-weight: 600; padding: 6px 12px; border-radius: 999px;
    margin-bottom: 18px; background: rgba(255,255,255,0.14); color: #fff;
    backdrop-filter: blur(6px); animation: cr-fade-up .7s ease both;
  }
  .cr-title {
    font-size: clamp(30px, 4.2vw, 48px); line-height: 1.08; margin: 0 0 16px;
    letter-spacing: -0.01em; color: #fff;
    animation: cr-fade-up .7s ease both; animation-delay: .08s;
  }
  .cr-title .accent { color: #D9CCFF; }
  .cr-desc {
    font-size: 16px; color: rgba(255,255,255,0.86); line-height: 1.6;
    margin: 0 0 28px; max-width: 46ch;
    animation: cr-fade-up .7s ease both; animation-delay: .16s;
  }
  .cr-cta-row {
    display: flex; flex-wrap: wrap; gap: 12px;
    animation: cr-fade-up .7s ease both; animation-delay: .24s;
  }
  @keyframes cr-kenburns {
    from { transform: scale(1) translate(var(--px), var(--py)); }
    to { transform: scale(1.12) translate(var(--px), var(--py)); }
  }
  @keyframes cr-fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes cr-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
  @media (prefers-reduced-motion: reduce) {
    .cr-hero-bg { animation: none; transition: none; }
    .cr-eyebrow, .cr-title, .cr-desc, .cr-cta-row { animation: none; }
    .ticket { animation: none !important; }
    .reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
    .service-image { transition: none !important; }
  }

  .cr-btn {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 14.5px; font-weight: 600; border-radius: 12px;
    padding: 13px 20px; border: none; cursor: pointer;
    transition: transform .12s ease, box-shadow .12s ease;
  }
  .cr-btn:hover { transform: translateY(-1px); }
  .cr-btn-primary { background: var(--primary); color: white; box-shadow: 0 8px 20px -8px rgba(14,124,134,0.55); }
  .cr-btn-glass {
    background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.4);
    backdrop-filter: blur(6px);
  }
  .cr-btn-glass:hover { background: rgba(255,255,255,0.2); }

  /* ---------- Panneau flottant ---------- */
  .cr-floating-wrap { padding: 0 6vw 56px; position: relative; z-index: 3; }
  .cr-floating {
    background: var(--card); border-radius: 20px;
    box-shadow: 0 30px 60px -24px rgba(10,20,26,0.35);
    margin-top: -96px; padding: 28px;
    display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 28px; align-items: center;
  }
  @media (max-width: 880px) { .cr-floating { grid-template-columns: 1fr; margin-top: -70px; } }
  .cr-info-row { display: flex; flex-wrap: wrap; gap: 14px 26px; }
  .cr-info-item { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--ink); font-weight: 500; }
  .cr-info-item svg { color: var(--primary); flex-shrink: 0; }

  /* ---------- Ticket (signature) ---------- */
  .ticket-wrap { display: flex; justify-content: center; }
  .ticket {
    position: relative; width: 100%; max-width: 380px; background: var(--card);
    border-radius: 20px; box-shadow: 0 24px 60px -24px rgba(18,36,47,0.35);
    overflow: hidden; border: 1px solid var(--line);
    animation: cr-float 5s ease-in-out infinite;
  }

  /* ---------- Animations au scroll ---------- */
  .reveal {
    opacity: 0; transform: translateY(24px);
    transition: opacity .6s ease, transform .6s ease;
  }
  .reveal.visible { opacity: 1; transform: translateY(0); }
  .ticket-top { background: linear-gradient(135deg, var(--primary-dark), var(--primary)); color: white; padding: 22px 24px 26px; }
  .ticket-top-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .ticket-label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85; }
  .ticket-value { font-size: 15px; font-weight: 700; margin-top: 4px; }
  .ticket-divider-wrap { position: relative; height: 0; }
  .ticket-notch { position: absolute; width: 22px; height: 22px; background: var(--paper); border-radius: 50%; top: -11px; }
  .ticket-notch.left { left: -11px; }
  .ticket-notch.right { right: -11px; }
  .ticket-dashes { border-top: 2px dashed var(--line); margin: 0 22px; }
  .ticket-bottom { padding: 22px 24px 26px; }
  .ticket-service { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
  .ticket-icon {
    width: 40px; height: 40px; border-radius: 10px; background: var(--primary-tint);
    display: flex; align-items: center; justify-content: center; color: var(--primary-dark); flex-shrink: 0;
  }
  .ticket-service-name { font-weight: 700; font-size: 14.5px; }
  .ticket-service-sub { font-size: 12.5px; color: var(--ink-soft); }
  .ticket-meta { display: flex; justify-content: space-between; align-items: center; }
  .ticket-meta-block .ticket-label { color: var(--ink-soft); }
  .ticket-meta-block .ticket-value { color: var(--ink); font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 17px; }
  .ticket-qr { width: 52px; height: 52px; border-radius: 10px; background: var(--ink); display: flex; align-items: center; justify-content: center; color: white; }

  /* ---------- Widget de démonstration animée (façon showreel) ---------- */
  .demo-widget {
    width: 100%; max-width: 372px; background: var(--card); border-radius: 22px;
    box-shadow: 0 30px 64px -26px rgba(18,36,47,0.32); overflow: hidden;
    position: relative; min-height: 392px;
  }
  .demo-widget.dw-hidden, .dw-hidden { display: none; }
  /* Curseur animé façon démo SimplyBook : se déplace vers l'élément à "cliquer" */
  .demo-cursor {
    position: absolute; top: 0; left: 0; width: 20px; height: 20px; opacity: 0; z-index: 6;
    transition: left .55s cubic-bezier(.4,0,.2,1), top .55s cubic-bezier(.4,0,.2,1), opacity .3s ease;
    pointer-events: none; filter: drop-shadow(0 3px 6px rgba(18,10,40,0.3));
  }
  .demo-cursor.dc-show { opacity: 1; }
  .demo-click-ring {
    position: absolute; top: 0; left: 0; width: 26px; height: 26px; border-radius: 50%;
    border: 2.5px solid var(--primary); opacity: 0; z-index: 5; pointer-events: none;
    transform: translate(-50%, -50%) scale(0.4);
  }
  .demo-click-ring.dc-pulse { animation: cr-click-pulse .55s ease-out; }
  @keyframes cr-click-pulse {
    0% { opacity: .9; transform: translate(-50%, -50%) scale(0.4); }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(1.7); }
  }
  .demo-screen {
    position: absolute; inset: 0; padding: 22px 22px 20px;
    opacity: 0; transform: translateY(10px); transition: opacity .5s ease, transform .5s ease;
    pointer-events: none; display: flex; flex-direction: column;
  }
  .demo-screen.active { opacity: 1; transform: translateY(0); pointer-events: auto; }
  .demo-eyebrow { font-size: 10.5px; font-weight: 700; color: var(--primary-dark); text-transform: uppercase; letter-spacing: .06em; margin: 0 0 4px; }
  .demo-title { font-size: 15px; font-weight: 700; margin: 0 0 14px; }

  .demo-svc-row { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border: 1px solid var(--line); border-radius: 13px; margin-bottom: 10px; transition: border-color .3s ease, background .3s ease; }
  .demo-svc-row.picked { border-color: var(--primary); background: var(--primary-tint); }
  .demo-svc-icon { width: 34px; height: 34px; border-radius: 10px; background: var(--primary-tint); color: var(--primary-dark); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .demo-svc-info { flex: 1; }
  .demo-svc-name { font-size: 12.5px; font-weight: 700; }
  .demo-svc-price { font-size: 11px; color: var(--ink-soft); }
  .demo-svc-btn { font-size: 10.5px; font-weight: 700; padding: 6px 12px; border-radius: 999px; background: var(--primary-tint); color: var(--primary-dark); transition: background .3s ease, color .3s ease; }
  .demo-svc-row.picked .demo-svc-btn { background: var(--primary); color: #fff; }

  .demo-cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .demo-cal-head span { font-size: 12px; font-weight: 700; }
  .demo-cal-nav { display: flex; gap: 6px; }
  .demo-cal-nav i { width: 20px; height: 20px; border-radius: 50%; background: var(--paper); display: inline-block; }
  .demo-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 14px; }
  .demo-day { text-align: center; font-size: 10.5px; padding: 6px 0; border-radius: 8px; color: var(--ink-soft); }
  .demo-day.demo-dow { color: var(--ink-soft); font-weight: 600; font-size: 9px; text-transform: uppercase; }
  .demo-day.demo-selected { background: var(--primary); color: #fff; font-weight: 700; transform: scale(1.06); transition: all .3s ease; }
  .demo-slots { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .demo-slot { text-align: center; font-size: 10.5px; font-weight: 600; padding: 7px 0; border-radius: 8px; border: 1px solid var(--line); color: var(--ink-soft); }
  .demo-slot.demo-slot-on { background: var(--primary); border-color: var(--primary); color: #fff; }

  .demo-field { margin-bottom: 12px; }
  .demo-field label { display: block; font-size: 10.5px; font-weight: 600; color: var(--ink-soft); margin-bottom: 5px; }
  .demo-field-box { border: 1px solid var(--line); border-radius: 9px; padding: 9px 11px; font-size: 12px; color: var(--ink); background: var(--paper); min-height: 15px; }
  .demo-caret { display: inline-block; width: 1.5px; height: 12px; background: var(--primary); margin-left: 1px; vertical-align: middle; animation: cr-caret 1s steps(1) infinite; }
  @keyframes cr-caret { 50% { opacity: 0; } }
  .demo-submit { margin-top: auto; background: var(--primary); color: #fff; font-size: 12.5px; font-weight: 700; text-align: center; padding: 11px; border-radius: 10px; }

  .demo-confirm { align-items: center; text-align: center; justify-content: center; }
  .demo-check-wrap { position: relative; width: 68px; height: 68px; margin: 0 auto 16px; }
  .demo-check { width: 68px; height: 68px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); display: flex; align-items: center; justify-content: center; animation: cr-pop .4s ease; }
  @keyframes cr-pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
  .demo-confetti { position: absolute; width: 6px; height: 6px; border-radius: 50%; opacity: 0; animation: cr-confetti .9s ease-out forwards; }
  @keyframes cr-confetti { 0% { opacity: 1; transform: translate(0,0) scale(1); } 100% { opacity: 0; transform: translate(var(--cx), var(--cy)) scale(.4); } }
  .demo-confirm-title { font-size: 15.5px; font-weight: 700; margin: 0 0 4px; }
  .demo-confirm-sub { font-size: 11.5px; color: var(--ink-soft); margin: 0 0 16px; }
  .demo-again { background: var(--primary-tint); color: var(--primary-dark); font-size: 12px; font-weight: 700; padding: 9px 18px; border-radius: 999px; }

  /* ---------- Calendriers colorés flottants (placés ponctuellement, pas partout) ---------- */
  .floaty-cal {
    position: absolute; pointer-events: none; z-index: 1;
    filter: drop-shadow(0 10px 18px rgba(20,10,40,0.22));
    animation: cr-cal-float 6s ease-in-out infinite;
  }
  @keyframes cr-cal-float {
    0%, 100% { transform: translateY(0) rotate(var(--rot, 0deg)); }
    50% { transform: translateY(-16px) rotate(calc(var(--rot, 0deg) * -1)); }
  }
  @media (prefers-reduced-motion: reduce) { .floaty-cal { animation: none; } }

  /* ---------- Photo principale animée : l'enchaînement de la réservation ---------- */
  .cr-hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 30%; opacity: 0; transition: opacity 1.1s ease; }
  .cr-hero-bg.hb-active { opacity: 1; }
  .hero-flow-badge {
    position: absolute; z-index: 2; top: 22px; right: 6vw;
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(27,23,48,0.55); color: #fff; backdrop-filter: blur(6px);
    font-size: 12px; font-weight: 600; padding: 8px 14px; border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.25);
  }
  .hero-flow-dots { display: flex; gap: 5px; }
  .hero-flow-dots span { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.35); transition: background .2s ease; }
  .hero-flow-dots span.on { background: #fff; }
  @media (max-width: 600px) { .hero-flow-badge { top: auto; bottom: 18px; right: 6vw; font-size: 11px; padding: 7px 12px; } }

  /* ---------- Comment ça marche (séquence photo réelle) ---------- */
  .how-section { padding: 8px 6vw 56px; position: relative; overflow: hidden; }
  .how-head { text-align: center; max-width: 560px; margin: 0 auto 32px; position: relative; z-index: 1; }
  .how-eyebrow { font-size: 12px; font-weight: 600; color: var(--primary-dark); text-transform: uppercase; letter-spacing: .07em; margin: 0 0 8px; }
  .how-title { font-size: 24px; margin: 0 0 6px; }
  .how-sub { font-size: 13.5px; color: var(--ink-soft); margin: 0; }
  .how-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; position: relative; z-index: 1; }
  @media (max-width: 880px) { .how-row { grid-template-columns: 1fr; gap: 28px; } }
  .how-connector {
    position: absolute; top: 96px; left: calc(16.66% + 20px); right: calc(16.66% + 20px); height: 0;
    border-top: 2px dashed var(--line); z-index: 0;
  }
  @media (max-width: 880px) { .how-connector { display: none; } }
  .how-card { position: relative; z-index: 1; text-align: left; }
  .how-photo { position: relative; border-radius: 18px; overflow: hidden; height: 180px; box-shadow: 0 20px 40px -22px rgba(18,36,47,0.4); }
  .how-photo img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .5s ease; }
  .how-card:hover .how-photo img { transform: scale(1.06); }
  .how-step-num {
    position: absolute; top: 12px; left: 12px; width: 30px; height: 30px; border-radius: 50%;
    background: var(--primary); color: #fff; font-weight: 700; font-size: 13px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 16px -6px rgba(137,87,255,0.7);
  }
  .how-card-title { font-size: 14.5px; font-weight: 700; margin: 14px 0 4px; }
  .how-card-desc { font-size: 12.5px; color: var(--ink-soft); margin: 0; line-height: 1.5; }

  /* ---------- Réservation personnalisée (photo circulaire + badges animés) ---------- */
  .pz-section { padding: 12px 6vw 60px; }
  .pz-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 52px; align-items: center; }
  @media (max-width: 880px) { .pz-grid { grid-template-columns: 1fr; gap: 36px; } .pz-photo-col { order: -1; } }
  .pz-eyebrow { font-size: 12px; font-weight: 700; color: var(--primary-dark); text-transform: uppercase; letter-spacing: .07em; margin: 0 0 8px; }
  .pz-title { font-size: 26px; line-height: 1.25; margin: 0 0 14px; }
  .pz-title span { color: var(--primary); }
  .pz-sub { font-size: 14px; color: var(--ink-soft); line-height: 1.6; margin: 0 0 22px; max-width: 440px; }
  .pz-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
  .pz-list li { display: flex; align-items: flex-start; gap: 12px; font-size: 13.5px; color: var(--ink-soft); line-height: 1.55; }
  .pz-check { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; background: var(--primary-tint); color: var(--primary-dark); display: flex; align-items: center; justify-content: center; margin-top: 1px; }
  .pz-list b { color: var(--ink); }

  .pz-photo-col { position: relative; display: flex; justify-content: center; align-items: center; min-height: 380px; }
  .pz-halo {
    position: absolute; width: min(400px, 92%); aspect-ratio: 1/1; border-radius: 50%;
    background: radial-gradient(circle, var(--primary-tint) 0%, rgba(137,87,255,0.03) 65%, transparent 75%);
    z-index: 0;
  }
  .pz-circle {
    position: relative; width: min(320px, 76%); aspect-ratio: 1/1; border-radius: 50%; overflow: hidden;
    box-shadow: 0 34px 64px -22px rgba(137,87,255,0.4); z-index: 1; border: 6px solid var(--card);
  }
  .pz-circle img { width: 100%; height: 100%; object-fit: cover; }

  .pz-badge {
    position: absolute; z-index: 2; background: var(--card); border-radius: 999px;
    padding: 9px 14px 9px 10px; display: flex; align-items: center; gap: 8px;
    box-shadow: 0 16px 30px -14px rgba(18,36,47,0.32); font-size: 12px; font-weight: 700; color: var(--ink);
    animation: cr-cal-float 5.5s ease-in-out infinite;
  }
  .pz-badge-icon { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .pz-badge-1 { top: 6%; left: -4%; animation-delay: -1s; }
  .pz-badge-1 .pz-badge-icon { background: #4ECDC4; color: #fff; }
  .pz-badge-2 { bottom: 8%; right: -6%; animation-duration: 6.5s; animation-delay: -3s; }
  .pz-badge-2 .pz-badge-icon { background: var(--primary); color: #fff; }

  .pz-toast {
    position: absolute; z-index: 3; top: 12%; right: -2%; background: var(--card); border-radius: 14px;
    padding: 10px 14px; display: flex; align-items: center; gap: 9px; box-shadow: 0 18px 36px -14px rgba(18,36,47,0.34);
    font-size: 11.5px; font-weight: 700; color: var(--ink); opacity: 0; transform: translateY(-8px) scale(0.92);
    transition: opacity .5s ease, transform .5s ease; pointer-events: none;
  }
  .pz-toast.pz-toast-show { opacity: 1; transform: translateY(0) scale(1); }
  .pz-toast-icon { width: 22px; height: 22px; border-radius: 50%; background: #FFB86B; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  @media (max-width: 480px) { .pz-badge-1, .pz-badge-2, .pz-toast { font-size: 10.5px; padding: 7px 11px 7px 8px; } }
  @media (prefers-reduced-motion: reduce) { .pz-badge { animation: none; } }

  /* ---------- Trust strip ---------- */
  .cr-trust {
    background: var(--card); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
    padding: 26px 6vw; display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;
  }
  @media (max-width: 880px) { .cr-trust { grid-template-columns: repeat(2, 1fr); } }
  .cr-trust-item { display: flex; align-items: center; gap: 12px; }
  .cr-trust-icon {
    width: 38px; height: 38px; border-radius: 10px; background: var(--primary-tint);
    display: flex; align-items: center; justify-content: center; color: var(--primary-dark); flex-shrink: 0;
  }
  .cr-trust-text { font-size: 12.5px; font-weight: 600; line-height: 1.35; }
  .cr-trust-text span { display: block; font-weight: 400; color: var(--ink-soft); font-size: 11.5px; margin-top: 1px; }

  /* ---------- Services ---------- */
  .cr-section { padding: 56px 6vw; }
  .cr-section-title { font-size: 24px; margin: 0 0 4px; }
  .cr-section-sub { font-size: 13.5px; color: var(--ink-soft); margin: 0 0 26px; }
  .cr-services-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
  @media (max-width: 720px) { .cr-services-grid { grid-template-columns: 1fr; } }
  .service-card {
    background: var(--card); border: 1px solid var(--line); border-radius: var(--radius);
    overflow: hidden; display: flex; flex-direction: column;
    transition: border-color .2s ease, box-shadow .3s ease, transform .3s ease;
  }
  .service-card:hover { border-color: var(--primary); box-shadow: 0 20px 40px -20px rgba(137,87,255,0.45); transform: translateY(-4px); }
  .service-image-wrap { position: relative; height: 160px; overflow: hidden; }
  .service-image { width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
  .service-card:hover .service-image { transform: scale(1.1); }
  .service-image-badge {
    position: absolute; bottom: 10px; left: 10px;
    background: rgba(27,23,48,0.72); color: #fff; backdrop-filter: blur(4px);
    font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 999px;
    display: flex; align-items: center; gap: 5px;
  }
  .service-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
  .service-top { display: flex; justify-content: space-between; gap: 10px; }
  .service-name { font-weight: 700; font-size: 15px; margin: 0 0 4px; }
  .service-note { font-size: 12.5px; color: var(--ink-soft); margin: 0; }
  .service-price { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 20px; color: var(--primary-dark); white-space: nowrap; }
  .service-bottom { display: flex; justify-content: space-between; align-items: center; }
  .service-duration { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--ink-soft); }
  .service-cta {
    display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600;
    color: var(--primary-dark); background: none; border: none; cursor: pointer; transition: gap .2s ease;
  }
  .service-cta:hover { gap: 8px; }

  /* ---------- Info + hours ---------- */
  .cr-info-section { padding: 0 6vw 64px; display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; }
  @media (max-width: 880px) { .cr-info-section { grid-template-columns: 1fr; } }
  .info-card { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 24px; }
  .map-block {
    height: 100%; min-height: 220px; border-radius: 12px;
    background:
      radial-gradient(circle at 30% 30%, rgba(14,124,134,0.18), transparent 60%),
      repeating-linear-gradient(0deg, #EEF3F2 0 1px, transparent 1px 28px),
      repeating-linear-gradient(90deg, #EEF3F2 0 1px, transparent 1px 28px);
    background-color: #F3F6F5;
    display: flex; align-items: center; justify-content: center; position: relative; border: 1px solid var(--line);
  }
  .map-pin {
    width: 44px; height: 44px; border-radius: 50% 50% 50% 0; background: var(--primary);
    transform: rotate(-45deg); display: flex; align-items: center; justify-content: center;
    box-shadow: 0 10px 20px -8px rgba(14,124,134,0.6);
  }
  .map-pin svg { transform: rotate(45deg); color: white; }
  .hours-title { font-size: 15px; font-weight: 700; margin: 0 0 14px; display: flex; align-items: center; gap: 8px; }
  .hours-row { display: flex; justify-content: space-between; font-size: 13.5px; padding: 9px 0; border-bottom: 1px solid var(--line); }
  .hours-row:last-child { border-bottom: none; }
  .hours-row.closed .hours-value { color: #B5473A; font-weight: 600; }
  .hours-value { font-weight: 600; }

  /* ---------- Footer ---------- */
  .cr-footer {
    border-top: 1px solid var(--line); padding: 28px 6vw;
    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
    font-size: 12.5px; color: var(--ink-soft);
  }
  .cr-footer a { color: var(--primary-dark); font-weight: 600; }

  /* ---------- Assistant ---------- */
  .assistant-fab {
    position: fixed; bottom: 24px; right: 24px; width: 58px; height: 58px; border-radius: 50%;
    background: var(--primary); color: white; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 14px 30px -10px rgba(14,124,134,0.6); z-index: 40;
  }
  .assistant-panel {
    position: fixed; bottom: 92px; right: 24px; width: 300px; background: var(--card);
    border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 24px 50px -20px rgba(18,36,47,0.4);
    padding: 18px; z-index: 40; display: none;
  }
  .assistant-panel.open { display: block; }
  .assistant-panel h4 { margin: 0 0 6px; font-size: 14.5px; }
  .assistant-panel p { margin: 0; font-size: 12.5px; color: var(--ink-soft); line-height: 1.5; }

  /* ---------- Booking modal ---------- */
  .booking-overlay {
    position: fixed; inset: 0; z-index: 100;
    background: rgba(27,23,48,0.5); backdrop-filter: blur(3px);
    display: none; align-items: center; justify-content: center; padding: 24px;
    opacity: 0; transition: opacity .22s ease;
  }
  .booking-overlay.open { display: flex; }
  .booking-overlay.visible { opacity: 1; }
  .booking-modal {
    width: 100%; max-width: 560px; max-height: 88vh; overflow-y: auto;
    background: var(--card); border-radius: 20px;
    box-shadow: 0 40px 80px -20px rgba(10,10,26,0.5);
    padding: 26px 26px 28px;
    transform: translateY(18px) scale(0.98); opacity: 0;
    transition: transform .28s cubic-bezier(.2,.8,.2,1), opacity .28s ease;
  }
  .booking-overlay.visible .booking-modal { transform: translateY(0) scale(1); opacity: 1; }
  .booking-close {
    position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; border-radius: 50%;
    border: none; background: var(--paper); color: var(--ink-soft); font-size: 18px; line-height: 1;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background .15s ease, color .15s ease;
  }
  .booking-close:hover { background: var(--primary-tint); color: var(--primary-dark); }

  .booking-header { margin-bottom: 18px; padding-right: 34px; }
  .booking-eyebrow { font-size: 11.5px; font-weight: 600; color: var(--primary-dark); text-transform: uppercase; letter-spacing: .06em; margin: 0 0 4px; }
  .booking-title { font-size: 19px; margin: 0; }

  .booking-progress { display: flex; align-items: center; gap: 6px; margin-bottom: 22px; }
  .booking-dot {
    flex: 1; height: 4px; border-radius: 999px; background: var(--line);
    overflow: hidden; position: relative;
  }
  .booking-dot::after {
    content: ""; position: absolute; inset: 0; background: var(--primary);
    transform: scaleX(0); transform-origin: left; transition: transform .35s ease;
  }
  .booking-dot.done::after, .booking-dot.active::after { transform: scaleX(1); }

  .booking-panel { animation: cr-fade-up .35s ease both; }

  /* Calendar */
  .booking-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 20px; }
  .booking-day {
    border: 1px solid var(--line); border-radius: 12px; background: var(--paper);
    padding: 10px 4px; text-align: center; cursor: pointer; font-size: 12.5px;
    transition: border-color .15s ease, background .15s ease, transform .15s ease;
    opacity: 0; transform: translateY(8px) scale(.9);
    animation: cr-day-in .35s ease forwards;
  }
  @keyframes cr-day-in { to { opacity: 1; transform: translateY(0) scale(1); } }
  .booking-day .dow { display: block; font-size: 10.5px; color: var(--ink-soft); margin-bottom: 4px; text-transform: uppercase; }
  .booking-day .num { display: block; font-weight: 700; font-size: 15px; }
  .booking-day:hover:not(.disabled) { border-color: var(--primary); transform: translateY(-2px); }
  .booking-day.selected { background: var(--primary); border-color: var(--primary); color: #fff; }
  .booking-day.selected .dow { color: rgba(255,255,255,0.8); }
  .booking-day.disabled { opacity: 0.35 !important; cursor: not-allowed; }

  .booking-slots-label { font-size: 12.5px; font-weight: 600; color: var(--ink-soft); margin: 4px 0 10px; }
  .booking-slots { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  @media (max-width: 480px) { .booking-slots { grid-template-columns: repeat(3, 1fr); } }
  .booking-slot {
    border: 1px solid var(--line); border-radius: 10px; background: var(--card);
    padding: 9px 4px; text-align: center; font-size: 12.5px; font-weight: 600; cursor: pointer;
    transition: border-color .15s ease, background .15s ease, color .15s ease;
    opacity: 0; transform: translateY(6px);
    animation: cr-day-in .3s ease forwards;
  }
  .booking-slot:hover:not(.taken) { border-color: var(--primary); color: var(--primary-dark); }
  .booking-slot.selected { background: var(--primary); border-color: var(--primary); color: #fff; }
  .booking-slot.taken { opacity: 0.35; text-decoration: line-through; cursor: not-allowed; color: var(--ink-soft); }

  /* Form step */
  .booking-form-layout { display: grid; grid-template-columns: 1fr 1.1fr; gap: 18px; align-items: stretch; }
  @media (max-width: 540px) { .booking-form-layout { grid-template-columns: 1fr; } }
  .booking-photo { border-radius: 14px; overflow: hidden; min-height: 180px; position: relative; }
  .booking-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .booking-photo-tag {
    position: absolute; bottom: 10px; left: 10px; background: rgba(27,23,48,0.7); color: #fff;
    font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 999px; backdrop-filter: blur(4px);
  }
  .booking-field { margin-bottom: 12px; }
  .booking-field label { display: block; font-size: 12.5px; font-weight: 600; color: var(--ink-soft); margin-bottom: 5px; }
  .booking-field input, .booking-field textarea {
    width: 100%; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px;
    font-family: inherit; font-size: 13.5px; color: var(--ink); background: var(--paper);
    transition: border-color .15s ease;
  }
  .booking-field input:focus, .booking-field textarea:focus { outline: none; border-color: var(--primary); }
  .booking-field textarea { resize: vertical; min-height: 56px; }
  .booking-recap {
    background: var(--primary-tint); border-radius: 12px; padding: 12px 14px; font-size: 12.5px;
    color: var(--ink); margin-bottom: 14px; display: flex; flex-direction: column; gap: 3px;
  }
  .booking-recap b { color: var(--primary-dark); }
  .booking-error { color: #B5473A; font-size: 12px; margin: -6px 0 10px; display: none; }
  .booking-error.show { display: block; }

  /* Confirmation step */
  .booking-confirm-head { text-align: center; padding: 6px 0 18px; }
  .booking-check {
    width: 62px; height: 62px; border-radius: 50%; background: var(--primary-tint);
    display: flex; align-items: center; justify-content: center; margin: 0 auto 14px;
  }
  .booking-check svg path { stroke-dasharray: 30; stroke-dashoffset: 30; animation: cr-draw .5s ease forwards .2s; }
  @keyframes cr-draw { to { stroke-dashoffset: 0; } }
  .booking-confirm-title { font-size: 19px; margin: 0 0 4px; }
  .booking-confirm-sub { font-size: 13px; color: var(--ink-soft); margin: 0; }
  .booking-confirm-photo { border-radius: 14px; overflow: hidden; height: 130px; margin-bottom: 16px; }
  .booking-confirm-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .booking-nav { display: flex; justify-content: space-between; gap: 10px; margin-top: 20px; }
  .booking-btn {
    font-size: 13.5px; font-weight: 600; border-radius: 10px; padding: 11px 20px; border: none;
    cursor: pointer; transition: transform .12s ease, opacity .15s ease;
  }
  .booking-btn:hover { transform: translateY(-1px); }
  .booking-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .booking-btn-ghost { background: var(--paper); color: var(--ink); }
  .booking-btn-primary { background: var(--primary); color: #fff; }
  .booking-btn-full { width: 100%; }

  /* Lookup modal (Gérer mon rendez-vous) */
  .lookup-result {
    margin-top: 14px; border: 1px dashed var(--line); border-radius: 12px; padding: 14px;
    font-size: 13px; color: var(--ink-soft); animation: cr-fade-up .3s ease both;
  }
  .lookup-result b { color: var(--ink); }

  /* --- Éléments alimentés par l'API publique --- */
  /* Message affiché quand le backend ne renvoie rien : on ne comble jamais un vide par un exemple. */
  .cr-empty { grid-column: 1 / -1; text-align: center; font-size: 13px; color: var(--ink-soft); padding: 26px 10px; margin: 0; }
  .service-unavailable { font-size: 12px; font-weight: 700; color: var(--ink-soft); background: var(--paper); border-radius: 999px; padding: 7px 14px; }
  .pro-selector { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 22px; }
  .pro-chip { border: 1.5px solid var(--line); background: var(--card); border-radius: 999px; padding: 8px 16px; font-size: 12.5px; font-weight: 600; color: var(--ink-soft); cursor: pointer; font-family: inherit; }
  .pro-chip:hover { border-color: var(--primary); color: var(--primary-dark); }
  .pro-chip.active { border-color: var(--primary); background: var(--primary-tint); color: var(--primary-dark); }
  .ticket-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; min-height: 190px; padding: 24px; border: 1.5px dashed var(--line); border-radius: var(--radius); background: var(--card); color: var(--ink-soft); text-align: center; }
  .ticket-placeholder p { margin: 0; font-size: 12.5px; line-height: 1.5; max-width: 220px; }
  .booking-field-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 14px; }
  @media (max-width: 560px) { .booking-field-2col { grid-template-columns: 1fr; } }
  .booking-link-box { background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 14px; margin: 4px 0 10px; }
  .booking-link-box label { display: block; font-size: 12px; font-weight: 700; color: var(--ink-soft); margin-bottom: 6px; }
  .booking-link-box input { width: 100%; border: 1px solid var(--line); border-radius: 9px; padding: 9px 11px; font-size: 12px; font-family: inherit; color: var(--ink); background: var(--card); margin-bottom: 8px; }
  .assistant-log { display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto; margin: 10px 0; }
  .assistant-msg { font-size: 12.5px; line-height: 1.5; padding: 9px 12px; border-radius: 12px; max-width: 90%; white-space: pre-wrap; }
  .assistant-msg.bot { background: var(--paper); color: var(--ink); align-self: flex-start; }
  .assistant-msg.user { background: var(--primary-tint); color: var(--primary-dark); align-self: flex-end; }
  .assistant-input-row { display: flex; gap: 8px; }
  .assistant-input-row input { flex: 1; border: 1px solid var(--line); border-radius: 10px; padding: 9px 12px; font-size: 12.5px; font-family: inherit; color: var(--ink); }
  .assistant-input-row button { border: none; background: var(--primary); color: #fff; border-radius: 10px; padding: 0 13px; cursor: pointer; display: flex; align-items: center; }

      `}</style>

  
  <header className="cr-header">
    <div className="cr-brand">
      <div className="cr-logo">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/></svg>
      </div>
      <div>
        <div className="cr-brand-name display" id="brandName"></div>
        <div className="cr-brand-domain" id="brandDomain"></div>
      </div>
    </div>
    <button type="button" className="cr-pro-link" onClick={() => navigate('/connexion')}>Espace Pro</button>
  </header>

  
  <section className="cr-hero-photo">
    <img className="cr-hero-bg hb-active" id="heroBgA" src="https://images.unsplash.com/photo-1758876023053-3aa541a0935b?fm=jpg&q=80&w=1600&auto=format&fit=crop" alt="Étape 1 : cliente réservant son rendez-vous par téléphone" />
    <img className="cr-hero-bg" id="heroBgB" src="https://images.unsplash.com/photo-1621606677061-ec5eda5c04e9?fm=jpg&q=80&w=1600&auto=format&fit=crop" alt="Étape 2 : remplissage du formulaire de rendez-vous" />
    <div className="cr-hero-overlay"></div>

    
    <svg className="floaty-cal" style={{top: '18%', left: '5%', '--rot': '-8deg'}} width="34" height="34" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="4" fill="#FF6BAE" opacity="0.92"/><rect x="3" y="5" width="18" height="5" rx="4" fill="#E2478A"/>
      <rect x="7" y="2" width="2" height="5" rx="1" fill="#E2478A"/><rect x="15" y="2" width="2" height="5" rx="1" fill="#E2478A"/>
      <circle cx="8" cy="14" r="1.3" fill="#fff"/><circle cx="12" cy="14" r="1.3" fill="#fff"/><circle cx="16" cy="14" r="1.3" fill="#fff"/>
    </svg>
    <svg className="floaty-cal" style={{top: '60%', left: '9%', '--rot': '10deg', animationDuration: '7.5s', animationDelay: '-2s'}} width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="4" fill="#4ECDC4" opacity="0.92"/><rect x="3" y="5" width="18" height="5" rx="4" fill="#2FA79D"/>
      <rect x="7" y="2" width="2" height="5" rx="1" fill="#2FA79D"/><rect x="15" y="2" width="2" height="5" rx="1" fill="#2FA79D"/>
      <circle cx="8" cy="14" r="1.3" fill="#fff"/><circle cx="12" cy="14" r="1.3" fill="#fff"/>
    </svg>
    <svg className="floaty-cal" style={{top: '14%', right: '4%', '--rot': '6deg', animationDuration: '6.5s', animationDelay: '-1s'}} width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="4" fill="#FFB86B" opacity="0.92"/><rect x="3" y="5" width="18" height="5" rx="4" fill="#E2954A"/>
      <rect x="7" y="2" width="2" height="5" rx="1" fill="#E2954A"/><rect x="15" y="2" width="2" height="5" rx="1" fill="#E2954A"/>
      <circle cx="8" cy="14" r="1.3" fill="#fff"/><circle cx="12" cy="14" r="1.3" fill="#fff"/><circle cx="16" cy="14" r="1.3" fill="#fff"/>
    </svg>

    <div className="cr-hero-content">
      <span className="cr-eyebrow">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <span id="heroEyebrowText"></span>
      </span>
      <h1 className="cr-title display" id="heroTitle"></h1>
      <p className="cr-desc" id="heroDesc"></p>
      <div className="cr-cta-row">
        <button className="cr-btn cr-btn-primary" onClick={() => (window as any).openBooking()}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Réserver un rendez-vous
        </button>
        <button className="cr-btn cr-btn-glass" onClick={() => (window as any).openLookup()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Gérer mon rendez-vous
        </button>
        <button className="cr-btn cr-btn-glass" onClick={() => (window as any).toggleAssistant()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Discuter avec l'assistant
        </button>
      </div>
    </div>
  </section>

  
  <div className="cr-floating-wrap">
    <div className="cr-floating">
      <div>
        <p className="hours-title" style={{marginBottom: '16px'}} id="heroHoursTitle"></p>
        <div className="cr-info-row" id="heroInfoRow"></div>
      </div>

      <div className="ticket-wrap">
        <div className="ticket-placeholder" id="ticketPlaceholder">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <p>Votre confirmation de rendez-vous s'affichera ici.</p>
        </div>
        <div className="ticket dw-hidden" id="realTicket"></div>
      </div>
    </div>
  </div>

  
  <section className="how-section">
    <svg className="floaty-cal" style={{top: '2%', left: '1%', '--rot': '-6deg'}} width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="4" fill="#8957FF" opacity="0.9"/><rect x="3" y="5" width="18" height="5" rx="4" fill="#6B3FD9"/>
      <rect x="7" y="2" width="2" height="5" rx="1" fill="#6B3FD9"/><rect x="15" y="2" width="2" height="5" rx="1" fill="#6B3FD9"/>
      <circle cx="8" cy="14" r="1.3" fill="#fff"/><circle cx="12" cy="14" r="1.3" fill="#fff"/><circle cx="16" cy="14" r="1.3" fill="#fff"/>
    </svg>
    <svg className="floaty-cal" style={{top: '8%', right: '2%', '--rot': '9deg', animationDuration: '7s', animationDelay: '-1.5s'}} width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="4" fill="#6BB6FF" opacity="0.9"/><rect x="3" y="5" width="18" height="5" rx="4" fill="#3E8FE0"/>
      <rect x="7" y="2" width="2" height="5" rx="1" fill="#3E8FE0"/><rect x="15" y="2" width="2" height="5" rx="1" fill="#3E8FE0"/>
      <circle cx="8" cy="14" r="1.3" fill="#fff"/><circle cx="12" cy="14" r="1.3" fill="#fff"/>
    </svg>
    <div className="how-head reveal">
      <p className="how-eyebrow">Comment ça marche</p>
      <h2 className="how-title display">Trois étapes, deux minutes</h2>
      <p className="how-sub">De la sélection du créneau à la confirmation, tout se passe en ligne.</p>
    </div>
    <div className="how-row">
      <div className="how-connector"></div>
      <div className="how-card reveal">
        <div className="how-photo">
          <img src="https://images.unsplash.com/photo-1758876023053-3aa541a0935b?fm=jpg&q=80&w=700&auto=format&fit=crop" alt="Cliente réservant son rendez-vous depuis son téléphone" />
          <span className="how-step-num">1</span>
        </div>
        <p className="how-card-title">Prendre rendez-vous par téléphone</p>
        <p className="how-card-desc">Le patient ouvre le calendrier en ligne animé depuis son téléphone et sélectionne une date et une heure libres.</p>
      </div>
      <div className="how-card reveal" style={{transitionDelay: '.1s'}}>
        <div className="how-photo">
          <img src="https://images.unsplash.com/photo-1621606677061-ec5eda5c04e9?fm=jpg&q=80&w=700&auto=format&fit=crop" alt="Remplissage du formulaire de rendez-vous" />
          <span className="how-step-num">2</span>
        </div>
        <p className="how-card-title">Remplir ses coordonnées</p>
        <p className="how-card-desc">Un court formulaire — nom, téléphone, motif — suffit à finaliser la demande.</p>
      </div>
      <div className="how-card reveal" style={{transitionDelay: '.2s'}}>
        <div className="how-photo">
          <img src="https://images.unsplash.com/photo-1758874383881-cd90c326058e?fm=jpg&q=80&w=700&auto=format&fit=crop" alt="Client heureux, rendez-vous confirmé" />
          <span className="how-step-num">3</span>
        </div>
        <p className="how-card-title">Rendez-vous confirmé</p>
        <p className="how-card-desc">Le créneau est bloqué immédiatement et un lien de gestion vous est remis pour le consulter ou l'annuler.</p>
      </div>
    </div>
  </section>

  
  <section className="pz-section">
    <div className="pz-grid">
      <div>
        <p className="pz-eyebrow">Pensé pour vos patients</p>
        <h2 className="pz-title display">Une réservation <span>personnalisée</span>, du premier clic à la confirmation</h2>
        <p className="pz-sub">Depuis son téléphone, chaque patiente retrouve le calendrier du cabinet, réserve en quelques secondes et reçoit une confirmation immédiate.</p>
        <ul className="pz-list">
          <li><span className="pz-check"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span><span><b>Confirmation instantanée.</b> Le rendez-vous est validé en quelques secondes, sans appel ni attente.</span></li>
          <li><span className="pz-check"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span><span><b>Gestion autonome.</b> Le lien reçu à la confirmation permet de consulter ou d'annuler le rendez-vous, sans créer de compte.</span></li>
          <li><span className="pz-check"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span><span><b>Pensé pour le mobile.</b> Un parcours simple et guidé, accessible depuis n'importe quel téléphone.</span></li>
          <li><span className="pz-check"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span><span><b>Cabinet joignable.</b> Une question avant ou après la réservation ? Le cabinet reste disponible.</span></li>
        </ul>
      </div>
      <div className="pz-photo-col">
        <div className="pz-halo"></div>
        <div className="pz-circle">
          <img src="https://images.unsplash.com/photo-1758876023053-3aa541a0935b?fm=jpg&q=80&w=700&auto=format&fit=crop" alt="Cliente réservant son rendez-vous en ligne" />
        </div>
        <span className="pz-badge pz-badge-1">
          <span className="pz-badge-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
          Créneau réservé
        </span>
        <span className="pz-badge pz-badge-2">
          <span className="pz-badge-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
          Rendez-vous confirmé
        </span>
        <span className="pz-toast" id="pzToast">
          <span className="pz-toast-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
          Confirmation envoyée
        </span>
      </div>
    </div>
  </section>

  
  <section className="cr-trust">
    <div className="cr-trust-item">
      <div className="cr-trust-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg></div>
      <div className="cr-trust-text">Sans création de compte<span>Accès direct par lien ou QR code</span></div>
    </div>
    <div className="cr-trust-item">
      <div className="cr-trust-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
      <div className="cr-trust-text">Confirmation immédiate<span>Créneau bloqué dès validation</span></div>
    </div>
    <div className="cr-trust-item">
      <div className="cr-trust-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></div>
      <div className="cr-trust-text">Gestion autonome<span>Consultez ou annulez via votre lien</span></div>
    </div>
    <div className="cr-trust-item">
      <div className="cr-trust-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
      <div className="cr-trust-text">Assistant intégré<span>Questions sur les services et horaires</span></div>
    </div>
  </section>

  
  <section className="cr-section">
    <h2 className="cr-section-title display">Services disponibles</h2>
    <p className="cr-section-sub">Sélectionnez une prestation pour voir les créneaux réellement libres.</p>
    <div className="pro-selector" id="proSelector"></div>
    <div className="cr-services-grid" id="services-grid"></div>
  </section>

  
  <section className="cr-info-section">
    <div className="info-card" style={{padding: '0', overflow: 'hidden'}}>
      <div className="map-block">
        <div className="map-pin">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      </div>
    </div>
    <div className="info-card">
      <p className="hours-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Horaires d'ouverture
      </p>
      <div id="hours-list"></div>
    </div>
  </section>

  
  <footer className="cr-footer">
    <span id="footerName"></span>
    <button type="button" className="cr-footer-pro-link" onClick={() => navigate('/connexion')}>Espace Pro →</button>
  </footer>

  
  <div className="booking-overlay" id="bookingOverlay">
    <div className="booking-modal" role="dialog" aria-modal="true">
      <button className="booking-close" onClick={() => (window as any).closeBooking()} aria-label="Fermer">×</button>
      <div className="booking-header">
        <p className="booking-eyebrow">Prise de rendez-vous</p>
        <h3 className="booking-title display" id="bookingTitle">Choisissez un créneau</h3>
      </div>
      <div className="booking-progress">
        <div className="booking-dot" id="dot1"></div>
        <div className="booking-dot" id="dot2"></div>
        <div className="booking-dot" id="dot3"></div>
      </div>
      <div id="bookingStepContent"></div>
    </div>
  </div>

  
  <div className="booking-overlay" id="lookupOverlay">
    <div className="booking-modal" role="dialog" aria-modal="true" style={{maxWidth: '420px'}}>
      <button className="booking-close" onClick={() => (window as any).closeLookup()} aria-label="Fermer">×</button>
      <div className="booking-header">
        <p className="booking-eyebrow">Gérer mon rendez-vous</p>
        <h3 className="booking-title display">Retrouver ma réservation</h3>
      </div>
      <div className="booking-field">
        <label>Lien de gestion reçu lors de la confirmation</label>
        <input type="text" id="lookupToken" placeholder="https://…/rdv/…" />
      </div>
      <div className="booking-error" id="lookupError">Collez le lien reçu lors de la confirmation.</div>
      <button className="booking-btn booking-btn-primary booking-btn-full" onClick={() => (window as any).doLookup()}>Rechercher</button>
      <div id="lookupResultZone"></div>
    </div>
  </div>

  
  <button className="assistant-fab" onClick={() => (window as any).toggleAssistant()}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  </button>
  <div className="assistant-panel" id="assistant-panel">
    <h4 className="display">Assistant</h4>
    <div className="assistant-log" id="assistantLog"></div>
    <div className="assistant-input-row">
      <input type="text" id="assistantInput" placeholder="Votre question…" onKeyDown={(e) => { if (e.key === 'Enter') (window as any).sendAssistant(); }} />
      <button type="button" onClick={() => (window as any).sendAssistant()} aria-label="Envoyer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  </div>
    </>
  );
}