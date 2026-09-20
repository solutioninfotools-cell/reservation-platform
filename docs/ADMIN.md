# Espace Administrateur — fonctionnalités et API

L'espace Admin couvre la totalité des responsabilités de l'Administrateur décrites au
cahier des charges : gestion des comptes, des affectations, de l'activité globale
(clients, réservations, services, agendas), des paramètres de la plateforme, des
domaines d'activité, des statistiques et de la traçabilité.

Toutes les routes sont préfixées par `/api/admin` et protégées par
`JwtAuthGuard` + `RolesGuard` (`@Roles('ADMIN')`). Le frontend n'est jamais l'autorité :
chaque filtre et chaque règle est appliqué côté serveur.

---

## 1. Comptes

| Fonctionnalité | Route |
|---|---|
| Liste des professionnels (statut / recherche) | `GET /admin/professionnels?statut&search` |
| Fiche détaillée d'un professionnel (services, disponibilités, règles de réservation, réceptionnistes, 10 derniers RDV, compteurs) | `GET /admin/professionnels/:id` |
| Liste des réceptionnistes | `GET /admin/receptionnistes?statut&search` |
| Fiche d'une réceptionniste | `GET /admin/receptionnistes/:id` |
| Corriger la fiche d'un professionnel / d'une réceptionniste | `PATCH /admin/professionnels/:id` · `PATCH /admin/receptionnistes/:id` |
| Valider / refuser / activer / désactiver un compte | `PATCH /admin/comptes/:userId/statut` |
| Même chose pour plusieurs comptes à la fois | `PATCH /admin/comptes/statut-groupe` |
| Créer un compte Professionnel, Réceptionniste ou Administrateur | `POST /admin/comptes` |
| Réinitialiser un mot de passe | `PATCH /admin/comptes/:userId/mot-de-passe` |
| Changer l'adresse e-mail de connexion | `PATCH /admin/comptes/:userId/email` |
| Supprimer un compte | `DELETE /admin/comptes/:userId` |
| Recherche globale (professionnels, réceptionnistes, clients) | `GET /admin/users?role&search` |
| Diffuser une annonce interne (CDC I.13) | `POST /admin/annonces` |

**Règles métier**

- Un compte créé par l'Admin est immédiatement `ACTIF` et `emailVerifie` — l'inscription
  publique, elle, reste `EN_ATTENTE` de validation.
- La suppression est refusée si le professionnel possède des rendez-vous :
  l'historique métier ne doit jamais être perdu, on désactive le compte à la place.
- L'Admin ne peut ni changer le statut ni supprimer son propre compte.
- Chaque changement de statut déclenche une notification au titulaire du compte
  (`COMPTE_VALIDE` / `COMPTE_REFUSE`) et une entrée d'audit.

## 2. Affectations Réceptionniste ↔ Professionnel

| Fonctionnalité | Route |
|---|---|
| Affecter | `POST /admin/affectations` |
| Désaffecter | `DELETE /admin/affectations` |
| Remplacer toutes les affectations d'une réceptionniste | `PUT /admin/receptionnistes/:id/affectations` |
| Modifier les autorisations d'une affectation | `PATCH /admin/affectations/:id/permissions` |

Les quatre autorisations (`peutConsulterAgenda`, `peutGererRdv`, `peutGererPlanning`,
`peutGererParametres`) sont portées par le couple (Professionnel, Réceptionniste) :
une même réceptionniste peut donc avoir des droits différents selon le professionnel.

`Affectation.actif` (activation sur un espace donné, CDC II.13.1) relève du
Professionnel, pas de l'Admin : l'espace Admin l'affiche en lecture seule
(pastille « Active ici » / « Suspendue ici »). Le statut du compte lui-même
(`User.statutCompte`) reste du ressort de l'Admin.

## 3. Activité globale

| Fonctionnalité | Route |
|---|---|
| Clients (recherche, nb de RDV, dernier RDV) | `GET /admin/clients?search` |
| Fiche client + historique complet | `GET /admin/clients/:id` |
| Corriger / supprimer une fiche client | `PATCH` / `DELETE /admin/clients/:id` |
| Réservations (statut, professionnel, service, période, recherche, pagination) | `GET /admin/rendez-vous` |
| Détail d'une réservation (historique de statuts, champs personnalisés) | `GET /admin/rendez-vous/:id` |
| Annulation administrative | `PATCH /admin/rendez-vous/:id/annuler` |
| Déplacer un rendez-vous | `PATCH /admin/rendez-vous/:id/deplacer` |
| Services de tous les professionnels | `GET /admin/services?search&professionnelId&actif&statut` |
| Publier / dépublier un service | `PATCH /admin/services/:id/actif` |
| Changer la disponibilité d'un service | `PATCH /admin/services/:id/statut` |
| Supprimer un service | `DELETE /admin/services/:id` |
| Absences et indisponibilités, tous professionnels | `GET /admin/indisponibilites?professionnelId&from&to&type` |
| Synthèse des agendas (jours travaillés, RDV à venir, prochain RDV, absences) | `GET /admin/agendas` |
| Agenda détaillé d'une journée (lecture seule) | `GET /admin/agendas/:professionnelId?date=YYYY-MM-DD` |

