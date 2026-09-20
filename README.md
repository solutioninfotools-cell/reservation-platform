# RendezVousApp — Plateforme de gestion de rendez-vous

Application Full-Stack de prise de rendez-vous en ligne : **Admin**, **Professionnel**,
**Réceptionniste**, **Client (sans compte)**.

Stack : **React + TypeScript + Vite + Tailwind CSS** (frontend) · **NestJS + TypeScript**
(backend) · **PostgreSQL + Prisma** · **Socket.IO** · **JWT + bcrypt**.

---

## Installation

### Prérequis
- Node.js 20+
- Un fichier `.env` dans `backend/` avec les identifiants de connexion à la base
  (voir `.env.example` pour le modèle — demandez les vraies valeurs à l'équipe)

### Étapes

```bash
# 1. Cloner le repo
git clone https://github.com/solutioninfotools-cell/reservation-platform.git
cd reservation-platform

# 2. Variables d'environnement
cp .env.example backend/.env
# Remplacez les valeurs par les vraies (fournies en privé par l'équipe)

# 3. Backend
cd backend
npm install
npx prisma generate
npx prisma migrate deploy       # applique les migrations existantes
npm run start:dev               # http://localhost:3000/api

# 4. Frontend (nouveau terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

---

## Accès — comptes de démonstration

Mot de passe pour tous les comptes : **`Password123!`**

| Rôle | E-mail |
|---|---|
| Admin | admin@rendezvousapp.com |
| Professionnel | ahmed.benali@rendezvousapp.com |
| Réceptionniste | imane.b@rendezvousapp.com |

Le Client n'a pas de compte : il réserve directement depuis la page publique
(`http://localhost:5173`).

---

## Architecture

```
reservation-platform/
├── backend/            # API NestJS (auth, appointments, admin, professionnel, receptionniste, public...)
│   └── prisma/          # schema.prisma + migrations
├── frontend/           # App React (un dashboard par rôle)
├── docs/              # ARCHITECTURE.md + ADMIN.md (fonctionnalités et API de l'espace Admin)
├── .env.example
└── docker-compose.yml
```