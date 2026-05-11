# 🎨 Documentacion Mockup - BambinoChicken

> Nota: Guía visual de mockups alineada con RFs, BPMN y lógica de negocio vigente.

## 🗂️ Índice
- [🎯 1) Objetivo de este documento](#1-objetivo-de-este-documento)
- [🧱 2) Mockups base reutilizables (plantilla comun)](#2-mockups-base-reutilizables-plantilla-comun)
- [🧩 3) Mockups por modulo](#3-mockups-por-modulo)
- [🔀 4) Flujo visual recomendado (navegacion por flechas)](#4-flujo-visual-recomendado-navegacion-por-flechas)
- [✅ 5) Notas de consistencia visual](#5-notas-de-consistencia-visual)
- [🗃️ 6) Regla obligatoria de trazabilidad con BD (no inventar)](#6-regla-obligatoria-de-trazabilidad-con-bd-no-inventar)
- [🔗 7) Matriz Mockup -> Tablas -> Campos clave](#7-matriz-mockup---tablas---campos-clave)

## 1) Objetivo de este documento
Dejar definido que mockups se van a construir, que contiene cada uno y como se conectan, para que cualquier chat o persona continue el trabajo sin desalinearse.

Este documento esta alineado con:
- `Requerimientos.md`
- `Logica del sistema.md`
- `bpmns pasos.md`
- `division de los bpmns.md`

---

## 2) Mockups base reutilizables (plantilla comun)
Estos 2 mockups se reutilizan como base visual/general:

### 2.1 Sistema principal (hub)
Uso:
- Es la pantalla central de navegacion.
- Desde aqui salen flechas a los modulos Cliente, Cocina y Admin.
- Tambien enlaza a configuracion tecnica si se desea mostrar.

Contenido:
- Ventana principal tipo escritorio.
- Menus por rol:
  - Cliente
  - Cocina
  - Admin
- Opcion de configuracion tecnica (opcional en demo).

### 2.2 Configuracion conexion BD (tecnico)
Uso:
- Pantalla tecnica/referencial para mostrar conexion a la base real del proyecto.
- No es pantalla final de cliente; es de documentacion/demo tecnica.

Contenido sugerido (con datos reales del proyecto):
- Servidor: `localhost`
- Puerto: `3306`
- Nombre BD: `bambino_db`
- Usuario: `root`
- Password: (oculto en mockup)
- Conexion ejemplo: `jdbc:mysql://localhost:3306/bambino_db`

---

## 3) Mockups por modulo

## 3.1 Cliente

### M01 - Cliente Catalogo
Descripcion:
- Vista de carta: productos activos, visibles y disponibles.
- Filtros por categoria/busqueda.
- Etiquetas de oferta cuando aplique.

### M02 - Cliente Detalle producto
Descripcion:
- Detalle de producto: nombre, descripcion, precio base, precio con oferta.
- Control de cantidad y boton agregar al carrito.

### M03 - Cliente Carrito
Descripcion:
- Lista de items agregados.
- Muestra snapshot de precio y descuento por item.
- Muestra subtotal, descuento total y total.

### M04 - Cliente Checkout entrega
Descripcion:
- Seleccion de modalidad: recojo o delivery.
- Si delivery: seleccion de punto en mapa.
- Direccion autocompletada por coordenadas + referencia.

### M05 - Cliente Checkout comprobante (boleta/factura)
Descripcion:
- Selector de tipo de comprobante.
- Boleta: usa automaticamente DNI vigente del perfil.
- Factura: usa automaticamente RUC personal (RUC10) vigente del perfil.
- No solicita ingreso manual de DNI/RUC en checkout.

### M06 - Cliente Pago
Descripcion:
- Resumen final del pedido.
- Seleccion/metodo de pago.
- Estado de pago: pendiente, aprobado o rechazado.

### M07 - Cliente Confirmacion y seguimiento
Descripcion:
- Muestra codigo de pedido.
- Estado actual y linea de tiempo de estados.

### M08 - Cliente Mis direcciones
Descripcion:
- Lista de direcciones del cliente.
- Crear/editar/inactivar direccion.
- Marcar direccion principal.

### M09 - Cliente Registro
Descripcion:
- Formulario de alta de cliente.
- Campos basicos de identidad y acceso.
- Cliente define documento principal y puede agregar un segundo documento opcional.
- En perfil puede agregar mas documentos, sin repetir tipo+numero.

### M10 - Cliente Recuperar contrasena
Descripcion:
- Solicitar codigo al correo.
- Ingresar codigo y nueva contrasena.

### M11 - Cliente Chatbot consultas
Descripcion:
- Opciones rapidas: ver carta, ver ofertas, ver estado de pedido.
- Respuesta dentro del chat con datos resumidos.

---

## 3.2 Cocina

### M12 - Cocina Bandeja de pedidos
Descripcion:
- Lista de pedidos operativos.
- Filtros por estado/prioridad.

### M13 - Cocina Detalle y accion de pedido
Descripcion:
- Ver detalle de pedido.
- Tomar pedido.
- Marcar en preparacion, listo o entregado.

### M14 - Cocina Incidencias
Descripcion:
- Registrar incidencia de cocina por pedido.
- Ver historial de incidencias del pedido.

---

## 3.3 Admin

### M15 - Admin Dashboard
Descripcion:
- Resumen de pedidos, pagos y estados clave.
- Panel inicial de control.

### M16 - Admin Productos
Descripcion:
- CRUD de productos.
- Control de visible web/disponible/estado.

### M17 - Admin Ofertas
Descripcion:
- Crear/editar oferta.
- Asignar oferta a productos.
- Activar/desactivar por vigencia.

### M18 - Admin Pedidos
Descripcion:
- Lista y filtros de pedidos.
- Cambio de estado permitido.
- Cancelar/anular con motivo.

### M19 - Admin Pagos
Descripcion:
- Gestion de pagos pendientes/rechazados.
- Confirmacion manual administrativa.

### M20 - Admin Comprobantes
Descripcion:
- Emision/revision/reenvio de comprobantes.
- Control de series y correlativos.

### M21 - Admin Configuracion del sistema
Descripcion:
- Configuracion de empresa emisora.
- Parametros delivery.
- Reglas de transicion de estados.
- Configuración de media web (inicio, nosotros, carta PDF).

---

## 4) Flujo visual recomendado (navegacion por flechas)
1. `Sistema principal (hub)` apunta a Cliente, Cocina y Admin.
2. Cada rol abre sus mockups internos.
3. Mockups clave pueden regresar al hub con boton `Cerrar` o `Volver`.
4. `Configuracion conexion BD` se conecta como vista tecnica aparte.

---

## 5) Notas de consistencia visual
1. Mantener la misma estructura de ventana en todos los mockups.
2. Mantener botones coherentes (`Buscar`, `Agregar`, `Editar`, `Borrar`, `Cerrar`, `Aceptar`, `Cancelar`).
3. Mantener nombres y campos alineados a `bambino_db` y a los RFs actuales.
4. No mezclar terminos antiguos de inventario/caja que no aplican al enfoque Cliente/Admin/Cocina.

---

## 6) Regla obligatoria de trazabilidad con BD (no inventar)
1. Todo mockup debe usar tablas/campos existentes en `bambino_db`.
2. Si un campo no existe en BD, no debe mostrarse como dato persistido.
3. Ante duda, prevalece:
   - `Diccionaro de Datos.md`
   - `Logica del sistema.md`
   - `Requerimientos.md`

---

## 7) Matriz Mockup -> Tablas -> Campos clave

### 7.1 Cliente
- M01 Catalogo -> `producto`, `categoria_producto`, `oferta`, `oferta_producto`
  - Campos: `id_producto`, `nombre`, `descripcion`, `precio_base`, `visible_web`, `disponible`, `estado`, `id_categoria`, `tipo`, `valor_descuento`, `precio_especial`, `fecha_inicio`, `fecha_fin`.
- M02 Detalle producto -> `producto`, `oferta`, `oferta_producto`
  - Campos: `id_producto`, `nombre`, `descripcion`, `precio_base`, `imagen_url`, `tipo`, `valor_descuento`, `precio_especial`.
- M03 Carrito -> `carrito`, `carrito_item`, `producto`
  - Campos: `id_carrito`, `id_cliente`, `estado`, `id_producto`, `cantidad`, `precio_unitario_snapshot`, `descuento_unitario_snapshot`.
- M04 Checkout entrega -> `cliente_direccion`, `zona_delivery`, `configuracion_global`
  - Campos: `id_direccion`, `id_cliente`, `direccion_texto`, `referencia`, `latitud`, `longitud`, `google_place_id`, `es_principal`, `activo`, `radio_km`, `tarifa_base`, `monto_minimo`.
- M05 Checkout comprobante -> `cliente_perfil`
  - Campos: `doc_tipo`, `doc_numero` (tomados automaticamente desde perfil segun tipo de comprobante).
- M06 Pago -> `pago`
  - Campos: `id_pago`, `id_pedido`, `estado_pago`, `monto`, `idempotency_key`, `fecha_creacion`.
- M07 Confirmacion/seguimiento -> `pedido`, `pedido_estado_historial`, `pedido_item`
  - Campos: `id_pedido`, `estado_actual`, `total`, `fecha_creacion`, `id_estado_origen`, `id_estado_destino`, `fecha_evento`.
- M08 Mis direcciones -> `cliente_direccion`
  - Campos: `id_direccion`, `id_cliente`, `direccion_texto`, `referencia`, `latitud`, `longitud`, `google_place_id`, `es_principal`, `activo`.
- M09 Registro -> `usuario`, `cliente_perfil`, `cliente_documento`, `rol`
  - Campos: `email`, `password_hash`, `nombres`, `apellidos`, `telefono`, `estado`, `id_rol`, `doc_tipo`, `doc_numero`, `es_principal`, `activo`.
  - Regla: no duplicar documentos por cliente con la misma combinacion `doc_tipo + doc_numero`.
- M10 Recuperar contrasena -> `recuperacion_password_codigo`, `usuario`
  - Campos: `id_usuario`, `correo`, `codigo_hash`, `estado`, `fecha_expiracion`, `intentos_fallidos`, `password_hash`.
- M11 Chatbot consultas -> `producto`, `oferta`, `pedido`, `pedido_estado_historial`
  - Campos: catálogo/ofertas activas y `id_pedido`, `estado_actual`, `fecha_evento`.

### 7.2 Cocina
- M12 Bandeja pedidos -> `pedido`, `pedido_item`
  - Campos: `id_pedido`, `estado_actual`, `total`, `fecha_creacion`, detalle de ítems.
- M13 Detalle/accion pedido -> `pedido`, `pedido_asignacion_cocina`, `pedido_estado_historial`
  - Campos: `usuario_cocina_preparacion`, `fecha_inicio_preparacion`, `fecha_fin_preparacion`, asignaciones, historial de transición.
- M14 Incidencias -> `pedido_cocina_incidencia`
  - Campos: `id_incidencia`, `id_pedido`, `id_usuario_cocina`, `tipo_incidencia`, `detalle`, `fecha_creacion`.

### 7.3 Admin
- M15 Dashboard -> `pedido`, `pago`, `comprobante`
  - Campos: estados, conteos y montos (`estado_actual`, `estado_pago`, totales, fechas).
- M16 Productos -> `producto`, `categoria_producto`
  - Campos: `nombre`, `descripcion`, `precio_base`, `visible_web`, `disponible`, `estado`, `orden_visual`, `id_categoria`.
- M17 Ofertas -> `oferta`, `oferta_producto`
  - Campos: `nombre`, `tipo`, `valor_descuento`, `precio_especial`, `estado`, `fecha_inicio`, `fecha_fin`, `id_producto`.
- M18 Pedidos -> `pedido`, `pedido_estado_historial`, `pedido_estado_transicion_permitida`
  - Campos: `estado_actual`, transiciones, motivos, actor/fecha de cambio.
- M19 Pagos -> `pago`
  - Campos: `estado_pago`, `monto`, `idempotency_key`, referencias de transacción, fechas.
- M20 Comprobantes -> `comprobante`, `comprobante_detalle`, `serie_comprobante`, `empresa`
  - Campos: tipo, serie, correlativo, receptor, montos, detalle de líneas.
- M21 Configuracion sistema -> `empresa`, `zona_delivery`, `configuracion_global`, `pedido_estado_transicion_permitida`, `serie_comprobante`
  - Campos: datos empresa, parámetros delivery, reglas de transición, series/correlativos.
- M22 Configuración media web -> `configuracion_media`
  - Campos: `clave`, `nombre`, `descripcion`, `tipo`, `url`, `public_id`, `version_tag`, `activa`.
