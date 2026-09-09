/**
 * Datos semilla de la demo. Todo es ficticio: la empresa, los precios, los
 * pedidos y las personas fueron inventados para esta demostración.
 */

import { imagenProducto } from './imagenes-demo';

const HOY = new Date();

export function fechaRelativa(diasAtras: number, hora = 12, minuto = 30): string {
  const fecha = new Date(HOY);
  fecha.setDate(fecha.getDate() - diasAtras);
  fecha.setHours(hora, minuto, 0, 0);
  return fecha.toISOString();
}

export interface CategoriaDemo {
  idCategoria: number;
  nombre: string;
  descripcion: string | null;
  ordenVisual: number;
  activa: boolean;
}

export interface ProductoDemo {
  idProducto: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  idCategoria: number;
  categoriaNombre: string;
  precioBase: number;
  visibleWeb: boolean;
  disponible: boolean;
  estado: string;
  imagenUrl: string | null;
  ordenVisual: number;
  vecesPedido: number;
  idOfertaActiva?: number | null;
}

export const CATEGORIAS_SEMILLA: CategoriaDemo[] = [
  { idCategoria: 1, nombre: 'Pollos a la brasa', descripcion: 'Nuestra especialidad, con papas y ensalada', ordenVisual: 1, activa: true },
  { idCategoria: 2, nombre: 'Broaster', descripcion: 'Pollo crocante en presas', ordenVisual: 2, activa: true },
  { idCategoria: 3, nombre: 'Parrillas', descripcion: 'Cortes a la parrilla', ordenVisual: 3, activa: true },
  { idCategoria: 4, nombre: 'Guarniciones', descripcion: 'Para acompañar', ordenVisual: 4, activa: true },
  { idCategoria: 5, nombre: 'Bebidas', descripcion: 'Gaseosas, chicha y refrescos', ordenVisual: 5, activa: true },
  { idCategoria: 6, nombre: 'Postres', descripcion: 'Para cerrar la mesa', ordenVisual: 6, activa: true },
  { idCategoria: 7, nombre: 'Temporada', descripcion: 'Fuera de carta', ordenVisual: 7, activa: false },
];

const P = (
  idProducto: number, nombre: string, slug: string, descripcion: string,
  idCategoria: number, precioBase: number, ordenVisual: number, vecesPedido: number,
  disponible = true, visibleWeb = true
): ProductoDemo => ({
  idProducto,
  nombre,
  slug,
  descripcion,
  idCategoria,
  categoriaNombre: CATEGORIAS_SEMILLA.find((c) => c.idCategoria === idCategoria)?.nombre ?? '',
  precioBase,
  visibleWeb,
  disponible,
  estado: visibleWeb ? 'ACTIVO' : 'INACTIVO',
  imagenUrl: imagenProducto(nombre, idCategoria),
  ordenVisual,
  vecesPedido,
});

