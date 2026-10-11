# Actividad 3 · Diseño y dominio

Propuesta de diseño para el flujo **asignar un repartidor a una entrega** en una plataforma logística de última milla.

> Esta entrega documenta el diseño previo a la implementación. No conecta una base de datos, un servicio de rutas ni una API de repartidores; esas integraciones pertenecen a la Actividad 4.

## Recorrido

- [Presentación editable para Canva](slides/Actividad-3-Diseno-y-Dominio.pptx)
- [Architecture.md](Architecture.md): límites, C4, componentes y dependencias.
- [Modelo del dominio](docs/modelo-dominio.md): entidades, objetos de valor, estados e invariantes.
- [Lenguaje ubicuo y contextos](docs/contextos-y-glosario.md): términos, ambigüedades y contratos.
- [Escenarios BDD](docs/escenarios-bdd.md): casos de aceptación.
- [ADR-001](docs/adr/ADR-001-arquitectura-limpia-y-ddd.md): decisión, alternativas y trade-offs.
- [Boceto C#](prototype/): contratos y coordinación propuesta, sin adaptadores concretos.

## Flujo seleccionado

`AssignCourierUseCase` recibe una entrega pendiente y un repartidor candidato. Consulta su disponibilidad a través de un puerto, protege la invariante en la entidad `Delivery`, persiste por medio de un repositorio y registra un evento para que el sistema de rutas conozca la asignación.

La asignación no debe ocurrir si la entrega ya tiene repartidor activo o si la ruta no admite más entregas. El estado `Asignado` y el registro del evento deben quedar coherentes con la persistencia; en una futura implementación se deberá definir una estrategia transaccional/outbox.

## Entrega del video

**Pendiente:** agregar aquí el enlace de acceso al video de sustentación cuando esté publicado. El PDF pide entregar solo el enlace, no adjuntar el archivo de video.

## Importar en Canva

1. Descarga `slides/Actividad-3-Diseno-y-Dominio.pptx` desde este repositorio.
2. En Canva, usa **Crear un diseño → Importar archivo** y selecciona el PPTX.
3. Revisa fuentes y saltos de línea después de la conversión; cada elemento del deck está creado como texto o forma editable.

## Estructura

```text
Architecture.md
docs/
  adr/ADR-001-arquitectura-limpia-y-ddd.md
  contextos-y-glosario.md
  escenarios-bdd.md
  modelo-dominio.md
slides/Actividad-3-Diseno-y-Dominio.pptx
src/
  Application/Ports/
  Application/UseCases/
  Domain/
  Infrastructure/Adapters/
```

