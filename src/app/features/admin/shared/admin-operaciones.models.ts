export interface AdminPedido {
  idPedido: number;
  codigoPedido: string | null;
  estadoActual: string | null;
  modalidad: string | null;
  tipoComprobante: string | null;
  subtotal: number;
  descuentoTotal: number;
  impuestoTotal: number;
  total: number;
  fechaCreacion: string | null;
}

export interface AdminPago {
  idPago: number;
  idPedido: number;
  metodo: string | null;
  estado: string | null;
  monto: number;
  proveedor: string | null;
  proveedorTxnId: string | null;
  idempotencyKey: string | null;
  urlPago: string | null;
  fechaCreacion: string | null;
  fechaActualizacion: string | null;
}

export interface AdminComprobanteDetalle {
  idComprobanteDetalle: number;
  descripcionItem: string | null;
  cantidad: number;
  precioUnitario: number;
  descuentoUnitario: number;
  subtotalLinea: number;
}

export interface AdminComprobante {
  idComprobante: number;
  idPedido: number;
  tipo: string | null;
  serie: string | null;
  correlativo: number | null;
  numeroCompleto: string | null;
  estado: string | null;
  docReceptorTipo: string | null;
  docReceptorNumero: string | null;
  razonSocialReceptor: string | null;
  direccionFiscalReceptor: string | null;
  subtotal: number;
  impuestoTotal: number;
  total: number;
  fechaEmision: string | null;
  correoEnviado: boolean;
  correoDestino: string | null;
  fechaCorreoEnvio: string | null;
  correoError: string | null;
  pdfPath: string | null;
  pdfToken: string | null;
  fechaPdfGenerado: string | null;
  detalle: AdminComprobanteDetalle[];
}

export interface ConfiguracionGlobal {
  idConfig: number;
  moneda: string;
  igvPorcentaje: number;
  deliveryMontoMinimo: number;
  deliveryTiempoMinMinutos: number;
  deliveryTiempoMaxMinutos: number;
  timezone: string;
}

export interface ZonaDelivery {
  idZona: number | null;
  nombre: string;
  activo: boolean;
  tarifaBase: number;
  montoMinimo: number;
  tiempoEstimadoMinutos: number;
  coberturaDescripcion: string | null;
  mapaEmbedUrl: string | null;
  latitudCentro: number | null;
  longitudCentro: number | null;
  radioKm: number | null;
  horaInicioAtencion: string | null;
  horaFinAtencion: string | null;
}

export interface EmpresaAdmin {
  idEmpresa: number;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  direccionFiscal: string;
  telefono: string | null;
  correo: string | null;
  activo: boolean;
}

export interface SerieComprobanteAdmin {
  idSerie: number;
  idEmpresa: number;
  tipoComprobante: string;
  serie: string;
  correlativoActual: number;
  activo: boolean;
}

export interface TransicionPedidoAdmin {
  idTransicion: number;
  estadoOrigen: string | null;
  estadoDestino: string;
  actorTipo: string;
  activo: boolean;
}

export interface AuditoriaEvento {
  idEvento: number;
  entidad: string;
  entidadId: string;
  accion: string;
  actorTipo: string | null;
  idActor: number | null;
  canal: string | null;
  metadataJson: string | null;
  fechaCreacion: string | null;
}

export interface AdminPageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface ErrorLogResumen {
  idError: number;
  fecha: string | null;
  statusCode: number;
  error: string | null;
  mensaje: string | null;
  ruta: string | null;
  metodoHttp: string | null;
  usuarioEmail: string | null;
  actorTipo: string | null;
  requestId: string | null;
  exceptionClass: string | null;
}

export interface ErrorLogDetalle extends ErrorLogResumen {
  ip: string | null;
  userAgent: string | null;
  stacktraceResumen: string | null;
  detallesJson: string | null;
}

export interface ErrorLogFiltros {
  statusCode?: number | null;
  desde?: string | null;
  hasta?: string | null;
  ruta?: string | null;
  usuarioEmail?: string | null;
  exceptionClass?: string | null;
  page?: number;
  size?: number;
}

export interface BackupConfiguracion {
  idConfig: number;
  activo: boolean;
  horaEjecucion: string;
  retencionCantidad: number;
  rutaDestino: string;
  fechaActualizacion: string | null;
}

export interface BackupHistorial {
  idBackup: number;
  nombreArchivo: string;
  rutaArchivo: string;
  tamanioBytes: number;
  estado: 'GENERANDO' | 'COMPLETADO' | 'ERROR';
  mensajeError: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  tipoDisparo: 'MANUAL' | 'AUTOMATICO';
}

export interface BackupPreview {
  idBackup: number;
  nombreArchivo: string;
  tamanioBytes: number;
  estado: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  tablas: string[];
  primerasLineas: string[];
}
