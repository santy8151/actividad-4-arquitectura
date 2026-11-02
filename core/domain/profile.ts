import { DomainRuleError } from './errors';

export const VALID_USER_ROLES = [
  'admin',
  'operador',
  'distribuidor',
  'domiciliario',
  'pendiente',
] as const;

export type UserRole = (typeof VALID_USER_ROLES)[number];

export type Permission =
  | 'map:view_all'
  | 'map:view_own'
  | 'orders:view_all'
  | 'orders:view_own'
  | 'orders:create'
  | 'orders:assign'
  | 'orders:transition_any'
  | 'orders:transition_assigned'
  | 'couriers:view_all'
  | 'couriers:manage'
  | 'couriers:shift_gps'
  | 'distributors:view_all'
  | 'distributors:manage'
  | 'profiles:manage'
  | 'audit:view';

export interface UserProfile {
  id: string;
  email: string;
  nombre: string;
  rol: UserRole;
  cargo: string;
  avatarColor: string;
  distribuidorId?: string | null;
  domiciliarioId?: string | null;
  aprobado: boolean;
  ultimoAcceso: string;
}

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  admin: [
    'map:view_all',
    'orders:view_all',
    'orders:create',
    'orders:assign',
    'orders:transition_any',
    'couriers:view_all',
    'couriers:manage',
    'couriers:shift_gps',
    'distributors:view_all',
    'distributors:manage',
    'profiles:manage',
    'audit:view',
  ],
  operador: [
    'map:view_all',
    'orders:view_all',
    'orders:create',
    'orders:assign',
    'orders:transition_any',
    'couriers:view_all',
    'couriers:manage',
    'distributors:view_all',
    'distributors:manage',
    'audit:view',
  ],
  distribuidor: [
    'map:view_own',
    'orders:view_own',
    'orders:create',
    'distributors:view_all',
  ],
  domiciliario: [
    'map:view_own',
    'orders:view_own',
    'orders:transition_assigned',
    'couriers:shift_gps',
  ],
  pendiente: [],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function assertPermission(actor: Pick<UserProfile, 'id' | 'nombre' | 'rol'>, permission: Permission): void {
  if (actor.rol === 'pendiente') {
    throw new DomainRuleError(
      'ACCOUNT_PENDING_APPROVAL',
      `La cuenta de ${actor.nombre} está en estado 'pendiente' de aprobación por un administrador.`
    );
  }
  if (!hasPermission(actor.rol, permission)) {
    throw new DomainRuleError(
      'UNAUTHORIZED_ACTION',
      `El perfil '${actor.rol}' (${actor.nombre}) no tiene el permiso requerido '${permission}'.`,
      { role: actor.rol, requiredPermission: permission }
    );
  }
}

/**
 * Regla de dominio crítica:
 * Ningún usuario puede asignarse ni modificarse un rol a sí mismo,
 * y únicamente un usuario con rol 'admin' puede administrar perfiles.
 */
export function assignUserRole(
  actor: Pick<UserProfile, 'id' | 'nombre' | 'rol'>,
  targetProfile: UserProfile,
  newRole: UserRole,
  nowIso: string
): UserProfile {
  if (actor.id === targetProfile.id) {
    throw new DomainRuleError(
      'SELF_ROLE_ASSIGNMENT_FORBIDDEN',
      'Regla de seguridad violada: ningún usuario puede asignarse o modificarse un rol a sí mismo.'
    );
  }

  assertPermission(actor, 'profiles:manage');

  if (!(VALID_USER_ROLES as readonly string[]).includes(newRole)) {
    throw new DomainRuleError('UNAUTHORIZED_ACTION', `El rol '${newRole}' no es válido en RutaClara.`);
  }

  return {
    ...targetProfile,
    rol: newRole,
    aprobado: newRole !== 'pendiente',
    ultimoAcceso: nowIso,
  };
}