export const PRODUCTOS_SEMILLA: ProductoDemo[] = [
  P(1, 'Pollo entero a la brasa', 'pollo-entero-a-la-brasa', 'Pollo entero marinado 24 horas, con papas fritas y ensalada fresca.', 1, 69.9, 1, 412),
  P(2, 'Medio pollo a la brasa', 'medio-pollo-a-la-brasa', 'Medio pollo con papas fritas y ensalada.', 1, 38.9, 2, 356),
  P(3, 'Cuarto de pollo a la brasa', 'cuarto-de-pollo-a-la-brasa', 'Cuarto de pollo con papas fritas y ensalada.', 1, 22.9, 3, 289),
  P(4, 'Pollo a la brasa familiar', 'pollo-a-la-brasa-familiar', 'Pollo y medio, papas grandes, ensalada y gaseosa de litro y medio.', 1, 92.9, 4, 174),
  P(5, 'Broaster 8 presas', 'broaster-8-presas', 'Ocho presas crocantes con papas y cremas de la casa.', 2, 64.9, 1, 198),
  P(6, 'Broaster 4 presas', 'broaster-4-presas', 'Cuatro presas crocantes con papas y cremas.', 2, 35.9, 2, 231),
  P(7, 'Combo broaster personal', 'combo-broaster-personal', 'Dos presas, papas, cremas y bebida personal.', 2, 19.9, 3, 265),
  P(8, 'Alitas BBQ x12', 'alitas-bbq-x12', 'Doce alitas bañadas en salsa BBQ con papas rústicas.', 2, 42.9, 4, 187),
  P(9, 'Parrilla familiar', 'parrilla-familiar', 'Bife, pollo, chorizo, chuleta y guarniciones para cuatro.', 3, 118.9, 1, 96),
  P(10, 'Anticuchos de corazón', 'anticuchos-de-corazon', 'Dos palos con papa dorada y choclo.', 3, 28.9, 2, 143),
  P(11, 'Chuleta a la parrilla', 'chuleta-a-la-parrilla', 'Chuleta de cerdo con ensalada criolla.', 3, 32.9, 3, 88),
  P(12, 'Papas fritas grandes', 'papas-fritas-grandes', 'Porción grande para compartir.', 4, 14.9, 1, 322),
  P(13, 'Ensalada fresca', 'ensalada-fresca', 'Lechuga, tomate, pepino y palta.', 4, 12.9, 2, 156),
  P(14, 'Arroz chaufa de pollo', 'arroz-chaufa-de-pollo', 'Porción de chaufa al wok.', 4, 21.9, 3, 134),
  P(15, 'Cremas adicionales', 'cremas-adicionales', 'Trío de cremas de la casa.', 4, 4.9, 4, 289),
  P(16, 'Gaseosa 1.5 L', 'gaseosa-1-5-l', 'Botella familiar bien helada.', 5, 10.9, 1, 341),
  P(17, 'Gaseosa personal', 'gaseosa-personal', 'Botella personal de 500 ml.', 5, 5.9, 2, 298),
  P(18, 'Chicha morada 1 L', 'chicha-morada-1-l', 'Preparada en casa, sin conservantes.', 5, 12.9, 3, 176),
  P(19, 'Limonada frozen', 'limonada-frozen', 'Jarra de limonada frozen.', 5, 14.9, 4, 121),
  P(20, 'Torta de chocolate', 'torta-de-chocolate', 'Porción con salsa de chocolate.', 6, 13.9, 1, 87),
  P(21, 'Gelatina de fresa', 'gelatina-de-fresa', 'Porción individual.', 6, 5.9, 2, 64),
  P(22, 'Panetón navideño', 'paneton-navideno', 'Disponible sólo en campaña.', 7, 29.9, 1, 12, false, false),
  P(23, 'Combo dos personas', 'combo-dos-personas', 'Medio pollo, papas, ensalada y gaseosa personal.', 1, 47.9, 5, 203),
  P(24, 'Salchipapa clásica', 'salchipapa-clasica', 'Papas con salchicha y cremas.', 4, 15.9, 5, 245),
];

export interface OfertaDemo {
  idOferta: number;
  nombre: string;
  descripcion: string | null;
  tipo: 'PORCENTAJE' | 'MONTO';
  valor: number;
  idProducto: number | null;
  activo: boolean;
  fechaInicio: string | null;
  fechaFin: string | null;
}

export const OFERTAS_SEMILLA: OfertaDemo[] = [
  { idOferta: 1, nombre: 'Martes de brasa', descripcion: '20% en el pollo entero, todos los martes.', tipo: 'PORCENTAJE', valor: 20, idProducto: 1, activo: true, fechaInicio: fechaRelativa(30), fechaFin: fechaRelativa(-30) },
  { idOferta: 2, nombre: 'Broaster en familia', descripcion: 'S/ 10 de descuento en el broaster de 8 presas.', tipo: 'MONTO', valor: 10, idProducto: 5, activo: true, fechaInicio: fechaRelativa(15), fechaFin: fechaRelativa(-15) },
  { idOferta: 3, nombre: 'Alitas al 15%', descripcion: 'Descuento en las alitas BBQ.', tipo: 'PORCENTAJE', valor: 15, idProducto: 8, activo: true, fechaInicio: fechaRelativa(7), fechaFin: fechaRelativa(-7) },
  { idOferta: 4, nombre: 'Verano frozen', descripcion: 'Campaña cerrada.', tipo: 'PORCENTAJE', valor: 25, idProducto: 19, activo: false, fechaInicio: fechaRelativa(120), fechaFin: fechaRelativa(60) },
];

export interface UsuarioDemo {
  idUsuario: number;
  email: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  docTipo: string | null;
  docNumero: string | null;
  rol: string;
  activo: boolean;
  fechaCreacion: string;
}

