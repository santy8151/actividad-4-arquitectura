import { DomainRuleError } from './errors';

export const VALID_DISTRIBUTOR_SEGMENTS = [
  'mayorista',
  'minorista',
  'horeca',
  'ecommerce',
  'institucional',
] as const;

export type DistributorSegment = (typeof VALID_DISTRIBUTOR_SEGMENTS)[number];

export const VALID_COMMERCIAL_STAGES = [
  'prospecto',
  'negociacion',
  'activo',
  'en_riesgo',
  'inactivo',
] as const;

export type CommercialStage = (typeof VALID_COMMERCIAL_STAGES)[number];

export interface Distributor {
  id: string;
  codigo: string;
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
  radioCoberturaKm: number;
  capacidadAlmacenamientoUnidades: number;
  inventarioDisponibleUnidades: number;
  pedidosMesActual: number;
  cupoCreditoCop: number;
  cumplimientoSlaPct: number;
  actualizadoEn: string;
}

export function isValidDistributorSegment(value: string): value is DistributorSegment {
  return (VALID_DISTRIBUTOR_SEGMENTS as readonly string[]).includes(value);
}

export function isValidCommercialStage(value: string): value is CommercialStage {
  return (VALID_COMMERCIAL_STAGES as readonly string[]).includes(value);
}

export function canDistributorDispatchOrders(distributor: Pick<Distributor, 'etapaComercial'>): boolean {
  return distributor.etapaComercial === 'activo' || distributor.etapaComercial === 'en_riesgo';
}

export interface ValidateDistributorInput {
  nombre: string;
  nit: string;
  segmento: string;
  etapaComercial: string;
  contactoNombre: string;
  contactoEmail: string;
  direccion: string;
  lat: number;
  lng: number;
  capacidadAlmacenamientoUnidades?: number;
  inventarioDisponibleUnidades?: number;
}

export function validateDistributorData(input: ValidateDistributorInput): void {
  if (!input.nombre || !input.nombre.trim()) {
    throw new DomainRuleError('INVALID_DISTRIBUTOR_DATA', 'El nombre del distribuidor es obligatorio.');
  }
  if (!input.nit || !input.nit.trim()) {
    throw new DomainRuleError('INVALID_DISTRIBUTOR_DATA', 'El NIT del distribuidor es obligatorio.');
  }
  if (!isValidDistributorSegment(input.segmento)) {
    throw new DomainRuleError(
      'INVALID_DISTRIBUTOR_SEGMENT',
      `Segmento de distribuidor inválido: '${input.segmento}'. Valores permitidos: ${VALID_DISTRIBUTOR_SEGMENTS.join(', ')}.`
    );
  }
  if (!isValidCommercialStage(input.etapaComercial)) {
    throw new DomainRuleError(
      'INVALID_COMMERCIAL_STAGE',
      `Etapa comercial inválida: '${input.etapaComercial}'. Valores permitidos: ${VALID_COMMERCIAL_STAGES.join(', ')}.`
    );
  }
  if (!input.direccion || !input.direccion.trim()) {
    throw new DomainRuleError('INVALID_DISTRIBUTOR_DATA', 'La dirección física del nodo distribuidor es obligatoria.');
  }
  if (Number.isNaN(input.lat) || Number.isNaN(input.lng) || input.lat < -90 || input.lat > 90 || input.lng < -180 || input.lng > 180) {
    throw new DomainRuleError('INVALID_DISTRIBUTOR_DATA', 'Las coordenadas geográficas del distribuidor son inválidas.');
  }
  if (
    input.capacidadAlmacenamientoUnidades !== undefined &&
    input.inventarioDisponibleUnidades !== undefined &&
    input.inventarioDisponibleUnidades > input.capacidadAlmacenamientoUnidades
  ) {
    throw new DomainRuleError(
      'INVALID_DISTRIBUTOR_DATA',
      'El inventario disponible no puede superar la capacidad máxima del punto de distribución.'
    );
  }
}
