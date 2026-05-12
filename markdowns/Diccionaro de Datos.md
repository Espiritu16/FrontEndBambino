# Diccionario de Datos - BambinoChicken

> Nota: Inventario técnico de tablas y relaciones actuales en MySQL.
> Regla funcional asociada: para cliente_documento, no se deben permitir duplicados por cliente con la misma combinación tipo+número.

## 🗂️ Índice
- [📌 Convenciones](#convenciones)
- [🧾 Tabla `auditoria_evento`](#tabla-auditoria_evento)
- [🧾 Tabla `carrito`](#tabla-carrito)
- [🧾 Tabla `carrito_item`](#tabla-carrito_item)
- [🧾 Tabla `categoria_producto`](#tabla-categoria_producto)
- [🧾 Tabla `cliente_direccion`](#tabla-cliente_direccion)
- [🧾 Tabla `cliente_perfil`](#tabla-cliente_perfil)
- [🧾 Tabla `cliente_documento`](#tabla-cliente_documento)
- [🧾 Tabla `comprobante`](#tabla-comprobante)
- [🧾 Tabla `comprobante_detalle`](#tabla-comprobante_detalle)
- [🧾 Tabla `configuracion_global`](#tabla-configuracion_global)
- [🧾 Tabla `configuracion_media` (nueva aprobada para assets web)](#tabla-configuracion_media-nueva-aprobada-para-assets-web)
- [🧾 Tabla `empresa`](#tabla-empresa)
- [🧾 Tabla `libro_reclamaciones`](#tabla-libro_reclamaciones)
- [🧾 Tabla `oferta`](#tabla-oferta)
- [🧾 Tabla `oferta_producto`](#tabla-oferta_producto)
- [🧾 Tabla `pago`](#tabla-pago)
- [🧾 Tabla `pedido`](#tabla-pedido)
- [🧾 Tabla `pedido_asignacion_cocina`](#tabla-pedido_asignacion_cocina)
- [🧾 Tabla `pedido_cocina_incidencia`](#tabla-pedido_cocina_incidencia)
- [🧾 Tabla `pedido_estado_historial`](#tabla-pedido_estado_historial)
- [🧾 Tabla `pedido_estado_transicion_permitida`](#tabla-pedido_estado_transicion_permitida)
- [🧾 Tabla `pedido_item`](#tabla-pedido_item)
- [🧾 Tabla `producto`](#tabla-producto)
- [🧾 Tabla `recuperacion_password_codigo`](#tabla-recuperacion_password_codigo)
- [🧾 Tabla `rol`](#tabla-rol)
- [🧾 Tabla `serie_comprobante`](#tabla-serie_comprobante)
- [🧾 Tabla `usuario`](#tabla-usuario)
- [🧾 Tabla `zona_delivery`](#tabla-zona_delivery)

Base consultada directamente: `bambino_db` (MySQL).
Este diccionario refleja el estado actual de tablas, columnas y relaciones en la base real.
## Convenciones
- `PK`: clave primaria
- `FK`: clave foránea
- `UNI`: índice único
- `NULL`: permite nulos

## Tabla `auditoria_evento`
Propósito: Bitácora de eventos de negocio y seguridad.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_evento` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `entidad` | `varchar(80)` | NO | `` | `NULL` | `` |
| `entidad_id` | `varchar(80)` | NO | `` | `NULL` | `` |
| `accion` | `varchar(80)` | NO | `` | `NULL` | `` |
| `actor_tipo` | `enum('CLIENTE','COCINA','ADMIN')` | SI | `` | `NULL` | `` |
| `id_actor` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `canal` | `enum('WEB','CHATBOT_WEB')` | SI | `` | `NULL` | `` |
| `metadata_json` | `json` | SI | `` | `NULL` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |

Relaciones FK:
- `fk_aud_actor`: `auditoria_evento.id_actor` -> `usuario.id_usuario`

## Tabla `carrito`
Propósito: Carrito activo/confirmado del cliente.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_carrito` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `id_cliente` | `bigint unsigned` | NO | `MUL` | `NULL` | `` |
| `estado` | `enum('ABIERTO','CONFIRMADO','ABANDONADO','CONVERTIDO')` | NO | `` | `ABIERTO` | `` |
| `canal` | `enum('WEB','CHATBOT_WEB')` | NO | `` | `WEB` | `` |
| `usuario_creacion` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `usuario_actualizacion` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `fecha_actualizacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED on update CURRENT_TIMESTAMP` |

Relaciones FK:
- `fk_carrito_cliente`: `carrito.id_cliente` -> `cliente_perfil.id_cliente`
- `fk_carrito_usuario_actualizacion`: `carrito.usuario_actualizacion` -> `usuario.id_usuario`
- `fk_carrito_usuario_creacion`: `carrito.usuario_creacion` -> `usuario.id_usuario`

## Tabla `carrito_item`
Propósito: Ítems del carrito con snapshot de precio/descuento.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_carrito_item` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `id_carrito` | `bigint unsigned` | NO | `MUL` | `NULL` | `` |
| `id_producto` | `bigint unsigned` | NO | `MUL` | `NULL` | `` |
| `cantidad` | `decimal(10,3)` | NO | `` | `NULL` | `` |
| `precio_unitario_snapshot` | `decimal(10,2)` | NO | `` | `NULL` | `` |
| `descuento_unitario_snapshot` | `decimal(10,2)` | NO | `` | `0.00` | `` |
| `observacion` | `varchar(220)` | SI | `` | `NULL` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `fecha_actualizacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED on update CURRENT_TIMESTAMP` |

Relaciones FK:
- `fk_carrito_item_carrito`: `carrito_item.id_carrito` -> `carrito.id_carrito`
- `fk_carrito_item_producto`: `carrito_item.id_producto` -> `producto.id_producto`

## Tabla `categoria_producto`
Propósito: Categorías de productos para catálogo web.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_categoria` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `nombre` | `varchar(120)` | NO | `UNI` | `NULL` | `` |
| `descripcion` | `varchar(220)` | SI | `` | `NULL` | `` |
| `orden_visual` | `int` | NO | `` | `0` | `` |
| `activa` | `tinyint(1)` | NO | `` | `1` | `` |
| `usuario_creacion` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `usuario_actualizacion` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `fecha_actualizacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED on update CURRENT_TIMESTAMP` |

Relaciones FK:
- `fk_categoria_usuario_actualizacion`: `categoria_producto.usuario_actualizacion` -> `usuario.id_usuario`
- `fk_categoria_usuario_creacion`: `categoria_producto.usuario_creacion` -> `usuario.id_usuario`

## Tabla `cliente_direccion`
Propósito: Direcciones del cliente con geodatos para delivery.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_direccion` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `id_cliente` | `bigint unsigned` | NO | `MUL` | `NULL` | `` |
| `direccion_linea1` | `varchar(220)` | NO | `` | `NULL` | `` |
| `referencia` | `varchar(220)` | SI | `` | `NULL` | `` |
| `distrito` | `varchar(120)` | SI | `` | `NULL` | `` |
| `ciudad` | `varchar(120)` | SI | `` | `NULL` | `` |
| `latitud` | `decimal(10,7)` | SI | `MUL` | `NULL` | `` |
| `longitud` | `decimal(10,7)` | SI | `` | `NULL` | `` |
| `google_place_id` | `varchar(120)` | SI | `` | `NULL` | `` |
| `google_plus_code` | `varchar(40)` | SI | `` | `NULL` | `` |
| `es_principal` | `tinyint(1)` | NO | `` | `0` | `` |
| `activo` | `tinyint(1)` | NO | `` | `1` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `fecha_actualizacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED on update CURRENT_TIMESTAMP` |

Relaciones FK:
- `fk_direccion_cliente`: `cliente_direccion.id_cliente` -> `cliente_perfil.id_cliente`

## Tabla `cliente_perfil`
Propósito: Perfil comercial/fiscal del cliente.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_cliente` | `bigint unsigned` | NO | `PRI` | `NULL` | `` |
| `doc_tipo` | `enum('DNI','RUC','CE','OTRO')` | NO | `` | `DNI` | `` |
| `doc_numero` | `varchar(20)` | SI | `` | `NULL` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `fecha_actualizacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED on update CURRENT_TIMESTAMP` |

Relaciones FK:
- `fk_cliente_usuario`: `cliente_perfil.id_cliente` -> `usuario.id_usuario`

## Tabla `cliente_documento`
Propósito: Documentos del cliente (múltiples por cliente, con principal).
> Regla funcional: no repetir documentos por cliente con la misma combinación `doc_tipo + doc_numero` (validación de negocio en backend).
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_documento` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `id_cliente` | `bigint unsigned` | NO | `MUL` | `NULL` | `` |
| `doc_tipo` | `enum('DNI','RUC','CE')` | NO | `` | `NULL` | `` |
| `doc_numero` | `varchar(20)` | NO | `` | `NULL` | `` |
| `es_principal` | `tinyint(1)` | NO | `` | `0` | `` |
| `activo` | `tinyint(1)` | NO | `` | `1` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `fecha_actualizacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED on update CURRENT_TIMESTAMP` |

Relaciones FK:
- `fk_cliente_documento_cliente`: `cliente_documento.id_cliente` -> `cliente_perfil.id_cliente` (ON DELETE CASCADE)

## Tabla `comprobante`
Propósito: Cabecera de boleta/factura emitida por pedido.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_comprobante` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `id_empresa` | `bigint unsigned` | NO | `MUL` | `NULL` | `` |
| `id_pedido` | `bigint unsigned` | NO | `UNI` | `NULL` | `` |
| `tipo` | `enum('BOLETA','FACTURA')` | NO | `` | `NULL` | `` |
| `serie` | `varchar(10)` | NO | `` | `NULL` | `` |
| `correlativo` | `bigint unsigned` | NO | `` | `NULL` | `` |
| `numero_completo` | `varchar(30)` | NO | `UNI` | `NULL` | `` |
| `estado` | `enum('EMITIDO','ANULADO','OBSERVADO')` | NO | `` | `EMITIDO` | `` |
| `doc_receptor_tipo` | `enum('DNI','RUC','CE','OTRO')` | SI | `` | `NULL` | `` |
| `doc_receptor_numero` | `varchar(20)` | SI | `` | `NULL` | `` |
| `razon_social_receptor` | `varchar(200)` | SI | `` | `NULL` | `` |
| `direccion_fiscal_receptor` | `varchar(300)` | SI | `` | `NULL` | `` |
| `subtotal` | `decimal(12,2)` | NO | `` | `NULL` | `` |
| `impuesto_total` | `decimal(12,2)` | NO | `` | `NULL` | `` |
| `total` | `decimal(12,2)` | NO | `` | `NULL` | `` |
| `fecha_emision` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `usuario_creacion` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `usuario_actualizacion` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |

Relaciones FK:
- `fk_comprobante_empresa`: `comprobante.id_empresa` -> `empresa.id_empresa`
- `fk_comprobante_pedido`: `comprobante.id_pedido` -> `pedido.id_pedido`
- `fk_comprobante_usuario_actualizacion`: `comprobante.usuario_actualizacion` -> `usuario.id_usuario`
- `fk_comprobante_usuario_creacion`: `comprobante.usuario_creacion` -> `usuario.id_usuario`

## Tabla `comprobante_detalle`
Propósito: Detalle fiscal por línea del comprobante.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_comprobante_detalle` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `id_comprobante` | `bigint unsigned` | NO | `MUL` | `NULL` | `` |
| `id_pedido_item` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `descripcion_item` | `varchar(220)` | NO | `` | `NULL` | `` |
| `cantidad` | `decimal(10,3)` | NO | `` | `NULL` | `` |
| `precio_unitario` | `decimal(10,2)` | NO | `` | `NULL` | `` |
| `descuento_unitario` | `decimal(10,2)` | NO | `` | `0.00` | `` |
| `subtotal_linea` | `decimal(12,2)` | NO | `` | `NULL` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |

Relaciones FK:
- `fk_comp_det_comprobante`: `comprobante_detalle.id_comprobante` -> `comprobante.id_comprobante`
- `fk_comp_det_pedido_item`: `comprobante_detalle.id_pedido_item` -> `pedido_item.id_pedido_item`

## Tabla `configuracion_global`
Propósito: Parámetros globales (impuesto, delivery, zona horaria).
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_config` | `tinyint unsigned` | NO | `PRI` | `NULL` | `` |
| `moneda` | `varchar(10)` | NO | `` | `PEN` | `` |
| `igv_porcentaje` | `decimal(5,2)` | NO | `` | `18.00` | `` |
| `delivery_monto_minimo` | `decimal(10,2)` | NO | `` | `0.00` | `` |
| `delivery_tiempo_min_minutos` | `int` | NO | `` | `20` | `` |
| `delivery_tiempo_max_minutos` | `int` | NO | `` | `60` | `` |
| `timezone` | `varchar(60)` | NO | `` | `America/Lima` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `fecha_actualizacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED on update CURRENT_TIMESTAMP` |

## Tabla `configuracion_media` (nueva aprobada para assets web)
Propósito: Configuración centralizada de recursos multimedia de la web (inicio, nosotros, carta PDF, etc.).
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_media` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `clave` | `varchar(80)` | NO | `UNI` | `NULL` | `` |
| `nombre` | `varchar(160)` | NO | `` | `NULL` | `` |
| `descripcion` | `varchar(220)` | SI | `` | `NULL` | `` |
| `tipo` | `enum('IMAGEN','PDF','VIDEO')` | NO | `` | `IMAGEN` | `` |
| `url` | `text` | NO | `` | `NULL` | `` |
| `public_id` | `varchar(220)` | SI | `` | `NULL` | `` |
| `version_tag` | `varchar(120)` | SI | `` | `NULL` | `` |
| `activa` | `tinyint(1)` | NO | `` | `1` | `` |
| `usuario_creacion` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `usuario_actualizacion` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `fecha_actualizacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED on update CURRENT_TIMESTAMP` |

Relaciones FK:
- `fk_config_media_usuario_creacion`: `configuracion_media.usuario_creacion` -> `usuario.id_usuario`
- `fk_config_media_usuario_actualizacion`: `configuracion_media.usuario_actualizacion` -> `usuario.id_usuario`

Notas de uso:
- `configuracion_global` conserva parámetros operativos (delivery, IGV, moneda).
- `configuracion_media` concentra recursos visuales/documentales de frontend.
- Datos de footer corporativo (dirección fiscal, teléfono, correo) se mantienen en `empresa`.

## Tabla `empresa`
Propósito: Datos del emisor de comprobantes.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_empresa` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `ruc` | `varchar(20)` | NO | `UNI` | `NULL` | `` |
| `razon_social` | `varchar(220)` | NO | `` | `NULL` | `` |
| `nombre_comercial` | `varchar(220)` | SI | `` | `NULL` | `` |
| `direccion_fiscal` | `varchar(300)` | NO | `` | `NULL` | `` |
| `telefono` | `varchar(30)` | SI | `` | `NULL` | `` |
| `correo` | `varchar(190)` | SI | `` | `NULL` | `` |
| `activo` | `tinyint(1)` | NO | `` | `1` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `fecha_actualizacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED on update CURRENT_TIMESTAMP` |

## Tabla `libro_reclamaciones`
Propósito: Registro formal de reclamos/quejas del consumidor.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_reclamo` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `numero_reclamo` | `varchar(40)` | NO | `UNI` | `NULL` | `` |
| `id_empresa` | `bigint unsigned` | NO | `MUL` | `NULL` | `` |
| `id_cliente` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `id_pedido` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `codigo_pedido` | `varchar(40)` | SI | `` | `NULL` | `` |
| `tipo_registro` | `enum('RECLAMO','QUEJA')` | NO | `` | `NULL` | `` |
| `consumidor_nombres` | `varchar(120)` | NO | `` | `NULL` | `` |
| `consumidor_apellidos` | `varchar(120)` | NO | `` | `NULL` | `` |
| `doc_tipo` | `enum('DNI','RUC','CE','OTRO')` | NO | `` | `NULL` | `` |
| `doc_numero` | `varchar(20)` | NO | `` | `NULL` | `` |
| `correo` | `varchar(190)` | NO | `` | `NULL` | `` |
| `telefono` | `varchar(20)` | SI | `` | `NULL` | `` |
| `direccion_consumidor` | `varchar(300)` | SI | `` | `NULL` | `` |
| `fecha_consumo` | `datetime` | SI | `` | `NULL` | `` |
| `monto_reclamado` | `decimal(10,2)` | SI | `` | `NULL` | `` |
| `detalle_hechos` | `text` | NO | `` | `NULL` | `` |
| `pedido_consumidor` | `text` | NO | `` | `NULL` | `` |
| `estado` | `varchar(20)` | NO | `` | `NULL` | `` |
| `fecha_registro` | `datetime` | NO | `MUL` | `NULL` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `fecha_actualizacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED on update CURRENT_TIMESTAMP` |

Relaciones FK:
- `fk_libro_reclamaciones_empresa`: `libro_reclamaciones.id_empresa` -> `empresa.id_empresa`
- `fk_libro_reclamaciones_cliente`: `libro_reclamaciones.id_cliente` -> `cliente_perfil.id_cliente`
- `fk_libro_reclamaciones_pedido`: `libro_reclamaciones.id_pedido` -> `pedido.id_pedido`


## Tabla `oferta`
Propósito: Definición de ofertas/promociones.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_oferta` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `nombre` | `varchar(180)` | NO | `` | `NULL` | `` |
| `tipo` | `enum('PORCENTAJE','MONTO_FIJO','PRECIO_ESPECIAL','COMBO')` | NO | `` | `NULL` | `` |
| `valor_descuento` | `decimal(10,2)` | SI | `` | `NULL` | `` |
| `precio_especial` | `decimal(10,2)` | SI | `` | `NULL` | `` |
| `estado` | `enum('BORRADOR','PROGRAMADA','ACTIVA','INACTIVA','EXPIRADA')` | NO | `` | `BORRADOR` | `` |
| `fecha_inicio` | `datetime` | SI | `` | `NULL` | `` |
| `fecha_fin` | `datetime` | SI | `` | `NULL` | `` |
| `usuario_creacion` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `usuario_actualizacion` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `fecha_actualizacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED on update CURRENT_TIMESTAMP` |

Relaciones FK:
- `fk_oferta_usuario_actualizacion`: `oferta.usuario_actualizacion` -> `usuario.id_usuario`
- `fk_oferta_usuario_creacion`: `oferta.usuario_creacion` -> `usuario.id_usuario`

## Tabla `oferta_producto`
Propósito: Relación N:N entre ofertas y productos.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_oferta_producto` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `id_oferta` | `bigint unsigned` | NO | `MUL` | `NULL` | `` |
| `id_producto` | `bigint unsigned` | NO | `MUL` | `NULL` | `` |

Relaciones FK:
- `fk_oferta_producto_oferta`: `oferta_producto.id_oferta` -> `oferta.id_oferta`
- `fk_oferta_producto_producto`: `oferta_producto.id_producto` -> `producto.id_producto`

## Tabla `pago`
Propósito: Registro transaccional de pago e idempotencia.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_pago` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `id_pedido` | `bigint unsigned` | NO | `MUL` | `NULL` | `` |
| `metodo` | `enum('TARJETA','YAPE','PLIN','TRANSFERENCIA','EFECTIVO','OTRO')` | NO | `` | `NULL` | `` |
| `estado` | `enum('INICIADO','PENDIENTE','APROBADO','RECHAZADO','ANULADO','EXPIRADO')` | NO | `` | `INICIADO` | `` |
| `monto` | `decimal(12,2)` | NO | `` | `NULL` | `` |
| `proveedor` | `varchar(80)` | SI | `` | `NULL` | `` |
| `proveedor_txn_id` | `varchar(120)` | SI | `` | `NULL` | `` |
| `idempotency_key` | `char(36)` | NO | `UNI` | `NULL` | `` |
| `url_pago` | `text` | SI | `` | `NULL` | `` |
| `usuario_creacion` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `usuario_actualizacion` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `fecha_actualizacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED on update CURRENT_TIMESTAMP` |

Relaciones FK:
- `fk_pago_pedido`: `pago.id_pedido` -> `pedido.id_pedido`
- `fk_pago_usuario_actualizacion`: `pago.usuario_actualizacion` -> `usuario.id_usuario`
- `fk_pago_usuario_creacion`: `pago.usuario_creacion` -> `usuario.id_usuario`

## Tabla `pedido`
Propósito: Cabecera del pedido y trazabilidad operativa.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_pedido` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `codigo_pedido` | `varchar(40)` | NO | `UNI` | `NULL` | `` |
| `id_cliente` | `bigint unsigned` | NO | `MUL` | `NULL` | `` |
| `canal_origen` | `enum('WEB','CHATBOT_WEB')` | NO | `` | `NULL` | `` |
| `modalidad` | `enum('RECOJO','DELIVERY')` | NO | `` | `NULL` | `` |
| `estado_actual` | `enum('CREADO','PAGO_PENDIENTE','PAGO_RECHAZADO','PAGO_APROBADO','CONFIRMADO','EN_PREPARACION','LISTO_RECOJO','LISTO_DESPACHO','EN_CAMINO','ENTREGADO','CANCELADO','ANULADO')` | NO | `MUL` | `NULL` | `` |
| `tipo_comprobante` | `enum('BOLETA','FACTURA')` | NO | `` | `NULL` | `` |
| `id_direccion_entrega` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `latitud_entrega_snapshot` | `decimal(10,7)` | SI | `` | `NULL` | `` |
| `longitud_entrega_snapshot` | `decimal(10,7)` | SI | `` | `NULL` | `` |
| `google_place_id_entrega_snapshot` | `varchar(120)` | SI | `` | `NULL` | `` |
| `direccion_formateada_snapshot` | `varchar(300)` | SI | `` | `NULL` | `` |
| `costo_delivery` | `decimal(10,2)` | NO | `` | `0.00` | `` |
| `cliente_doc_tipo_snapshot` | `enum('DNI','RUC','CE','OTRO')` | SI | `` | `NULL` | `` |
| `cliente_doc_numero_snapshot` | `varchar(20)` | SI | `` | `NULL` | `` |
| `razon_social_snapshot` | `varchar(200)` | SI | `` | `NULL` | `` |
| `direccion_fiscal_snapshot` | `varchar(300)` | SI | `` | `NULL` | `` |
| `subtotal` | `decimal(12,2)` | NO | `` | `NULL` | `` |
| `descuento_total` | `decimal(12,2)` | NO | `` | `0.00` | `` |
| `impuesto_total` | `decimal(12,2)` | NO | `` | `0.00` | `` |
| `total` | `decimal(12,2)` | NO | `` | `NULL` | `` |
| `usuario_cocina_preparacion` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `fecha_inicio_preparacion` | `datetime` | SI | `` | `NULL` | `` |
| `fecha_fin_preparacion` | `datetime` | SI | `` | `NULL` | `` |
| `usuario_creacion` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `usuario_actualizacion` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `fecha_actualizacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED on update CURRENT_TIMESTAMP` |

Relaciones FK:
- `fk_pedido_cliente`: `pedido.id_cliente` -> `cliente_perfil.id_cliente`
- `fk_pedido_direccion`: `pedido.id_direccion_entrega` -> `cliente_direccion.id_direccion`
- `fk_pedido_usuario_actualizacion`: `pedido.usuario_actualizacion` -> `usuario.id_usuario`
- `fk_pedido_usuario_cocina_preparacion`: `pedido.usuario_cocina_preparacion` -> `usuario.id_usuario`
- `fk_pedido_usuario_creacion`: `pedido.usuario_creacion` -> `usuario.id_usuario`

## Tabla `pedido_asignacion_cocina`
Propósito: Historial de toma/asignación de pedido en cocina.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_asignacion` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `id_pedido` | `bigint unsigned` | NO | `MUL` | `NULL` | `` |
| `id_cocina_actual` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `id_cocina_anterior` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `motivo_reasignacion` | `varchar(220)` | SI | `` | `NULL` | `` |
| `usuario_creacion` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `id_usuario_cocina` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `fecha_asignacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `motivo` | `varchar(255)` | SI | `` | `NULL` | `` |

Relaciones FK:
- `fk_asig_cocina_actual`: `pedido_asignacion_cocina.id_cocina_actual` -> `usuario.id_usuario`
- `fk_asig_cocina_anterior`: `pedido_asignacion_cocina.id_cocina_anterior` -> `usuario.id_usuario`
- `fk_asig_pedido`: `pedido_asignacion_cocina.id_pedido` -> `pedido.id_pedido`
- `fk_asig_usuario_creacion`: `pedido_asignacion_cocina.usuario_creacion` -> `usuario.id_usuario`
- `fk_asignacion_usuario_cocina`: `pedido_asignacion_cocina.id_usuario_cocina` -> `usuario.id_usuario`

## Tabla `pedido_cocina_incidencia`
Propósito: Registro de incidencias/notas operativas de cocina por pedido.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_incidencia` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `id_pedido` | `bigint unsigned` | NO | `MUL` | `NULL` | `` |
| `id_usuario_cocina` | `bigint unsigned` | NO | `MUL` | `NULL` | `` |
| `tipo_incidencia` | `varchar(40)` | NO | `` | `NULL` | `` |
| `detalle` | `varchar(255)` | NO | `` | `NULL` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |

Relaciones FK:
- `fk_cocina_incidencia_pedido`: `pedido_cocina_incidencia.id_pedido` -> `pedido.id_pedido` (ON DELETE CASCADE)
- `fk_cocina_incidencia_usuario`: `pedido_cocina_incidencia.id_usuario_cocina` -> `usuario.id_usuario`

## Tabla `pedido_estado_historial`
Propósito: Historial de cambios de estado del pedido.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_historial` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `id_pedido` | `bigint unsigned` | NO | `MUL` | `NULL` | `` |
| `estado_anterior` | `enum('CREADO','PAGO_PENDIENTE','PAGO_RECHAZADO','PAGO_APROBADO','CONFIRMADO','EN_PREPARACION','LISTO_RECOJO','LISTO_DESPACHO','EN_CAMINO','ENTREGADO','CANCELADO','ANULADO')` | SI | `` | `NULL` | `` |
| `estado_nuevo` | `enum('CREADO','PAGO_PENDIENTE','PAGO_RECHAZADO','PAGO_APROBADO','CONFIRMADO','EN_PREPARACION','LISTO_RECOJO','LISTO_DESPACHO','EN_CAMINO','ENTREGADO','CANCELADO','ANULADO')` | NO | `` | `NULL` | `` |
| `actor_tipo` | `enum('CLIENTE','COCINA','ADMIN')` | SI | `` | `NULL` | `` |
| `id_actor` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `canal` | `enum('WEB','CHATBOT_WEB')` | SI | `` | `NULL` | `` |
| `motivo` | `varchar(240)` | SI | `` | `NULL` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |

Relaciones FK:
- `fk_hist_actor`: `pedido_estado_historial.id_actor` -> `usuario.id_usuario`
- `fk_hist_pedido`: `pedido_estado_historial.id_pedido` -> `pedido.id_pedido`

## Tabla `pedido_estado_transicion_permitida`
Propósito: Matriz de transiciones permitidas por actor.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_transicion` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `estado_origen` | `enum('CREADO','PAGO_PENDIENTE','PAGO_RECHAZADO','PAGO_APROBADO','CONFIRMADO','EN_PREPARACION','LISTO_RECOJO','LISTO_DESPACHO','EN_CAMINO','ENTREGADO','CANCELADO','ANULADO')` | NO | `MUL` | `NULL` | `` |
| `estado_destino` | `enum('CREADO','PAGO_PENDIENTE','PAGO_RECHAZADO','PAGO_APROBADO','CONFIRMADO','EN_PREPARACION','LISTO_RECOJO','LISTO_DESPACHO','EN_CAMINO','ENTREGADO','CANCELADO','ANULADO')` | NO | `` | `NULL` | `` |
| `rol_habilitado` | `enum('CLIENTE','COCINA','ADMIN')` | NO | `` | `NULL` | `` |
| `activa` | `tinyint(1)` | NO | `` | `1` | `` |

## Tabla `pedido_item`
Propósito: Detalle del pedido (snapshot de productos).
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_pedido_item` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `id_pedido` | `bigint unsigned` | NO | `MUL` | `NULL` | `` |
| `id_producto` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `nombre_producto_snapshot` | `varchar(180)` | NO | `` | `NULL` | `` |
| `cantidad` | `decimal(10,3)` | NO | `` | `NULL` | `` |
| `precio_unitario` | `decimal(10,2)` | NO | `` | `NULL` | `` |
| `descuento_unitario` | `decimal(10,2)` | NO | `` | `0.00` | `` |
| `subtotal_linea` | `decimal(12,2)` | NO | `` | `NULL` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |

Relaciones FK:
- `fk_pedido_item_pedido`: `pedido_item.id_pedido` -> `pedido.id_pedido`
- `fk_pedido_item_producto`: `pedido_item.id_producto` -> `producto.id_producto`

## Tabla `producto`
Propósito: Productos de carta/catálogo.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_producto` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `nombre` | `varchar(160)` | NO | `` | `NULL` | `` |
| `descripcion` | `text` | SI | `` | `NULL` | `` |
| `id_categoria` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `precio_base` | `decimal(10,2)` | NO | `` | `NULL` | `` |
| `visible_web` | `tinyint(1)` | NO | `` | `1` | `` |
| `disponible` | `tinyint(1)` | NO | `` | `1` | `` |
| `estado` | `enum('ACTIVO','INACTIVO')` | NO | `` | `ACTIVO` | `` |
| `imagen_url` | `text` | SI | `` | `NULL` | `` |
| `orden_visual` | `int` | NO | `` | `0` | `` |
| `usuario_creacion` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `usuario_actualizacion` | `bigint unsigned` | SI | `MUL` | `NULL` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `fecha_actualizacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED on update CURRENT_TIMESTAMP` |

Relaciones FK:
- `fk_producto_categoria`: `producto.id_categoria` -> `categoria_producto.id_categoria`
- `fk_producto_usuario_actualizacion`: `producto.usuario_actualizacion` -> `usuario.id_usuario`
- `fk_producto_usuario_creacion`: `producto.usuario_creacion` -> `usuario.id_usuario`

## Tabla `recuperacion_password_codigo`
Propósito: Códigos de recuperación de contraseña.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_codigo` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `id_usuario` | `bigint unsigned` | NO | `MUL` | `NULL` | `` |
| `correo` | `varchar(190)` | NO | `MUL` | `NULL` | `` |
| `codigo` | `varchar(10)` | SI | `` | `NULL` | `` |
| `codigo_hash` | `varchar(255)` | SI | `` | `NULL` | `` |
| `estado` | `enum('PENDIENTE','USADO','EXPIRADO')` | NO | `` | `PENDIENTE` | `` |
| `fecha_expiracion` | `datetime` | NO | `` | `NULL` | `` |
| `intentos_fallidos` | `int` | NO | `` | `0` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `fecha_actualizacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED on update CURRENT_TIMESTAMP` |

Relaciones FK:
- `fk_recuperacion_usuario`: `recuperacion_password_codigo.id_usuario` -> `usuario.id_usuario`

## Tabla `rol`
Propósito: Catálogo de roles del sistema.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_rol` | `smallint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `nombre` | `enum('CLIENTE','COCINA','ADMIN')` | NO | `UNI` | `NULL` | `` |
| `descripcion` | `varchar(120)` | SI | `` | `NULL` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `fecha_actualizacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED on update CURRENT_TIMESTAMP` |

## Tabla `serie_comprobante`
Propósito: Series y correlativos por empresa/tipo.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_serie` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `id_empresa` | `bigint unsigned` | NO | `MUL` | `NULL` | `` |
| `tipo_comprobante` | `enum('BOLETA','FACTURA')` | NO | `` | `NULL` | `` |
| `serie` | `varchar(10)` | NO | `` | `NULL` | `` |
| `correlativo_actual` | `bigint unsigned` | NO | `` | `0` | `` |
| `activo` | `tinyint(1)` | NO | `` | `1` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `fecha_actualizacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED on update CURRENT_TIMESTAMP` |

Relaciones FK:
- `fk_serie_empresa`: `serie_comprobante.id_empresa` -> `empresa.id_empresa`

## Tabla `usuario`
Propósito: Cuenta de acceso del sistema.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_usuario` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `uuid_usuario` | `char(36)` | NO | `UNI` | `NULL` | `` |
| `email` | `varchar(190)` | NO | `UNI` | `NULL` | `` |
| `password_hash` | `varchar(255)` | NO | `` | `NULL` | `` |
| `nombres` | `varchar(120)` | NO | `` | `NULL` | `` |
| `apellidos` | `varchar(120)` | NO | `` | `NULL` | `` |
| `telefono` | `varchar(20)` | SI | `` | `NULL` | `` |
| `documento` | `varchar(20)` | NO | `UNI` | `NULL` | `` |
| `estado` | `enum('ACTIVO','INACTIVO','BLOQUEADO')` | NO | `` | `ACTIVO` | `` |
| `id_rol` | `smallint unsigned` | NO | `MUL` | `NULL` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `fecha_actualizacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED on update CURRENT_TIMESTAMP` |

Relaciones FK:
- `fk_usuario_rol`: `usuario.id_rol` -> `rol.id_rol`

## Tabla `zona_delivery`
Propósito: Configuración de zonas/tarifas/mínimos/horarios delivery.
| Campo | Tipo | Nulo | Clave | Default | Extra |
|---|---|---|---|---|---|
| `id_zona` | `bigint unsigned` | NO | `PRI` | `NULL` | `auto_increment` |
| `nombre` | `varchar(120)` | NO | `UNI` | `NULL` | `` |
| `activo` | `tinyint(1)` | NO | `` | `1` | `` |
| `tarifa_base` | `decimal(10,2)` | NO | `` | `0.00` | `` |
| `monto_minimo` | `decimal(10,2)` | NO | `` | `0.00` | `` |
| `tiempo_estimado_minutos` | `int` | NO | `` | `35` | `` |
| `cobertura_descripcion` | `varchar(300)` | SI | `` | `NULL` | `` |
| `latitud_centro` | `decimal(10,7)` | SI | `` | `NULL` | `` |
| `longitud_centro` | `decimal(10,7)` | SI | `` | `NULL` | `` |
| `radio_km` | `decimal(10,2)` | SI | `` | `NULL` | `` |
| `mapa_embed_url` | `text` | SI | `` | `NULL` | `` |
| `usuario_creacion` | `bigint unsigned` | SI | `` | `NULL` | `` |
| `usuario_actualizacion` | `bigint unsigned` | SI | `` | `NULL` | `` |
| `fecha_creacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED` |
| `fecha_actualizacion` | `datetime` | NO | `` | `CURRENT_TIMESTAMP` | `DEFAULT_GENERATED on update CURRENT_TIMESTAMP` |
| `hora_inicio_atencion` | `time` | SI | `` | `NULL` | `` |
| `hora_fin_atencion` | `time` | SI | `` | `NULL` | `` |

Nota de versionado:
- Campos `latitud_centro`, `longitud_centro` y `radio_km` incorporados por migración `V7__delivery_zona_cobertura_geo.sql` para soportar cobertura geográfica por zona.
- Campo `mapa_embed_url` incorporado por migración `V10__zona_delivery_mapa_embed_url.sql` para almacenar el `src` de Google Maps embebido reutilizable en vistas administrativas y públicas.
