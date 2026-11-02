import netlifyIdentity from 'netlify-identity-widget';
import { VALID_USER_ROLES, type UserProfile, type UserRole } from '../domain';

export interface IdentityConnectionStatus {
  initialized: boolean;
  netlifyIdentityAvailable: boolean;
  provider: 'netlify-identity' | 'enterprise-rbac-session';
}

const ACTIVE_PROFILE_STORAGE_KEY = 'rutaclara_active_profile_id_v1';

export class NetlifyIdentityAdapter {
  private initialized = false;

  public init(onUserChange?: (email: string | null, role?: UserRole, fullName?: string) => void): IdentityConnectionStatus {
    if (typeof window === 'undefined') {
      return {
        initialized: false,
        netlifyIdentityAvailable: false,
        provider: 'enterprise-rbac-session',
      };
    }

    if (!this.initialized) {
      try {
        netlifyIdentity.init({
          locale: 'es',
        });
        netlifyIdentity.on('login', (user) => {
          const rawRole = user?.app_metadata?.roles?.[0] ?? user?.user_metadata?.role ?? 'pendiente';
          const role: UserRole = (VALID_USER_ROLES as readonly string[]).includes(rawRole)
            ? (rawRole as UserRole)
            : 'pendiente';
          onUserChange?.(user?.email ?? null, role, user?.user_metadata?.full_name);
          netlifyIdentity.close();
        });
        netlifyIdentity.on('logout', () => {
          onUserChange?.(null);
        });
        this.initialized = true;
      } catch {
        // En despliegues fuera de Netlify (como Vercel) donde /.netlify/identity no está activo,
        // el adaptador opera limpiamente mediante sesión RBAC empresarial.
      }
    }

    return {
      initialized: this.initialized,
      netlifyIdentityAvailable: Boolean(window.location.hostname.includes('netlify.app')),
      provider: window.location.hostname.includes('netlify.app')
        ? 'netlify-identity'
        : 'enterprise-rbac-session',
    };
  }

  public openModal(tab: 'login' | 'signup' = 'login'): void {
    try {
      netlifyIdentity.open(tab);
    } catch {
      // Fallback silencioso
    }
  }

  public logoutNetlify(): void {
    try {
      if (netlifyIdentity.currentUser()) {
        netlifyIdentity.logout();
      }
    } catch {
      // Ignore
    }
  }

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

export const identityAdapter = new NetlifyIdentityAdapter();
