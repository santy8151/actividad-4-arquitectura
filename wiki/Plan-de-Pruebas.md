# Plan de pruebas

| Nivel | Caso | Aserciones | Evidencia |
|---|---|---|---|
| Dominio unitario | asignación válida | courier asignado, estado Assigned, versión incrementa | `AssignCourier_ChangesCourierAndStatus` |
| Dominio unitario | re-asignación | excepción `DeliveryAlreadyAssigned`; original/version preservados | `AssignCourier_WhenAlreadyAssigned...` |
| Dominio unitario | courier vacío | error `InvalidCourierId`; estado pending | `AssignCourier_WhenCourierIdIsEmpty...` |
| Integración éxito | POST API + EF + SQLite memoria | 200; DB Assigned; outbox pendiente en misma transacción | `AssignCourier_HappyPath_PersistsDeliveryAndOutboxEvent` |
| Integración error | ruta llena | 409; DB sigue Pending; outbox vacío | `AssignCourier_WhenRouteIsFull_ReturnsConflictAndLeavesNoSideEffects` |
| Arquitectura | dependencias de proyectos | Domain sin refs, Application solo Domain, Infrastructure hacia núcleo | `python scripts/check_architecture.py` |
| Build/dependencias | Release, reporte de vulnerabilidades | compila; vulnerabilidades reportadas | GitHub Actions |

## Comandos reproducibles

```powershell
python scripts/check_architecture.py
dotnet build LastMile.sln --configuration Release
dotnet test LastMile.sln --configuration Release
dotnet list LastMile.sln package --vulnerable --include-transitive
```

La suite integra HTTP TestServer con SQLite real en memoria y doubles de courier/ruta. No afirmar prueba contra proveedores externos. En esta máquina Windows, la ejecución de integración fue bloqueada por Application Control (`0x800711C7`) al cargar la DLL en WebApplicationFactory; la misma suite está incluida para runner hospedado Linux de Actions.

| Dominio RutaClara (Vitest) | Máquina de estados, versiones y bitácora | `pendiente → asignado → en_ruta → entregado/fallido` + `cancelado`; bloqueo de versión incorrecta (`CONCURRENCY_CONFLICT`) | `tests/rutaclara.domain.test.ts` |
| Dominio RutaClara (Vitest) | Reglas de domiciliario, distribuidor y RBAC | Rechazo por turno inactivo, sin cupo o GPS > 10 min; validación de segmento/etapa CRM; prohibición de auto-asignación de rol (`SELF_ROLE_ASSIGNMENT_FORBIDDEN`) | `tests/rutaclara.domain.test.ts` |
| Aplicación / Integración RutaClara | Reserva atómica de cupo y compensación ante fallo | `AssignCourierUseCase` reserva cupo (`tryReserveSlot`) y lo libera (`releaseSlot`) si falla `updateWithVersion`; sugerencias Haversine y endpoints Serverless | `tests/rutaclara.application.test.ts` |
| Arquitectura RutaClara + .NET | Doble fitness function | `core/domain` sin dependencias externas; `core/application` solo `core/domain`; `.NET` Onion intacto | `npm run check:arch` |
