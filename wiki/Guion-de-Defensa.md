# Guion de defensa final (12 minutos; dentro del margen 10–15)

> Reemplaza indicaciones de pantalla por capturas/output real tras CI y cronometra el ensayo. No afirmar que integraciones externas reales se ejecutaron: la demo usa adapters controlados.

| Tiempo | Voz / explicación | Pantalla y acción |
|---|---|---|
| 0:00–1:15 | Problema: despacho de última milla necesita asignar mensajero solo si entrega pendiente, mensajero disponible y ruta con capacidad. El diseño de A3 eligió `AssignCourierUseCase`. | Objetivo, matriz REQ y C4 del expediente A3. |
| 1:15–2:45 | Decisiones: dominio protege estado; Application orquesta puertos; Infrastructure implementa EF/HTTP; API traduce DTO y respuestas. ADR-002 concreta outbox y stack. | Diagrama del README y estructura de solución. |
| 2:45–5:30 | Flujo: POST con entrega demo y courier; API valida GUID, caso de uso consulta disponibilidad/cupo, `Delivery.AssignCourier` aplica invariante, unidad de trabajo guarda estado y evento. | README, ejemplo HTTP, salida 200, GET inspecciona asignación. |
| 5:30–7:45 | Validación: unit tests prueban asignación, reintento de asignación y courier vacío. Integración atraviesa TestServer y SQLite in-memory; en ruta llena espera 409 y cero cambios/outbox. | Ejecutar `dotnet test`; mostrar salida CI de Actions. Si Windows bloquea DLL local, explicar y enseñar resultado hospedado. |
| 7:45–9:00 | Persistencia: migración inicial, `Migrate()` al inicio, versión optimista, estado y outbox en una transacción. Worker reintenta publicación y deja DLQ tras 5 intentos. | Migración, tablas y prueba que inspecciona outbox. |
| 9:00–10:30 | Integraciones: dobles locales hacen demo reproducible; URLs de configuración activan HTTP; consultas reintentan timeout/red/429/5xx. Evento se publica de manera diferida e idempotente. | Configuración appsettings y adapters. Aclarar que no se llamaron servicios reales. |
| 10:30–11:30 | Operación/seguridad: logs sin dirección/payload, métricas con outcome bajo cardinalidad, trazas y health SQLite. Fitness function controla referencias. CI construye, testea y revisa dependencias. | Riesgos/observabilidad, CI y script de arquitectura. |
| 11:30–12:15 | Trade-offs: SQLite y doubles simplifican demo; sin exporter ni auth no es producción. Consulta de capacidad conserva una carrera cross-service; la solución futura es reserva idempotente/saga. | Riesgos residuales, REQ pendiente de video y cierre. |

## Antes de grabar

1. Clonar limpio, ejecutar build/test y fitness function; esperar CI verde.
2. Usar base demo limpia para el éxito; reiniciar/eliminar `lastmile.db` con API cerrada entre ejecuciones.
3. Mostrar error de ruta llena en prueba de integración y resultado HTTP o prueba; éxito y error en pantallas separadas.
4. Ocultar credenciales, usar datos sintéticos y grabar 10–15 minutos.
5. Subir video con permiso de acceso verificable y pegar URL en README, matriz y entrega.