L'annulation administrative passe par `AppointmentsService.updateStatus` : elle respecte
les transitions de statut autorisées, écrit l'historique et notifie le professionnel
ainsi que les réceptionnistes autorisées.

## 4. Plateforme

| Fonctionnalité | Route |
|---|---|
| Paramètres généraux | `GET` / `PATCH /admin/params` |

Champs éditables : identité publique (`platformName`, `slogan`, `description`,
`logoUrl`, `heroImageUrl`), contacts (`address`, `phone`, `email`,
`localisationUrl`), disponibilité par défaut (`joursOuvrables`,
`horairesGeneraux`), textes (`conditions`, `conditionsReservation`) et règles
d'annulation / report du client (`delaiMinAnnulationHeures`,
`delaiMinModificationHeures`, `maxChangementsRdv`, CDC IV).

`SystemConfig.domaine` (domaine principal de l'instance) est fixé à la
configuration initiale et affiché en lecture seule dans cette page.

## 5. Statistiques et traçabilité

| Fonctionnalité | Route |
|---|---|
| Statistiques globales | `GET /admin/stats` |
| Journal d'audit (action, utilisateur, professionnel, période, pagination) | `GET /admin/audit` |
| Exports CSV | `GET /admin/export/:entity` |

`GET /admin/stats` renvoie : comptes par rôle et par statut, nombre de clients et de
services, rendez-vous (total, aujourd'hui, semaine, à venir, terminés, annulés),
taux d'annulation, répartition par statut, top 5 services, top 5 professionnels et
l'évolution mensuelle des 6 derniers mois.

`:entity` accepte `professionnels`, `receptionnistes`, `clients`, `rendez-vous`,
`services`, `indisponibilites` et `audit`. Le CSV est encodé en UTF-8 avec BOM (ouverture directe dans Excel)
et séparé par `;`.

Actions tracées dans l'audit : `ACCOUNT_STATUS_CHANGED`, `ACCOUNT_CREATED`,
`ACCOUNT_PASSWORD_RESET`, `ACCOUNT_DELETED`, `AFFECTATION_CREATED`, `AFFECTATION_REMOVED`,
`AFFECTATION_PERMISSIONS_UPDATED`, `SERVICE_STATUS_CHANGED`, `PLATFORM_PARAMS_UPDATED`,
auxquelles s'ajoutent celles des autres modules (`LOGIN`, `RDV_STATUS_CHANGED`,
`INITIAL_SETUP`, `SUPERVISOR_RESET`…).

Les actions qui portent sur l'activité d'un professionnel renseignent
`AuditLog.professionnelId` (affectations, permissions, statut d'un service) :
elles alimentent l'« Historique des actions » de son espace (CDC II.17) sans lui
ouvrir le journal global.

Les notifications émises par l'espace Admin renseignent `Notification.senderId`
avec le compte administrateur à l'origine de l'action ; les notifications
système (rappels, annulations automatiques) le laissent nul.

## 6. Interface

Le tableau de bord (`frontend/src/pages/AdminDashboard.tsx`) consomme exclusivement
`frontend/src/api/admin.api.ts` — aucune donnée simulée. Pages disponibles :

Tableau de bord · Professionnels · Réceptionnistes · Utilisateurs · Clients ·
Réservations · Services · Agendas · Paramètres généraux · Journal d'audit · Notifications.

La page Services distingue deux colonnes : **Publication** (`Service.actif`,
modifiable par l'Admin) et **Disponibilité** (`Service.statut` :
`DISPONIBLE` / `COMPLET` / `INDISPONIBLE`, définie par le professionnel et
affichée ici en lecture seule).

Quelques routes n'ont pas encore d'écran dédié et ne sont appelables que via
`admin.api.ts` : annonces, changement de statut groupé, édition d'une fiche
professionnel / réceptionniste / client, changement d'e-mail, suppression de
service, déplacement d'un rendez-vous et liste des indisponibilités.

Les filtres des tableaux (professionnels, réceptionnistes, utilisateurs, clients,
réservations, services, audit) interrogent l'API à chaque changement (recherches
débouncées à ~320 ms) : ils portent donc sur l'ensemble des données, pas seulement
sur la page affichée.

## 7. Base de données

L'espace Admin n'ajoute aucun modèle ni aucune valeur d'énumération : il
fonctionne sur `prisma/schema.prisma` tel quel. Après tout changement de schéma,
il suffit donc de régénérer le client :

```bash
cd backend
npx prisma generate
```
