import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { UnauthorizedException } from '@nestjs/common';

/**
 * Tests critiques de l'authentification (section 40 du CDC).
 * Ces tests unitaires utilisent un PrismaService simulé (pas de connexion réelle
 * à PostgreSQL) — voir README > Tests pour la portée exacte de la suite en V1.
 */
describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: any };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: () => 'fake.jwt.token' } },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: EmailService, useValue: { send: jest.fn(), generateCode: () => '123456' } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('refuse la connexion avec un mauvais mot de passe', async () => {
    const hash = await bcrypt.hash('BonMotDePasse1', 12);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@a.com', passwordHash: hash, statutCompte: 'ACTIF' });

    await expect(service.login({ email: 'a@a.com', password: 'Mauvais' })).rejects.toThrow(UnauthorizedException);
  });

  it('refuse la connexion pour un compte en attente de validation', async () => {
    const hash = await bcrypt.hash('BonMotDePasse1', 12);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@a.com', passwordHash: hash, statutCompte: 'EN_ATTENTE' });

    await expect(service.login({ email: 'a@a.com', password: 'BonMotDePasse1' })).rejects.toThrow(
      /attente de validation/,
    );
  });

  it('autorise la connexion avec les bons identifiants pour un compte actif', async () => {
    const hash = await bcrypt.hash('BonMotDePasse1', 12);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@a.com', passwordHash: hash, statutCompte: 'ACTIF', role: 'PROFESSIONNEL' });
    prisma.user.update.mockResolvedValue({});

    const result = await service.login({ email: 'a@a.com', password: 'BonMotDePasse1' });
    expect(result.accessToken).toBe('fake.jwt.token');
    expect(result.user.email).toBe('a@a.com');
  });
});
