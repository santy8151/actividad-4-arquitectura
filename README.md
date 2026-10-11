# Actividad 4: asignación de mensajero (vertical slice)

[![CI](https://github.com/santy8151/actividad-4-arquitectura/actions/workflows/ci.yml/badge.svg)](https://github.com/santy8151/actividad-4-arquitectura/actions/workflows/ci.yml)

Vertical slice basado en el flujo aprobado en Actividad 3: asignar un mensajero disponible a una entrega pendiente, verificar capacidad de ruta y guardar el evento `DeliveryAssigned` de forma durable.

## Arquitectura Onion

La dependencia siempre apunta hacia el dominio. Infraestructura implementa puertos de aplicación; la API compone los adaptadores al iniciar.

```text
                    ┌───────────────────────────────┐
                    │ Exterior: API + Infrastructure│
                    │       dependen hacia adentro  │
                    │   ┌───────────────────────┐   │
                    │   │ Application           │   │
                    │   │ casos de uso + puertos│   │
                    │   │   ┌───────────────┐   │   │
                    │   │   │ Domain        │   │   │
                    │   │   │ reglas/eventos│   │   │
                    │   │   └───────────────┘   │   │
                    │   └───────────────────────┘   │
                    └───────────────────────────────┘
```

- `LastMile.Domain`: entidades, invariantes, value objects y eventos; no referencia otras capas.
- `LastMile.Application`: casos de uso y puertos; referencia solo Domain.
- `LastMile.Infrastructure`: EF Core, SQLite y adaptadores; implementa contratos de Application y referencia el núcleo.
- `LastMile.Api`: HTTP/DTO y composition root; referencia Application e Infrastructure.

La regla se verifica automáticamente con `python scripts/check_architecture.py` y en CI. No hay carpetas por cada clase: se agrupa por capa, y en Infrastructure por adaptador concreto.

## Navegación

- [Tablero Kanban](https://github.com/users/santy8151/projects/12) · [wiki y trazabilidad](wiki/Home.md)
- [Diseño de Actividad 3](docs/actividad-3.md) · [ADRs](wiki/Decisiones-Arquitectonicas.md)
- [Pruebas](wiki/Plan-de-Pruebas.md) · [riesgos/observabilidad](wiki/Riesgos-y-Observabilidad.md)
- [Guion de defensa](wiki/Guion-de-Defensa.md) · [checklist](wiki/Checklist-de-Entrega.md)

## Requisitos

.NET SDK 10.0.x y Python 3.

## Ejecutar

```powershell
dotnet restore LastMile.sln
dotnet run --project src/LastMile.Api
```

La primera ejecución aplica la migración SQLite y agrega la entrega demo. Repartidor: `c0000000-0000-4000-8000-000000000001`. Entrega: `d1000000-0000-4000-8000-000000000001`. API HTTP de ejemplo en `src/LastMile.Api/LastMile.Api.http`.

Consulta `GET /api/deliveries/{deliveryId}`, salud `GET /health`; asigna con `POST /api/deliveries/{deliveryId}/courier-assignment`. La entrega solo se asigna una vez; elimina `lastmile.db` con la API detenida para reiniciar la demostración.

## Verificar

```powershell
python scripts/check_architecture.py
dotnet build LastMile.sln --configuration Release
dotnet test LastMile.sln --configuration Release
```

CI además ejecuta `dotnet ef migrations has-pending-model-changes` y `dotnet list package --vulnerable --include-transitive`. Evidencia: [última ejecución verde](https://github.com/santy8151/actividad-4-arquitectura/actions/runs/38127220532).

## Estructura

```text
src/
  LastMile.Domain/          # Centro de Onion
  LastMile.Application/     # Casos de uso y puertos
  LastMile.Infrastructure/  # Adaptadores y persistencia
  LastMile.Api/             # Entrada HTTP y composition root
tests/                      # Dominio e integración
docs/                       # Diseño de Actividad 3 y ADR original
wiki/                       # Trazabilidad, decisiones, riesgos y defensa
scripts/                    # Fitness function arquitectónica
```

## Adaptadores y riesgos

Las integraciones HTTP se configuran con `Integration:CourierManagement:BaseUrl`, `Integration:RoutePlanning:BaseUrl` y `Integration:RouteEvents:BaseUrl`; valores vacíos usan doubles demo. Las consultas reintentan red/429/5xx hasta tres veces. La entrega y el evento se guardan en una transacción; un worker publica el outbox con idempotency key, backoff y dead-letter tras cinco intentos.

SQLite y doubles permiten ejecutar la demo local. La capacidad se consulta, no se reserva atómicamente; falta reserva idempotente o saga para resolver la carrera entre solicitudes. La API no tiene autenticación y la telemetría no exporta a un collector; son límites documentados para esta demostración, no configuración de producción.