export const USUARIOS_SEMILLA: UsuarioDemo[] = [
  { idUsuario: 1, email: 'admin@bambino.demo', nombres: 'Rosa', apellidos: 'Delgado', telefono: '987000111', docTipo: 'DNI', docNumero: '40000001', rol: 'ADMIN', activo: true, fechaCreacion: fechaRelativa(300) },
  { idUsuario: 2, email: 'cocina@bambino.demo', nombres: 'Julio', apellidos: 'Paredes', telefono: '987000222', docTipo: 'DNI', docNumero: '40000002', rol: 'COCINA', activo: true, fechaCreacion: fechaRelativa(280) },
  { idUsuario: 3, email: 'cliente@bambino.demo', nombres: 'Lucía', apellidos: 'Ramírez', telefono: '987000333', docTipo: 'DNI', docNumero: '40000003', rol: 'CLIENTE', activo: true, fechaCreacion: fechaRelativa(200) },
  { idUsuario: 4, email: 'diego.maldonado@bambino.demo', nombres: 'Diego', apellidos: 'Maldonado', telefono: '987000444', docTipo: 'DNI', docNumero: '40000004', rol: 'CLIENTE', activo: true, fechaCreacion: fechaRelativa(150) },
  { idUsuario: 5, email: 'ana.quispe@bambino.demo', nombres: 'Ana', apellidos: 'Quispe', telefono: '987000555', docTipo: 'DNI', docNumero: '40000005', rol: 'CLIENTE', activo: true, fechaCreacion: fechaRelativa(90) },
  { idUsuario: 6, email: 'marco.ivanoff@bambino.demo', nombres: 'Marco', apellidos: 'Ivanoff', telefono: '987000666', docTipo: 'DNI', docNumero: '40000006', rol: 'CLIENTE', activo: false, fechaCreacion: fechaRelativa(45) },
];

/** Cliente con el que entra el visitante de la demo. */
export const ID_CLIENTE_DEMO = 3;

export const DIRECCIONES_SEMILLA = [
  { idDireccion: 1, idUsuario: 3, alias: 'Casa', direccion: 'Jr. Las Begonias 240', referencia: 'Frente al parque', distrito: 'Villa Esperanza', principal: true, latitud: -12.048, longitud: -77.031 },
  { idDireccion: 2, idUsuario: 3, alias: 'Trabajo', direccion: 'Av. Los Próceres 1220', referencia: 'Oficina 302', distrito: 'Los Álamos', principal: false, latitud: -12.052, longitud: -77.038 },
];

export interface PedidoDemo {
  idPedido: number;
  idUsuario: number;
  codigoPedido: string;
  estadoActual: string;
  modalidad: string;
  tipoComprobante: string;
  subtotal: number;
  descuentoTotal: number;
  impuestoTotal: number;
  total: number;
  fechaCreacion: string;
  items: { idProducto: number; nombre: string; cantidad: number; precioUnitario: number }[];
}

function pedido(
  idPedido: number, idUsuario: number, dias: number, hora: number, estado: string,
  modalidad: string, tipoComprobante: string, items: [number, number][]
): PedidoDemo {
  const detalle = items.map(([idProducto, cantidad]) => {
    const p = PRODUCTOS_SEMILLA.find((x) => x.idProducto === idProducto)!;
    return { idProducto, nombre: p.nombre, cantidad, precioUnitario: p.precioBase };
  });
  const bruto = detalle.reduce((acc, i) => acc + i.precioUnitario * i.cantidad, 0);
  const subtotal = Math.round((bruto / 1.18) * 100) / 100;
  const impuestoTotal = Math.round((bruto - subtotal) * 100) / 100;
  return {
    idPedido,
    idUsuario,
    codigoPedido: `BMB-${String(idPedido).padStart(5, '0')}`,
    estadoActual: estado,
    modalidad,
    tipoComprobante,
    subtotal,
    descuentoTotal: 0,
    impuestoTotal,
    total: Math.round(bruto * 100) / 100,
    fechaCreacion: fechaRelativa(dias, hora),
    items: detalle,
  };
}

