# Actividad 4 — Asignación de mensajero (vertical slice)

Implementación de la Actividad 3: asignar un mensajero disponible a una entrega pendiente, verificando capacidad de ruta y registrando `DeliveryAssigned` de forma durable.

## Navegación y trazabilidad

- [Tablero Kanban GitHub Projects](https://github.com/users/santy8151/projects/12) · [Issues](https://github.com/santy8151/actividad-4-arquitectura/issues)
- [Wiki versionada](wiki/Home.md) · [Matriz de trazabilidad](wiki/Trazabilidad.md)
- [ADRs](wiki/Decisiones-Arquitectonicas.md) · [Plan de pruebas](wiki/Plan-de-Pruebas.md)
- [Riesgos y observabilidad](wiki/Riesgos-y-Observabilidad.md) · [Guion de defensa](wiki/Guion-de-Defensa.md)
- [Diseño original Actividad 3](docs/activity-3/Architecture.md) · [modelo](docs/activity-3/docs/modelo-dominio.md) · [BDD](docs/activity-3/docs/escenarios-bdd.md)

## Requisitos

- .NET SDK 10.0.x
- Python 3 para ejecutar la fitness function

## Ejecutar localmente

```powershell
dotnet restore LastMile.sln
dotnet build LastMile.sln
dotnet run --project src/LastMile.Api
```

La primera ejecución aplica la migración SQLite y crea una entrega de demostración. La API escucha en la URL que informa ASP.NET Core. El mensajero demo disponible es `c0000000-0000-4000-8000-000000000001` y la entrega de ejemplo es `d1000000-0000-4000-8000-000000000001`.

```powershell
Invoke-RestMethod http://localhost:5000/api/deliveries/d1000000-0000-4000-8000-000000000001/courier-assignment `
  -Method Post -ContentType 'application/json' `
  -Body '{"courierId":"c0000000-0000-4000-8000-000000000001"}'
```

La URL de ejemplo debe cambiarse por la URL HTTP/HTTPS anunciada en la consola (`launchSettings.json` suele usar otro puerto). Para inspeccionar la entrega: `GET /api/deliveries/{deliveryId}`; para salud de persistencia: `GET /health`. La entrega queda asignada una sola vez, por lo que reinicia SQLite (`lastmile.db`) o usa otro ID para repetir la demo de éxito.

### Probar

```powershell
python scripts/check_architecture.py
dotnet test LastMile.sln
```

Las pruebas unitarias cubren invariantes de dominio. Las pruebas de integración atraviesan la API y SQLite en memoria, verifican persistencia/outbox y aseguran que una ruta llena produce conflicto sin efectos laterales.

## Arquitectura

`Domain` no conoce infraestructura; `Application` depende solo de `Domain`; `Infrastructure` implementa los puertos de aplicación; `Api` compone el sistema. El flujo guarda la entrega y evento en la misma transacción SQLite mediante outbox. La versión de entrega actúa como token de concurrencia.

```text
HTTP → API/DTO → AssignCourierUseCase → Delivery (invariante)
                    ├─ ICourierAvailability → demo o adaptador HTTP
                    ├─ IRouteCapacity       → demo o adaptador HTTP
                    └─ IDeliveryRepository + IAssignmentEvents → EF Core/SQLite + outbox
```

Migración reproducible: `src/LastMile.Infrastructure/Persistence/Migrations/20261011000000_InitialCreate.cs`; la API llama `Database.Migrate()` al iniciar. La configuración de producción conecta adaptadores HTTP mediante `Integration:CourierManagement:BaseUrl`, `Integration:RoutePlanning:BaseUrl` y `Integration:RouteEvents:BaseUrl` (variables `Integration__...__BaseUrl`). Vacíos usan adaptadores demo; no usar esos defaults para producción.

Los GET de integraciones externas reintentan fallos de transporte/5xx/429 hasta tres veces. Un evento fallido queda en outbox y se reintenta con espera exponencial hasta cinco intentos, luego queda en dead-letter para revisión. No hay credenciales ni secretos de servicios externos en el repositorio.

## Límites y riesgos conocidos

- La consulta de capacidad no reserva cupo atómicamente; dos asignaciones concurrentes podrían exceder capacidad en el sistema de rutas. En producción el servicio de rutas debe ofrecer reserva idempotente o contrato de saga.
- API de demostración sin autenticación/autorización: solo local, agregar identidad y autorización antes de exponer.
- La muestra usa SQLite local; elegir motor administrado, backup y alta disponibilidad según despliegue.
- Se emiten métricas .NET y actividades, pero no se configura exporter; agregar OpenTelemetry/exporter para despliegue y alertas.
- La comprobación SAST/dependencias se ejecuta en CI; integrar DAST contra entorno desplegado antes de publicar.

Consulta [riesgos, mitigaciones y evidencia](wiki/Riesgos-y-Observabilidad.md) y [registro de ejecución](wiki/Registro-de-Ejecucion.md). Nunca registrar direcciones ni credenciales.

- [Checklist de entrega](wiki/Checklist-de-Entrega.md)
