# ADR-001 · Arquitectura limpia y DDD para asignación logística

- **Estado:** Propuesto
- **Contexto:** La asignación depende de reglas críticas —entrega sin asignación previa, disponibilidad del repartidor y capacidad de ruta— que deben poder verificarse sin desplegar una base de datos o servicios externos.

## Decisión

Modelar `Delivery` como raíz de agregado y proteger la asignación con `AssignCourier`. Organizar la propuesta en Domain, Application, Infrastructure y Presentation. Application define puertos y coordina `AssignCourierUseCase`; Infrastructure implementará los contratos. La verificación de disponibilidad y capacidad se hará a través de puertos explícitos.

## Alternativas consideradas

1. **Lógica en el controlador:** descartada porque mezcla transporte y regla de negocio, y facilita omitir invariantes desde otros canales.
2. **Repositorio/ORM con reglas de asignación:** descartada porque acopla el modelo de negocio a persistencia y hace más costosa su validación aislada.
3. **Microservicios separados para cada contexto desde esta actividad:** descartada por añadir despliegue y coordinación innecesarios antes de validar límites; los contextos se documentan y podrán desplegarse según necesidades futuras.

## Consecuencias y trade-offs

- Las reglas se prueban en memoria y la infraestructura puede cambiar sin alterar el dominio.
- Se requieren contratos, mapeos y coordinación de eventos; aumenta el trabajo inicial.
- Validar disponibilidad y capacidad antes de guardar introduce riesgo de carrera. La implementación deberá reservar/revalidar de forma atómica o usar control optimista.
- Para no perder el evento después de persistir, se evaluará transactional outbox en Actividad 4.

