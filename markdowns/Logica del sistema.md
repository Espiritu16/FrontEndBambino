# ⚙️ Lógica de Negocio - BambinoChicken

> Nota: Reglas operativas y transaccionales del sistema, alineadas con BPMN, RFs y modelo de datos vigente.

## 🗂️ Índice
- [🎯 1) Objetivo](#1-objetivo)
- [📌 2) Principios transversales](#2-principios-transversales)
- [🔄 3) Flujo global resumido](#3-flujo-global-resumido)
- [👤 4) Lógica de negocio por rol: Cliente](#4-lógica-de-negocio-por-rol-cliente)
- [🍳 5) Lógica de negocio por rol: Cocina](#5-lógica-de-negocio-por-rol-cocina)
- [🛠️ 6) Lógica de negocio por rol: Administrador](#6-lógica-de-negocio-por-rol-administrador)
- [📊 7) Matriz de estados](#7-matriz-de-estados-regla-funcional-base)
- [🧾 8) Reglas de comprobante](#8-reglas-de-comprobante-cabecera--detalle)
- [✅ 9) Casos límite y validaciones críticas](#9-casos-límite-y-validaciones-críticas)
- [🔐 11) Lógica de recuperación de contraseña](#11-lógica-de-recuperación-de-contraseña-seguridad)


## 1) Objetivo
Definir la lógica de negocio operativa y transaccional, separada por rol:
- Cliente
- Cocina
- Administrador

Este documento está alineado con RFs, BPMN y modelo SQL vigente.

## 2) Principios transversales
1. Separación estricta por rol y permisos.
2. Validación en servidor de toda regla crítica (precio, stock, transición de estados, comprobantes).
3. Trazabilidad de acciones con usuario, fecha/hora y operación.
4. Consistencia transaccional entre pedido, pago y comprobante.
5. Snapshot de datos sensibles al momento de confirmar (dirección, fiscal, precios, detalle comprobante).

## 3) Flujo global resumido
1. Cliente navega catálogo y crea carrito.
2. Cliente define entrega (`RECOJO` o `DELIVERY` con punto en mapa).
3. Cliente selecciona comprobante (`BOLETA` o `FACTURA`) y paga.
4. Con pago aprobado, se crea pedido + comprobante + comprobante_detalle.
5. Cocina toma pedido y lo pasa a `EN_PREPARACION` (queda registrado quién cocina).
6. Cocina marca `LISTO_RECOJO` o `LISTO_DESPACHO`.
7. Pedido continúa hasta `ENTREGADO` o cierre alterno (`CANCELADO`/`ANULADO`).

---

## 4) Lógica de negocio por rol: Cliente

### 4.1 Catálogo y oferta
- Solo se muestran productos `ACTIVOS`, visibles y disponibles.
- Ofertas se aplican solo si están vigentes y activas.
- Si hay más de una oferta activa para el mismo producto, se aplica la de mayor prioridad temporal (fecha de inicio más reciente).

### 4.2 Carrito
- El cliente puede agregar, editar o quitar ítems.
- Al agregar/actualizar un ítem, backend calcula y guarda snapshot de precio y descuento por tipo de oferta:
  - `PORCENTAJE`
  - `MONTO_FIJO`
  - `PRECIO_ESPECIAL`
  - `COMBO` (si define precio especial)
- Checkout usa ese snapshot persistido (`precio_unitario_snapshot`, `descuento_unitario_snapshot`) como base de cálculo.
- No se permite cantidad <= 0.

### 4.3 Entrega
- `RECOJO`: no requiere dirección de entrega.
- `DELIVERY`:
  - Cliente selecciona punto exacto en mapa.
  - Se guardan `latitud`, `longitud`, `google_place_id`.
  - Backend autocompleta dirección y valida cobertura por coordenadas.
  - La cobertura se evalúa primero contra zonas activas (`zona_delivery`) usando `latitud_centro`, `longitud_centro` y `radio_km` por zona.
  - Si una zona activa no tiene centro/radio configurado, se usa centro/radio global de respaldo para no romper operación.
  - Se valida horario de zona, monto mínimo y tarifa aplicable.

### 4.4 Comprobante y datos fiscales
- `BOLETA`: usa automáticamente el DNI vigente del perfil del cliente.
- `FACTURA`: usa automáticamente el RUC personal (RUC10) vigente del perfil del cliente.
- No se solicita ingreso manual de DNI/RUC en checkout.
- Si no existe documento válido o está inactivo, no se permite pagar y se solicita actualización de perfil.

### 4.5 Pago
- Se inicia transacción de pago con clave de idempotencia.
- Resultados posibles: `PENDIENTE`, `APROBADO`, `RECHAZADO`.
- No se confirma pedido final sin pago aprobado.

### 4.6 Pedido postpago
Al aprobar pago:
1. Se crea `pedido` con estado inicial de negocio.
2. Se crean `pedido_item` desde carrito confirmado.
3. Se emite `comprobante`.
4. Se crea `comprobante_detalle` como snapshot fiscal de líneas.
5. Se registra historial y auditoría.

### 4.7 Gestión de documentos de cliente
- En registro, el cliente define documento principal y puede agregar un segundo documento opcional.
- En perfil, el cliente puede agregar más documentos.
- Regla obligatoria: no se permite duplicar documentos por cliente con la misma combinación tipo+número.

### 4.8 Consulta y cancelación
- El cliente consulta solo sus propios pedidos.
- Cancelación permitida solo en estados definidos como cancelables.
- Toda cancelación deja motivo y trazabilidad.

---

## 5) Lógica de negocio por rol: Cocina

### 5.1 Bandeja operativa
- Cocina visualiza pedidos en estados operables por su rol.
- Puede filtrar por estado, prioridad y ventana de tiempo.
- Estados operativos mínimos de bandeja: `CONFIRMADO`, `EN_PREPARACION`, `LISTO_RECOJO`, `LISTO_DESPACHO`.

### 5.2 Toma de pedido
- Al tomar pedido, se registra asignación operativa (`pedido_asignacion_cocina`).
- Debe quedar identificado el usuario de cocina que toma la orden.
- Cada toma/reasignación guarda `id_pedido`, `id_usuario_cocina`, `fecha_asignacion` y `motivo`.

### 5.3 Inicio de preparación
Al cambiar a `EN_PREPARACION`:
1. Se valida transición permitida por matriz.
2. Se valida que el actor sea rol `COCINA`.
3. Se guarda `usuario_cocina_preparacion` (si vacío).
4. Se guarda `fecha_inicio_preparacion` (si vacía).
5. Se registra evento en historial con `actor_tipo=COCINA`.

### 5.4 Fin de preparación
Al pasar de `EN_PREPARACION` a `LISTO_RECOJO` o `LISTO_DESPACHO`:
1. Se valida transición.
2. Se guarda `fecha_fin_preparacion` (si vacía).
3. Se registra historial de estado.

### 5.5 Entrega operativa
- Cocina puede marcar `ENTREGADO` según flujo de operación.
- El cambio genera historial y auditoría.

### 5.6 Notas e incidencias
- Cocina puede registrar notas operativas por pedido.
- Las incidencias se guardan en tabla dedicada `pedido_cocina_incidencia` con `tipo_incidencia`, `detalle`, `id_usuario_cocina` y timestamp.
- Reasignación entre usuarios de cocina debe guardar origen, destino, motivo y fecha/hora.

### 5.7 Restricciones
- Cocina no gestiona productos/ofertas, usuarios ni configuraciones globales.

---

## 6) Lógica de negocio por rol: Administrador

### 6.1 Gestión comercial
- Crear/editar/inactivar productos.
- Configurar visibilidad, disponibilidad y orden en carta.
- Crear/editar/activar/desactivar ofertas y vigencia.

### 6.2 Gestión de pedidos
- Monitoreo integral por filtros: estado, fecha, cliente, pago, comprobante.
- Cambios de estado excepcionales según matriz y permisos.
- Anulación/cancelación administrativa con motivo obligatorio.

### 6.3 Gestión de pagos
- Revisión de pagos rechazados o pendientes.
- Acciones de regularización sobre pagos según política.
- Confirmación de pago soporta doble vía:
  - administrativa (`/api/admin/pagos/{idPago}/confirmar`)
  - webhook público (`/api/public/pagos/webhook`) con control de idempotencia.

### 6.4 Gestión de comprobantes
- Consultar comprobantes emitidos.
- Reenvío o correcciones permitidas por norma interna.
- Control de series/correlativos por empresa.

### 6.5 Configuración operativa
- Matriz de transiciones de estados.
- Políticas de cancelación.
- Parámetros delivery (zona, tarifa, mínimos, horario).
- Datos de empresa emisora y series de comprobante.
- Ubicación empresarial reutilizable para UI:
  - La ubicación principal mostrada en admin/web se gestiona desde `zona_delivery`.
  - Coordenadas: `latitud_centro`, `longitud_centro`.
  - Mapa embebido reutilizable: `mapa_embed_url` (src de iframe).
  - Regla actual: una zona principal activa usada como referencia de ubicación de la empresa.

### 6.6 Seguridad y auditoría
- Gestión de usuarios internos y roles.
- Auditoría obligatoria en operaciones críticas.
- Consulta de auditoría con filtros por entidad, acción y actor.

### 6.7 Gestión de contenido web (media)
- El administrador puede gestionar recursos globales de la web en `configuracion_media`.
- Recursos soportados: `IMAGEN`, `PDF`, `VIDEO`.
- Casos principales:
  - Banner/hero de inicio.
  - Recursos de sección Nosotros.
  - PDF de carta.
- Regla de separación:
  - `configuracion_media`: URLs de assets.
  - `empresa`: datos de emisor y datos corporativos (dirección/teléfono/correo) usados en footer.
- Cada cambio de media debe registrar trazabilidad (`usuario_actualizacion`, fecha y auditoría de acción crítica).

---

## 7) Matriz de estados (regla funcional base)
Estados:
- `CREADO`
- `PAGO_PENDIENTE`
- `PAGO_RECHAZADO`
- `PAGO_APROBADO`
- `CONFIRMADO`
- `EN_PREPARACION`
- `LISTO_RECOJO`
- `LISTO_DESPACHO`
- `EN_CAMINO`
- `ENTREGADO`
- `CANCELADO`
- `ANULADO`

Transiciones clave por rol:
- Cliente: `CREADO -> PAGO_PENDIENTE`, cancelaciones permitidas.
- Cocina: `CONFIRMADO -> EN_PREPARACION -> LISTO_* -> ENTREGADO`.
- Admin: confirmaciones administrativas, excepciones, anulaciones.

Toda transición:
1. Debe existir en tabla de transición permitida.
2. Debe registrar historial de estado.
3. Debe registrar actor y timestamp.

---

## 8) Reglas de comprobante (cabecera + detalle)

### 8.1 Cabecera
- Emisor: tabla `empresa`.
- Receptor: snapshot fiscal del cliente.
- Numeración: serie + correlativo por tipo.

### 8.2 Detalle
- `comprobante_detalle` conserva:
  - descripción del ítem
  - cantidad
  - precio unitario
  - descuento
  - subtotal por línea
- Debe generarse en el mismo flujo transaccional de emisión.

### 8.3 Integridad
- No emitir comprobante sin pedido válido.
- No emitir factura sin RUC10 válido y activo asociado al cliente.
- El total de comprobante debe cuadrar con el pedido confirmado.

---

## 9) Casos límite y validaciones críticas
1. Reintento de pago con mismo `idempotency_key` no debe duplicar cargo ni pedido.
2. Cambio de estado no permitido debe rechazar con error de negocio.
3. Inicio de preparación por usuario no cocina debe rechazarse.
4. Delivery fuera de cobertura debe bloquear checkout.
5. Serie/correlativo no disponible debe bloquear emisión de comprobante.
6. Acceso de cliente a pedido ajeno debe rechazarse.
7. Recuperación de contraseña debe validar código no expirado y no exceder intentos máximos permitidos.
8. El código de recuperación debe almacenarse en hash y compararse en servidor; no debe persistirse en texto plano.
9. Webhook de pagos repetido con mismo `idempotency_key` no debe duplicar transición ni comprobante.

---

## 11) Lógica de recuperación de contraseña (seguridad)
1. Cliente solicita recuperación con su correo registrado.
2. Sistema genera código temporal y guarda solo `codigo_hash` en BD.
3. Sistema envía el código al correo del cliente.
4. Cliente ingresa código + nueva contraseña.
5. Sistema valida hash del código, expiración e intentos.
6. Si valida, actualiza `password_hash` del usuario.
7. Sistema marca el código como `USADO` y bloquea su reutilización.

---

## 10) Checklist de implementación backend
1. Middleware de autorización por rol en cada endpoint.
2. Servicio de pricing en backend (fuente única de verdad).
3. Servicio de geocobertura para delivery por coordenadas.
4. Orquestación transaccional: pago aprobado -> pedido -> comprobante -> comprobante_detalle.
5. Servicio de estados con matriz de transición centralizada.
6. Trazabilidad obligatoria en eventos críticos.
7. Pruebas de concurrencia en pago/idempotencia.
8. Pruebas de regresión para estados de cocina.
