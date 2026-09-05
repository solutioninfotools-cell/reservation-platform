import { SetMetadata } from '@nestjs/common';

export type PermissionKey =
  | 'peutConsulterAgenda'
  | 'peutGererRdv'
  | 'peutGererPlanning'
  | 'peutGererParametres';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
