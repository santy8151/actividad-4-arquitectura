# Adaptadores de infraestructura

Los adaptadores concretos se implementarán en la Actividad 4. En esta actividad solo se definen los puertos de Application.

Adaptadores previstos:

- `DeliveryRepositoryAdapter` → almacenamiento de entregas.
- `CourierAvailabilityAdapter` → servicio/contexto de repartidores.
- `RouteCapacityAdapter` → planificación de rutas.
- `AssignmentEventsAdapter` → publicación persistente del evento (se evaluará transactional outbox).

Ningún adaptador ni framework forma parte de `Domain`.
