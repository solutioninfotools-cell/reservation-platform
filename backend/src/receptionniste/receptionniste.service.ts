import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import {
  StatutRdv,
  TypeNotification,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { CreateRdvDto } from '../appointments/dto/create-rdv.dto';
import { NotificationsService } from '../notifications/notifications.service';


@Injectable()
export class ReceptionnisteService {

  constructor(
    private prisma: PrismaService,
    private clientsService: ClientsService,
    private appointments: AppointmentsService,
    private notificationsService: NotificationsService,
  ) {}


  // =========================================================
  // PROFIL RECEPTIONNISTE
  // =========================================================

  async findByUserId(userId: string) {

    const rec =
      await this.prisma.receptionniste.findUnique({
        where: { userId }
      });

    if (!rec) {
      throw new NotFoundException(
        'Profil réceptionniste introuvable.'
      );
    }

    return rec;
  }


  /** Profil affiché dans l'espace Réceptionniste (l'e-mail vient du compte). */
  async profilComplet(userId: string) {
    const rec = await this.prisma.receptionniste.findUnique({
      where: { userId },
      include: { user: { select: { email: true, statutCompte: true } } },
    });
    if (!rec) throw new NotFoundException('Profil réceptionniste introuvable.');
    const { user, ...reste } = rec;
    return { ...reste, email: user.email, statutCompte: user.statutCompte };
  }


  // =========================================================
  // AFFECTATIONS
  // =========================================================

  /** Liste les professionnels auxquels cette réceptionniste est affectée (avec ses permissions). */
  async mesAffectations(userId: string) {

    const rec =
      await this.findByUserId(userId);

    return this.prisma.affectation.findMany({

      where: {
        receptionnisteId: rec.id
      },

      include: {
        professionnel: true
      }

    });
  }


  private async ensureAffectee(
    userId: string,
    professionnelId: string
  ) {

    const rec =
      await this.findByUserId(userId);

    const aff =
      await this.prisma.affectation.findUnique({

        where: {

          professionnelId_receptionnisteId: {
            professionnelId,
            receptionnisteId: rec.id
          }

        }

      });

    if (!aff) {

      throw new ForbiddenException(
        "Vous n'êtes pas affectée à ce professionnel."
      );

    }

    return aff;
  }


  // =========================================================
  // TELEPHONE
  // =========================================================

  private normalizeTelephone(
    telephone: string
  ): string {

    let tel = telephone
      .replace(/\s/g, '')
      .replace(/-/g, '');


    if (tel.startsWith('+213')) {
      tel = '0' + tel.substring(4);
    }


    if (tel.startsWith('00213')) {
      tel = '0' + tel.substring(5);
    }


    return tel;
  }


  private isValidTelephone(
    telephone: string
  ): boolean {

    return /^0[5-7][0-9]{8}$/.test(
      telephone
    );
  }


  // =========================================================
  // DETECTER CLIENT
  // =========================================================

  async detecterClient(
    telephone?: string,
    nom?: string,
    dateNaissance?: string
  ) {

    if (telephone) {

      const c =
        await this.prisma.client.findUnique({
          where: { telephone }
        });

      if (c) {
        return c;
      }
    }


    if (nom && dateNaissance) {

      const c =
        await this.prisma.client.findFirst({

          where: {

            nom: {
              equals: nom,
              mode: 'insensitive'
            },

            dateNaissance:
              new Date(dateNaissance)

          }

        });

      if (c) {
        return c;
      }
    }


    return null;
  }


  // =========================================================
  // CREER RENDEZ-VOUS
  // =========================================================

  async creerRdv(
    userId: string,
    dto: CreateRdvDto
  ) {

    await this.ensureAffectee(
      userId,
      dto.professionnelId
    );


    const telephone =
      this.normalizeTelephone(
        dto.telephone
      );


    if (!this.isValidTelephone(telephone)) {

      throw new BadRequestException(
        'Numéro de téléphone invalide'
      );

    }


    const service =
      await this.prisma.service.findUnique({

        where: {
          id: dto.serviceId
        }

      });


    if (!service) {

      throw new NotFoundException(
        'Service introuvable'
      );

    }


    // Vérifier que le service appartient bien
    // au professionnel choisi
    if (
      service.professionnelId !==
      dto.professionnelId
    ) {

      throw new BadRequestException(
        "Ce service n'appartient pas à ce professionnel"
      );

    }


    const professionnel =
      await this.prisma.professionnel.findUnique({

        where: {
          id: dto.professionnelId
        },

        select: {
          userId: true
        }

      });


    if (!professionnel) {

      throw new NotFoundException(
        'Professionnel introuvable'
      );

    }


    const dateDebut =
      new Date(dto.dateDebut);


    if (isNaN(dateDebut.getTime())) {

      throw new BadRequestException(
        'Date du rendez-vous invalide'
      );

    }


    const dateFin =
      new Date(dateDebut);


    dateFin.setMinutes(
      dateFin.getMinutes() +
      service.dureeMinutes
    );


    const result =
      await this.prisma.$transaction(
        async (tx) => {

          let client =
            await tx.client.findUnique({

              where: {
                telephone
              }

            });


          if (client) {

            const memeNom =
              client.nom.toLowerCase() ===
              dto.nom.trim().toLowerCase();


            const memePrenom =
              client.prenom.toLowerCase() ===
              dto.prenom.trim().toLowerCase();


            if (
              !memeNom ||
              !memePrenom
            ) {

              throw new ConflictException(
                `Ce numéro appartient déjà à ${client.prenom} ${client.nom}`
              );

            }

          } else {

            client =
              await tx.client.create({

                data: {

                  nom:
                    dto.nom.trim(),

                  prenom:
                    dto.prenom.trim(),

                  telephone,

                  email:
                    dto.email || null,

                  adresse:
                    dto.adresse || null,

                  dateNaissance:
                    dto.dateNaissance
                      ? new Date(
                          dto.dateNaissance
                        )
                      : null

                }

              });

          }


          const rdv =
            await tx.rendezVous.create({

              data: {

                clientId:
                  client.id,

                professionnelId:
                  dto.professionnelId,

                serviceId:
                  dto.serviceId,

                dateDebut,

                dateFin,

                origine:
                  'RECEPTIONNISTE',

                remarque:
                  dto.remarque || null

              }

            });


          return {
            rdv,
            client
          };

        }
      );


    // Notification après création réussie
    const message =
      `${result.client.prenom} ${result.client.nom} a réservé un rendez-vous le ${dateDebut.toLocaleDateString('fr-FR')}.`;


    await this.notificationsService.pushNotification(

      professionnel.userId,

      TypeNotification.NOUVELLE_RESERVATION,

      message,

      userId

    );


    return result.rdv;
  }


  // =========================================================
  // RECHERCHE CLIENTS
  // =========================================================

  async searchClients(
    search: string
  ) {

    const clients =
      await this.prisma.client.findMany({

        where: {

          OR: [

            {
              nom: {
                contains: search,
                mode: 'insensitive'
              }
            },

            {
              prenom: {
                contains: search,
                mode: 'insensitive'
              }
            },

            {
              telephone: {
                contains: search
              }
            }

          ]

        },

        include: {
          rendezVous: true
        }

      });


    if (clients.length === 0) {

      return {
        message:
          `Aucun résultat pour "${search}"`
      };

    }


    return clients;
  }


  // =========================================================
  // TOUS LES CLIENTS
  // =========================================================

  async getAllClientsWithRdv() {

    const clients =
      await this.prisma.client.findMany({

        include: {
          rendezVous: true
        }

      });


    if (
      !clients ||
      clients.length === 0
    ) {

      return {
        message: 'Table vide'
      };

    }


    return clients.map(
      (c) => ({

        id:
          c.id,

        name:
          `${c.prenom} ${c.nom}`,

        phone:
          c.telephone,

        rdvs:
          c.rendezVous

      })
    );
  }


  // =========================================================
  // PROFESSIONNELS
  // =========================================================

  async professionnels(
    userId: string
  ) {

    const rec =
      await this.findByUserId(
        userId
      );


    return this.prisma.affectation.findMany({

      where: {

        receptionnisteId:
          rec.id,

        actif:
          true

      },

      include: {
        professionnel: true
      }

    });
  }


  // =========================================================
  // LISTE RENDEZ-VOUS
  // =========================================================

  async getRdvList(
    userId: string
  ) {

    console.log(
      '📋 Récupérer RDVs pour réceptionniste:',
      userId
    );


    const affectations =
      await this.mesAffectations(
        userId
      );


    console.log(
      '✅ Affectations trouvées:',
      affectations.length
    );


    if (
      !affectations ||
      affectations.length === 0
    ) {

      return {
        message:
          'Aucun professionnel assigné'
      };

    }


    const proIds =
      affectations.map(
        (a) =>
          a.professionnelId
      );


    console.log(
      '🔑 IDs professionnels:',
      proIds
    );


    const rdvs =
      await this.prisma.rendezVous.findMany({

        where: {

          professionnelId: {
            in: proIds
          }

        },

        include: {

          client: true,

          professionnel: true,

          service: true

        },

        orderBy: {
          dateDebut: 'asc'
        }

      });


    console.log(
      '📅 RDVs trouvés:',
      rdvs.length
    );


    return rdvs;
  }


  // =========================================================
  // CLIENT PAR ID
  // =========================================================

  async getClientById(
    id: string
  ) {

    const client =
      await this.prisma.client.findUnique({

        where: {
          id
        }

      });


    if (!client) {

      throw new NotFoundException(
        'Client introuvable'
      );

    }


    return client;
  }


  // =========================================================
  // CONVERSION STATUT
  // =========================================================

  private toStatutRdv(
    value: string
  ): StatutRdv {

    const map:
      Record<string, StatutRdv> = {

        reserve:
          StatutRdv.RESERVE,

        arrive:
          StatutRdv.CLIENT_ARRIVE,

        encours:
          StatutRdv.EN_COURS,

        termine:
          StatutRdv.TERMINE,

        absent:
          StatutRdv.ABSENT,

        annule:
          StatutRdv.ANNULE

      };


    const statut =
      map[
        value?.toLowerCase()
      ];


    if (!statut) {

      throw new BadRequestException(
        'Statut invalide'
      );

    }


    return statut;
  }


  // =========================================================
  // MODIFIER STATUT RDV
  // =========================================================

  async modifierStatutRdv(
    userId: string,
    rdvId: string,
    nouveauStatut: string
  ) {

    const rdv =
      await this.prisma.rendezVous.findUnique({

        where: {
          id: rdvId
        },

        include: {

          client: true,

          professionnel: true

        }

      });


    if (!rdv) {

      throw new NotFoundException(
        'Rendez-vous introuvable'
      );

    }


    const affectation =
      await this.ensureAffectee(

        userId,

        rdv.professionnelId

      );


    if (
      !affectation.peutGererRdv
    ) {

      throw new ForbiddenException(
        "Vous n'avez pas l'autorisation de gérer ce rendez-vous"
      );

    }


    const statut =
      this.toStatutRdv(
        nouveauStatut
      );


    if (
      rdv.statut === statut
    ) {

      throw new BadRequestException(
        'Le rendez-vous est déjà dans ce statut'
      );

    }


    const limite =
      new Date(

        rdv.dateFin.getTime() +

        3 *
          24 *
          60 *
          60 *
          1000

      );


    if (
      new Date() >
      limite
    ) {

      throw new BadRequestException(
        'Impossible de modifier le rendez-vous plus de 3 jours après son déroulement'
      );

    }


    const result =
      await this.prisma.$transaction(
        async (tx) => {

          const updated =
            await tx.rendezVous.update({

              where: {
                id: rdvId
              },

              data: {
                statut
              }

            });


          await tx.historiqueStatut.create({

            data: {

              rendezVousId:
                rdvId,

              ancienStatut:
                rdv.statut,

              nouveauStatut:
                statut,

              changedBy:
                userId

            }

          });


          return updated;
        }
      );


    const message =
      `Le statut du rendez-vous de ${rdv.client.prenom} ${rdv.client.nom} est maintenant ${statut}.`;


    await this.notificationsService.pushNotification(

      rdv.professionnel.userId,

      TypeNotification.CHANGEMENT_STATUT,

      message,

      userId

    );


    return result;
  }


  // =========================================================
  // ANNULER RDV
  // =========================================================

  async annulerRdv(
    userId: string,
    rdvId: string,
    motif?: string
  ) {

    const rdv =
      await this.prisma.rendezVous.findUnique({

        where: {
          id: rdvId
        },

        include: {

          client: true,

          professionnel: true

        }

      });


    if (!rdv) {

      throw new NotFoundException(
        'Rendez-vous introuvable'
      );

    }


    const affectation =
      await this.ensureAffectee(

        userId,

        rdv.professionnelId

      );


    if (
      !affectation.peutGererRdv
    ) {

      throw new ForbiddenException(
        "Vous n'avez pas l'autorisation"
      );

    }


    if (
      rdv.statut ===
      StatutRdv.ANNULE
    ) {

      throw new BadRequestException(
        'Ce rendez-vous est déjà annulé'
      );

    }


    const result =
      await this.prisma.$transaction(
        async (tx) => {

          const updated =
            await tx.rendezVous.update({

              where: {
                id: rdvId
              },

              data: {

                statut:
                  StatutRdv.ANNULE,

                motifAnnulation:
                  motif || null

              }

            });


          await tx.historiqueStatut.create({

            data: {

              rendezVousId:
                rdvId,

              ancienStatut:
                rdv.statut,

              nouveauStatut:
                StatutRdv.ANNULE,

              changedBy:
                userId

            }

          });


          return updated;
        }
      );


    const message =
      `Le rendez-vous de ${rdv.client.prenom} ${rdv.client.nom} a été annulé.`;


    await this.notificationsService.pushNotification(

      rdv.professionnel.userId,

      TypeNotification.ANNULATION,

      message,

      userId

    );


    return result;
  }


  // =========================================================
  // MODIFIER CLIENT
  // PAS DE NOTIFICATION
  // =========================================================

  async modifierClient(
    userId: string,
    rdvId: string,
    dto: any
  ) {

    const rdv =
      await this.prisma.rendezVous.findUnique({

        where: {
          id: rdvId
        }

      });


    if (!rdv) {

      throw new NotFoundException(
        'Rendez-vous introuvable'
      );

    }


    await this.ensureAffectee(

      userId,

      rdv.professionnelId

    );


    const client =
      await this.prisma.client.findUnique({

        where: {
          id: rdv.clientId
        }

      });


    if (!client) {

      throw new NotFoundException(
        'Client introuvable'
      );

    }


    return this.prisma.client.update({

      where: {
        id: rdv.clientId
      },

      data: {

        nom:
          dto.nom,

        prenom:
          dto.prenom,

        telephone:
          dto.telephone,

        email:
          dto.email || null,

        adresse:
          dto.adresse || null,

        dateNaissance:
          dto.dateNaissance
            ? new Date(
                dto.dateNaissance
              )
            : null

      }

    });
  }


  // =========================================================
  // MODIFIER RENDEZ-VOUS
  // =========================================================

  async modifierRdv(
    userId: string,
    rdvId: string,
    dto: any
  ) {

    const rdv =
      await this.prisma.rendezVous.findUnique({

        where: {
          id: rdvId
        },

        include: {
          client: true
        }

      });


    if (!rdv) {

      throw new NotFoundException(
        'Rendez-vous introuvable'
      );

    }


    const professionnelId =
      dto.professionnelId ||
      rdv.professionnelId;


    await this.ensureAffectee(

      userId,

      professionnelId

    );


    const serviceId =
      dto.serviceId ||
      rdv.serviceId;


    const service =
      await this.prisma.service.findFirst({

        where: {

          id:
            serviceId,

          professionnelId:
            professionnelId

        },

        include: {
          professionnel: true
        }

      });


    if (!service) {

      throw new NotFoundException(
        'Service introuvable pour ce professionnel'
      );

    }


    const dateDebut =
      dto.dateDebut
        ? new Date(
            dto.dateDebut
          )
        : rdv.dateDebut;


    if (
      isNaN(
        dateDebut.getTime()
      )
    ) {

      throw new BadRequestException(
        'Date du rendez-vous invalide'
      );

    }


    const dateFin =
      new Date(

        dateDebut.getTime() +

        service.dureeMinutes *
          60 *
          1000

      );


    const result =
      await this.prisma.rendezVous.update({

        where: {
          id: rdvId
        },

        data: {

          professionnelId:
            professionnelId,

          serviceId:
            service.id,

          dateDebut:
            dateDebut,

          dateFin:
            dateFin,

          remarque:
            dto.remarque ??
            rdv.remarque

        }

      });


    const message =
      `Le rendez-vous de ${rdv.client.prenom} ${rdv.client.nom} a été modifié.`;


    await this.notificationsService.pushNotification(

      service.professionnel.userId,

      TypeNotification.MODIFICATION,

      message,

      userId

    );


    return result;
  }
async updateCreneaux(
  userId: string,
  professionnelId: string,
  creneaux: {
    jourSemaine: number;
    heureDebut: string;
    heureFin: string;
  }[]
) {

  // 1. Vérifier que la réceptionniste est affectée au professionnel
  const affectation =
    await this.ensureAffectee(
      userId,
      professionnelId
    );


  // 2. Vérifier permission planning
  if (!affectation.peutGererPlanning) {
    throw new ForbiddenException(
      "Vous n'avez pas l'autorisation de modifier le planning."
    );
  }


  // 3. Vérifier professionnel
  const professionnel =
    await this.prisma.professionnel.findUnique({
      where: {
        id: professionnelId
      },

      select: {
        id: true,
        userId: true,
        nom: true
      }
    });


  if (!professionnel) {
    throw new NotFoundException(
      'Professionnel introuvable'
    );
  }


  // 4. Vérifier les données
  if (!Array.isArray(creneaux)) {
    throw new BadRequestException(
      'Liste des créneaux invalide'
    );
  }


  const heureRegex =
    /^([01]\d|2[0-3]):[0-5]\d$/;


  for (const c of creneaux) {

    if (
      !heureRegex.test(c.heureDebut) ||
      !heureRegex.test(c.heureFin)
    ) {
      throw new BadRequestException(
        'Format heure invalide. Utilisez HH:mm'
      );
    }


    if (c.heureDebut >= c.heureFin) {
      throw new BadRequestException(
        `Heure de début invalide pour le jour ${c.jourSemaine}`
      );
    }
  }


  // 5. Remplacer les anciens créneaux
  const result =
    await this.prisma.$transaction(
      async (tx) => {

        await tx.disponibilite.deleteMany({
          where: {
            professionnelId
          }
        });


        if (creneaux.length > 0) {

          await tx.disponibilite.createMany({
            data: creneaux.map((c) => ({
              professionnelId,
              jourSemaine:
                c.jourSemaine,

              heureDebut:
                c.heureDebut,

              heureFin:
                c.heureFin
            }))
          });

        }


        return tx.disponibilite.findMany({

          where: {
            professionnelId
          },

          orderBy: [
            {
              jourSemaine: 'asc'
            },
            {
              heureDebut: 'asc'
            }
          ]

        });

      }
    );


  // 6. Notification au professionnel
  await this.notificationsService.pushNotification(

    professionnel.userId,

    TypeNotification.MODIFICATION,

    'Vos créneaux de disponibilité ont été modifiés.',

    userId

  );


  return result;
}
async getCreneaux(
  userId: string,
  professionnelId: string
) {

  const affectation =
    await this.ensureAffectee(
      userId,
      professionnelId
    );


  if (!affectation.peutGererPlanning) {

    throw new ForbiddenException(
      "Vous n'avez pas l'autorisation de consulter ce planning."
    );

  }


  return this.prisma.disponibilite.findMany({

    where: {
      professionnelId
    },

    orderBy: [
      {
        jourSemaine: 'asc'
      },
      {
        heureDebut: 'asc'
      }
    ]

  });
}
}