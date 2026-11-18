# AGENTS.md — Frontend del Portal de Proveedores

Este repositorio contiene el frontend Angular del portal de proveedores.

## Reglas de trabajo

- Usar Angular con TypeScript estricto, componentes standalone y Reactive Forms.
- Organizar el código por funcionalidades bajo `src/app/features/`.
- Mantener servicios transversales en `src/app/core/` y componentes reutilizables en `src/app/shared/`.
- El navegador solo consume la API propia; nunca accede directamente a Valuekeep.
- No implementar autenticación propia, usuarios locales, contraseñas ni OAuth2 de Valuekeep.
- No almacenar secretos en el frontend.
- Consultar las especificaciones en `../docs/specs/` antes de implementar funcionalidades.
- Aplicar diseño mobile first, estados de carga y mensajes de error comprensibles.
- No implementar PWA offline ni persistencia garantizada sin especificación aprobada.
- No crear workflows, configuración de DigitalOcean ni mecanismos de despliegue hasta que exista una especificación aprobada.
