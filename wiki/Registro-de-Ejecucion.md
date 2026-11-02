# Registro de ejecución y resultados

Entorno Windows 11 local; SDK .NET 10.0.401 aislado bajo `work/` durante desarrollo. No publicar contenidos de `work/`.

| Fecha | REQ | Comando/entorno | Resultado | Evidencia |
|---|---|---|---|---|
| 2026-10-11 | REQ-02, REQ-09 | `python scripts/check_architecture.py` | PASA; dependencias de proyectos dentro de límites permitidos | salida local: Domain [], Application → Domain, Infrastructure → Application/Domain, API → Application/Infrastructure |
| 2026-10-11 | REQ-12 | `dotnet build LastMile.sln --no-restore` (Debug) | PASA, cero errores; una advertencia CS0168 luego corregida | salida local; compilación final repetida en CI |
| 2026-10-11 | REQ-12 | `dotnet build LastMile.sln --no-restore --configuration Release` | PASA, cero errores y cero advertencias; compiló API y ambos proyectos de prueba | salida local; advertencia CS0168 luego corregida |
| 2026-10-11 | REQ-06 | `dotnet test tests/LastMile.Domain.Tests/... --no-build --configuration Release` | PASA: 3/3 | xUnit local, 45 ms |
| 2026-10-11 | REQ-06 | `dotnet test tests/LastMile.IntegrationTests/... --no-build --configuration Release` | BLOQUEADO por Windows Application Control: `FileLoadException`, 0x800711C7 al cargar `LastMile.Application.dll` desde el host de prueba | no intentar evadir política; workflow Ubuntu de Actions preparado para correr la suite |
| 2026-10-11 | REQ-06, REQ-09, REQ-07 | GitHub Actions | PASÓ: run 38127080133, incluye test y audit | `.github/workflows/ci.yml` |

## Riesgos residuales / tareas

- CI en verde (run 38127080133); registrar futuras ejecuciones si se cambia el código.
- Análisis NuGet actual sin vulnerabilidades conocidas; configurar DAST previo a release en entorno expuesto.
- Grabar video 10–15 min, publicar con acceso evaluador y reemplazar marcador pendiente.
- Requerir reserva atómica de capacidad y authn/authz antes de producción.
| 2026-10-11 | REQ-04, REQ-06 | GitHub Actions run 38126736237 | Fitness function, restore, build pasan; integración falla por snapshot EF Core con diferencias pendientes detectadas en `MigrateAsync()` | corregido en commit siguiente añadiendo conversión enum y generación de claves al snapshot; repetir CI antes de dar por aprobado |
| 2026-10-11 | REQ-04, REQ-06 | GitHub Actions run 38126982717 / artifact generado con `dotnet ef migrations add SnapshotDiagnostic` | Confirma discrepancia: conversión enum/model snapshot en tipo proveedor y nombre index SQLite truncado; generado movimiento del índice. | Snapshot regenerado desde EF y nombre inicial ajustado al índice SQLite `...NextAttempt~`; CI ahora verifica `has-pending-model-changes` antes de pruebas. Resultado pendiente. |
| 2026-10-11 | REQ-04, REQ-06, REQ-07, REQ-09, REQ-12 | GitHub Actions run 38127080133 | PASA: arquitectura, restore, build Release, `dotnet ef migrations has-pending-model-changes`, 5/5 pruebas, análisis NuGet sin vulnerabilidades conocidas | [Run CI](https://github.com/santy8151/actividad-4-arquitectura/actions/runs/38127080133); 3 unitarias + 2 integración. El resultado alojado supera el bloqueo local App Control. |
| 2026-10-11 | REQ-02, REQ-05, REQ-09, REQ-14 | Commit `a80f925`; CI run 38127580125 | PASA tras refactor Onion: grafo exacto, build sin warnings, migración, 5/5 pruebas y NuGet audit | [Run CI](https://github.com/santy8151/actividad-4-arquitectura/actions/runs/38127580125). Se eliminaron carpetas pequeñas/duplicadas y se aplanó la referencia de A3. |

| 2026-11-02 | REQ-01..10, REQ-12, REQ-14 | `npm run check:arch && npm run test && npm run build` | PASA: `core/domain` (0 dependencias externas), `core/application` (solo `core/domain`), `.NET Onion` válido, 13/13 pruebas Vitest (dominio, reserva atómica con compensación y API serverless) y build de producción Vite en `dist/` | `scripts/check-core-architecture.mjs`, `tests/rutaclara.domain.test.ts`, `tests/rutaclara.application.test.ts` |
