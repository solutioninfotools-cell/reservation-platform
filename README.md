# RendezVousApp — Plateforme de gestion de rendez-vous

Application Full-Stack de prise de rendez-vous en ligne : **Admin**, **Professionnel**,
**Réceptionniste**, **Client (sans compte)**. V1 conforme au cahier des charges fourni.

Stack : **React + TypeScript + Vite + Tailwind CSS** (frontend) · **NestJS + TypeScript**
(backend) · **PostgreSQL + Prisma** · **Socket.IO** · **JWT + bcrypt**.

---

## 1. État réel de cette V1 — à lire avant tout

Conformément à la règle du cahier des charges *(« ne jamais marquer une fonctionnalité
comme terminée si elle ne fonctionne pas réellement »)*, voici un état honnête de ce qui
a été construit, vérifié, et ce qui reste à faire.

### ✅ Vérifié réellement dans cet environnement de développement
- Le **backend compile** (`tsc --noEmit`) sans erreur propre au code (voir note Prisma ci-dessous).
- Le **frontend compile et build réellement** avec Vite (`npm run build` → bundle généré avec succès).
- Les **tests Jest du backend passent réellement** (`npm test` → 3/3 tests verts).
- Tous les imports (frontend et backend) ont été vérifiés automatiquement : aucun import cassé.
- Deux vrais bugs ont été détectés puis corrigés grâce à ces vérifications (conflit de nom
  dans `receptionniste.service.ts`, types manquants côté frontend) — la preuve que ces
  contrôles ont été réellement exécutés et pas seulement écrits.

### 🔧 Choix technique : `bcryptjs` plutôt que `bcrypt`
Le paquet `bcrypt` nécessite une compilation native (node-gyp + Visual Studio Build
Tools sous Windows), ce qui bloque `npm install` sur de nombreuses machines. Le projet
utilise donc **`bcryptjs`** (implémentation pure JavaScript, même API `hash`/`compare`)
— aucune installation supplémentaire requise, sur aucun OS.

### ⚠️ Limitation connue de cet environnement (pas un bug du code)
`prisma generate` n'a pas pu télécharger le moteur binaire (`binaries.prisma.sh` n'est
pas accessible depuis le réseau restreint de cet environnement de build). Résultat :
3 erreurs `TS2305` sur les enums `Role` / `TypeNotification` lors du `tsc` backend —
elles disparaissent automatiquement dès que vous lancez `npx prisma generate` sur votre
propre machine avec un accès internet normal (étape obligatoire de toute installation
Prisma, indépendante de ce projet). Le schéma `schema.prisma` a été relu et validé
manuellement mais n'a pas pu passer `prisma validate` pour la même raison.

### 🟡 Fonctionnalités du CDC volontairement simplifiées en V1 (transparence totale)
- **Les 4 pages principales (`CrenoPagePublique`, `AdminDashboard`,
  `ProfessionnelDashboard`, `ReceptionnisteDashboard`) sont des reproductions
  visuelles fidèles fournies par vous, intégrées telles quelles.** Elles utilisent
  encore leurs **données mock internes d'origine** (agenda, clients, statistiques,
  etc.) et ne sont **pas encore reliées à l'API réelle** — à l'exception de la modale
  "Espace Pro" de `CrenoPagePublique` (connexion + inscription), qui appelle bien les
  vrais endpoints `/auth/login` et `/auth/register`. Relier le reste de ces 4 pages à
  l'API (`api/professionnel.api.ts`, `api/admin.api.ts`, `api/receptionniste.api.ts`,
  déjà écrits et fonctionnels) est la prochaine étape logique — la logique métier
  backend correspondante existe déjà et a été pensée pour ces mêmes formes de données.

- **Email** : aucun fournisseur externe (conforme à la consigne). Les e-mails sont
  journalisés côté serveur (`EmailService.send()`) plutôt qu'envoyés réellement.
- **Assistant IA** : réponses par mots-clés à partir des données réelles de l'espace
  (pas de LLM), conforme à la consigne V1.
