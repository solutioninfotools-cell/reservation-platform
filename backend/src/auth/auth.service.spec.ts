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
  let prisma: { user: any; emailVerificationToken: any };

  const PASSWORD = 'BonMotDePasse1';
  let hash: string;

  beforeAll(async () => {
    hash = await bcrypt.hash(PASSWORD, 12);
  });

  /** Compte actif et e-mail confirmé, sauf surcharge explicite. */
  const compte = (over: Record<string, any> = {}) => ({
    id: 'u1',
    email: 'a@a.com',
    passwordHash: hash,
    role: 'PROFESSIONNEL',
    statutCompte: 'ACTIF',
    emailVerifie: true,
    ...over,
  });

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      emailVerificationToken: { create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
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
    prisma.user.findUnique.mockResolvedValue(compte());
    await expect(service.login({ email: 'a@a.com', password: 'Mauvais' })).rejects.toThrow(UnauthorizedException);
  });

  it('refuse la connexion pour un e-mail inconnu', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.login({ email: 'inconnu@a.com', password: PASSWORD })).rejects.toThrow(UnauthorizedException);
  });

  it('refuse la connexion tant que l\'e-mail n\'est pas confirmé', async () => {
    prisma.user.findUnique.mockResolvedValue(compte({ statutCompte: 'EN_ATTENTE', emailVerifie: false }));
    await expect(service.login({ email: 'a@a.com', password: PASSWORD })).rejects.toThrow(/pas encore confirmée/);
  });

  it('refuse la connexion pour un compte en attente de validation', async () => {
    prisma.user.findUnique.mockResolvedValue(compte({ statutCompte: 'EN_ATTENTE', emailVerifie: true }));
    await expect(service.login({ email: 'a@a.com', password: PASSWORD })).rejects.toThrow(/attente de validation/);
  });

  it('refuse la connexion pour un compte refusé', async () => {
    prisma.user.findUnique.mockResolvedValue(compte({ statutCompte: 'REFUSE' }));
    await expect(service.login({ email: 'a@a.com', password: PASSWORD })).rejects.toThrow(/refusée/);
  });

  it('refuse la connexion pour un compte désactivé', async () => {
    prisma.user.findUnique.mockResolvedValue(compte({ statutCompte: 'DESACTIVE' }));
    await expect(service.login({ email: 'a@a.com', password: PASSWORD })).rejects.toThrow(/désactivé/);
  });

  it('autorise la connexion avec les bons identifiants pour un compte actif', async () => {
    prisma.user.findUnique.mockResolvedValue(compte());
    const result = await service.login({ email: 'a@a.com', password: PASSWORD });
    expect(result.accessToken).toBe('fake.jwt.token');
    expect(result.user.email).toBe('a@a.com');
    expect(result.user.role).toBe('PROFESSIONNEL');
  });

  it('ne révèle pas si une adresse existe lors du mot de passe oublié', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await service.forgotPassword({ email: 'inconnu@a.com' });
    expect(res.message).toMatch(/Si un compte existe/);
    expect(prisma.emailVerificationToken.create).not.toHaveBeenCalled();
  });

  it('génère un code de réinitialisation pour un compte existant', async () => {
    prisma.user.findUnique.mockResolvedValue(compte());
    await service.forgotPassword({ email: 'a@a.com' });
    expect(prisma.emailVerificationToken.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'RESET_PASSWORD', code: '123456' }) }),
    );
  });

  it('refuse une réinitialisation avec un code expiré', async () => {
    prisma.user.findUnique.mockResolvedValue(compte());
    prisma.emailVerificationToken.findFirst.mockResolvedValue({
      id: 't1',
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(
      service.resetPassword({ email: 'a@a.com', code: '123456', password: 'NouveauPass1' }),
    ).rejects.toThrow(/invalide ou expiré/);
  });

  it('refuse la session /me pour un compte désactivé', async () => {
    prisma.user.findUnique.mockResolvedValue(compte({ statutCompte: 'DESACTIVE' }));
    await expect(service.me('u1')).rejects.toThrow(UnauthorizedException);
  });
});
