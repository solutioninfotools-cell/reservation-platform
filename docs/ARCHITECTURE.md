# Notes d'architecture

## Pourquoi un espace unique (pas de marketplace multi-domaines)
Conformément au cahier des charges, la configuration initiale (`SystemConfig`) fixe un
domaine unique pour toute l'instance. Le client ne voit jamais qu'un seul espace : les
endpoints publics (`/api/public/*`) ne filtrent jamais par domaine côté client — ils
exposent directement les professionnels actifs de l'unique espace configuré.

## Pourquoi la vérification de disponibilité est refaite deux fois
1. Une première fois côté lecture (`GET /public/professionnels/:id/creneaux`) pour
   afficher les créneaux à l'utilisateur.
2. Une seconde fois, dans une transaction Prisma, au moment de la création
   (`POST /public/rendez-vous`) — car entre les deux, un autre client a pu réserver le
   même créneau. C'est cette seconde vérification qui fait foi (le frontend n'est jamais
   la source de vérité, cf. cahier des charges section 14).

## Pourquoi les permissions Réceptionniste sont un modèle séparé (`Affectation`)
Une Réceptionniste peut être affectée à plusieurs Professionnels, avec des permissions
différentes pour chacun. Le modèle `Affectation` porte donc les 4 booléens de permission
par paire (Professionnel, Réceptionniste), plutôt que sur le compte utilisateur
lui-même — ce qui permet à un Professionnel de restreindre l'accès à son propre espace
sans affecter les autres affectations de la même Réceptionniste.
