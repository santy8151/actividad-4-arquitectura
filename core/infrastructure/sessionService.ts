const ACTIVE_PROFILE_STORAGE_KEY = 'rutaclara_active_profile_id_v1';

/** Adaptador de sesión RBAC: persiste el perfil activo del usuario en el navegador. */
export class SessionAdapter {
  public saveSessionProfileId(profileId: string | null): void {
    if (typeof window === 'undefined') return;
    if (!profileId) {
      window.localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY);
    } else {
      window.localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, profileId);
    }
  }

  public getSavedSessionProfileId(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
  }
}

export const identityAdapter = new SessionAdapter();
