# BPMNs Bambino Chicken

> Nota: Documento maestro de BPMN generales para cliente, admin, cocina y chatbot.

## 🗂️ Índice
- [🧩 BPMN 1: Cliente - Compra Completa (Web/App)](#bpmn-1-cliente---compra-completa-webapp)
- [🧩 BPMN 2: Admin - Gestión de Productos y Ofertas](#bpmn-2-admin---gestión-de-productos-y-ofertas)
- [🧩 BPMN 3: Admin - Gestión de Pedidos y Pagos](#bpmn-3-admin---gestión-de-pedidos-y-pagos)
- [🧩 BPMN 4: Cocina - Atención y Seguimiento de Pedidos](#bpmn-4-cocina---atención-y-seguimiento-de-pedidos)
- [🧩 BPMN 5: Chatbot Web - Flujo de Consulta (Detallado)](#bpmn-5-chatbot-web---flujo-de-consulta-detallado)
- [🔐 BPMN 6: Cliente - Registro de Cuenta](#bpmn-6-cliente---registro-de-cuenta)
- [🔐 BPMN 7: Cliente - Recuperación de Contraseña por Correo](#bpmn-7-cliente---recuperación-de-contraseña-por-correo)
- [✅ Nota informativa sobre división de BPMN](#nota-informativa-sobre-división-de-bpmn)


## BPMN 1: Cliente - Compra Completa (Web/App)
1. Crea 3 pools: `Cliente`, `Bambino Backend`, `Pasarela de Pago`.
2. En `Cliente`, coloca evento inicio: `Ingresa a la web`.
3. Tarea Cliente: `Inicia sesión / se identifica`.
4. Mensaje a Backend: `Solicitar catálogo y ofertas`.
5. En Backend: tarea `Consultar productos y ofertas activas`.
6. Mensaje de retorno a Cliente: `Mostrar carta`.
7. Tarea Cliente: `Seleccionar productos`.
8. Tarea Cliente: `Agregar al carrito`.
9. En Backend: tarea `Actualizar carrito`.
10. Gateway exclusivo: `¿Desea seguir comprando?`.
11. Rama Sí: vuelve a `Seleccionar productos`.
12. Rama No: tarea Cliente `Ir a checkout`.
13. Tarea Cliente: `Seleccionar modalidad: recojo/delivery`.
14. Gateway exclusivo: `¿Delivery?`.
15. Rama Delivery: tarea Cliente `Seleccionar punto exacto en Google Maps`.
16. En Backend: tarea `Guardar latitud/longitud y place_id`.
17. En Backend: tarea `Autocompletar dirección desde coordenadas (reverse geocoding)`.
18. Tarea Cliente: `Confirmar/ajustar referencia de entrega`.
19. En Backend: tarea `Validar cobertura por coordenadas y calcular costo/tiempo delivery`.
20. Gateway: `¿Cobertura válida?`.
21. Rama No: mensaje `Zona no disponible` y vuelve a selección de modalidad/punto en mapa.
22. Rama Sí: continuar.
23. Tarea Cliente: `Seleccionar comprobante (boleta/factura)`.
24. Gateway exclusivo: `¿Boleta o factura?`.
25. Rama Boleta: Backend `Tomar automáticamente DNI guardado del perfil`.
26. Rama Factura: Backend `Tomar automáticamente RUC personal (RUC10) guardado del perfil`.
27. Backend `Validar que el documento exista y esté habilitado`.
28. Gateway: `¿Documento válido?`.
29. Rama No: `Mostrar error y solicitar actualización de datos de perfil`.
30. Rama Sí: continuar.
31. Backend: tarea `Recalcular total final`.
32. Cliente: tarea `Confirmar pedido y método de pago`.
33. Mensaje Backend -> Pasarela: `Iniciar cobro`.
34. En Pasarela: tarea `Autorizar pago`.
35. Mensaje Pasarela -> Backend: `Resultado de pago`.
36. Gateway en Backend: `¿Pago aprobado?`.
37. Rama No: Backend `Registrar pago rechazado/pendiente` + mensaje Cliente `Pago fallido`.
38. En rama No agrega gateway: `¿Reintentar pago?`; si Sí regresa a `Confirmar método`; si No termina con evento fin `Compra no completada`.
39. Rama Sí: Backend `Crear pedido`.
40. Backend `Generar comprobante`.
41. Backend `Generar comprobante_detalle (snapshot de pedido_item)`.
42. Backend `Guardar trazabilidad`.
43. Backend -> Cliente: mensaje `Pedido confirmado + código seguimiento`.
44. Evento fin Cliente: `Pedido creado exitosamente`.

## BPMN 2: Admin - Gestión de Productos y Ofertas
1. Crea 2 pools: `Administrador`, `Bambino Backend`.
2. Evento inicio: `Admin ingresa al panel`.
3. Tarea Admin: `Iniciar sesión`.
4. Backend: tarea `Validar rol admin`.
5. Gateway: `¿Autorizado?`; No -> fin `Acceso denegado`.
6. Sí -> tarea Admin `Elegir módulo productos u ofertas`.
7. Gateway paralelo o exclusivo según prefieras: `¿Producto u oferta?`.
8. Rama Productos: tarea Admin `Crear/editar/inactivar producto`.
9. Backend `Validar campos obligatorios`.
10. Gateway: `¿Datos válidos?`; No -> `Mostrar errores`.
11. Sí -> Backend `Guardar cambios producto`.
12. Backend `Registrar auditoría`.
13. Rama Ofertas: tarea Admin `Crear/editar/activar/desactivar oferta`.
14. Backend `Validar vigencia, reglas y productos aplicables`.
15. Gateway: `¿Reglas válidas?`; No -> `Mostrar errores`.
16. Sí -> Backend `Guardar oferta`.
17. Backend `Registrar auditoría`.
18. Unión de ramas.
19. Tarea Admin: `Publicar cambios en carta`.
20. Backend: `Actualizar visibilidad web`.
21. Mensaje final: `Operación exitosa`.
22. Evento fin.

## BPMN 3: Admin - Gestión de Pedidos y Pagos
1. Crea 2 pools: `Administrador`, `Bambino Backend`.
2. Evento inicio: `Admin abre módulo pedidos`.
3. Admin `Aplicar filtros (estado, fecha, cliente, pago)`.
4. Backend `Consultar pedidos`.
5. Backend -> Admin `Mostrar lista`.
6. Admin `Seleccionar pedido`.
7. Backend `Mostrar detalle + pago + comprobante`.
8. Gateway exclusivo: `¿Qué acción desea?` con 5 ramas.
9. Rama 1: `Cambiar estado`.
10. Backend `Validar matriz de transición`.
11. Gateway `¿Transición válida?`; No -> `Error`.
12. Sí -> `Actualizar estado` + `Auditoría`.
13. Rama 2: `Cancelar/Anular pedido`.
14. Admin `Ingresar motivo obligatorio`.
15. Backend `Validar estado cancelable`.
16. Gateway `¿Cancelable?`; No -> `Error`.
17. Sí -> `Cancelar pedido` + `Registrar motivo` + `Auditoría`.
18. Rama 3: `Gestionar incidencia de pago`.
19. Backend `Consultar estado pago`.
20. Gateway `¿Pendiente/Rechazado?`.
21. Si Sí: `Marcar para regularización` o `Reintentar confirmación`.
22. Si No: `Sin acción`.
23. Rama 4: `Gestión comprobante`.
24. Backend `Consultar boleta/factura`.
25. Admin `Reenviar comprobante o corregir dato permitido`.
26. Backend `Aplicar acción` + `Auditoría`.
27. Rama 5: `Configurar reglas de transición`.
28. Admin `Abrir configuración de transiciones`.
29. Backend `Listar matriz pedido_estado_transicion_permitida`.
30. Admin `Activar/Desactivar transición`.
31. Backend `Guardar cambio de transición` + `Auditoría`.
32. Unión de ramas.
33. Gateway: `¿Pago confirmado por Admin o por Webhook?`.
34. Rama Admin: `PATCH /api/admin/pagos/{idPago}/confirmar`.
35. Rama Webhook (sistema externo): `PATCH /api/public/pagos/webhook`.
36. Backend `Validar idempotency_key y evitar doble efecto`.
37. Backend `Actualizar estado de pago/pedido + emitir comprobante si corresponde`.
38. Backend `Registrar auditoría`.
39. Backend `Notificar resultado`.
40. Evento fin.

## BPMN 4: Cocina - Atención y Seguimiento de Pedidos
1. Crea 2 pools: `Cocina`, `Bambino Backend`.
2. Evento inicio: `Cocina inicia turno`.
3. Cocina `Abrir vista de pedidos en curso`.
4. Backend `Cargar pedidos activos`.
5. Cocina `Filtrar por prioridad/estado/zona`.
6. Cocina `Seleccionar pedido`.
7. Backend `Mostrar detalle (ítems, notas, entrega)`.
8. Backend `Mostrar historial de asignaciones del pedido`.
9. Gateway: `¿Acción operativa?` con ramas.
10. Rama 1: `Tomar pedido`.
11. Backend `Asignar pedido a usuario de cocina actual`.
12. Backend `Guardar en pedido_asignacion_cocina (origen/destino/motivo)` cuando aplique.
13. Rama 2: `Marcar EN_PREPARACION`.
14. Backend `Validar transición CONFIRMADO -> EN_PREPARACION`.
15. Backend `Guardar usuario_cocina_preparacion = usuario_actualizacion`.
16. Backend `Guardar fecha_inicio_preparacion`.
17. Backend `Registrar historial de estado con actor_tipo=COCINA`.
18. Rama 3: `Marcar listo`.
19. Gateway `¿Recojo o delivery?`.
20. Recojo -> Backend `Cambiar a LISTO_RECOJO`.
21. Delivery -> Backend `Cambiar a LISTO_DESPACHO`.
22. Backend `Guardar fecha_fin_preparacion`.
23. Backend `Registrar historial de estado con actor_tipo=COCINA`.
24. Rama 4: `Registrar incidencia de cocina`.
25. Cocina `Ingresar tipo de incidencia + detalle`.
26. Backend `Guardar en pedido_cocina_incidencia`.
27. Backend `Registrar auditoría`.
28. Rama 5: `Consultar incidencias del pedido`.
29. Backend `Listar incidencias por id_pedido`.
30. Rama 6: `Marcar entregado`.
31. Backend `Guardar fecha/hora entrega`.
32. Backend `Registrar trazabilidad de cocina`.
33. Evento intermedio de tiempo en backend: `Control de demora`.
34. Gateway `¿Supera umbral?`; Sí -> `Generar alerta visual`.
35. Evento fin: `Pedido atendido/cerrado`.

## BPMN 5: Chatbot Web - Flujo de Consulta (Detallado)
1. Crea 2 pools: `Cliente Web`, `Chatbot/Backend`.
2. Evento inicio: `Cliente abre chatbot`.
3. Chatbot `Mostrar menú: ver carta, ver ofertas, ver estado de pedido`.
4. Gateway: `¿Opción elegida?`.
5. Rama carta: Backend `Consultar catálogo activo` -> Chatbot `Mostrar resultados` -> fin.
6. Rama ofertas: Backend `Consultar ofertas activas` -> Chatbot `Mostrar resultados` -> fin.
7. Rama estado pedido: Chatbot `Solicitar código de pedido o seleccionar pedido del historial`.
8. Backend `Buscar pedido por código/ID`.
9. Gateway: `¿Pedido encontrado?`.
10. Rama No: Chatbot `Informar pedido no encontrado y sugerir reintento` -> fin.
11. Rama Sí: Backend `Validar titularidad del pedido (cliente autenticado)`.
12. Gateway: `¿Pedido pertenece al cliente?`.
13. Rama No: Chatbot `Denegar consulta por seguridad` -> fin.
14. Rama Sí: Backend `Consultar estado actual + historial de estados`.
15. Gateway: `¿Estado final? (ENTREGADO/CANCELADO/ANULADO)`.
16. Rama Estado final: Chatbot `Responder estado final y fecha de cierre` -> fin.
17. Rama En curso: Chatbot `Responder estado actual + últimos cambios + ETA si aplica`.
18. Gateway opcional: `¿Cliente desea más detalle?`.
19. Rama Sí: Chatbot `Mostrar detalle resumido del pedido` -> fin.
20. Rama No: fin.

## BPMN 6: Cliente - Registro de Cuenta
1. Crea 2 pools: `Cliente`, `Bambino Backend`.
2. En `Cliente`, evento inicio: `Ingresar a registro`.
3. Tarea Cliente: `Completar formulario (nombres, apellidos, correo, contraseña, documento principal y opcionalmente segundo documento)`.
4. Mensaje Cliente -> Backend: `Enviar datos de registro`.
5. En Backend: tarea `Validar campos obligatorios y formato`.
6. Gateway: `¿Datos válidos?`.
7. Rama No: Backend `Responder errores de validación` -> Cliente `Corregir formulario` -> regresa a envío.
8. Rama Sí: Backend `Validar unicidad de correo`.
9. Gateway: `¿Correo ya existe?`.
10. Rama Sí: Backend `Responder correo ya registrado` -> Cliente `Corregir correo` -> regresa a envío.
11. Rama No: Backend `Hash de contraseña`.
12. Backend `Crear usuario con rol CLIENTE`.
13. Backend `Registrar documento principal en cliente_documento`.
14. Gateway: `¿Cliente envió segundo documento opcional?`.
15. Rama Sí: Backend `Registrar segundo documento si no está repetido (tipo+número)`.
16. Rama No: continuar.
17. Backend `Crear cliente_perfil con documento principal`.
18. Backend `Registrar auditoría de alta`.
19. Mensaje Backend -> Cliente: `Registro exitoso`.
20. Evento fin Cliente: `Cuenta creada`.

21. Evento posterior (perfil): `Cliente agrega más documentos en perfil`.
22. Backend `Validar no duplicidad por cliente (tipo+número) antes de guardar`.
23. Backend `Guardar documento adicional si válido`.

## BPMN 7: Cliente - Recuperación de Contraseña por Correo
1. Crea 3 pools: `Cliente`, `Bambino Backend`, `Servicio de Correo`.
2. En `Cliente`, evento inicio: `Olvidé mi contraseña`.
3. Tarea Cliente: `Ingresar correo`.
4. Mensaje Cliente -> Backend: `Solicitar recuperación`.
5. Backend `Validar formato de correo`.
6. Backend `Buscar cuenta por correo`.
7. Gateway: `¿Cuenta existe?`.
8. Rama No: Backend `Responder mensaje genérico de seguridad` -> fin.
9. Rama Sí: Backend `Generar código temporal y expiración`.
10. Backend -> Servicio de Correo: `Enviar código al correo`.
11. Servicio de Correo -> Backend: `Confirmación de envío`.
12. Backend -> Cliente: `Solicitar código y nueva contraseña`.
13. Tarea Cliente: `Ingresar código recibido + nueva contraseña`.
14. Cliente -> Backend: `Validar código y cambiar contraseña`.
15. Backend `Validar código (vigencia/intentos/consistencia)`.
16. Gateway: `¿Código válido?`.
17. Rama No: Backend `Responder error y permitir reintento limitado`.
18. Gateway: `¿Reintentos disponibles?`; Sí -> vuelve a ingreso de código; No -> fin `Recuperación bloqueada temporalmente`.
19. Rama Sí: Backend `Hash de nueva contraseña`.
20. Backend `Actualizar password_hash`.
21. Backend `Invalidar códigos previos y sesiones activas si aplica`.
22. Backend `Registrar auditoría de cambio de contraseña`.
23. Backend -> Cliente: `Contraseña actualizada`.
24. Evento fin Cliente: `Recuperación exitosa`.

## Nota informativa sobre división de BPMN
La versión original de pasos se mantiene en este archivo.

La división por subprocesos quedó documentada en:
- `CORRECION/division de los bpmns.md`

Subprocesos creados en la división:
- Cliente:
  - Cliente 1 - Descubrir Carta y Armar Carrito
  - Cliente 2 - Checkout Delivery/Recojo
  - Cliente 3 - Comprobante (Boleta/Factura)
  - Cliente 4 - Pago y Confirmación de Pedido
  - Cliente 5 - Aplicación de Oferta en Carrito
  - Cliente 6 - Gestión de Direcciones
  - Seguridad Cliente 1 - Registro de Cuenta
  - Seguridad Cliente 2 - Recuperación de Contraseña
  - Cliente 7 - Chatbot de Consultas
- Cocina:
  - Cocina 1 - Toma y Preparación
  - Cocina 2 - Incidencias y Cierre
- Admin:
  - Admin 1 - Catálogo y Ofertas
  - Admin 2 - Gestión de Pedidos
  - Admin 3 - Pagos, Comprobantes y Reglas
  - Admin 4 - Crear Oferta y Asignar a Productos
  - Admin 5 - Activar/Desactivar Oferta
  - Admin 6 - Configuración de Series y Correlativos
  - Admin 7 - Emisión/Reemisión de Comprobante
