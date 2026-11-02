import {
  assertPermission,
  assignUserRole,
  DomainRuleError,
  validateDistributorData,
  type CommercialStage,
  type Distributor,
  type DistributorSegment,
  type UserProfile,
  type UserRole,
} from '../domain';
import type {
  ClockPort,
  DistributorRepositoryPort,
  ProfileRepositoryPort,
} from './ports';

export interface SaveDistributorInput {
  id?: string;
  codigo?: string;
  nombre: string;
  nit: string;
  segmento: DistributorSegment;
  etapaComercial: CommercialStage;
  contactoNombre: string;
  contactoEmail: string;
  contactoTelefono: string;
  direccion: string;
  localidad: string;
  lat: number;
  lng: number;
  radioCoberturaKm?: number;
  capacidadAlmacenamientoUnidades?: number;
  inventarioDisponibleUnidades?: number;
  cupoCreditoCop?: number;
  actor: Pick<UserProfile, 'id' | 'nombre' | 'rol'>;
}

export class ManageDistributorsUseCase {
  constructor(
    private readonly deps: {
      distributors: DistributorRepositoryPort;
      clock: ClockPort;
    }
  ) {}

  async upsert(input: SaveDistributorInput): Promise<Distributor> {
    assertPermission(input.actor, 'distributors:manage');

    validateDistributorData({
      nombre: input.nombre,
      nit: input.nit,
      segmento: input.segmento,
      etapaComercial: input.etapaComercial,
      contactoNombre: input.contactoNombre,
      contactoEmail: input.contactoEmail,
      direccion: input.direccion,
      lat: input.lat,
      lng: input.lng,
      capacidadAlmacenamientoUnidades: input.capacidadAlmacenamientoUnidades,
      inventarioDisponibleUnidades: input.inventarioDisponibleUnidades,
    });

    const nowIso = this.deps.clock.nowIso();

    if (input.id) {
      const existing = await this.deps.distributors.findById(input.id);
      if (!existing) {
        throw new DomainRuleError('ENTITY_NOT_FOUND', `Distribuidor '${input.id}' no encontrado.`);
      }
      const updated: Distributor = {
        ...existing,
        nombre: input.nombre.trim(),
        nit: input.nit.trim(),
        segmento: input.segmento,
        etapaComercial: input.etapaComercial,
        contactoNombre: input.contactoNombre.trim(),
        contactoEmail: input.contactoEmail.trim(),
        contactoTelefono: input.contactoTelefono.trim(),
        direccion: input.direccion.trim(),
        localidad: input.localidad.trim(),
        lat: input.lat,
        lng: input.lng,
        radioCoberturaKm: input.radioCoberturaKm ?? existing.radioCoberturaKm,
        capacidadAlmacenamientoUnidades:
          input.capacidadAlmacenamientoUnidades ?? existing.capacidadAlmacenamientoUnidades,
        inventarioDisponibleUnidades:
          input.inventarioDisponibleUnidades ?? existing.inventarioDisponibleUnidades,
        cupoCreditoCop: input.cupoCreditoCop ?? existing.cupoCreditoCop,
        actualizadoEn: nowIso,
      };
      return this.deps.distributors.update(updated);
    }

    const all = await this.deps.distributors.listAll();
    const created: Distributor = {
      id: `dist-${Date.now()}`,
      codigo: input.codigo ?? `DIST-BOG-0${all.length + 1}`,
      nombre: input.nombre.trim(),
      nit: input.nit.trim(),
      segmento: input.segmento,
      etapaComercial: input.etapaComercial,
      contactoNombre: input.contactoNombre.trim(),
      contactoEmail: input.contactoEmail.trim(),
      contactoTelefono: input.contactoTelefono.trim(),
      direccion: input.direccion.trim(),
      localidad: input.localidad.trim(),
      lat: input.lat,
      lng: input.lng,
      radioCoberturaKm: input.radioCoberturaKm ?? 4.5,
      capacidadAlmacenamientoUnidades: input.capacidadAlmacenamientoUnidades ?? 1500,
      inventarioDisponibleUnidades: input.inventarioDisponibleUnidades ?? 950,
      pedidosMesActual: 0,
      cupoCreditoCop: input.cupoCreditoCop ?? 45000000,
      cumplimientoSlaPct: 98.0,
      actualizadoEn: nowIso,
    };

    return this.deps.distributors.create(created);
  }
}

export interface UpdateProfileRoleInput {
  targetProfileId: string;
  nuevoRol: UserRole;
  distribuidorId?: string | null;
  domiciliarioId?: string | null;
  actor: Pick<UserProfile, 'id' | 'nombre' | 'rol'>;
}

export class ManageProfilesUseCase {
  constructor(
    private readonly deps: {
      profiles: ProfileRepositoryPort;
      clock: ClockPort;
    }
  ) {}

  async changeUserRole(input: UpdateProfileRoleInput): Promise<UserProfile> {
    const target = await this.deps.profiles.findById(input.targetProfileId);
    if (!target) {
      throw new DomainRuleError('ENTITY_NOT_FOUND', `Perfil de usuario '${input.targetProfileId}' no encontrado.`);
    }

    const updated = assignUserRole(
      input.actor,
      target,
      input.nuevoRol,
      this.deps.clock.nowIso()
    );

    return this.deps.profiles.save({
      ...updated,
      distribuidorId: input.distribuidorId !== undefined ? input.distribuidorId : updated.distribuidorId,
      domiciliarioId: input.domiciliarioId !== undefined ? input.domiciliarioId : updated.domiciliarioId,
    });
  }
}