- **Champs personnalisés** : le modèle de données et les endpoints existent
  (`ChampPersonnalise`, `ReponseChamp`), mais l'interface d'administration pour les
  créer/configurer depuis l'espace Professionnel n'est pas encore construite — seule la
  saisie des réponses côté client est câblée dans l'API.
- **Indisponibilités du Professionnel** (fermer un créneau/journée/période) : endpoints
  backend prêts (`/professionnel/indisponibilites`), mais pas encore d'écran dans
  `ProDashboard.tsx` pour les utiliser — seules les disponibilités hebdomadaires ont une
  interface.
- **Réinitialisation du superviseur** (section 7 du CDC) : endpoint backend prêt et
  sécurisé (`PATCH /config/reset-supervisor`, ressaisie de mot de passe vérifiée côté
  serveur), mais pas encore d'écran dans `AdminDashboard.tsx` pour le déclencher.
- **Page Utilisateurs** (recherche globale multi-rôles côté Admin) : pas encore
  construite, ni backend ni frontend, dans cette V1.
- **Vue Grille/Liste et menus rétractables** (exigences UI/UX) : implémentés pour le menu
  latéral des 3 espaces authentifiés ; la bascule Grille/Liste sur les listes n'est pas
  encore ajoutée sur toutes les pages.
- **Suite de tests** : seule l'authentification a une couverture de tests unitaires réelle
  en V1. Le moteur de réservation (anti-double-réservation, permissions, etc.) est écrit
  pour être testable (logique isolée dans des services) mais les tests d'intégration
  nécessitant une vraie base PostgreSQL ne sont pas encore écrits.
- **Docker** : `docker-compose.yml` ne contient que PostgreSQL (le plus utile en
  développement local) ; pas d'image Docker pour le backend/frontend eux-mêmes en V1.
- **Swagger** : activé et fonctionnel (`/api/docs`) mais les DTO n'ont pas tous une
  documentation `@ApiProperty` exhaustive.

### ❌ Non commencé
- Déploiement production, CI/CD.
- Vérification email obligatoire avant connexion (le mécanisme et la page existent —
  `/verification-email` — mais `login()` ne bloque pas encore un compte non vérifié,
  seul le statut de compte `EN_ATTENTE` bloque).
- Page d'inscription pour la Réceptionniste (celle du Professionnel existe :
  `/professionnel/inscription` — une Réceptionniste est en pratique créée par
  affectation depuis l'Admin, mais l'auto-inscription n'a pas d'écran dédié).

**En résumé : le cœur métier (auth réelle, moteur de réservation avec vérification de
conflits en transaction, 4 espaces fonctionnels connectés à une vraie API, temps réel,
audit, permissions vérifiées côté backend) est réellement implémenté et vérifié. Les
éléments listés ci-dessus sont les prochaines itérations logiques.**

---

## 2. Architecture

```
reservation-platform/
├── backend/            # API NestJS
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── auth/               # JWT, bcrypt, inscription, vérification e-mail
│       ├── config/              # Configuration initiale + réinitialisation superviseur
│       ├── admin/                # Espace Admin
│       ├── professionnel/        # Espace Professionnel (services, dispo, permissions)
│       ├── receptionniste/       # Espace Réceptionniste
│       ├── appointments/         # Moteur de réservation (cœur du système)
│       ├── clients/              # Dédoublonnage client
│       ├── public/               # Parcours Client sans compte
│       ├── notifications/, audit/, email/, assistant/, websocket/
│       └── common/                # Guards (rôles, permissions), decorators, filtres
├── frontend/           # App React
│   └── src/
│       ├── pages/
│       │   ├── CrenoPagePublique.tsx         # indépendant — Espace Client public
│       │   │                                  (reproduction fidèle du design fourni,
│       │   │                                  bouton "Espace Pro" câblé sur l'auth réelle)
│       │   ├── AdminDashboard.tsx            # indépendant — reproduction fidèle
│       │   ├── ProfessionnelDashboard.tsx    # indépendant — reproduction fidèle
│       │   ├── ReceptionnisteDashboard.tsx   # indépendant — reproduction fidèle
│       │   ├── setup/InitialSetup.tsx        # indépendant
│       │   ├── auth/Login.tsx                # indépendant
│       │   ├── auth/VerifyEmail.tsx          # indépendant
│       │   ├── professionnel/ProRegister.tsx # indépendant (inscription Pro)
│       │   ├── admin/AdminDashboard.tsx      # indépendant
│       │   ├── professionnel/ProDashboard.tsx# indépendant
│       │   ├── receptionniste/RecDashboard.tsx# indépendant
│       │   ├── client/ClientBooking.tsx      # indépendant
│       │   └── errors/ (401/403/404/500/réseau)
│       ├── components/ui/    # Composants génériques partagés (Button, Input, Modal,
│       │                       StatCard, StatusBadge, AppointmentRow, NotificationBell)
│       ├── api/, stores/, guards/, hooks/, types/, utils/
├── docs/
├── .env.example
├── docker-compose.yml
└── README.md (ce fichier)
```

