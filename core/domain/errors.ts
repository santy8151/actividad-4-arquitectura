export type DomainErrorCode =
  | 'INVALID_ORDER_DATA'
  | 'INVALID_STATE_TRANSITION'
  | 'ORDER_ALREADY_ASSIGNED'
  | 'CONCURRENCY_CONFLICT'
  | 'COURIER_OFF_SHIFT'
  | 'COURIER_NO_CAPACITY'
  | 'COURIER_LOCATION_STALE'
  | 'COURIER_LOAD_INVALID'
  | 'COURIER_HAS_ACTIVE_ROUTE'
  | 'INVALID_DISTRIBUTOR_DATA'
  | 'INVALID_DISTRIBUTOR_SEGMENT'
  | 'INVALID_COMMERCIAL_STAGE'
  | 'DISTRIBUTOR_NOT_ACTIVE'
  | 'UNAUTHORIZED_ACTION'
  | 'ACCOUNT_PENDING_APPROVAL'
  | 'SELF_ROLE_ASSIGNMENT_FORBIDDEN'
  | 'ENTITY_NOT_FOUND';

export class DomainRuleError extends Error {
  public readonly code: DomainErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: DomainErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'DomainRuleError';
    this.code = code;
    this.details = details;
  }
}
