# Registro de ejecución y resultados

Entorno Windows 11 local; SDK .NET 10.0.401 aislado bajo `work/` durante desarrollo. No publicar contenidos de `work/`.

| Fecha | REQ | Comando/entorno | Resultado | Evidencia |
|---|---|---|---|---|
| 2026-10-11 | REQ-02, REQ-09 | `python scripts/check_architecture.py` | PASA; dependencias de proyectos dentro de límites permitidos | salida local: Domain [], Application → Domain, Infrastructure → Application/Domain, API → Application/Infrastructure |
| 2026-10-11 | REQ-12 | `dotnet build LastMile.sln --no-restore` (Debug) | PASA, cero errores; una advertencia CS0168 luego corregida | salida local; verificación pendiente de repetir con cambio final |
| 2026-10-11 | REQ-12 | `dotnet build LastMile.sln --no-restore --configuration Release` | PASA, cero errores y cero advertencias; compiló API y ambos proyectos de prueba | salida local; advertencia CS0168 luego corregida |
| 2026-10-11 | REQ-06 | `dotnet test tests/LastMile.Domain.Tests/... --no-build --configuration Release` | PASA: 3/3 | xUnit local, 45 ms |
| 2026-10-11 | REQ-06 | `dotnet test tests/LastMile.IntegrationTests/... --no-build --configuration Release` | BLOQUEADO por Windows Application Control: `FileLoadException`, 0x800711C7 al cargar `LastMile.Application.dll` desde el host de prueba | no intentar evadir política; workflow Ubuntu de Actions preparado para correr la suite |
| 2026-10-11 | REQ-06, REQ-09, REQ-07 | GitHub Actions | PENDIENTE de push/ejecución | `.github/workflows/ci.yml` |

## Riesgos residuales / tareas

- Observar workflow de CI tras publicar cambios; no declarar integración aprobada hasta tener ese resultado.
- Revisar salida del análisis de dependencias; configurar DAST previo a release en entorno expuesto.
- Grabar video 10–15 min, publicar con acceso evaluador y reemplazar marcador pendiente.
- Requerir reserva atómica de capacidad y authn/authz antes de producción.
