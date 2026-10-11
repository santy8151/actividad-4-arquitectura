# Escenarios de aceptación · BDD

```gherkin
Característica: Asignación de repartidor a una entrega
  Como operador logístico de última milla
  Quiero asignar un repartidor elegible a una entrega pendiente
  Para despachar el paquete sin duplicidades ni rutas saturadas

  Escenario: Asignación exitosa
    Dado que la entrega "del-001" está pendiente y no tiene repartidor activo
    Y el repartidor "courier-xyz" está disponible
    Y la ruta asociada tiene capacidad para la entrega
    Cuando se ejecuta AssignCourierUseCase para "del-001" y "courier-xyz"
    Entonces la entrega queda asociada a "courier-xyz"
    Y su estado cambia a "Assigned"
    Y se registra el evento "DeliveryAssigned"

  Escenario: La entrega ya tiene repartidor activo
    Dado que "del-001" ya está asignada a "courier-xyz"
    Cuando se intenta asignar "courier-abc"
    Entonces la operación se rechaza con "DeliveryAlreadyAssigned"
    Y la asignación original permanece sin cambios

  Escenario: El repartidor no está disponible
    Dado que la entrega "del-001" está pendiente y sin repartidor
    Y el repartidor "courier-xyz" no está disponible
    Cuando se solicita la asignación
    Entonces la operación se rechaza con "CourierUnavailable"
    Y la entrega permanece pendiente y sin repartidor

  Escenario: La ruta está saturada
    Dado que la entrega "del-001" está pendiente y sin repartidor
    Y la ruta asociada no tiene capacidad disponible
    Cuando se solicita la asignación
    Entonces la operación se rechaza con "RouteCapacityExceeded"
    Y no se registra el evento "DeliveryAssigned"
```

