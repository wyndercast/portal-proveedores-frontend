# Frontend — Portal de Proveedores

Aplicación Angular existente del Portal de Servicios para Proveedores.

## Tecnología base

- Angular 22.2.x
- TypeScript 6.0.3
- PrimeNG 22.1.4
- Tailwind CSS 4.1.12
- Node.js 22.22.3 para CI

## Desarrollo local

Ejecuta:

```bash
npm ci
npm start
```

Abre `http://localhost:4200/`. La URL local de la API se define en `src/environments/environment.ts`.

## Compilación y pruebas

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npm run build -- --configuration production
```

El build de producción usa `environment.production.ts`. Su URL de API contiene un marcador pendiente hasta que exista el dominio público real del backend.

Los artefactos se generan en `dist/frontend`; el contenido estático se publica desde el directorio browser correspondiente.

La CI valida cada SHA sin desplegar. El CD es manual y permanece bloqueado hasta demostrar que DigitalOcean Static Site construye exactamente el SHA solicitado.
