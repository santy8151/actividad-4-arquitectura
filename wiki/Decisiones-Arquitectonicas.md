# Decisiones arquitectónicas

Registrar una decisión por ADR: contexto, opciones, decisión, consecuencias y estado. Las decisiones concretas del sistema deben esperar la revisión de Actividad 3.

## ADR-000 — Expediente versionado

- **Estado:** Aceptada
- **Contexto:** La actividad requiere trazabilidad entre requisitos, diseño, implementación, pruebas, riesgos y defensa.
- **Decisión:** Mantener matriz y páginas del expediente en Markdown versionado en el repositorio.
- **Consecuencias:** La evidencia queda revisable junto al historial. El repositorio mantiene una copia en Markdown y un tablero operativo de GitHub Projects enlazado a issues.
- **Pendiente:** Añadir ADRs del sistema tras revisar Actividad 2/3.

## ADR-001 — Kanban operativo vinculado a issues

- **Estado:** Aceptada
- **Fecha:** 2026-10-11
- **Requisitos:** REQ-05, REQ-12
- **Contexto:** El trabajo necesita un tablero operable y trazable al repositorio, además de una copia legible/versionada en el expediente.
- **Opciones consideradas:** Kanban solo en Markdown; GitHub Projects; ambos con una fuente operativa explícita.
- **Decisión:** Usar el tablero privado de GitHub Projects como tablero operativo. Cada tarjeta es un issue del repositorio con ID `KAN-XX`, `REQ-XX`, criterios de aceptación y enlaces al expediente. Mantener `wiki/Tablero-Kanban.md` como espejo documental versionado.
- **Consecuencias y trade-offs:** Estado operativo y filtros viven en Projects; Markdown puede quedar desactualizado si no se sincroniza. Los issues y la matriz mantienen los enlaces de trazabilidad.
- **Riesgo residual:** Actualizar el tablero operativo y la copia Markdown como parte del cierre de cada tarjeta.
- **Evidencia / enlaces:** [Project Kanban](https://github.com/users/santy8151/projects/12), [Issues](https://github.com/santy8151/actividad-4-arquitectura/issues).

## Plantilla ADR

### ADR-NNN — Título

- **Estado:** Propuesta / Aceptada / Rechazada / Sustituida
- **Fecha:** AAAA-MM-DD
- **Requisitos:** REQ-XX
- **Contexto:**
- **Opciones consideradas:**
- **Decisión:**
- **Consecuencias y trade-offs:**
- **Riesgo residual:**
- **Evidencia/enlaces:**
