# Regla Global de Navegación, Cache e Invalidación (Angular)

## Objetivo
Evitar recargas innecesarias al navegar entre vistas y actualizar datos solo cuando realmente cambien.

Esta regla aplica a toda la web (cliente y administrador), para vistas actuales y futuras.

## Regla obligatoria
1. Toda navegación interna debe ser SPA (`routerLink` + `router-outlet`).
2. Todo `GET` debe pasar por estrategia de cache (no recargar datos por defecto al volver a una vista).
3. Toda mutación (`POST`, `PUT`, `PATCH`, `DELETE`) debe invalidar tags de cache relacionadas.
4. Toda vista debe usar `stale-while-revalidate` (mostrar cache primero, revalidar en segundo plano).
5. Cambios hechos por admin deben propagarse a cliente con invalidación dirigida (no refresh global).

## Arquitectura estándar

### 1) Enrutamiento Angular
- Usar lazy loading por rutas/módulos.
- Usar preloading selectivo para secciones probables.
- No usar `<a href="...">` para rutas internas.

### 2) Cache de datos por recurso
- Implementar `HttpInterceptor` de cache para `GET`.
- Clave de cache: `url + queryParams + tenant/contexto`.
- Definir TTL por recurso (ver tabla).

### 3) Estrategia SWR (Stale-While-Revalidate)
- Paso 1: responder desde cache inmediato si existe.
- Paso 2: disparar revalidación en background.
- Paso 3: si hay cambio, actualizar estado/UI.

### 4) Revalidación eficiente con backend
- Usar `ETag/If-None-Match` o `Last-Modified/If-Modified-Since`.
- Si backend responde `304 Not Modified`, conservar cache y no repintar innecesariamente.

### 5) Invalidación por tags
Definir tags por dominio funcional. Ejemplo base:
- `promotions`
- `menu`
- `store_status`
- `cart`
- `checkout`
- `orders`
- `profile`
- `addresses`

Reglas:
- Si cliente agrega/quita ítems: invalidar `cart` y `checkout`.
- Si admin edita promociones: invalidar `promotions`.
- Si admin edita carta/precios/stock: invalidar `menu` (y `promotions` si impacta).
- Si cambia estado de tienda: invalidar `store_status`.

### 6) Actualización en tiempo real (recomendado)
- Usar WebSocket o SSE para eventos de cambio.
- Al recibir evento (`menu_updated`, `promotion_updated`, etc.), invalidar solo tags afectadas.

## TTL sugerido inicial
- `store_status`: 15-30 s
- `cart`: sin TTL largo (evento/mutación manda)
- `promotions`: 2-5 min
- `menu`: 3-10 min
- `profile` / `addresses`: 5-15 min
- `orders` activas: 10-30 s (o tiempo real)

> Ajustar estos valores según métricas reales de uso.

## Comportamiento esperado de UX
- Si usuario vuelve a una vista ya visitada (ej. Promociones), la vista se muestra instantánea desde cache.
- Solo se refresca contenido si se detecta cambio real.
- No debe haber pantallas en blanco por refetch innecesario.

## Checklist obligatorio por cada vista nueva
1. ¿La ruta es lazy-load?
2. ¿Sus `GET` tienen cache + TTL?
3. ¿La vista usa SWR?
4. ¿Se definieron tags de invalidación?
5. ¿Las mutaciones invalidan tags correctas?
6. ¿Se conserva estado de UI al volver (filtro, paginación, scroll cuando aplique)?
7. ¿Se documentó el comportamiento de revalidación?

## Checklist de migración para vistas existentes
1. Reemplazar recargas directas por navegación SPA.
2. Envolver `GET` en capa común con cache.
3. Añadir invalidación en cada mutación.
4. Incorporar SWR en componentes con alto tráfico.
5. Activar eventos en tiempo real para cambios de admin que impactan al cliente.

## Anti-patrones (prohibidos)
- Refetch completo en cada `ngOnInit` sin revisar cache.
- Limpiar toda la cache por cualquier mutación.
- Recargar toda la página para actualizar una sección.
- Usar la misma TTL para todos los recursos.

## Decisión de equipo
Esta regla queda como estándar técnico de frontend para Bambino. Toda implementación futura debe cumplirla salvo excepción documentada.