export const PEDIDOS_SEMILLA: PedidoDemo[] = [
  pedido(1, 3, 21, 13, 'ENTREGADO', 'DELIVERY', 'BOLETA', [[1, 1], [16, 1]]),
  pedido(2, 4, 18, 20, 'ENTREGADO', 'RECOJO', 'BOLETA', [[5, 1], [12, 1]]),
  pedido(3, 3, 14, 19, 'ENTREGADO', 'DELIVERY', 'FACTURA', [[9, 1], [18, 1]]),
  pedido(4, 5, 11, 13, 'ENTREGADO', 'DELIVERY', 'BOLETA', [[2, 2], [17, 2]]),
  pedido(5, 3, 8, 20, 'ENTREGADO', 'RECOJO', 'BOLETA', [[7, 2], [15, 1]]),
  pedido(6, 4, 6, 14, 'ENTREGADO', 'DELIVERY', 'BOLETA', [[4, 1], [16, 1]]),
  pedido(7, 5, 4, 21, 'CANCELADO', 'DELIVERY', 'BOLETA', [[6, 1]]),
  pedido(8, 3, 2, 19, 'EN_CAMINO', 'DELIVERY', 'BOLETA', [[1, 1], [12, 1], [16, 1]]),
  pedido(9, 4, 1, 13, 'EN_PREPARACION', 'DELIVERY', 'FACTURA', [[9, 1], [19, 1]]),
  pedido(10, 5, 0, 12, 'EN_PREPARACION', 'RECOJO', 'BOLETA', [[3, 2], [24, 1]]),
  pedido(11, 3, 0, 13, 'CONFIRMADO', 'DELIVERY', 'BOLETA', [[8, 1], [17, 2]]),
  pedido(12, 4, 0, 13, 'PENDIENTE', 'DELIVERY', 'BOLETA', [[2, 1], [13, 1]]),
];

export const EMPRESA_SEMILLA = {
  idEmpresa: 1,
  ruc: '20600000099',
  razonSocial: 'Bambino Chicken Demo S.A.C.',
  nombreComercial: 'Bambino Chicken',
  direccionFiscal: 'Av. Los Próceres 1450, Lima',
  telefono: '013000900',
  correo: 'contacto@bambino.demo',
  activo: true,
};

export const CONFIGURACION_GLOBAL_SEMILLA = {
  idConfig: 1,
  moneda: 'PEN',
  igvPorcentaje: 18,
  deliveryMontoMinimo: 25,
  deliveryTiempoMinMinutos: 30,
  deliveryTiempoMaxMinutos: 55,
  timezone: 'America/Lima',
};

export const ZONAS_DELIVERY_SEMILLA = [
  { idZona: 1, nombre: 'Villa Esperanza', activo: true, tarifaBase: 5, montoMinimo: 25, tiempoEstimadoMinutos: 35, coberturaDescripcion: 'Todo el sector y alrededores del parque central.', mapaEmbedUrl: null, latitudCentro: -12.048, longitudCentro: -77.031, radioKm: 2.5, horaInicioAtencion: '11:00', horaFinAtencion: '23:00' },
  { idZona: 2, nombre: 'Los Álamos', activo: true, tarifaBase: 6, montoMinimo: 25, tiempoEstimadoMinutos: 40, coberturaDescripcion: 'Desde la avenida principal hasta el óvalo.', mapaEmbedUrl: null, latitudCentro: -12.052, longitudCentro: -77.038, radioKm: 3, horaInicioAtencion: '11:00', horaFinAtencion: '23:00' },
  { idZona: 3, nombre: 'Nueva Aurora', activo: true, tarifaBase: 8, montoMinimo: 35, tiempoEstimadoMinutos: 50, coberturaDescripcion: 'Zona alta, con recargo por distancia.', mapaEmbedUrl: null, latitudCentro: -12.061, longitudCentro: -77.044, radioKm: 4, horaInicioAtencion: '12:00', horaFinAtencion: '22:30' },
  { idZona: 4, nombre: 'El Mirador', activo: false, tarifaBase: 10, montoMinimo: 45, tiempoEstimadoMinutos: 60, coberturaDescripcion: 'Cobertura suspendida temporalmente.', mapaEmbedUrl: null, latitudCentro: -12.058, longitudCentro: -77.052, radioKm: 3.5, horaInicioAtencion: '12:00', horaFinAtencion: '21:00' },
];

export const SERIES_COMPROBANTE_SEMILLA = [
  { idSerie: 1, idEmpresa: 1, tipoComprobante: 'BOLETA', serie: 'B001', correlativoActual: 148, activo: true },
  { idSerie: 2, idEmpresa: 1, tipoComprobante: 'FACTURA', serie: 'F001', correlativoActual: 32, activo: true },
];

