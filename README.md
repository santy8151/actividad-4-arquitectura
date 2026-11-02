# LastMile Logistics Platform

[![CI](https://github.com/santy8151/actividad-4-arquitectura/actions/workflows/ci.yml/badge.svg)](https://github.com/santy8151/actividad-4-arquitectura/actions/workflows/ci.yml)

Plataforma de gestión logística para la asignación de mensajeros a entregas pendientes, con validación de capacidad de ruta y trazabilidad de eventos de negocio. Este repositorio presenta una solución orientada a producto y preparada para escenarios de operación real, con arquitectura limpia, automatización, pruebas y gobernanza técnica.

## Visión empresarial

LastMile está diseñado para apoyar una operación de reparto urbano eficiente y confiable. El sistema permite:

- asignar automáticamente un mensajero disponible a una entrega pendiente;
- validar la capacidad de la ruta antes de confirmar la asignación;
- registrar eventos de dominio para auditoría y trazabilidad;
- ofrecer una base tecnológica lista para evolución hacia integración con sistemas externos reales;
- mantener un nivel de calidad y observabilidad adecuado para entornos de producción.

La solución se estructura como un producto interno de empresa logística, con una arquitectura que separa claramente negocio, aplicación, infraestructura e interfaces.

## Arquitectura

La dependencia siempre apunta hacia el dominio. Infraestructura implementa puertos de aplicación; la API compone los adaptadores al iniciar la solución.

```text
                    ┌──────────────────────────────────────┐
                    │ Exterior: API + Infrastructure         │
                    │ depende hacia el núcleo               │
                    │   ┌───────────────────────────────┐   │
                    │   │ Application                   │   │
                    │   │ casos de uso + puertos        │   │
                    │   │   ┌───────────────────────┐   │   │
                    │   │   │ Domain                │   │   │
                    │   │   │ reglas / eventos      │   │   │
                    │   │   └───────────────────────┘   │   │
                    │   └───────────────────────────────┘   │
                    └──────────────────────────────────────┘
```

### Capas del sistema

- `LastMile.Domain`: entidades, invariantes, value objects, eventos de dominio y reglas de negocio.
- `LastMile.Application`: casos de uso y contratos de integración.
- `LastMile.Infrastructure`: persistencia, adaptadores y servicios externos.
- `LastMile.Api`: capa HTTP, endpoints y composición de dependencias.

La regla arquitectónica se valida con `python scripts/check_architecture.py` y se integra en CI.

## Modelo de negocio

El caso de uso central es la asignación de mensajero a entrega:

1. se identifica una entrega pendiente;
2. se consulta la disponibilidad del mensajero;
3. se valida la capacidad de ruta y la factibilidad operativa;
4. se registra el evento `DeliveryAssigned`;
5. se persiste la información para trazabilidad y análisis posterior.

Esto permite que el sistema actúe como un componente operativo dentro de una cadena de logística de última milla, con principios de consistencia, auditabilidad y extensibilidad.

## Navegación del proyecto

- [Tablero Kanban](https://github.com/users/santy8151/projects/12)
- [Wiki y trazabilidad](wiki/Home.md)
- [Diseño de actividad 3](docs/actividad-3.md)
- [ADRs](wiki/Decisiones-Arquitectonicas.md)
- [Plan de pruebas](wiki/Plan-de-Pruebas.md)
- [Riesgos y observabilidad](wiki/Riesgos-y-Observabilidad.md)
- [Guion de defensa](wiki/Guion-de-Defensa.md)
- [Checklist de entrega](wiki/Checklist-de-Entrega.md)

## Requisitos

- .NET SDK 10.0.x
- Python 3
- SQLite para la ejecución local

## Ejecución local

```powershell
dotnet restore LastMile.sln
dotnet run --project src/LastMile.Api
```

La primera ejecución aplica la migración de SQLite y agrega la entrega demo. El repartidor demo es:

- `c0000000-0000-4000-8000-000000000001`

La entrega demo es:

- `d1000000-0000-4000-8000-000000000001`

### Endpoints principales

- `GET /api/deliveries/{deliveryId}`
- `GET /health`
- `POST /api/deliveries/{deliveryId}/courier-assignment`

La entrega solo puede asignarse una vez. En caso de reinicio de datos, se recomienda eliminar `lastmile.db` antes de realizar una nueva ejecución de demostración.

## Verificación de calidad

```powershell
python scripts/check_architecture.py
dotnet build LastMile.sln --configuration Release
dotnet test LastMile.sln --configuration Release
```

El pipeline de CI incluye validaciones adicionales sobre arquitectura, migraciones y dependencias vulnerables:

- `dotnet ef migrations has-pending-model-changes`
- `dotnet list package --vulnerable --include-transitive`

## Estructura del repositorio

```text
src/
  LastMile.Domain/          # Centro del dominio y reglas de negocio
  LastMile.Application/     # Casos de uso y puertos
  LastMile.Infrastructure/  # Persistencia e integraciones
  LastMile.Api/             # API HTTP y composition root

tests/
  LastMile.Domain.Tests/
  LastMile.IntegrationTests/

docs/                      # Diseño de la actividad y ADR original
docs/actividad-3.md
wiki/                      # Trazabilidad, decisiones, riesgos y defensa
scripts/                   # Validación arquitectónica
.github/workflows/         # Pipeline CI/CD
```

## Calidad, observabilidad y riesgos

La solución incorpora criterios de operación empresarial:

- trazabilidad de eventos de negocio;
- separación clara entre capas y responsabilidades;
- validación automática de integridad arquitectónica;
- pruebas de dominio e integración;
- preparación para observabilidad y comportamiento en entorno real.

### Riesgos identificados

- la capacidad se consulta y no se reserva de forma transaccional;
- falta una reserva idempotente o saga para controlar carreras concurrentes;
- la API aún presenta un nivel de simplicidad adecuado para demostración y evolución.

Estos puntos se documentan en la wiki para mantener una visión realista del producto y su madurez operativa.

## Roadmap

El proyecto está preparado para avanzar hacia una versión más empresarial mediante:

- reservas transaccionales y manejo de concurrencia;
- integración con sistemas reales de gestión de couriers y rutas;
- observabilidad avanzada con métricas, logs estructurados y alertas;
- seguridad y control de acceso;
- despliegue automatizado en entornos de calidad y producción.

## Conclusión

LastMile no es solo un ejercicio académico: representa un enfoque de arquitectura empresarial para resolver un problema real de logística de última milla con rigor técnico, trazabilidad y escalabilidad. La estructura del repositorio, la organización por capas, la automatización y la documentación evidencian una solución preparada para un contexto corporativo.

---

Proyecto académico desarrollado como una propuesta de arquitectura limpia, trazabilidad, pruebas y operación realista para una empresa de logística.
