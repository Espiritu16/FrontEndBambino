# 📋 RFs Completos - Enfoque Cliente/Admin (con Flujo de Pago)

> Nota: Documento de requerimientos funcionales y reglas de negocio del sistema BambinoChicken.

## 🗂️ Índice
- [🎯 1) Objetivo](#1-objetivo)
- [👥 2) Actores](#2-actores)
- [🛒 3) Flujo funcional objetivo (Cliente)](#3-flujo-funcional-objetivo-cliente)
- [🧩 4) Requerimientos funcionales - Cliente](#4-requerimientos-funcionales---cliente)
- [🛠️ 5) Requerimientos funcionales - Administrador](#5-requerimientos-funcionales---administrador)
- [🍳 6) Requerimientos funcionales - Cocina](#6-requerimientos-funcionales---cocina-vista-operativa)
- [💬 7) Requerimientos funcionales - Chatbot Web](#7-requerimientos-funcionales---chatbot-web-consulta-simple)
- [📌 8) Reglas funcionales de negocio](#8-reglas-funcionales-de-negocio)
- [🔌 9) Requerimientos de integración](#9-requerimientos-de-integración-orientados-a-backend)
- [✅ 10) Requerimientos del sistema](#10-requerimientos-del-sistema-no-funcionales-y-técnicos)


## 1) Objetivo
Definir requerimientos funcionales completos para el backend de BambinoChicken con separación clara de dominios:
- Cliente: navegación de catálogo, carrito, checkout, pago y seguimiento de pedidos.
- Administrador: gestión del contenido comercial y administración del ciclo de pedidos.

## 2) Actores
- Cliente registrado
- Administrador
- Cocina
- Sistema de pagos (pasarela o módulo interno)
- Sistema de comprobantes (boleta/factura)

## 3) Flujo funcional objetivo (Cliente)
1. Cliente inicia sesión.
2. Cliente visualiza carta/catálogo y ofertas.
3. Cliente selecciona productos.
4. Cliente agrega productos al carrito.
5. Cliente selecciona modalidad de entrega: recojo o delivery.
6. Cliente revisa carrito y confirma checkout.
7. Cliente selecciona tipo de comprobante:
   - Boleta: usa automáticamente el DNI vigente del perfil del cliente.
   - Factura: usa automáticamente el RUC personal (RUC10) vigente del perfil del cliente.
8. Cliente selecciona método de pago y confirma.
9. Sistema autoriza pago.
10. Sistema crea pedido y comprobante.
11. Cliente consulta estado del pedido y su historial.

## 4) Requerimientos funcionales - Cliente

### RF-CL-01: Autenticación de cliente
El sistema debe permitir al Cliente autenticarse para acceder a funciones de carrito, pago y seguimiento de pedidos.

### RF-CL-02: Visualización de carta/catálogo
El sistema debe mostrar al Cliente productos activos con nombre, descripción, precio vigente, categoría, imagen y disponibilidad.

### RF-CL-03: Visualización de ofertas
El sistema debe mostrar al Cliente ofertas activas con condiciones, vigencia y productos aplicables.

### RF-CL-04: Búsqueda y filtros de catálogo
El sistema debe permitir buscar y filtrar productos por categoría, precio, disponibilidad y promociones.

### RF-CL-05: Agregar producto al carrito
El sistema debe permitir al Cliente agregar uno o más productos al carrito indicando cantidad y observaciones.

### RF-CL-06: Editar carrito
El sistema debe permitir modificar cantidades, quitar ítems y vaciar carrito antes de confirmar el checkout.

### RF-CL-07: Cálculo de totales
El sistema debe calcular subtotal, descuentos, impuestos aplicables, costo de entrega (si aplica) y total final en tiempo real.

### RF-CL-08: Selección de modalidad de entrega
El sistema debe permitir al Cliente seleccionar modalidad de entrega: recojo en tienda o delivery.

### RF-CL-09: Datos y validación para delivery
Si el Cliente selecciona delivery, el sistema debe solicitar dirección de entrega, referencia y datos de contacto, además de validar cobertura y estimar tiempo/costo de entrega.

### RF-CL-09A: Reglas operativas de delivery
El sistema debe validar horario de atención por zona, monto mínimo de compra para delivery y tarifa aplicable por distancia/zona antes de permitir confirmar checkout.

### RF-CL-09B: Selección de ubicación exacta en mapa
Si el Cliente selecciona delivery, el sistema debe permitir seleccionar el punto exacto de entrega en Google Maps (o proveedor equivalente), guardar latitud/longitud y autocompletar la dirección textual desde el punto seleccionado.

### RF-CL-09C: Validación geográfica de entrega
El sistema debe validar cobertura de delivery usando coordenadas del punto seleccionado (no solo texto libre), y bloquear checkout si el punto está fuera de zona.

### RF-CL-09D: Cobertura por zonas geográficas configurables
El sistema debe permitir validar cobertura por zonas activas de delivery usando `latitud_centro`, `longitud_centro` y `radio_km` por zona; si una zona no tiene centro/radio definido, podrá usar un centro/radio global de respaldo configurado.

### RF-CL-10: Confirmación de checkout
El sistema debe mostrar un resumen final del pedido y requerir confirmación explícita del Cliente antes del pago.

### RF-CL-11: Selección de comprobante
El sistema debe permitir al Cliente seleccionar tipo de comprobante: boleta o factura.

### RF-CL-12: Datos para boleta
Si el Cliente selecciona boleta, el sistema debe usar automáticamente el DNI vigente registrado en su perfil.

### RF-CL-12A: Validación de identidad para boleta
Si el DNI está vacío, incompleto o inválido, el sistema debe bloquear la emisión de boleta y solicitar corrección antes de continuar con el pago.

### RF-CL-13: Datos para factura
Si el Cliente selecciona factura, el sistema debe usar automáticamente el RUC personal (RUC10) vigente del perfil, sin solicitar razón social ni dirección fiscal.

### RF-CL-13A: Validación extendida de factura
El sistema debe validar que el RUC10 exista, esté activo y cumpla formato; opcionalmente puede validar contra servicio externo tributario cuando esté habilitado.

### RF-CL-14: Selección de método de pago
El sistema debe permitir seleccionar método de pago habilitado (tarjeta, Yape/Plin, transferencia u otros configurados).

### RF-CL-15: Procesamiento de pago
El sistema debe procesar la transacción y devolver resultado: aprobado, rechazado o pendiente.

### RF-CL-16: Creación de pedido postpago
Con pago aprobado, el sistema debe crear el pedido con identificador único, estado inicial y detalle consolidado.

### RF-CL-17: Emisión de comprobante
Con pago aprobado, el sistema debe generar y asociar el comprobante elegido (boleta/factura) al pedido.

### RF-CL-17A: Generación de detalle de comprobante
Al emitir comprobante, el sistema debe generar el detalle de comprobante como snapshot de ítems (cantidad, precio, descuento, subtotal) para trazabilidad fiscal.

### RF-CL-18: Notificación de resultado
El sistema debe notificar al Cliente el resultado del pago y creación de pedido, incluyendo código de pedido/comprobante.

### RF-CL-19: Consulta de estado de pedido
El sistema debe permitir al Cliente consultar estado actual e historial de cambios de sus pedidos.

### RF-CL-20: Historial de compras
El sistema debe permitir listar compras pasadas con detalle de ítems, montos, comprobante y estado.

### RF-CL-21: Cancelación de pedido por cliente
El sistema debe permitir cancelación por el Cliente solo en estados cancelables definidos por negocio.

### RF-CL-22: Restricción por titularidad
El sistema debe garantizar que el Cliente solo pueda consultar o operar sobre sus propios pedidos y comprobantes.

### RF-CL-23: Registro de cliente
El sistema debe permitir que una persona se registre como Cliente desde la web ingresando datos obligatorios (nombres, apellidos, correo, contraseña y documento principal), con validación de formato, unicidad de correo y creación de cuenta en estado activo.

### RF-CL-23A: Documento opcional en registro
Durante el registro, el sistema debe permitir registrar opcionalmente un segundo documento del cliente, validando que no esté repetido por combinación tipo+número.

### RF-CL-23B: Gestión de documentos en perfil
En el perfil del cliente, el sistema debe permitir agregar documentos adicionales y bloquear duplicados por combinación tipo+número en el mismo cliente.

### RF-CL-24: Recuperación de contraseña por correo
El sistema debe permitir recuperar contraseña mediante correo electrónico: solicitud de recuperación, envío de código temporal de verificación, validación de código y registro de nueva contraseña cumpliendo políticas de seguridad.

### RF-CL-24A: Seguridad del código de recuperación
El sistema debe almacenar el código de recuperación en formato hash (no en texto plano), validar el código ingresado contra el hash almacenado y evitar exposición del código real en persistencia.

### RF-CL-24B: Expiración e intentos de recuperación
El sistema debe controlar expiración temporal del código de recuperación y número máximo de intentos fallidos; al superar el límite o vencer el tiempo, el código debe quedar inválido.

## 5) Requerimientos funcionales - Administrador

### RF-AD-01: Alta de productos
El sistema debe permitir al Administrador registrar productos con atributos comerciales requeridos.

### RF-AD-02: Edición de productos
El sistema debe permitir modificar precio, descripción, categoría, imagen, disponibilidad y visibilidad web.

### RF-AD-03: Activación/inactivación de productos
El sistema debe permitir activar o inactivar productos preservando trazabilidad histórica.

### RF-AD-04: Gestión de ofertas
El sistema debe permitir crear, editar, activar, desactivar y programar vigencias de ofertas.

### RF-AD-05: Priorización/orden de carta
El sistema debe permitir ordenar productos/ofertas para su visualización en la web.

### RF-AD-06: Listado administrativo de pedidos
El sistema debe permitir ver pedidos con filtros por fecha, estado, cliente, tipo de comprobante y método de pago.

### RF-AD-07: Cambio de estado de pedido
El sistema debe permitir transicionar pedidos entre estados válidos (ejemplo: pendiente, confirmado, en preparación, enviado/listo, entregado, cancelado).

### RF-AD-08: Cancelación/anulación administrativa
El sistema debe permitir anular/cancelar pedidos con registro obligatorio de motivo.

### RF-AD-09: Gestión de incidencias de pago
El sistema debe permitir revisar pagos rechazados/pendientes y ejecutar acciones administrativas de regularización.

### RF-AD-10: Gestión de comprobantes
El sistema debe permitir consultar, reenviar, corregir datos permitidos y auditar boletas/facturas emitidas.

### RF-AD-11: Gestión de usuarios y roles administrativos
El sistema debe permitir crear, editar, inactivar usuarios administrativos y asignar roles/permisos.

### RF-AD-12: Auditoría administrativa
El sistema debe registrar acciones críticas sobre productos, ofertas, pedidos, pagos y comprobantes.

### RF-AD-12A: Consulta filtrada de auditoría
El sistema debe permitir al Administrador consultar auditoría por filtros de entidad, acción y tipo de actor.

### RF-AD-13: Configuración de reglas operativas
El sistema debe permitir al Administrador configurar matriz de estados del pedido, tiempos SLA operativos, políticas de cancelación y parámetros de delivery (cobertura, tarifa, monto mínimo).

### RF-AD-13A: Configuración geográfica de zonas delivery
El Administrador debe poder configurar para cada zona de delivery su centro geográfico (`latitud_centro`, `longitud_centro`) y radio de cobertura (`radio_km`) para validar despacho por proximidad real.

### RF-AD-13B: Configuración de mapa embebido reutilizable
El Administrador debe poder definir y mantener una URL de mapa embebido (`mapa_embed_url`) por zona principal de delivery para reutilizar la misma referencia visual en múltiples ventanas (panel admin, módulos web y futuras vistas operativas) sin duplicar configuración.

### RF-AD-14: Gestión de contenido multimedia web
El sistema debe permitir al Administrador crear, editar, activar e inactivar configuraciones de recursos multimedia globales (inicio, nosotros, carta PDF y otros), almacenando tipo, URL, clave única y trazabilidad.

## 6) Requerimientos funcionales - Cocina (Vista Operativa)

### RF-CO-01: Vista de pedidos en curso
El sistema debe permitir al Cocina visualizar pedidos en curso con estado, tiempo transcurrido, tipo de entrega (recojo/delivery) y canal de origen.

### RF-CO-01A: Bandeja operativa de cocina por estados
La vista de cocina debe listar pedidos en estados operativos (`CONFIRMADO`, `EN_PREPARACION`, `LISTO_RECOJO`, `LISTO_DESPACHO`) para priorizar atención en tiempo real.

### RF-CO-02: Filtros de atención
El sistema debe permitir al Cocina filtrar pedidos por estado, prioridad, mesa/zona (si aplica) y rango horario.

### RF-CO-03: Detalle operativo del pedido
El sistema debe permitir al Cocina ver detalle de ítems, observaciones del cliente, notas internas y comprobante asociado.

### RF-CO-04: Actualización de estado operativo
El sistema debe permitir al Cocina actualizar estados permitidos (por ejemplo: confirmado, en preparación, listo para recojo, entregado) según matriz de transición.

### RF-CO-05: Notas del pedido
El sistema debe permitir al Cocina registrar notas/incidencias operativas por pedido, con tipo de incidencia, detalle, usuario de cocina y fecha/hora.

### RF-CO-06: Alertas por demora
El sistema debe alertar visualmente pedidos con umbrales de tiempo excedidos para priorización.

### RF-CO-07: Confirmación de entrega
El sistema debe permitir al Cocina marcar pedido como entregado con fecha/hora y usuario responsable.

### RF-CO-08: Restricción por rol de cocina
El perfil Cocina no debe acceder a funciones administrativas de productos, ofertas, usuarios o configuración del sistema.

### RF-CO-09: Reasignación de pedidos
El sistema debe permitir reasignar pedidos entre usuarios de cocina autorizados, registrando usuario origen, usuario destino, motivo y fecha/hora de reasignación.

### RF-CO-10: Trazabilidad de preparación por usuario de cocina
El sistema debe registrar explícitamente qué usuario de cocina preparó cada pedido, junto con fecha/hora de inicio y finalización de preparación.

### RF-CO-11: Toma de pedido por cocina
El sistema debe permitir que un usuario de cocina “tome” un pedido antes de prepararlo, registrando la asignación en una bitácora de cocina con `id_pedido`, `id_usuario_cocina`, `fecha_asignacion` y motivo.

## 7) Requerimientos funcionales - Chatbot Web (Consulta Simple)

### RF-CB-01: Chatbot embebido en la web
El sistema debe ofrecer un chatbot interno en la web para navegación guiada de opciones y consultas frecuentes.

### RF-CB-02: Consulta de catálogo y ofertas
El chatbot debe permitir consultar carta/catálogo y ofertas vigentes.

### RF-CB-03: Consulta de estado de pedido
El chatbot debe permitir consultar estado de pedido por código y/o por historial del cliente autenticado.

### RF-CB-04: Sin flujo de compra completo por chatbot
El chatbot web no reemplaza el checkout transaccional principal; su objetivo es asistencia y consulta.

## 8) Reglas funcionales de negocio

### RF-RN-01: Separación por rol
Las funciones Cliente, Cocina y Admin deben exponerse en endpoints separados y protegidos por rol.

### RF-RN-02: Integridad del precio
El precio final del checkout debe recalcularse en servidor al confirmar pago, sin confiar en montos del frontend.

### RF-RN-03: Estado de pedido condicionado al pago
No se debe crear pedido confirmado si el pago no fue aprobado.

### RF-RN-04: Matriz de transición de estados
Todo cambio de estado de pedido debe respetar una matriz de transición válida.

### RF-RN-05: Boleta vs factura
- Boleta: usa automáticamente DNI vigente del perfil.
- Factura: usa automáticamente RUC10 vigente del perfil (sin razón social ni dirección fiscal).

### RF-RN-06: Trazabilidad obligatoria
Toda operación crítica debe guardar usuario, fecha/hora, operación y datos relevantes.

### RF-RN-06A: Metadata estandarizada de auditoría
Los eventos de auditoría deben guardar metadata en JSON consistente y, cuando no se envíe actor explícito, el backend debe resolverlo desde la sesión autenticada.

### RF-RN-07: Idempotencia de pago
El sistema debe evitar doble cobro o duplicación de pedido ante reintentos o callbacks repetidos.

### RF-RN-08: Consistencia carrito-pedido
Al confirmar compra, el carrito confirmado debe convertirse en snapshot inmutable del pedido.

### RF-RN-09: Unificación de canal digital
Los pedidos creados por web y acciones de consulta desde chatbot web deben seguir el mismo modelo de estados, validaciones y trazabilidad.

### RF-RN-10: Restricción de datos fiscales
No se debe emitir factura sin RUC10 válido, activo y asociado al cliente.

### RF-RN-11: Protección de recuperación de contraseña
Los códigos de recuperación de contraseña deben ser de un solo uso, con expiración y estado de ciclo de vida (`PENDIENTE`, `USADO`, `EXPIRADO`) para evitar reutilización.

### RF-RN-12: Trazabilidad operativa de cocina
Las transiciones de cocina deben actualizar trazabilidad operativa en `pedido`: al pasar a `EN_PREPARACION` debe registrarse `usuario_cocina_preparacion` y `fecha_inicio_preparacion`; al pasar a `LISTO_RECOJO` o `LISTO_DESPACHO` debe registrarse `fecha_fin_preparacion`.

### RF-RN-13: Separación de configuración operativa vs contenido
El sistema debe separar claramente:
- `configuracion_global` para reglas operativas (delivery, impuestos, tiempos).
- `configuracion_media` para assets de frontend (imágenes, PDF, video).
- `empresa` para datos corporativos del emisor y footer.

## 9) Requerimientos de integración (orientados a backend)

### RF-INT-01: Integración de pasarela de pago
El backend debe integrar un servicio de pago con endpoints para iniciar, confirmar y consultar transacciones.

### RF-INT-02: Webhook de confirmación
El backend debe recibir y validar notificaciones de pago para actualizar estado transaccional de forma segura.

### RF-INT-02A: Idempotencia de webhook
El webhook de pagos debe soportar reintentos del proveedor sin duplicar efectos de negocio.

### RF-INT-03: Generación de comprobantes
El backend debe generar comprobantes y asociarlos al pedido en la misma transacción lógica postpago.

### RF-INT-03A: Persistencia de detalle fiscal
El backend debe persistir detalle de comprobante en tabla dedicada de líneas fiscales al momento de emisión.

### RF-INT-04: Consulta de comprobantes por cliente
El backend debe exponer consulta segura de comprobantes para el titular de la compra.

### RF-INT-05: Integración de chatbot web
El backend debe exponer servicios de consulta para el chatbot embebido en la web (catálogo, ofertas, estado de pedido).

### RF-INT-08: Mesa de atención operativa
El backend debe exponer endpoints en tiempo real o de baja latencia para la vista de Cocina y monitoreo de pedidos.

### RF-INT-08A: Integración de geolocalización
El backend debe integrar servicios de mapas/geocodificación para: selección de punto, reverse geocoding, validación de cobertura y cálculo de distancia/ETA en delivery.

### RF-INT-09: Integración de notificaciones de estado
El backend debe emitir notificaciones de cambio de estado de pedido por canal web, incluyendo confirmación de entrega.

### RF-INT-10: Integración de correo para recuperación de contraseña
El backend debe integrar servicio de correo para envío de código temporal de recuperación de contraseña, con control de expiración, reintentos y trazabilidad del evento.

### RF-INT-11: Integración de almacenamiento de media
El backend debe integrar un proveedor de almacenamiento de archivos (por ejemplo Cloudinary) para subir y publicar URLs seguras de recursos usados por `configuracion_media`.

## 10) Requerimientos del sistema (no funcionales y técnicos)

### RF-SIS-01: Disponibilidad operativa
El sistema debe estar disponible en horario operativo definido, con tolerancia a fallos en componentes no críticos.

### RF-SIS-02: Rendimiento en consulta de pedidos
Las consultas de pedidos en curso (Admin/Cocina) deben responder en tiempos adecuados para operación en tiempo real.

### RF-SIS-03: Seguridad y control de acceso
El sistema debe aplicar autenticación robusta, autorización por rol y protección de endpoints críticos.

### RF-SIS-04: Protección de datos personales
El sistema debe proteger datos de cliente (DNI, RUC10, dirección, teléfono y demás datos sensibles) y registrar accesos sensibles.

### RF-SIS-05: Auditoría centralizada
El sistema debe centralizar logs de negocio, seguridad y auditoría de acciones por usuario/canal.

### RF-SIS-06: Resiliencia en pagos
El sistema debe manejar reintentos controlados, idempotencia y colas para eventos de pago.

### RF-SIS-07: Escalabilidad por canal
El sistema debe soportar crecimiento de pedidos y conversaciones concurrentes sin degradar operación.

### RF-SIS-08: Observabilidad
El sistema debe incluir métricas y alertas de pedidos, pagos, tiempos de atención y errores por canal.

### RF-SIS-09: Integridad transaccional
La creación de pedido, actualización de pago y emisión de comprobante deben conservar consistencia transaccional.

### RF-SIS-10: Trazabilidad extremo a extremo
Cada pedido debe poder rastrearse desde origen web, pago, atención de cocina y cierre.

### RF-SIS-11: Continuidad y recuperación
El sistema debe definir estrategia de respaldo, retención de evidencias (logs/auditoría) y procedimientos de recuperación ante fallas de pasarela de pagos.

### RF-SIS-12: Retención de auditoría
El sistema debe conservar historial de auditoría y trazas operativas por el periodo definido por política de negocio/cumplimiento.

## 11) Matriz base de estados de pedido (propuesta)

Estados sugeridos:
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

Transiciones sugeridas:
- `CREADO` -> `PAGO_PENDIENTE` | `CANCELADO`
- `PAGO_PENDIENTE` -> `PAGO_APROBADO` | `PAGO_RECHAZADO` | `CANCELADO`
- `PAGO_RECHAZADO` -> `PAGO_PENDIENTE` | `CANCELADO`
- `PAGO_APROBADO` -> `CONFIRMADO`
- `CONFIRMADO` -> `EN_PREPARACION` | `CANCELADO`
- `EN_PREPARACION` -> `LISTO_RECOJO` | `LISTO_DESPACHO` | `CANCELADO`
- `LISTO_RECOJO` -> `ENTREGADO`
- `LISTO_DESPACHO` -> `EN_CAMINO`
- `EN_CAMINO` -> `ENTREGADO`
- `ENTREGADO` -> (fin)
- `CANCELADO` -> (fin)
- `ANULADO` -> (fin)

Responsabilidad por rol (sugerida):
- Cliente: solicitar cancelación en estados cancelables.
- Cocina: `CONFIRMADO`, `EN_PREPARACION`, `LISTO_RECOJO`, `LISTO_DESPACHO`, `ENTREGADO` (según permisos).
- Admin: cambios excepcionales, anulaciones e incidencias.

## 12) Prioridad sugerida (MVP)
1. RF-RN-01, RF-RN-03, RF-RN-04, RF-RN-07, RF-RN-09
2. RF-CL-05 a RF-CL-18
3. RF-AD-06, RF-AD-07, RF-AD-08, RF-AD-09
4. RF-CO-01 a RF-CO-07
5. RF-CB-01 a RF-CB-03
6. RF-CL-02, RF-CL-03, RF-CL-04
7. RF-AD-01 a RF-AD-05
8. RF-AD-10, RF-AD-11, RF-AD-12, RF-CB-04

## 13) BPMN mínimos a derivar de estos RFs
1. BPMN Cliente - Compra completa (catálogo -> carrito -> checkout -> pago -> comprobante -> seguimiento)
2. BPMN Admin - Gestión de productos y ofertas web
3. BPMN Admin - Gestión de pedidos y pagos (estados, incidencias, cancelaciones)
4. BPMN Cocina - Atención y seguimiento de pedidos en curso
5. BPMN Chatbot Web - Flujo de consulta de catálogo/ofertas/estado