export const TRANSICIONES_SEMILLA = [
  { idTransicion: 1, estadoOrigen: null, estadoDestino: 'PENDIENTE', actorTipo: 'CLIENTE', activo: true },
  { idTransicion: 2, estadoOrigen: 'PENDIENTE', estadoDestino: 'CONFIRMADO', actorTipo: 'ADMIN', activo: true },
  { idTransicion: 3, estadoOrigen: 'CONFIRMADO', estadoDestino: 'EN_PREPARACION', actorTipo: 'COCINA', activo: true },
  { idTransicion: 4, estadoOrigen: 'EN_PREPARACION', estadoDestino: 'EN_CAMINO', actorTipo: 'ADMIN', activo: true },
  { idTransicion: 5, estadoOrigen: 'EN_CAMINO', estadoDestino: 'ENTREGADO', actorTipo: 'ADMIN', activo: true },
  { idTransicion: 6, estadoOrigen: 'PENDIENTE', estadoDestino: 'CANCELADO', actorTipo: 'ADMIN', activo: true },
];

export const BACKUP_CONFIGURACION_SEMILLA = {
  idConfig: 1,
  activo: true,
  horaEjecucion: '03:00',
  retencionCantidad: 7,
  rutaDestino: '/var/backups/bambino',
  fechaActualizacion: fechaRelativa(3, 3),
};

export const BACKUPS_SEMILLA = [
  { idBackup: 1, nombreArchivo: 'bambino-2026-09-09.sql.gz', rutaArchivo: '/var/backups/bambino/bambino-2026-09-09.sql.gz', tamanioBytes: 4823110, estado: 'COMPLETADO' as const, mensajeError: null, fechaInicio: fechaRelativa(0, 3), fechaFin: fechaRelativa(0, 3, 42), tipoDisparo: 'AUTOMATICO' as const },
  { idBackup: 2, nombreArchivo: 'bambino-2026-09-08.sql.gz', rutaArchivo: '/var/backups/bambino/bambino-2026-09-08.sql.gz', tamanioBytes: 4791204, estado: 'COMPLETADO' as const, mensajeError: null, fechaInicio: fechaRelativa(1, 3), fechaFin: fechaRelativa(1, 3, 39), tipoDisparo: 'AUTOMATICO' as const },
  { idBackup: 3, nombreArchivo: 'bambino-2026-09-07-manual.sql.gz', rutaArchivo: '/var/backups/bambino/bambino-2026-09-07-manual.sql.gz', tamanioBytes: 4770988, estado: 'COMPLETADO' as const, mensajeError: null, fechaInicio: fechaRelativa(2, 18), fechaFin: fechaRelativa(2, 18, 41), tipoDisparo: 'MANUAL' as const },
  { idBackup: 4, nombreArchivo: 'bambino-2026-09-06.sql.gz', rutaArchivo: '/var/backups/bambino/bambino-2026-09-06.sql.gz', tamanioBytes: 0, estado: 'ERROR' as const, mensajeError: 'Espacio insuficiente en el destino.', fechaInicio: fechaRelativa(3, 3), fechaFin: fechaRelativa(3, 3, 4), tipoDisparo: 'AUTOMATICO' as const },
];

