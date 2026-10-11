# Plan de pruebas

Completar al confirmar caso de uso e invariantes de Actividad 3.

| Nivel | Objetivo | Casos mínimos | Evidencia |
|---|---|---|---|
| Unitario de dominio | Probar invariantes sin infraestructura | Regla válida; rechazo de valor/transición inválida; límite relevante | Comando y salida en registro |
| Aplicación | Probar orquestación y contratos | Éxito; puerto devuelve error controlado; estado inválido no se persiste | Pendiente |
| Integración | Probar entrada → caso de uso → adaptador/persistencia | Camino feliz; error/límite; inspección del estado persistido | Pendiente |
| Arquitectura/calidad | Prevenir dependencias que rompen límites | Dominio no importa infraestructura; análisis pertinente | Pendiente |
| Seguridad | Comprobar riesgos del stack | SAST/dependency scan; DAST si hay endpoint desplegable | Pendiente |

No reportar pruebas como ejecutadas si aún no existen. Indicar si la integración usa servicios reales, contenedores o doubles controlados.
