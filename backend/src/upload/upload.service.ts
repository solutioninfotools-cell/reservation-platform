import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import sharp = require('sharp');

/**
 * Forme minimale d'un fichier reçu par Multer. On la déclare nous-mêmes au
 * lieu d'utiliser le type `Express.Multer.File` fourni par @types/multer :
 * certaines installations Windows n'arrivent pas à faire cohabiter ce type
 * avec la version d'@types/express du projet, ce qui bloquait la compilation
 * sans rien changer au comportement réel du code.
 */
export interface FichierRecu {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

/**
 * Téléversement d'images (photo de profil, image de service).
 *
 * Le fichier envoyé (JPG, PNG ou WebP) est redimensionné puis converti en WebP
 * avant d'être rangé dans Supabase Storage. La base de données ne conserve que
 * l'adresse publique (colonnes `photoUrl` / `imageUrl`, de simples chaînes).
 */
const FORMATS_ACCEPTES = ['image/jpeg', 'image/png', 'image/webp'];
const LARGEUR_MAX = { profils: 600, services: 1200, plateforme: 1600 } as const;

@Injectable()
export class UploadService {
  private client: SupabaseClient | null = null;
  private readonly bucket = process.env.SUPABASE_BUCKET || 'images';

  /** Client créé au premier usage : l'API démarre même si Supabase n'est pas encore configuré. */
  private supabase(): SupabaseClient {
    if (this.client) return this.client;
    const url = process.env.SUPABASE_URL;
    const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !cle) {
      throw new InternalServerErrorException(
        'Stockage des images non configuré : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquent dans backend/.env.',
      );
    }
    this.client = createClient(url, cle, { auth: { persistSession: false } });
    return this.client;
  }

  async saveImage(file: FichierRecu | undefined, dossier: keyof typeof LARGEUR_MAX): Promise<string> {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
    if (!FORMATS_ACCEPTES.includes(file.mimetype)) {
      throw new BadRequestException('Format non supporté : utilisez JPG, PNG ou WebP.');
    }

    let contenu: Buffer;
    try {
      contenu = await sharp(file.buffer)
        .rotate() // applique l'orientation des photos de téléphone
        .resize({ width: LARGEUR_MAX[dossier], withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } catch {
      // Le type annoncé par le navigateur peut être faux (PDF renommé en .jpg…).
      throw new BadRequestException("Le fichier n'est pas une image valide.");
    }

    const chemin = `${dossier}/${randomUUID()}.webp`;
    const { error } = await this.supabase()
      .storage.from(this.bucket)
      .upload(chemin, contenu, { contentType: 'image/webp', cacheControl: '31536000' });
    if (error) throw new BadRequestException(`Échec de l'envoi de l'image : ${error.message}`);

    return this.supabase().storage.from(this.bucket).getPublicUrl(chemin).data.publicUrl;
  }
}