export const AUDITORIA_SEMILLA = [
  { idEvento: 1, entidad: 'PEDIDO', entidadId: '12', accion: 'CREAR', actorTipo: 'CLIENTE', idActor: 4, canal: 'WEB', metadataJson: '{"total":51.8}', fechaCreacion: fechaRelativa(0, 13, 5) },
  { idEvento: 2, entidad: 'PEDIDO', entidadId: '11', accion: 'CONFIRMAR', actorTipo: 'ADMIN', idActor: 1, canal: 'PANEL', metadataJson: '{"estado":"CONFIRMADO"}', fechaCreacion: fechaRelativa(0, 13, 12) },
  { idEvento: 3, entidad: 'PRODUCTO', entidadId: '8', accion: 'ACTUALIZAR', actorTipo: 'ADMIN', idActor: 1, canal: 'PANEL', metadataJson: '{"precioBase":42.9}', fechaCreacion: fechaRelativa(1, 10, 20) },
  { idEvento: 4, entidad: 'OFERTA', entidadId: '3', accion: 'CREAR', actorTipo: 'ADMIN', idActor: 1, canal: 'PANEL', metadataJson: '{"valor":15}', fechaCreacion: fechaRelativa(7, 9) },
  { idEvento: 5, entidad: 'USUARIO', entidadId: '6', accion: 'DESACTIVAR', actorTipo: 'ADMIN', idActor: 1, canal: 'PANEL', metadataJson: null, fechaCreacion: fechaRelativa(9, 16) },
  { idEvento: 6, entidad: 'PEDIDO', entidadId: '7', accion: 'CANCELAR', actorTipo: 'ADMIN', idActor: 1, canal: 'PANEL', metadataJson: '{"motivo":"cliente no responde"}', fechaCreacion: fechaRelativa(4, 21, 30) },
  { idEvento: 7, entidad: 'COMPROBANTE', entidadId: '6', accion: 'EMITIR', actorTipo: 'SISTEMA', idActor: null, canal: 'BATCH', metadataJson: '{"serie":"B001"}', fechaCreacion: fechaRelativa(6, 14, 15) },
  { idEvento: 8, entidad: 'ZONA_DELIVERY', entidadId: '4', accion: 'DESACTIVAR', actorTipo: 'ADMIN', idActor: 1, canal: 'PANEL', metadataJson: null, fechaCreacion: fechaRelativa(12, 11) },
];

export const LOGS_ERRORES_SEMILLA = [
  { idError: 1, fecha: fechaRelativa(0, 12, 4), statusCode: 404, error: 'Not Found', mensaje: 'Producto no encontrado', ruta: '/api/public/catalogo/productos/999', metodoHttp: 'GET', usuarioEmail: null, actorTipo: 'ANONIMO', requestId: 'req-90a1', exceptionClass: 'RecursoNoEncontradoException', ip: '190.0.0.11', userAgent: 'Mozilla/5.0', stacktraceResumen: 'RecursoNoEncontradoException: producto 999', detallesJson: null },
  { idError: 2, fecha: fechaRelativa(1, 19, 22), statusCode: 409, error: 'Conflict', mensaje: 'El pedido ya fue cancelado', ruta: '/api/admin/pedidos/7/estado', metodoHttp: 'PATCH', usuarioEmail: 'admin@bambino.demo', actorTipo: 'ADMIN', requestId: 'req-77c2', exceptionClass: 'EstadoInvalidoException', ip: '190.0.0.12', userAgent: 'Mozilla/5.0', stacktraceResumen: 'EstadoInvalidoException: transición no permitida', detallesJson: null },
  { idError: 3, fecha: fechaRelativa(3, 3, 4), statusCode: 500, error: 'Internal Server Error', mensaje: 'Espacio insuficiente en el destino', ruta: '/api/admin/backups/generar', metodoHttp: 'POST', usuarioEmail: null, actorTipo: 'SISTEMA', requestId: 'req-51f9', exceptionClass: 'IOException', ip: '127.0.0.1', userAgent: 'batch', stacktraceResumen: 'IOException: No space left on device', detallesJson: null },
  { idError: 4, fecha: fechaRelativa(5, 20, 10), statusCode: 401, error: 'Unauthorized', mensaje: 'Credenciales inválidas', ruta: '/api/auth/yo', metodoHttp: 'GET', usuarioEmail: null, actorTipo: 'ANONIMO', requestId: 'req-32b8', exceptionClass: 'BadCredentialsException', ip: '190.0.0.31', userAgent: 'Mozilla/5.0', stacktraceResumen: 'BadCredentialsException', detallesJson: null },
];

export const OPCIONES_CHATBOT_SEMILLA = [
  { id: 1, etiqueta: '¿Cuál es el horario de atención?', respuesta: 'Atendemos todos los días de 11:00 a 23:00, y los domingos hasta las 22:00.' },
  { id: 2, etiqueta: '¿Hacen delivery a mi zona?', respuesta: 'Cubrimos Villa Esperanza, Los Álamos y Nueva Aurora. Puedes revisar la cobertura y el costo en la sección de delivery.' },
  { id: 3, etiqueta: '¿Cuánto demora el pedido?', respuesta: 'Entre 30 y 55 minutos según la zona. En horas punta puede tomar un poco más.' },
  { id: 4, etiqueta: '¿Qué medios de pago aceptan?', respuesta: 'Tarjeta por la web, y efectivo o Yape contra entrega. En esta demostración ningún pago es real.' },
];
