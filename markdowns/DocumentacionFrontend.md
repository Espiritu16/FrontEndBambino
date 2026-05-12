# 🎨 Documentación Frontend - BambinoChicken

> Nota: Documento técnico del estado actual del frontend `FrontEndBambino`, incluyendo arquitectura SPA, módulos funcionales, seguridad de sesión e integración con backend.

## 🗂️ Índice
- [🎯 1) Objetivo](#1-objetivo)
- [📌 2) Estado actual del frontend](#2-estado-actual-del-frontend)
- [🧭 3) Arquitectura de navegación (SPA)](#3-arquitectura-de-navegación-spa)
- [🧩 4) Organización funcional por módulos](#4-organización-funcional-por-módulos)
- [🔐 5) Sesión, autenticación y guards](#5-sesión-autenticación-y-guards)
- [⚡ 6) Capa HTTP, cache e invalidación](#6-capa-http-cache-e-invalidación)
- [🔌 7) Integración con backend y estado de endpoints](#7-integración-con-backend-y-estado-de-endpoints)
- [🗺️ 8) Cobertura delivery y mapa](#8-cobertura-delivery-y-mapa)
- [🚀 9) Ejecución local y scripts](#9-ejecución-local-y-scripts)
- [🧪 10) Verificación técnica mínima](#10-verificación-técnica-mínima)
- [📎 11) Referencias](#11-referencias)

## 1) Objetivo
Documentar cómo está estructurado y operando hoy el frontend de Bambino Chicken, para facilitar mantenimiento técnico y futura etapa de rediseño visual.

## 2) Estado actual del frontend
- Proyecto: `FrontEndBambino`.
- Stack base: `Angular 21`, `TypeScript 5.9`, `RxJS 7.8`, `SCSS`.
- UI/estado: `Angular Material`, `CDK`, `NgRx`, `ngx-translate`.
- Mapa/cobertura: `Leaflet` + `OpenStreetMap`.
- Calidad: `ESLint`, `Prettier`, `Vitest`, `Husky`, `lint-staged`.

## 3) Arquitectura de navegación (SPA)
Ruteo principal en `src/app/app.routes.ts`:

- Área admin bajo `/admin` con `adminGuard` y `canActivateChild`.
- Área cliente/pública bajo `AppLayoutComponent`.
- Rutas autenticadas de cliente con `authGuard` (`carrito`, `checkout`, `mis-pedidos`, `perfil`, etc.).
- Área cocina expuesta en `/cocina-panel` (protegida por guard).
- Wildcard `**` con redirección a `/inicio`.

Configuración global (`app.config.ts`):

- `provideHttpClient(withInterceptors([authSessionInterceptor, cacheInterceptor]))`
- `provideRouter(..., withPreloading(PreloadAllModules), withInMemoryScrolling(...))`

## 4) Organización funcional por módulos
Estructura principal en `src/app`:

- `core`: guards, capa HTTP, layout y base transversal.
- `shared`: componentes reutilizables, utilidades y servicios comunes.
- `features/cliente`: inicio, carta, promociones, carrito, checkout, pedidos, perfil, direcciones, cobertura, reclamaciones y páginas informativas.
- `features/admin`: dashboard, comercial, web media, pedidos, pagos, comprobantes, empresa, configuración, usuarios y auditoría.
- `features/cocina`: panel operativo de cocina.

Rutas admin específicas (`features/admin/admin.routes.ts`):

- `comercial`, `web`, `pedidos`, `pagos`, `comprobantes`, `empresa`, `configuracion`, `usuarios`, `auditoria`.

## 5) Sesión, autenticación y guards
Modelo de sesión detectado:

- Token en `localStorage` con clave `bambino_basic_auth`.
- `authGuard`: exige token para rutas autenticadas.
- `adminGuard`: exige token + rol con semántica admin.

Flujo de autenticación actual:

- El frontend construye token `Basic` (`btoa(email:password)`).
- Valida sesión consultando `/api/auth/yo` con header `Authorization: Basic <token>`.
- Guarda nombre y rol en `localStorage` (`bambino_user_name`, `bambino_user_role`).

## 6) Capa HTTP, cache e invalidación
Interceptors activos:

- `authSessionInterceptor`: fuerza logout en respuestas `401/403` vinculadas a token vigente.
- `cacheInterceptor`: cache de `GET` con estrategia tipo `stale-while-revalidate`.

Características técnicas de cache:

- TTL por reglas de URL.
- Clave de cache incluye método, URL y encabezado Authorization.
- Invalidación por tags al mutar (`POST/PUT/PATCH/DELETE`) en dominios como catálogo, media, carrito, pedidos, perfil y direcciones.

## 7) Integración con backend y estado de endpoints
Estado actual detectado en código:

- Backend principal hardcodeado en múltiples módulos:
  - `https://backendbambino.onrender.com`
- Existe al menos un caso local explícito:
  - `http://localhost:8080` en `cliente-libro-reclamaciones`.

Conclusión técnica:

- Hay coexistencia de URLs remotas y locales dentro de componentes.
- Conviene centralizar base URL en `environment.ts`/inyección por entorno para evitar divergencias por módulo.

## 8) Cobertura delivery y mapa
Módulo clave: `features/cliente/cliente-cobertura-delivery`.

Implementación:

- Render del mapa con `Leaflet`.
- Polígono de cobertura desde `public/geo/chorrillos.geojson`.
- Consulta de ubicación principal del restaurante en `/api/public/delivery/ubicacion-principal`.
- Validación de punto manual o por geolocalización del navegador.

## 9) Ejecución local y scripts
Desde carpeta `FrontEndBambino`:

```bash
npm install
npm start
```

Servidor local:

- `ng serve --port 5173`
- URL: `http://localhost:5173`

Scripts principales:

- `npm run build`
- `npm run watch`
- `npm test`
- `npm run lint`

## 10) Verificación técnica mínima
Checklist recomendado después de cambios:

1. La app levanta en `5173` sin errores de compilación.
2. Navegación entre rutas públicas y protegidas funciona.
3. Login con Basic auth permite consultar `/api/auth/yo`.
4. Invalida sesión correctamente en `401/403`.
5. Cache no rompe refresco de datos tras mutaciones.
6. Cobertura delivery carga polígono y valida puntos dentro/fuera.

## 11) Referencias
- `FrontEndBambino/README.md`
- `FrontEndBambino/src/app/app.routes.ts`
- `FrontEndBambino/src/app/app.config.ts`
- `FrontEndBambino/docs/regla-navegacion-cache.md`
- `markdowns/DocumentacionBackend.md`
