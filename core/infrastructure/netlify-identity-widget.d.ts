declare module 'netlify-identity-widget' {
  export interface NetlifyIdentityUser {
    id: string;
    email: string;
    app_metadata?: {
      roles?: string[];
    };
    user_metadata?: {
      full_name?: string;
      role?: string;
    };
  }

  export interface InitOptions {
    APIUrl?: string;
    logo?: boolean;
    namePlaceholder?: string;
    locale?: string;
  }

  const netlifyIdentity: {
    init(opts?: InitOptions): void;
    open(tabName?: 'login' | 'signup'): void;
    close(): void;
    currentUser(): NetlifyIdentityUser | null;
    logout(): Promise<void> | void;
    on(event: 'init' | 'login', callback: (user: NetlifyIdentityUser | null) => void): void;
    on(event: 'logout' | 'open' | 'close', callback: () => void): void;
    on(event: 'error', callback: (err: Error) => void): void;
  };

  export default netlifyIdentity;
}