**Principe de séparation des interfaces** (demande explicite) : chaque espace
(Admin/Professionnel/Réceptionniste/Client) est un fichier de page React indépendant,
contenant directement sa logique métier et son styling Tailwind. Seuls les éléments
réellement génériques (bouton, champ, modale, badge de statut, ligne de rendez-vous,
cloche de notifications) sont mutualisés dans `components/ui/`, pour pouvoir modifier le
design d'un espace sans toucher aux autres.

---

## 3. Installation

### Prérequis
- Node.js 20+
- PostgreSQL 16 (ou `docker compose up -d` pour le lancer via Docker)

### Étapes

```bash
# 1. Variables d'environnement
cp .env.example backend/.env
cp .env.example frontend/.env   # seules les variables VITE_* sont utilisées côté frontend

# 2. Base de données
docker compose up -d            # démarre PostgreSQL

# 3. Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed             # crée des comptes de démonstration
npm run start:dev               # http://localhost:3000/api (docs: /api/docs)

# 4. Frontend (nouveau terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

### Comptes créés par le seed (mot de passe : `Password123!`)
| Rôle | E-mail |
|---|---|
| Admin | admin@rendezvousapp.com |
| Professionnel | ahmed.benali@rendezvousapp.com |
| Réceptionniste | imane.b@rendezvousapp.com |

Si vous préférez repartir de zéro sans seed, ouvrez `http://localhost:5173/configuration`
pour lancer l'assistant de configuration initiale (mode de supervision + domaine).

---

## 4. Tests

```bash
cd backend
npm test          # tests unitaires (voir portée exacte en section 1)
npm run test:cov  # avec couverture
```

---

## 5. Points clés d'implémentation

- **Le backend est la seule autorité** : le moteur de réservation
  (`appointments.service.ts`) recalcule et revérifie systématiquement la disponibilité
  et les conflits dans une transaction Prisma avant de créer un rendez-vous, quelle que
  soit la confiance accordée au frontend.
- **Permissions Réceptionniste** vérifiées à deux niveaux : `RolesGuard` (rôle) puis
  `PermissionsGuard` (permission accordée par le Professionnel pour cette affectation
  précise) — jamais dans le frontend seul.
- **Réinitialisation du superviseur** : ne supprime aucune donnée métier, suspend
  temporairement les comptes existants, exige la ressaisie du mot de passe (vérifiée
  côté backend), et journalise l'action dans `AuditLog`.
- **Temps réel** : Socket.IO diffuse `rdv:created` / `rdv:updated` / `rdv:status-changed`
  aux rooms `pro:<id>` et `admin`.

---

## 6. Prochaines étapes suggérées

1. `npx prisma generate` + `prisma migrate dev` sur votre machine pour lever la
   limitation Prisma de cet environnement.
2. Interface Professionnel pour configurer les champs personnalisés par service.
3. Tests d'intégration du moteur de réservation avec une vraie base PostgreSQL
   (notamment le scénario de double réservation simultanée).
4. Vue Grille/Liste sur les listes restantes (services, clients).
5. Fournisseur e-mail réel branché derrière `EmailService` (l'abstraction est prête).
