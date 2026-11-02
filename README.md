# LastMile Logistics Platform

[![CI](https://github.com/santy8151/actividad-4-arquitectura/actions/workflows/ci.yml/badge.svg)](https://github.com/santy8151/actividad-4-arquitectura/actions/workflows/ci.yml)

Sistema de gestión logística para la asignación de mensajeros a entregas pendientes, desarrollado con una arquitectura orientada a dominio y validación de reglas de negocio. El proyecto implementa un caso de uso de asignación de courier, validación de capacidad de ruta y trazabilidad de eventos de negocio mediante una solución estructurada en capas.

## 1. Descripción del problema

La aplicación modela un escenario real de última milla en el cual una entrega debe ser asignada a un mensajero disponible. La decisión de asignación no es trivial: debe considerar disponibilidad del recurso, capacidad operativa y consistencia de la información que se persiste.

El dominio del problema incluye:

- entregas pendientes;
- mensajeros disponibles o no disponibles;
- capacidad de ruta;
- validación de reglas de negocio;
- registro de eventos de asignación;
- trazabilidad para auditoría y análisis.

## 2. Objetivo del proyecto

Desarrollar una solución técnica con una estructura de software clara y sostenible, donde la lógica de negocio quede aislada de la infraestructura y la capa de presentación. El sistema debe permitir:

- asignar un mensajero disponible a una entrega pendiente;
- verificar la capacidad operativa antes de confirmar la asignación;
- persistir el resultado de la operación;
- registrar eventos de negocio que permitan seguimiento y trazabilidad;
- mantener la solución extensible para integración con servicios externos.

## 3. Arquitectura del sistema

El repositorio sigue una arquitectura limpia (Clean Architecture) y una aproximación Onion Architecture, con dependencia dirigida hacia el núcleo del dominio.

```text
                            ┌────────────────────────────────────────┐
                            │           Capa externa                 │
                            │  API + Infrastructure + Integrations   │
                            └────────────────────────────────────────┘
                                             │
                                             ▼
                            ┌────────────────────────────────────────┐
                            │         Application Layer               │
                            │  Casos de uso, puertos, contratos      │
                            └────────────────────────────────────────┘
                                             │
                                             ▼
                            ┌────────────────────────────────────────┐
                            │            Domain Layer                  │
                            │ entidades, reglas, invariantes, eventos │
                            └────────────────────────────────────────┘
```

### Principios implementados

- separación por capas;
- dependencia del dominio hacia el exterior;
- aislamiento de la lógica de negocio;
- uso de puertos y adaptadores;
- trazabilidad mediante eventos de dominio;
- validación arquitectónica automatizada.

## 4. Estructura del repositorio

```text
src/
  LastMile.Domain/
    Entidades, value objects, invariantes y eventos del dominio.

  LastMile.Application/
    Casos de uso y contratos de aplicación.

  LastMile.Infrastructure/
    Persistencia, adaptadores, EF Core, SQLite e integraciones.

  LastMile.Api/
    API HTTP, configuración y composición de dependencias.

tests/
  LastMile.Domain.Tests/
  LastMile.IntegrationTests/

docs/
  Documentación y diseño previo.

wiki/
  Trazabilidad, decisiones arquitectónicas, pruebas, riesgos y defensa.

scripts/
  Validación automática de la arquitectura.

.github/workflows/
  Pipeline de CI/CD.
```

## 5. Capa por capa

### 5.1 Domain
La capa de dominio concentra la lógica del negocio y representa el modelo principal del problema.

Contiene:

- entidades del negocio;
- invariantes;
- value objects;
- eventos de dominio;
- reglas de asignación;
- validación de capacidad y disponibilidad.

Es la capa más estable y no debe depender de infraestructura ni de la API.

### 5.2 Application
La capa de aplicación coordina los casos de uso del sistema. Define las operaciones que pueden ser ejecutadas por la capa externa y encapsula la lógica de orquestación.

Incluye:

- servicios de aplicación;
- puertos para persistencia e integración;
- casos de uso específicos del dominio.

### 5.3 Infrastructure
La infraestructura implementa los puertos definidos en la capa de aplicación y se encarga de la persistencia y de los adaptadores externos.

Incluye:

- Entity Framework Core;
- SQLite;
- adaptadores de integración;
- configuración de dependencias;
- soporte a ejecuciones locales y de pruebas.

### 5.4 API
La API es la capa de entrada y salida del sistema. Expone endpoints HTTP y se encarga de:

- recibir peticiones del cliente;
- serializar y deserializar payloads;
- invocar los casos de uso;
- devolver respuestas del sistema.

## 6. Flujos funcionales principales

El caso de uso principal del proyecto es la asignación de un mensajero a una entrega pendiente.

Flujo general:

1. la API recibe la solicitud;
2. se identifica la entrega a asignar;
3. se valida la disponibilidad del mensajero;
4. se comprueba la capacidad de ruta;
5. se valida la regla de negocio correspondiente;
6. se genera el evento `DeliveryAssigned`;
7. se persiste la asignación para trazabilidad.

## 7. Decisiones arquitectónicas

### 7.1 Arquitectura limpia
Se mantiene una separación clara entre negocio, aplicación, infraestructura y presentación. Esto facilita el mantenimiento, la prueba y la evolución del sistema.

### 7.2 Eventos de dominio
La emisión de eventos permite dejar registro del cambio en el estado del negocio y facilita extensiones futuras como auditoría, observabilidad o integración con sistemas externos.

### 7.3 Puertos e interfaces
La lógica de negocio no conoce detalles de persistencia ni de infraestructura. Eso reduce acoplamiento y mejora la capacidad de cambiar implementaciones sin afectar el dominio.

### 7.4 Composición de dependencias
La composición de la aplicación se realiza en la capa más externa, evitando que la lógica del dominio dependa de frameworks o detalles tecnológicos.

## 8. Tecnologías utilizadas

- C#
- .NET
- ASP.NET Core
- EF Core
- SQLite
- Python (validación arquitectónica)
- GitHub Actions
- pruebas unitarias e integradas

## 9. Verificación y calidad

El proyecto incorpora validaciones automáticas para reforzar la calidad y la disciplina arquitectónica.

### Verificación local

```powershell
python scripts/check_architecture.py
dotnet build LastMile.sln --configuration Release
dotnet test LastMile.sln --configuration Release
```

### Validaciones de CI

En GitHub Actions se revisa además:

- migraciones pendientes del modelo;
- vulnerabilidades de dependencias;
- integridad de la solución antes del merge.

Esto refleja un enfoque de ingeniería más robusto y cercano a entornos productivos.

## 10. Trazabilidad y observabilidad

El proyecto presenta una visión técnica orientada a la trazabilidad del negocio. La documentación del repositorio incluye:

- decisiones arquitectónicas;
- riesgos del sistema;
- plan de pruebas;
- trazabilidad de ejecución;
- documentación de defensa y entrega.

Esto demuestra que el desarrollo no se limita a la lógica funcional, sino que también considera operación, análisis y evolución del sistema.

## 11. Riesgos identificados

El repositorio documenta algunos riesgos relevantes del dominio:

- capacidad de ruta no reservada transaccionalmente;
- posible carrera concurrente entre varias asignaciones;
- necesidad futura de idempotencia o coordinación basada en workflows más avanzados.

El reconocimiento de estos puntos es importante para mantener una visión realista del sistema y su grado de madurez.

## 12. Ejecución local

```powershell
dotnet restore LastMile.sln
dotnet run --project src/LastMile.Api
```

La primera ejecución aplica la migración de SQLite y carga el escenario demo del proyecto.

### Datos ejemplo

- Repartidor: `c0000000-0000-4000-8000-000000000001`
- Entrega: `d1000000-0000-4000-8000-000000000001`

### Endpoints principales

- `GET /api/deliveries/{deliveryId}`
- `GET /health`
- `POST /api/deliveries/{deliveryId}/courier-assignment`

## 13. Documentación adicional

El repositorio incluye documentación técnica complementaria en la carpeta `wiki` y en `docs`, con los siguientes temas:

- trazabilidad;
- decisiones arquitectónicas;
- pruebas;
- riesgos y observabilidad;
- defensa final;
- checklist de entrega.

## 14. Conclusión

LastMile es un proyecto de arquitectura aplicada al dominio logístico. Su valor no radica únicamente en resolver una asignación puntual, sino en demostrar cómo estructurar una solución con un modelo de negocio claro, diseño limpio, separación de responsabilidades, trazabilidad y validación técnica.

La solución refleja un enfoque disciplinado de ingeniería de software orientado a calidad, mantenibilidad y evolución del sistema.

---

Proyecto académico desarrollado con enfoque en arquitectura limpia, trazabilidad, pruebas y diseño de software para un escenario realista de logística de última milla.
