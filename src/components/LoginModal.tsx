import { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  KeyRound,
  Lock,
  MapPin,
  Shield,
  Sparkles,
  Truck,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { ROLE_PERMISSIONS, type Distributor, type UserProfile, type UserRole } from '@core/domain';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: UserProfile[];
  distributors: Distributor[];
  activeProfile: UserProfile;
  onSelectProfile: (profile: UserProfile) => void;
  onRegisterPendingUser: (data: {
    nombre: string;
    email: string;
    cargo: string;
    distribuidorId?: string;
  }) => Promise<void>;
}

const ROLE_META: Record<
  UserRole,
  {
    title: string;
    subtitle: string;
    badgeClass: string;
    icon: typeof Shield;
  }
> = {
  admin: {
    title: 'Administrador General',
    subtitle: 'Acceso total: Operaciones, CRM/ERP, Flota, Auditoría y Aprobación de Perfiles',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    icon: Shield,
  },
  operador: {
    title: 'Operador de Torre de Control',
    subtitle: 'Despacho atómico, sugerencias Haversine, máquina de estados y monitoreo en mapa',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    icon: MapPin,
  },
  distribuidor: {
    title: 'Socio Distribuidor (CRM / ERP)',
    subtitle: 'Gestión de nodo de distribución, stock ERP, creación y rastreo de sus pedidos',
    badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    icon: Building2,
  },
  domiciliario: {
    title: 'Domiciliario en Ruta',
    subtitle: 'Control de turno, cupo activo, telemetría GPS en tiempo real y entregas en campo',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    icon: Truck,
  },
  pendiente: {
    title: 'Cuenta Pendiente de Aprobación',
    subtitle: 'Usuario registrado sin permisos operativos hasta que un Administrador le asigne rol',
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    icon: Clock,
  },
};

export function LoginModal({
  isOpen,
  onClose,
  profiles,
  distributors,
  activeProfile,
  onSelectProfile,
  onRegisterPendingUser,
}: LoginModalProps) {
  const [tab, setTab] = useState<'profiles' | 'register'>('profiles');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState('Coordinador de Punto Aliado');
  const [distribuidorId, setDistribuidorId] = useState(distributors[0]?.id ?? 'dist-01');

  if (!isOpen) return null;

  async function handleCreatePending(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) return;
    await onRegisterPendingUser({
      nombre: nombre.trim(),
      email: email.trim(),
      cargo: cargo.trim() || 'Solicitante Externo',
      distribuidorId,
    });
    setNombre('');
    setEmail('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Centro de Identidad y Acceso Multi-Perfil — RutaClara
              </h2>
              <p className="text-xs text-slate-400">
                Selecciona cualquier perfil para operar la plataforma según sus reglas de dominio RBAC.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 py-2.5">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('profiles')}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                tab === 'profiles'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <UserCheck className="mr-1.5 inline h-4 w-4" />
              Ingresar con Perfil Demo / RBAC ({profiles.length})
            </button>
            <button
              onClick={() => setTab('register')}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                tab === 'register'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <UserPlus className="mr-1.5 inline h-4 w-4" />
              Registrar Nueva Cuenta (Inicia en estado Pendiente)
            </button>
          </div>

        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6">
          {tab === 'profiles' ? (
            <div className="grid gap-4 md:grid-cols-2">
              {profiles.map((profile) => {
                const meta = ROLE_META[profile.rol];
                const Icon = meta.icon;
                const isCurrent = profile.id === activeProfile.id;
                const perms = ROLE_PERMISSIONS[profile.rol] ?? [];

                return (
                  <div
                    key={profile.id}
                    onClick={() => {
                      onSelectProfile(profile);
                      onClose();
                    }}
                    className={`group cursor-pointer rounded-2xl border p-4 transition-all ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-950/20 ring-2 ring-emerald-500/30'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow"
                          style={{ backgroundColor: profile.avatarColor }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{profile.nombre}</span>
                            {isCurrent && (
                              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                SESIÓN ACTIVA
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">{profile.email}</div>
                        </div>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${meta.badgeClass}`}
                      >
                        {profile.rol}
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-slate-300">{meta.subtitle}</p>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {perms.length > 0 ? (
                        perms.slice(0, 6).map((perm) => (
                          <span
                            key={perm}
                            className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-400 border border-slate-800"
                          >
                            {perm}
                          </span>
                        ))
                      ) : (
                        <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-500/20">
                          🔒 Sin permisos operativos hasta aprobación de Admin
                        </span>
                      )}
                      {perms.length > 6 && (
                        <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400">
                          +{perms.length - 6} más
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                      <span className="text-slate-400">{profile.cargo}</span>
                      <span className="font-semibold text-emerald-400 group-hover:underline">
                        Entrar con este perfil →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleCreatePending} className="mx-auto max-w-lg space-y-4">
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <Lock className="h-4 w-4" />
                  Regla de Dominio: Aprobación Obligatoria de Cuentas Nuevas
                </div>
                <p className="mt-1 text-amber-200/80">
                  Toda cuenta nueva se crea con el rol <code className="font-mono font-bold">pendiente</code>. Ningún usuario puede asignarse un rol a sí mismo; un Administrador deberá aprobarla en el panel de Perfiles.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">Nombre completo</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Camilo Vargas"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">Correo corporativo</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="camilo.vargas@empresa.co"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">Cargo / Solicitud</label>
                <input
                  type="text"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Nodo Distribuidor vinculado (opcional)
                </label>
                <select
                  value={distribuidorId}
                  onChange={(e) => setDistribuidorId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  {distributors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.codigo} — {d.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg hover:bg-emerald-400"
              >
                <CheckCircle2 className="h-4 w-4" />
                Crear Cuenta en Estado Pendiente e Iniciar Sesión
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
