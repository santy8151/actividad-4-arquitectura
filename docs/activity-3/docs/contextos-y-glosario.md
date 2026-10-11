# Lenguaje ubicuo y contextos

## Glosario

| Término | Significado en esta propuesta |
|---|---|
| Entrega (`Delivery`) | Trabajo logístico para llevar un paquete a una dirección final. |
| Repartidor (`Courier`) | Persona que ejecuta entregas y cuya elegibilidad se consulta antes de asignar. |
| Asignación | Asociación válida entre una entrega y un repartidor para su despacho. |
| Invariante | Regla que debe seguir siendo cierta para que la entrega sea válida. |
| Objeto de valor | Dato inmutable definido por sus atributos, como `DeliveryId` o `DeliveryAddress`. |
| Puerto | Contrato que Application necesita para completar el caso de uso. |
| Adaptador | Implementación tecnológica de un puerto. |
| Capacidad de ruta | Espacio operativo disponible para aceptar otra entrega; su unidad exacta requiere confirmación. |
| Evento `DeliveryAssigned` | Hecho confirmado que informa a otros contextos que una entrega fue asignada. |

## Contextos delimitados

- **Despacho y asignación:** coordina el caso de uso, consulta las reglas de elegibilidad y protege la asignación de la entrega.
- **Gestión de entregas:** es dueño del ciclo de vida y del estado de `Delivery`.
- **Gestión de repartidores:** es dueño de identidad y disponibilidad operativa del repartidor.
- **Planificación de rutas:** valida capacidad y recibe el evento de asignación para actualizar el plan.

El intercambio se hace por contratos de aplicación y evento; ningún contexto comparte entidades ORM ni tablas como contrato.

## Ambigüedades para confirmar con negocio

1. “Repartidor activo asignado”: ¿activo en la empresa, disponible ahora, o ya asignado a esta entrega?
2. ¿La capacidad se reserva al consultar o se vuelve a confirmar al asignar para evitar condiciones de carrera?
3. ¿La entrega puede cambiar de ruta y mantener su repartidor?
4. ¿Qué identificador o versión del agregado se usa para evitar dos asignaciones simultáneas?

