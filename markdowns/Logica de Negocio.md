# ⚙️ Lógica del Sistema - BambinoChicken

> Documento funcional consolidado de lógica de negocio por rol, flujos transaccionales y reglas críticas.

## 🗂️ Índice
- [🎯 1) Objetivo](#1-objetivo)
- [📌 2) Principios transversales](#2-principios-transversales)
- [🔄 3) Flujo global resumido](#3-flujo-global-resumido)
- [👤 4) Lógica de negocio por rol: Cliente](#4-lógica-de-negocio-por-rol-cliente)
- [🍳 5) Lógica de negocio por rol: Cocina](#5-lógica-de-negocio-por-rol-cocina)
- [🛠️ 6) Lógica de negocio por rol: Administrador](#6-lógica-de-negocio-por-rol-administrador)
- [📊 7) Matriz de estados](#7-matriz-de-estados)
- [🧾 8) Reglas de comprobante](#8-reglas-de-comprobante)
- [✅ 9) Casos límite y validaciones críticas](#9-casos-límite-y-validaciones-críticas)
- [🔐 10) Seguridad: recuperación de contraseña](#10-seguridad-recuperación-de-contraseña)

## 1) Objetivo
Definir la lógica de negocio operativa y transaccional del sistema con separación por rol:
- Cliente
- Cocina
- Administrador
- Sistema (actor técnico para transiciones automáticas)

## 2) Principios transversales
1. Separación estricta por rol y permisos.
2. Validación en backend de reglas críticas (precio, cobertura, comprobante, estados, seguridad).
3. Trazabilidad de operaciones con historial y auditoría.
4. Idempotencia en pagos por `idempotencyKey`.
5. Consistencia entre checkout, pedido, pago y comprobante.

## 3) Flujo global resumido
1. Cliente navega catálogo y arma carrito.
2. Cliente valida checkout (entrega, dirección si delivery, comprobante).
3. Cliente confirma checkout (carrito pasa a `CONFIRMADO`).
4. Cliente crea pedido desde checkout (`CREADO`) y se copian ítems snapshot a `pedido_item`.
5. Cliente inicia pago con `idempotencyKey`.
6. Sistema/Admin confirma pago (`APROBADO` o `RECHAZADO`) y transiciona estado del pedido.
7. Con pago aprobado, se emite comprobante con detalle snapshot.
8. Cocina opera pedido según matriz de transiciones.

## 4) Lógica de negocio por rol: Cliente

### 4.1 Cuenta, acceso y perfil
- Registro con datos básicos y creación de cuenta activa.
- Inicio de sesión con credenciales válidas.
- Recuperación de contraseña con código temporal, expiración e intentos limitados.
- Gestión de perfil y direcciones activas para delivery.

### 4.2 Gestión de documentos del cliente
- En registro, el cliente define documento principal.
- En registro puede agregar un segundo documento opcional.
- En perfil puede agregar documentos adicionales.
- Regla obligatoria: no duplicar documentos por cliente con la misma combinación `doc_tipo + doc_numero`.

### 4.3 Catálogo, ofertas y carrito
- Solo se muestran productos operables para cliente.
- Al agregar/actualizar ítems, backend recalcula y guarda snapshot de precio/descuento.
- Regla de cantidad: `cantidad > 0`.
- El resumen de checkout usa snapshots persistidos.

### 4.4 Entrega
- `RECOJO`: no requiere dirección.
- `DELIVERY`:
  - Requiere dirección activa y coordenadas.
  - Valida cobertura por zonas activas y coordenadas.
  - Valida horario y monto mínimo aplicable.

### 4.5 Comprobante en checkout
- Cliente solo selecciona tipo de comprobante (`BOLETA` o `FACTURA`).
- `BOLETA`: backend usa automáticamente DNI vigente del perfil.
- `FACTURA`: backend usa automáticamente RUC personal (RUC10) vigente del perfil.
- No se solicita ingreso manual de DNI/RUC en checkout.
- Si el documento requerido no existe, es inválido o está inactivo, no se permite continuar al pago.

### 4.6 Pago
- Inicio de pago con `idempotencyKey` obligatorio.
- Si la clave existe para otro pedido: rechazo.
- Si la clave existe para el mismo pedido: se retorna pago existente.
- El monto debe coincidir con el total del pedido.

### 4.7 Consulta y cancelación
- Cliente consulta solo sus pedidos/comprobantes.
- Cancelación sujeta a matriz de transiciones permitidas.

## 5) Lógica de negocio por rol: Cocina

### 5.1 Bandeja operativa
Estados mínimos:
- `CONFIRMADO`
- `EN_PREPARACION`
- `LISTO_RECOJO`
- `LISTO_DESPACHO`

### 5.2 Asignación y toma
- Registrar asignación en `pedido_asignacion_cocina` con usuario y motivo.

### 5.3 Cambios de estado
- Toda transición debe existir en `pedido_estado_transicion_permitida`.
- Registrar historial con actor, motivo y fecha.

### 5.4 Incidencias
- Registrar incidencias por pedido en `pedido_cocina_incidencia`.

## 6) Lógica de negocio por rol: Administrador

### 6.1 Gestión comercial
- Gestiona productos, categorías, visibilidad, disponibilidad y ofertas.

### 6.2 Gestión de pedidos
- Consulta integral por filtros.
- Cambios de estado permitidos por matriz y actor.

### 6.3 Gestión de pagos
- Confirmación de pagos (`APROBADO`/`RECHAZADO`) por endpoint admin.
- Webhook público también confirma pago con idempotencia.

### 6.4 Gestión de comprobantes
- Consulta comprobantes emitidos.
- Emisión condicionada a pago aprobado.
- Serie/correlativo se incrementa al emitir.

### 6.5 Configuración operativa
- Delivery por zona (centro, radio, tarifa, horario, mínimo, mapa).
- Empresa emisora, series de comprobante y transiciones permitidas.

### 6.6 Seguridad y auditoría
- Gestión de usuarios/roles internos.
- Auditoría obligatoria en eventos críticos.

## 7) Matriz de estados
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

Actores válidos:
- `CLIENTE`
- `COCINA`
- `ADMIN`
- `SISTEMA`

Reglas:
1. La transición debe existir en tabla de transiciones permitidas para el actor.
2. Debe registrarse historial de estado.
3. Para pagos automáticos se usa actor `SISTEMA`.

## 8) Reglas de comprobante

### 8.1 Cabecera
- Emisor: empresa activa.
- Tipo: según selección del cliente (`BOLETA`/`FACTURA`).
- Serie: serie activa por empresa y tipo.
- Correlativo: incremento secuencial.

### 8.2 Detalle
`comprobante_detalle` conserva snapshot de `pedido_item`:
- descripción
- cantidad
- precio unitario
- descuento unitario
- subtotal por línea

### 8.3 Integridad
- No emitir comprobante sin pedido válido.
- No emitir comprobante sin ítems de pedido.
- Emisión idempotente por pedido (`emitirSiNoExiste`).
- No emitir factura sin RUC10 válido y activo asociado al cliente.

## 9) Casos límite y validaciones críticas
1. `idempotencyKey` repetida con otro pedido: rechazar.
2. `idempotencyKey` repetida con mismo pedido: devolver pago existente.
3. Monto de pago distinto al total del pedido: rechazar.
4. Delivery sin coordenadas: rechazar.
5. Zona activa sin centro/radio válido: rechazar cobertura.
6. Cambio de estado sin transición permitida por actor: rechazar.
7. Acceso de cliente a pedido/comprobante ajeno: rechazar.
8. Comprobante sin serie activa o sin ítems: rechazar.

## 10) Seguridad: recuperación de contraseña
1. Cliente solicita recuperación con correo.
2. Si existe cuenta activa, se expiran códigos pendientes previos.
3. Se genera código temporal y se persiste `codigo_hash`.
4. Se envía código por correo.
5. Se valida hash, expiración e intentos máximos.
6. Si valida, se actualiza contraseña y el código queda `USADO`.
