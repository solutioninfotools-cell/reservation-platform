import { Injectable, Logger } from '@nestjs/common';

/**
 * Abstraction d'envoi d'e-mail.
 * V1 : aucun fournisseur externe (Brevo/Resend/SendGrid) n'est intégré, conformément
 * au cahier des charges. Les e-mails sont simplement journalisés côté serveur.
 * Pour brancher un vrai fournisseur plus tard, il suffit de remplacer l'implémentation
 * de `send()` dans cette classe (l'interface reste identique pour le reste de l'app).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService (mode journalisation — pas de fournisseur externe en V1)');

  async send(to: string, subject: string, body: string): Promise<void> {
    this.logger.log(`→ À: ${to} | Sujet: ${subject}\n${body}`);
  }

  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
