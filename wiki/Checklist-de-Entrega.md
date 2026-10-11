# Checklist de entrega

## Repositorio y ejecución

- [x] Código fuente, solución, migración y configuración documentados.
- [x] README con SDK, comandos, caso demo, endpoints, pruebas y configuración externa.
- [ ] Clonar limpio y confirmar instrucciones en una máquina sin SDK/runtime preinstalado.
- [x] CI de GitHub Actions en verde (3 unitarias, 2 integración, build, migración y NuGet audit).

## Correspondencia con Actividad 3

- [x] Material original de Actividad 3 incluido en `docs/activity-3/`.
- [x] Flujo implementado conserva el caso `AssignCourierUseCase` y reglas documentadas.
- [x] Decisiones añadidas están en ADR con trade-offs y residuales.
- [x] Matriz REQ ↔ A3 ↔ código ↔ pruebas ↔ evidencia.

## Calidad y operación

- [x] Unit tests para invariantes (3/3 pasan en máquina local).
- [x] Integración éxito y error implementadas (pendiente evidencia CI por bloqueo de Windows Application Control local).
- [x] Fitness function arquitectónica ejecutada.
- [x] Riesgos/controles/evidencias y logs, métricas, trazas documentados.
- [ ] Adjuntar resultado CI y del análisis de vulnerabilidades a registro.
- [ ] Revisar que no hay secretos ni datos personales en historial/telemetría exportada.

## Defensa

- [x] Guion de 12 minutos con todos los apartados pedidos.
- [ ] Ensayar para mantener entre 10 y 15 minutos.
- [ ] Grabar demostración de éxito y caso de error; mostrar evidencia de pruebas real.
- [ ] Publicar video con permiso de acceso para evaluadores.
- [ ] Pegar URL del video en README/entrega; entregar enlace, no archivo.

## Cierre

- [ ] Sincronizar tablero GitHub Projects con la matriz/estado de evidencia.
- [ ] Validar en sesión privada que repo/video/enlaces estén accesibles con los permisos requeridos.
- [ ] Releer cada criterio del PDF de Actividad 4 y comprobar enlace/evidencia correspondiente.
