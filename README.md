# FrontEndBambino

Frontend oficial del proyecto **Bambino Chicken**, construido con Angular, con enfoque en experiencia de cliente, panel administrativo, operación de cocina y funcionalidades de cobertura de delivery georreferenciada.

Este documento centraliza la guía técnica del frontend: arquitectura, stack, ejecución local, integración con backend y pautas de colaboración.

## Tabla de contenido

1. [Objetivo del frontend](#objetivo-del-frontend)
2. [Stack tecnológico](#stack-tecnológico)
3. [Requisitos del entorno](#requisitos-del-entorno)
4. [Puesta en marcha local](#puesta-en-marcha-local)
5. [Scripts disponibles](#scripts-disponibles)
6. [Arquitectura frontend](#arquitectura-frontend)
7. [Organización funcional del proyecto](#organización-funcional-del-proyecto)
8. [Integración con backend](#integración-con-backend)
9. [Mapa geográfico y cobertura delivery](#mapa-geográfico-y-cobertura-delivery)
10. [Navegación SPA, cache e invalidación](#navegación-spa-cache-e-invalidación)
11. [Calidad y colaboración](#calidad-y-colaboración)
12. [Troubleshooting](#troubleshooting)
13. [Documentación de apoyo](#documentación-de-apoyo)

## Objetivo del frontend

El frontend de Bambino tiene como objetivos principales:

- Exponer una experiencia de compra web para cliente final (catálogo, carrito, checkout, pedidos y perfil).
- Ofrecer un panel administrativo para gestión comercial, usuarios, configuración y web media.
- Soportar operación interna (incluyendo panel de cocina).
- Integrar validación de cobertura delivery con mapa geográfico para decisiones de despacho.

## Stack tecnológico

### Base de aplicación

- `Angular 21` (`@angular/core`, `@angular/router`, `@angular/forms`, `@angular/common`)
- `TypeScript 5.9`
- `RxJS 7.8`
- `SCSS`

### UI y estado

- `Angular Material` + `CDK`
- `NgRx` (`store`, `effects`, `entity`, `store-devtools`)
- `ngx-translate` para internacionalización

### Funcionalidades especializadas

- `Leaflet` para mapa interactivo
- `OpenStreetMap` como proveedor de tiles cartográficos
- `Zod` para validaciones tipadas
- `pdfjs-dist` para manejo de contenido PDF en frontend

### Calidad y tooling

- `ESLint` + `angular-eslint`
- `Vitest` (integrado vía `ng test`)
- `Prettier`
- `Husky` + `lint-staged`

## Requisitos del entorno

Según `package.json`:

- `Node.js 24.x`
- `npm 10.x`

Recomendación práctica:

- Verificar versiones antes de instalar dependencias:

```bash
node -v
npm -v
```

## Puesta en marcha local

Desde la carpeta del frontend:

```bash
cd FrontEndBambino
npm install
npm start
```

El comando `npm start` ejecuta:

- `ng serve --port 5173`

URL local esperada:

- [http://localhost:5173](http://localhost:5173)

## Scripts disponibles

- `npm start`: levanta servidor de desarrollo en puerto `5173`.
- `npm run build`: genera build de producción.
- `npm run watch`: build en modo desarrollo con watch.
- `npm test`: ejecuta pruebas unitarias.
- `npm run lint`: ejecuta lint del proyecto.

## Arquitectura frontend

La aplicación sigue arquitectura SPA con Angular Router y carga diferida por funcionalidades.

### Enrutamiento principal

- Ruta `admin` protegida con `adminGuard` y `canActivateChild`.
- Rutas públicas/cliente bajo `AppLayoutComponent`.
- Guards de sesión (`authGuard`) en rutas que requieren autenticación.
- Wildcard `**` con redirección a `inicio`.

### Configuración global

En `app.config.ts` se define:

- `provideHttpClient(withInterceptors([...]))` con:
  - `authSessionInterceptor`
  - `cacheInterceptor`
- `provideRouter(...)` con:
  - `withPreloading(PreloadAllModules)`
  - `withInMemoryScrolling` para restauración y anclas.

### Capas técnicas relevantes

- `core/http`: interceptores, cache service, helpers e invalidación por tags.
- `core/guards`: control de acceso por sesión/rol.
- `core/layout`: layout principal de aplicación.
- `shared`: componentes reutilizables (modales, toast, spinner) y utilidades.

## Organización funcional del proyecto

Estructura de alto nivel en `src/app`:

- `features/cliente`: experiencia del usuario final (inicio, carta, carrito, checkout, pedidos, perfil, direcciones, cobertura, etc.).
- `features/admin`: módulos de administración (dashboard, comercial, usuarios, configuración, auditoría, web media, etc.).
- `features/cocina`: vistas de operación de cocina.
- `core`: infraestructura transversal (layout, guards, http).
- `shared`: UI y utilidades compartidas.

## Integración con backend

### Base URL y consumo de APIs

El frontend consume endpoints HTTP del backend Bambino. En el código actual coexisten referencias a:

- `https://backendbambino.onrender.com` (principal en múltiples módulos)
- `http://localhost:8080` (presente en casos puntuales, por ejemplo libro de reclamaciones)

Esto implica dos escenarios operativos:

- Entorno conectado a backend remoto (cloud).
- Entorno de desarrollo local con backend levantado en `8080`.

### Autenticación de sesión

- Se usa token almacenado en `localStorage`.
- `authSessionInterceptor` gestiona encabezados de autorización para requests autenticados.
- Varias vistas protegidas dependen de sesión activa (`authGuard`).

### Nota técnica recomendada

Como mejora futura, conviene centralizar base URLs en `environment.ts` para evitar dispersión de endpoints hardcodeados.

## Mapa geográfico y cobertura delivery

La funcionalidad de cobertura está implementada en la vista `cliente-cobertura-delivery`.

### Tecnología utilizada

- `Leaflet` para render interactivo del mapa.
- `OpenStreetMap` como tile layer (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).

### Fuente geográfica oficial

- Archivo GeoJSON local: `public/geo/chorrillos.geojson`.
- Este polígono define la zona oficial de cobertura para Chorrillos.

### Flujo funcional

1. Se inicializa Leaflet y se crea mapa base.
2. Se carga `chorrillos.geojson` y se dibuja capa de cobertura.
3. Se consulta ubicación principal del restaurante:
   - `GET /api/public/delivery/ubicacion-principal`
   - Si falla, aplica fallback a coordenadas locales predefinidas.
4. Se agrega marcador del restaurante (estilo personalizado).
5. El usuario puede:
   - Hacer click en el mapa para validar un punto manual.
   - Usar botón de geolocalización para validar su posición GPS.
6. El sistema evalúa si el punto está dentro/fuera del polígono usando algoritmo punto-en-geometría (Polygon/MultiPolygon).
7. Se muestran mensajes de resultado mediante `ToastService`.

### Marcadores y feedback visual

- Marcador restaurante: pin rojo personalizado.
- Marcador cliente: icono de persona (`person_pin_circle`).
- Leyenda visual en mapa para área, restaurante y ubicación del usuario.

### Consideraciones de permisos GPS

- Si el navegador no soporta geolocalización: se informa error.
- Si el usuario deniega permisos: se muestra advertencia específica.
- Si hay timeout/error de lectura GPS: se notifica fallo controlado.

## Navegación SPA, cache e invalidación

El proyecto adopta una regla técnica para navegación y datos:

- Navegación interna por `routerLink`/`router-outlet`.
- Cache de `GET` a través de interceptor.
- Estrategia `stale-while-revalidate`.
- Invalidación por tags en mutaciones (`POST/PUT/PATCH/DELETE`).

Referencia oficial de esta convención:

- [docs/regla-navegacion-cache.md](./docs/regla-navegacion-cache.md)

## Calidad y colaboración

### Flujo mínimo de validación antes de PR

Ejecutar en local:

```bash
npm run lint
npm test
npm run build
```

### Checklist recomendado previo a merge

- El código compila sin errores (`build`).
- No hay errores de lint.
- Las pruebas existentes pasan.
- No se rompen rutas protegidas ni públicas.
- Si hubo cambios en consumo API, validar impacto en cache e invalidación.
- Si hubo cambios en cobertura, validar mapa, polígono y geolocalización.

## Troubleshooting

### La app no levanta en local

- Verificar versiones `node`/`npm` requeridas.
- Reinstalar dependencias:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Puerto ocupado (`5173`)

- Liberar puerto o ajustar temporalmente el script `start`.

### Errores CORS / backend inaccesible

- Confirmar que backend objetivo esté activo (`onrender` o `localhost:8080`).
- Revisar consistencia de base URLs en el módulo que falla.

### Mapa no carga o sin polígono

- Verificar existencia de `public/geo/chorrillos.geojson`.
- Validar que el asset esté siendo servido correctamente.

### Geolocalización no funciona

- Confirmar permisos de ubicación del navegador.
- Recordar que algunos navegadores restringen GPS fuera de contexto seguro/permisos explícitos.

## Documentación de apoyo

- Regla de cache/navegación:
  - [docs/regla-navegacion-cache.md](./docs/regla-navegacion-cache.md)
- Documentos funcionales/técnicos complementarios:
  - [markdowns/Requerimientos.md](./markdowns/Requerimientos.md)
  - [markdowns/Logica del sistema.md](./markdowns/Logica%20del%20sistema.md)
  - [markdowns/Logica de Negocio.md](./markdowns/Logica%20de%20Negocio.md)
  - [markdowns/Diccionaro de Datos.md](./markdowns/Diccionaro%20de%20Datos.md)
  - [markdowns/documentacionMockup.md](./markdowns/documentacionMockup.md)

---

Este README describe el estado técnico actual del frontend `FrontEndBambino` y debe mantenerse actualizado conforme evolucione la arquitectura y las integraciones del proyecto.
