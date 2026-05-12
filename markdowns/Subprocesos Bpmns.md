# Subprocesos de los roles

> Nota: Versión segmentada por subprocesos para facilitar diseño, lectura y mantenimiento.

## 🗂️ Índice
- [📌 Objetivo](#objetivo)
- [📌 Regla base de líneas (lanes)](#regla-base-de-líneas-lanes)
- [👤 Bloque Cliente](#bloque-cliente)
- [🍳 Bloque Cocina](#bloque-cocina)
- [🛠️ Bloque Admin](#bloque-admin)


## Objetivo
Esta versión divide los BPMN grandes en sub-BPMN para que los diagramas sean legibles, mantenibles y alineados por rol.

## Regla base de líneas (lanes)
1. Línea 1: Rol principal.
2. Línea 2: `Bambino Backend`.
3. Línea 3: Servicio externo o soporte (`Pasarela de Pago`, `Google Maps`, `Base de Datos`, `Servicio de Correo`, etc.).

---

# 👤 Bloque Cliente

## BPMN Cliente 1 - Descubrir Carta y Armar Carrito
(Origen: BPMN 1 pasos 1 al 12)

Líneas recomendadas:
1. `Cliente`
2. `Bambino Backend`
3. `Base de Datos`

1. Evento inicio: `Ingresa a la web`.
2. Cliente: `Inicia sesión / se identifica`.
3. Cliente -> Backend: `Solicitar catálogo y ofertas`.
4. Backend: `Consultar productos y ofertas activas`.
5. Backend -> Cliente: `Mostrar carta`.
6. Cliente: `Seleccionar productos`.
7. Cliente: `Agregar al carrito`.
8. Backend: `Actualizar carrito`.
9. Gateway: `¿Desea seguir comprando?`.
10. Rama Sí: vuelve a `Seleccionar productos`.
11. Rama No: fin `Carrito listo para checkout`.

---

## BPMN Cliente 2 - Checkout Delivery/Recojo
(Origen: BPMN 1 pasos 13 al 22)

Líneas recomendadas:
1. `Cliente`
2. `Bambino Backend`
3. `Google Maps / Geocoding`

1. Inicio: `Ir a checkout`.
2. Cliente: `Seleccionar modalidad: recojo/delivery`.
3. Gateway: `¿Delivery?`.
4. Rama Recojo: continuar.
5. Rama Delivery: `Seleccionar punto exacto en Google Maps`.
6. Backend: `Guardar latitud/longitud y place_id`.
7. Backend -> Maps: `Reverse geocoding`.
8. Maps -> Backend: `Dirección normalizada`.
9. Cliente: `Confirmar/ajustar referencia`.
10. Backend: `Validar cobertura y calcular costo/tiempo`.
11. Gateway: `¿Cobertura válida?`.
12. Rama No: `Zona no disponible` y volver a selección de modalidad/punto.
13. Rama Sí: fin `Entrega validada`.

---

## BPMN Cliente 3 - Comprobante (Boleta/Factura)
(Origen: BPMN 1 pasos 23 al 30)

Líneas recomendadas:
1. `Cliente`
2. `Bambino Backend`
3. `Base de Datos`

1. Inicio: `Seleccionar comprobante`.
2. Cliente: `Elegir boleta o factura`.
3. Gateway: `¿Boleta o factura?`.
4. Rama Boleta: Backend `Tomar automáticamente DNI guardado del perfil`.
5. Rama Factura: Backend `Tomar automáticamente RUC personal (RUC10) guardado del perfil`.
6. Backend: `Validar que el documento exista y esté habilitado`.
7. Gateway: `¿Documento válido?`.
8. Rama No: `Mostrar error y solicitar actualización de datos de perfil`.
9. Rama Sí: fin `Comprobante validado para pago`.

---

## BPMN Cliente 4 - Pago y Confirmación de Pedido
(Origen: BPMN 1 pasos 31 al 44)

Líneas recomendadas:
1. `Cliente`
2. `Bambino Backend`
3. `Pasarela de Pago`

1. Inicio: `Confirmar pedido y método de pago`.
2. Backend: `Recalcular total final`.
3. Backend -> Pasarela: `Iniciar cobro`.
4. Pasarela: `Autorizar pago`.
5. Pasarela -> Backend: `Resultado de pago`.
6. Gateway: `¿Pago aprobado?`.
7. Rama No: `Registrar pago rechazado/pendiente` y notificar fallo.
8. Rama No: Gateway `¿Reintentar pago?`; Sí -> volver a pago; No -> fin `Compra no completada`.
9. Rama Sí: `Crear pedido`.
10. Backend: `Generar comprobante`.
11. Backend: `Generar comprobante_detalle`.
12. Backend: `Guardar trazabilidad`.
13. Backend -> Cliente: `Pedido confirmado + código seguimiento`.
14. Fin: `Pedido creado exitosamente`.

---

## BPMN Cliente 5 - Aplicación de Oferta en Carrito

Líneas recomendadas:
1. `Cliente`
2. `Bambino Backend`
3. `Base de Datos`

1. Inicio: `Cliente agrega producto al carrito`.
2. Backend: `Consultar producto activo/disponible`.
3. Backend: `Buscar oferta activa vigente del producto`.
4. Gateway: `¿Existe oferta activa?`.
5. Rama No: `Usar precio base`.
6. Rama Sí: `Calcular descuento según tipo`.
7. Backend: `Limitar descuento entre 0 y precio base`.
8. Backend: `Guardar snapshot precio_unitario`.
9. Backend: `Guardar snapshot descuento_unitario`.
10. Backend -> BD: `Insert/Update carrito_item`.
11. Backend: `Recalcular subtotal, descuento y total`.
12. Backend -> Cliente: `Mostrar resumen actualizado`.
13. Fin: `Carrito actualizado con oferta`.

---

## BPMN Cliente 6 - Gestión de Direcciones

> Regla: En perfil también se permite gestionar documentos del cliente con validación de no duplicados (tipo+número).

Líneas recomendadas:
1. `Cliente`
2. `Bambino Backend`
3. `Google Maps / Geocoding`

1. Inicio: `Cliente abre mis direcciones`.
2. Gateway: `¿Crear, editar, marcar principal o inactivar?`.
3. Rama Crear/Editar: Cliente `Seleccionar punto en mapa`.
4. Backend -> Maps: `Reverse geocoding`.
5. Maps -> Backend: `Dirección normalizada`.
6. Cliente: `Completar referencia y alias`.
7. Backend: `Validar latitud/longitud/place_id`.
8. Backend: `Guardar dirección`.
9. Si marca principal: `Desmarcar principal anterior`.
10. Rama Inactivar: `Desactivar dirección`.
11. Backend -> Cliente: `Mostrar lista actualizada`.
12. Fin: `Direcciones actualizadas`.

---

## BPMN Seguridad Cliente 1 - Registro de Cuenta
(Origen: BPMN 6 completo)

Líneas recomendadas:
1. `Cliente`
2. `Bambino Backend`
3. `Base de Datos`

1. Inicio: `Ingresar a registro`.
2. Cliente: `Completar formulario con documento principal y opcionalmente segundo documento`.
3. Cliente -> Backend: `Enviar datos`.
4. Backend: `Validar campos`.
5. Gateway: `¿Datos válidos?`.
6. Rama No: `Responder errores` y reintentar.
7. Rama Sí: `Validar unicidad de correo`.
8. Gateway: `¿Correo ya existe?`.
9. Rama Sí: `Responder correo ya registrado`.
10. Rama No: `Hash de contraseña`.
11. Backend: `Crear usuario rol CLIENTE`.
12. Backend: `Registrar documento principal en cliente_documento`.
13. Gateway: `¿Cliente envió segundo documento opcional?`.
14. Rama Sí: `Guardar segundo documento si no está repetido (tipo+número)`.
15. Rama No: `Continuar registro`.
16. Backend: `Crear cliente_perfil con documento principal`.
17. Backend: `Registrar auditoría`.
18. Fin: `Cuenta creada`.
19. Evento posterior (perfil): `Cliente agrega más documentos`.
20. Backend: `Validar no duplicidad por cliente (tipo+número)`.

---

## BPMN Seguridad Cliente 2 - Recuperación de Contraseña
(Origen: BPMN 7 completo)

Líneas recomendadas:
1. `Cliente`
2. `Bambino Backend`
3. `Servicio de Correo`

1. Inicio: `Olvidé mi contraseña`.
2. Cliente: `Ingresar correo`.
3. Cliente -> Backend: `Solicitar recuperación`.
4. Backend: `Validar correo y buscar cuenta`.
5. Gateway: `¿Cuenta existe?`.
6. Rama No: `Mensaje genérico de seguridad` -> fin.
7. Rama Sí: `Generar código temporal + expiración`.
8. Backend: `Guardar solo codigo_hash`.
9. Backend -> Correo: `Enviar código`.
10. Correo -> Backend: `Confirmación de envío`.
11. Backend -> Cliente: `Solicitar código + nueva contraseña`.
12. Cliente -> Backend: `Enviar código + nueva contraseña`.
13. Backend: `Validar hash, expiración e intentos`.
14. Gateway: `¿Código válido?`.
15. Rama No: `Error y reintento limitado`.
16. Gateway: `¿Reintentos disponibles?`; Sí -> vuelve a validar; No -> fin `Recuperación bloqueada`.
17. Rama Sí: `Hash de nueva contraseña`.
18. Backend: `Actualizar password_hash`.
19. Backend: `Marcar código como usado/inválido`.
20. Backend: `Registrar auditoría`.
21. Fin: `Contraseña actualizada`.

---

## BPMN Cliente 7 - Chatbot de Consultas
(Origen: BPMN 5 completo)

Líneas recomendadas:
1. `Cliente Web`
2. `Chatbot/Backend`
3. `Base de Datos`

1. Inicio: `Cliente abre chatbot`.
2. Chatbot: `Mostrar menú (carta/ofertas/estado pedido)`.
3. Gateway: `¿Opción elegida?`.
4. Rama carta: `Consultar catálogo activo` -> `Mostrar resultados` -> fin.
5. Rama ofertas: `Consultar ofertas activas` -> `Mostrar resultados` -> fin.
6. Rama estado: `Solicitar código o pedido del historial`.
7. Backend: `Buscar pedido`.
8. Gateway: `¿Pedido encontrado?`; No -> `Informar no encontrado` -> fin.
9. Sí -> `Validar titularidad del pedido`.
10. Gateway: `¿Pertenece al cliente?`; No -> `Denegar consulta` -> fin.
11. Sí -> `Consultar estado actual + historial`.
12. Gateway: `¿Estado final?`.
13. Rama final: `Responder estado final y fecha cierre` -> fin.
14. Rama en curso: `Responder estado + últimos cambios + ETA`.
15. Gateway opcional: `¿Desea más detalle?`.
16. Rama Sí: `Mostrar detalle resumido` -> fin.
17. Rama No: fin.

---

# 🍳 Bloque Cocina

## BPMN Cocina 1 - Toma y Preparación
(Origen: BPMN 4 pasos 1 al 23)

Líneas recomendadas:
1. `Cocina`
2. `Bambino Backend`
3. `Base de Datos`

1. Inicio: `Cocina inicia turno`.
2. Cocina: `Abrir vista de pedidos en curso`.
3. Backend: `Cargar pedidos activos`.
4. Cocina: `Filtrar y seleccionar pedido`.
5. Backend: `Mostrar detalle del pedido`.
6. Cocina: `Tomar pedido`.
7. Backend: `Asignar pedido a usuario cocina`.
8. Backend: `Guardar en pedido_asignacion_cocina`.
9. Cocina: `Marcar EN_PREPARACION`.
10. Backend: `Validar transición CONFIRMADO -> EN_PREPARACION`.
11. Backend: `Guardar usuario_cocina_preparacion`.
12. Backend: `Guardar fecha_inicio_preparacion`.
13. Backend: `Registrar historial actor_tipo=COCINA`.
14. Cocina: `Marcar listo`.
15. Gateway: `¿Recojo o delivery?`.
16. Rama Recojo: `Cambiar a LISTO_RECOJO`.
17. Rama Delivery: `Cambiar a LISTO_DESPACHO`.
18. Backend: `Guardar fecha_fin_preparacion`.
19. Backend: `Registrar historial`.
20. Fin: `Pedido listo`.

---

## BPMN Cocina 2 - Incidencias y Cierre
(Origen: BPMN 4 pasos 24 al 35)

Líneas recomendadas:
1. `Cocina`
2. `Bambino Backend`
3. `Base de Datos`

1. Inicio: `Pedido en operación`.
2. Gateway: `¿Registrar incidencia, consultar incidencias o cerrar pedido?`.
3. Rama incidencia: Cocina `Ingresar tipo + detalle`.
4. Backend: `Guardar en pedido_cocina_incidencia`.
5. Backend: `Registrar auditoría`.
6. Rama consulta: Backend `Listar incidencias por id_pedido`.
7. Rama cierre: Cocina `Marcar entregado`.
8. Backend: `Guardar fecha/hora entrega`.
9. Backend: `Registrar trazabilidad`.
10. Evento intermedio: `Control de demora`.
11. Gateway: `¿Supera umbral?`; Sí -> `Generar alerta visual`.
12. Fin: `Pedido atendido/cerrado`.

---

# 🛠️ Bloque Admin

## BPMN Admin 1 - Catálogo y Ofertas
(Origen: BPMN 2 completo)

Líneas recomendadas:
1. `Administrador`
2. `Bambino Backend`
3. `Base de Datos`

1. Inicio: `Admin ingresa al panel`.
2. Admin: `Iniciar sesión`.
3. Backend: `Validar rol admin`.
4. Gateway: `¿Autorizado?`; No -> fin `Acceso denegado`.
5. Sí -> Admin `Elegir módulo productos u ofertas`.
6. Gateway: `¿Producto u oferta?`.
7. Rama Productos: `Crear/editar/inactivar producto`.
8. Backend: `Validar campos`.
9. Gateway: `¿Datos válidos?`; No -> `Mostrar errores`.
10. Sí -> `Guardar cambios producto` + `Registrar auditoría`.
11. Rama Ofertas: `Crear/editar/activar/desactivar oferta`.
12. Backend: `Validar vigencia/reglas/productos`.
13. Gateway: `¿Reglas válidas?`; No -> `Mostrar errores`.
14. Sí -> `Guardar oferta` + `Registrar auditoría`.
15. Unión de ramas.
16. Admin: `Publicar cambios en carta`.
17. Backend: `Actualizar visibilidad web`.
18. Fin: `Operación exitosa`.

---

## BPMN Admin 2 - Gestión de Pedidos
(Origen: BPMN 3 pasos 1 al 17)

Líneas recomendadas:
1. `Administrador`
2. `Bambino Backend`
3. `Base de Datos`

1. Inicio: `Admin abre módulo pedidos`.
2. Admin: `Aplicar filtros`.
3. Backend: `Consultar pedidos`.
4. Backend -> Admin: `Mostrar lista y detalle`.
5. Gateway: `¿Cambiar estado o cancelar/anular?`.
6. Rama Cambiar estado: `Validar matriz de transición`.
7. Gateway: `¿Transición válida?`; No -> `Error`.
8. Sí -> `Actualizar estado` + `Auditoría`.
9. Rama Cancelar/Anular: Admin `Ingresar motivo`.
10. Backend: `Validar estado cancelable`.
11. Gateway: `¿Cancelable?`; No -> `Error`.
12. Sí -> `Cancelar/Anular` + `Registrar motivo` + `Auditoría`.
13. Fin: `Gestión de pedido completada`.

---

## BPMN Admin 3 - Pagos, Comprobantes y Reglas
(Origen: BPMN 3 pasos 18 al 40)

Líneas recomendadas:
1. `Administrador`
2. `Bambino Backend`
3. `Base de Datos / Pasarela` 

1. Inicio: `Admin gestiona pago/comprobante/reglas`.
2. Gateway: `¿Pago, comprobante o reglas?`.
3. Rama Pago: Backend `Consultar estado pago`.
4. Gateway: `¿Pendiente/Rechazado?`; Sí -> `Regularizar o reintentar confirmación`.
5. Rama Comprobante: `Consultar boleta/factura`.
6. Admin: `Reenviar comprobante o corregir dato permitido`.
7. Backend: `Aplicar acción` + `Auditoría`.
8. Rama Reglas: `Listar matriz transiciones`.
9. Admin: `Activar/Desactivar transición`.
10. Backend: `Guardar cambio` + `Auditoría`.
11. Gateway: `¿Confirmación de pago por Admin o Webhook?`.
12. Rama Admin: `PATCH /api/admin/pagos/{idPago}/confirmar`.
13. Rama Webhook: `PATCH /api/public/pagos/webhook`.
14. Backend: `Validar idempotency_key`.
15. Backend: `Actualizar pago/pedido + emitir comprobante si aplica`.
16. Backend: `Registrar auditoría y notificar resultado`.
17. Fin: `Gestión finalizada`.

---

## BPMN Admin 4 - Crear Oferta y Asignar a Productos

Líneas recomendadas:
1. `Administrador`
2. `Bambino Backend`
3. `Base de Datos`

1. Inicio: `Admin abre módulo ofertas`.
2. Admin: `Seleccionar crear oferta`.
3. Admin: `Ingresar nombre, tipo, valor, vigencia`.
4. Admin: `Seleccionar productos aplicables`.
5. Backend: `Validar campos obligatorios`.
6. Backend: `Validar reglas por tipo`.
7. Gateway: `¿Datos válidos?`.
8. Rama No: `Devolver errores`.
9. Rama Sí: `Guardar oferta`.
10. Backend -> BD: `Insertar oferta`.
11. Backend -> BD: `Insertar oferta_producto por cada producto`.
12. Backend -> BD: `Registrar auditoría`.
13. Backend -> Admin: `Confirmar creación`.
14. Fin: `Oferta creada y asignada`.

---

## BPMN Admin 5 - Activar/Desactivar Oferta

Líneas recomendadas:
1. `Administrador`
2. `Bambino Backend`
3. `Base de Datos`

1. Inicio: `Admin lista ofertas`.
2. Admin: `Seleccionar oferta`.
3. Admin: `Elegir activar o desactivar`.
4. Backend: `Validar estado actual`.
5. Backend: `Validar vigencia y consistencia`.
6. Gateway: `¿Cambio permitido?`.
7. Rama No: `Mostrar motivo de bloqueo`.
8. Rama Sí: `Actualizar estado de oferta`.
9. Backend -> BD: `Update oferta`.
10. Backend -> BD: `Registrar auditoría`.
11. Backend -> Admin: `Notificar cambio aplicado`.
12. Fin: `Estado de oferta actualizado`.

---

## BPMN Admin 6 - Configuración de Series y Correlativos

Líneas recomendadas:
1. `Administrador`
2. `Bambino Backend`
3. `Base de Datos`

1. Inicio: `Admin abre configuración de comprobantes`.
2. Admin: `Seleccionar tipo (boleta/factura)`.
3. Admin: `Ingresar serie y correlativo inicial`.
4. Backend: `Validar formato de serie`.
5. Backend: `Validar unicidad por tipo`.
6. Gateway: `¿Datos válidos?`.
7. Rama No: `Mostrar error`.
8. Rama Sí: `Guardar configuración`.
9. Backend -> BD: `Insert/Update serie_comprobante`.
10. Backend -> BD: `Registrar auditoría`.
11. Backend -> Admin: `Confirmar guardado`.
12. Fin: `Serie/correlativo configurado`.

---

## BPMN Admin 7 - Emisión/Reemisión de Comprobante

Líneas recomendadas:
1. `Administrador`
2. `Bambino Backend`
3. `Base de Datos`

1. Inicio: `Admin abre pedido`.
2. Backend: `Consultar pago y pedido`.
3. Gateway: `¿Pago aprobado?`.
4. Rama No: `Bloquear emisión`.
5. Rama Sí: `Validar datos fiscales`.
6. Backend: `Obtener serie y siguiente correlativo`.
7. Backend: `Generar comprobante`.
8. Backend: `Generar comprobante_detalle`.
9. Backend -> BD: `Guardar comprobante y detalle`.
10. Backend -> BD: `Actualizar correlativo`.
11. Gateway: `¿Reemisión solicitada?`.
12. Rama Sí: `Generar reenvío permitido`.
13. Backend -> BD: `Registrar auditoría`.
14. Backend -> Admin: `Mostrar resultado`.
15. Fin: `Comprobante emitido/reemitido`.
