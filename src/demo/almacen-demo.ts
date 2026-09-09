/**
 * Almacén en memoria que sustituye al backend en la demo pública.
 *
 * Reproduce el contrato de la API real (catálogo, carrito, pedidos, comprobantes
 * y panel administrativo) para que ni los servicios ni las páginas noten la
 * diferencia. El estado vive en memoria: al recargar vuelve a su punto de partida.
 */
import { CUENTAS_DEMO } from './demo.config';
import {
  AUDITORIA_SEMILLA,
  BACKUPS_SEMILLA,
  BACKUP_CONFIGURACION_SEMILLA,
  CATEGORIAS_SEMILLA,
  CategoriaDemo,
  CONFIGURACION_GLOBAL_SEMILLA,
  DIRECCIONES_SEMILLA,
  EMPRESA_SEMILLA,
  fechaRelativa,
  ID_CLIENTE_DEMO,
  LOGS_ERRORES_SEMILLA,
  OFERTAS_SEMILLA,
  OfertaDemo,
  OPCIONES_CHATBOT_SEMILLA,
  PEDIDOS_SEMILLA,
  PedidoDemo,
  PRODUCTOS_SEMILLA,
  ProductoDemo,
  SERIES_COMPROBANTE_SEMILLA,
  TRANSICIONES_SEMILLA,
  USUARIOS_SEMILLA,
  UsuarioDemo,
  ZONAS_DELIVERY_SEMILLA,
} from './datos-semilla';
import { imagenHero, imagenProducto } from './imagenes-demo';
import { cartaPdfDemo } from './carta-pdf-demo';

export class ErrorDemo extends Error {
  constructor(
    readonly status: number,
    mensaje: string
  ) {
    super(mensaje);
    this.name = 'ErrorDemo';
  }
}

function clonar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

function normalizar(texto: string | null | undefined): string {
  return (texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function ahora(): string {
  return new Date().toISOString();
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export interface ItemCarrito {
  idCarritoItem: number;
  idProducto: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  notas: string | null;
}

export class AlmacenDemo {
  private categorias: CategoriaDemo[] = [];
  private productos: ProductoDemo[] = [];
  private ofertas: OfertaDemo[] = [];
  private usuarios: UsuarioDemo[] = [];
  private direcciones: typeof DIRECCIONES_SEMILLA = [];
  private pedidos: PedidoDemo[] = [];
  private carrito: ItemCarrito[] = [];
  private zonas = clonar(ZONAS_DELIVERY_SEMILLA);
  private empresas = [clonar(EMPRESA_SEMILLA)];
  private configuracionGlobal = clonar(CONFIGURACION_GLOBAL_SEMILLA);
  private series = clonar(SERIES_COMPROBANTE_SEMILLA);
  private transiciones = clonar(TRANSICIONES_SEMILLA);
  private auditoria = clonar(AUDITORIA_SEMILLA);
  private logs = clonar(LOGS_ERRORES_SEMILLA);
  private backups = clonar(BACKUPS_SEMILLA);
  private backupConfiguracion = clonar(BACKUP_CONFIGURACION_SEMILLA);
  private secuencia = 1000;
  private sesionUsuarioId = ID_CLIENTE_DEMO;

  constructor() {
    this.reiniciar();
  }

  reiniciar(): void {
    this.categorias = clonar(CATEGORIAS_SEMILLA);
    this.productos = clonar(PRODUCTOS_SEMILLA);
    this.ofertas = clonar(OFERTAS_SEMILLA);
    this.usuarios = clonar(USUARIOS_SEMILLA);
    this.direcciones = clonar(DIRECCIONES_SEMILLA);
    this.pedidos = clonar(PEDIDOS_SEMILLA);
    this.carrito = [];
    this.zonas = clonar(ZONAS_DELIVERY_SEMILLA);
    this.empresas = [clonar(EMPRESA_SEMILLA)];
    this.configuracionGlobal = clonar(CONFIGURACION_GLOBAL_SEMILLA);
    this.series = clonar(SERIES_COMPROBANTE_SEMILLA);
    this.transiciones = clonar(TRANSICIONES_SEMILLA);
    this.auditoria = clonar(AUDITORIA_SEMILLA);
    this.logs = clonar(LOGS_ERRORES_SEMILLA);
    this.backups = clonar(BACKUPS_SEMILLA);
    this.backupConfiguracion = clonar(BACKUP_CONFIGURACION_SEMILLA);
    this.secuencia = 1000;
    this.sesionUsuarioId = ID_CLIENTE_DEMO;
  }

  private nuevoId(): number {
    this.secuencia += 1;
    return this.secuencia;
  }

  // ---------------------------------------------------------------- Sesión

  /** Valida el `Authorization: Basic` que envía la aplicación. */
  autenticarBasico(cabecera: string | null): UsuarioDemo {
    const token = (cabecera ?? '').replace(/^Basic\s+/i, '').trim();
    if (!token) throw new ErrorDemo(401, 'Sin credenciales.');

    let email = '';
    let password = '';
    try {
      const plano = atob(token);
      const corte = plano.indexOf(':');
      email = plano.slice(0, corte).trim().toLowerCase();
      password = plano.slice(corte + 1);
    } catch {
      throw new ErrorDemo(401, 'Credenciales mal formadas.');
    }

    const cuenta = CUENTAS_DEMO.find((c) => c.email === email && c.password === password);
    if (!cuenta) throw new ErrorDemo(401, 'Credenciales inválidas. Usa uno de los accesos de demostración.');

    const usuario = this.usuarios.find((u) => u.email === cuenta.email);
    if (!usuario) throw new ErrorDemo(401, 'Usuario no encontrado.');
    this.sesionUsuarioId = usuario.idUsuario;
    return usuario;
  }

  perfilSesion(cabecera: string | null) {
    const usuario = this.autenticarBasico(cabecera);
    return {
      idUsuario: usuario.idUsuario,
      usuario: usuario.email,
      email: usuario.email,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      telefono: usuario.telefono,
      docTipo: usuario.docTipo,
      docNumero: usuario.docNumero,
      rol: usuario.rol,
      roles: [usuario.rol],
      activo: usuario.activo,
    };
  }

  registrar(datos: { email?: string; nombres?: string; apellidos?: string; telefono?: string; docNumero?: string }) {
    const email = (datos.email ?? '').trim().toLowerCase();
    if (!email) throw new ErrorDemo(400, 'El correo es obligatorio.');
    if (this.usuarios.some((u) => normalizar(u.email) === normalizar(email))) {
      throw new ErrorDemo(409, 'Ya existe una cuenta con ese correo.');
    }
    const usuario: UsuarioDemo = {
      idUsuario: this.nuevoId(),
      email,
      nombres: datos.nombres ?? 'Vecino',
      apellidos: datos.apellidos ?? '',
      telefono: datos.telefono ?? null,
      docTipo: 'DNI',
      docNumero: datos.docNumero ?? null,
      rol: 'CLIENTE',
      activo: true,
      fechaCreacion: ahora(),
    };
    this.usuarios.unshift(usuario);
    return usuario;
  }

  // ---------------------------------------------------------------- Catálogo público

  listarCategorias(): CategoriaDemo[] {
    return this.categorias;
  }

  /** Aplica la oferta vigente sobre el precio base, como hace el backend real. */
  private conOferta(producto: ProductoDemo) {
    const oferta = this.ofertas.find((o) => o.activo && o.idProducto === producto.idProducto);
    if (!oferta) {
      return { ...producto, precioFinal: producto.precioBase, descuentoAplicado: 0, idOfertaActiva: null, ofertaNombre: null, ofertaTipo: null };
    }
    const descuento = oferta.tipo === 'PORCENTAJE' ? (producto.precioBase * oferta.valor) / 100 : oferta.valor;
    return {
      ...producto,
      precioFinal: redondear(Math.max(0, producto.precioBase - descuento)),
      descuentoAplicado: redondear(descuento),
      idOfertaActiva: oferta.idOferta,
      ofertaNombre: oferta.nombre,
      ofertaTipo: oferta.tipo,
    };
  }

  listarProductos(filtro: { filtro?: string; idCategoria?: string; busqueda?: string; q?: string } = {}) {
    let items = this.productos.map((p) => this.conOferta(p));

    if (filtro.idCategoria) {
      items = items.filter((p) => p.idCategoria === Number(filtro.idCategoria));
    }
    const texto = filtro.busqueda ?? filtro.q;
    if (texto) {
      items = items.filter((p) => normalizar(p.nombre).includes(normalizar(texto)) || normalizar(p.descripcion).includes(normalizar(texto)));
    }
    if (filtro.filtro === 'mas-pedidos') {
      items = [...items].sort((a, b) => b.vecesPedido - a.vecesPedido).slice(0, 8);
    } else {
      items = [...items].sort((a, b) => a.ordenVisual - b.ordenVisual);
    }
    return items;
  }

  obtenerProducto(idProducto: number) {
    const producto = this.productos.find((p) => p.idProducto === idProducto);
    if (!producto) throw new ErrorDemo(404, 'Producto no encontrado en la demo.');
    return this.conOferta(producto);
  }

  obtenerProductoPorSlug(slug: string) {
    const producto = this.productos.find((p) => p.slug === slug);
    if (!producto) throw new ErrorDemo(404, 'Producto no encontrado en la demo.');
    return this.conOferta(producto);
  }

  listarOfertas() {
    return this.ofertas.map((o) => ({
      ...o,
      productoNombre: this.productos.find((p) => p.idProducto === o.idProducto)?.nombre ?? null,
    }));
  }

  /** Estado derivado de la vigencia, como en el panel real. */
  private estadoOferta(oferta: OfertaDemo): string {
    if (!oferta.activo) return 'INACTIVA';
    const ahoraMs = Date.now();
    if (oferta.fechaFin && new Date(oferta.fechaFin).getTime() < ahoraMs) return 'EXPIRADA';
    if (oferta.fechaInicio && new Date(oferta.fechaInicio).getTime() > ahoraMs) return 'PROGRAMADA';
    return 'ACTIVA';
  }

  /**
   * El panel administrativo maneja un contrato distinto al del catálogo público:
   * `valorDescuento`, `estado` como enumerado, `idsProductos` y `MONTO_FIJO`.
   */
  listarOfertasAdmin() {
    return this.ofertas.map((oferta) => ({
      idOferta: oferta.idOferta,
      nombre: oferta.nombre,
      tipo: oferta.tipo === 'MONTO' ? 'MONTO_FIJO' : 'PORCENTAJE',
      valorDescuento: oferta.valor,
      precioEspecial: null,
      estado: this.estadoOferta(oferta),
      fechaInicio: oferta.fechaInicio ?? '',
      fechaFin: oferta.fechaFin ?? '',
      idsProductos: oferta.idProducto != null ? [oferta.idProducto] : [],
    }));
  }

  listarProductosEnOferta() {
    const conOferta = this.ofertas.filter((o) => o.activo).map((o) => o.idProducto);
    return this.productos.filter((p) => conOferta.includes(p.idProducto)).map((p) => this.conOferta(p));
  }

  // ---------------------------------------------------------------- Carrito

  listarCarrito(): ItemCarrito[] {
    return this.carrito;
  }

  agregarAlCarrito(idProducto: number, cantidad = 1, notas: string | null = null): ItemCarrito[] {
    const producto = this.productos.find((p) => p.idProducto === Number(idProducto));
    if (!producto) throw new ErrorDemo(404, 'Producto no encontrado en la demo.');
    if (!producto.disponible) throw new ErrorDemo(409, 'Este producto no está disponible.');

    const existente = this.carrito.find((i) => i.idProducto === producto.idProducto);
    if (existente) {
      existente.cantidad += Number(cantidad) || 1;
    } else {
      this.carrito.push({
        idCarritoItem: this.nuevoId(),
        idProducto: producto.idProducto,
        nombre: producto.nombre,
        cantidad: Number(cantidad) || 1,
        precioUnitario: this.conOferta(producto).precioFinal ?? producto.precioBase,
        notas,
      });
    }
    return this.carrito;
  }

  actualizarItemCarrito(idCarritoItem: number, cantidad: number): ItemCarrito[] {
    const item = this.carrito.find((i) => i.idCarritoItem === Number(idCarritoItem));
    if (!item) throw new ErrorDemo(404, 'El ítem no está en el carrito.');
    if (Number(cantidad) <= 0) {
      return this.eliminarItemCarrito(idCarritoItem);
    }
    item.cantidad = Number(cantidad);
    return this.carrito;
  }

  eliminarItemCarrito(idCarritoItem: number): ItemCarrito[] {
    this.carrito = this.carrito.filter((i) => i.idCarritoItem !== Number(idCarritoItem));
    return this.carrito;
  }

  vaciarCarrito(): ItemCarrito[] {
    this.carrito = [];
    return this.carrito;
  }

  // ---------------------------------------------------------------- Pedidos

  listarPedidosCliente(): PedidoDemo[] {
    return this.pedidos
      .filter((p) => p.idUsuario === this.sesionUsuarioId)
      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
  }

  obtenerPedido(idPedido: number): PedidoDemo {
    const pedido = this.pedidos.find((p) => p.idPedido === Number(idPedido));
    if (!pedido) throw new ErrorDemo(404, 'Pedido no encontrado en la demo.');
    return pedido;
  }

  listarPedidosAdmin() {
    return [...this.pedidos]
      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
      .map((p) => ({
        idPedido: p.idPedido,
        codigoPedido: p.codigoPedido,
        estadoActual: p.estadoActual,
        modalidad: p.modalidad,
        tipoComprobante: p.tipoComprobante,
        subtotal: p.subtotal,
        descuentoTotal: p.descuentoTotal,
        impuestoTotal: p.impuestoTotal,
        total: p.total,
        fechaCreacion: p.fechaCreacion,
      }));
  }

  cambiarEstadoPedido(idPedido: number, estado: string): PedidoDemo {
    const pedido = this.obtenerPedido(idPedido);
    if (pedido.estadoActual === 'ENTREGADO' || pedido.estadoActual === 'CANCELADO') {
      throw new ErrorDemo(409, 'El pedido ya está cerrado.');
    }
    pedido.estadoActual = estado;
    this.auditoria.unshift({
      idEvento: this.nuevoId(),
      entidad: 'PEDIDO',
      entidadId: String(pedido.idPedido),
      accion: 'CAMBIO_ESTADO',
      actorTipo: 'ADMIN',
      idActor: 1,
      canal: 'PANEL',
      metadataJson: JSON.stringify({ estado }),
      fechaCreacion: ahora(),
    });
    return pedido;
  }

  /** Convierte el carrito en un pedido, como haría el checkout real. */
  crearPedido(datos: { modalidad?: string; tipoComprobante?: string } = {}): PedidoDemo {
    if (!this.carrito.length) throw new ErrorDemo(409, 'El carrito está vacío.');

    const items = this.carrito.map((i) => ({
      idProducto: i.idProducto,
      nombre: i.nombre,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario,
    }));
    const bruto = items.reduce((acc, i) => acc + i.precioUnitario * i.cantidad, 0);
    const subtotal = redondear(bruto / (1 + this.configuracionGlobal.igvPorcentaje / 100));

    const pedido: PedidoDemo = {
      idPedido: this.nuevoId(),
      idUsuario: this.sesionUsuarioId,
      codigoPedido: `BMB-${String(this.secuencia).padStart(5, '0')}`,
      estadoActual: 'PENDIENTE',
      modalidad: datos.modalidad ?? 'DELIVERY',
      tipoComprobante: datos.tipoComprobante ?? 'BOLETA',
      subtotal,
      descuentoTotal: 0,
      impuestoTotal: redondear(bruto - subtotal),
      total: redondear(bruto),
      fechaCreacion: ahora(),
      items,
    };

    this.pedidos.unshift(pedido);
    this.vaciarCarrito();
    return pedido;
  }

  // ---------------------------------------------------------------- Comprobantes y pagos

  private comprobanteDe(pedido: PedidoDemo) {
    const serie = pedido.tipoComprobante === 'FACTURA' ? 'F001' : 'B001';
    const usuario = this.usuarios.find((u) => u.idUsuario === pedido.idUsuario);
    return {
      idComprobante: pedido.idPedido,
      idPedido: pedido.idPedido,
      tipo: pedido.tipoComprobante,
      serie,
      correlativo: pedido.idPedido,
      numeroCompleto: `${serie}-${String(pedido.idPedido).padStart(6, '0')}`,
      estado: pedido.estadoActual === 'CANCELADO' ? 'ANULADO' : 'EMITIDO',
      docReceptorTipo: usuario?.docTipo ?? 'DNI',
      docReceptorNumero: usuario?.docNumero ?? '00000000',
      razonSocialReceptor: usuario ? `${usuario.nombres} ${usuario.apellidos}`.trim() : 'Cliente demo',
      direccionFiscalReceptor: 'Jr. Las Begonias 240',
      subtotal: pedido.subtotal,
      impuestoTotal: pedido.impuestoTotal,
      total: pedido.total,
      fechaEmision: pedido.fechaCreacion,
      correoEnviado: pedido.idPedido % 2 === 0,
      correoDestino: usuario?.email ?? null,
      fechaCorreoEnvio: pedido.idPedido % 2 === 0 ? pedido.fechaCreacion : null,
      correoError: null,
      pdfPath: `/demo/comprobantes/${serie}-${pedido.idPedido}.pdf`,
      pdfToken: `demo-${pedido.idPedido}`,
      fechaPdfGenerado: pedido.fechaCreacion,
      detalle: pedido.items.map((i, indice) => ({
        idComprobanteDetalle: pedido.idPedido * 100 + indice,
        descripcionItem: i.nombre,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        descuentoUnitario: 0,
        subtotalLinea: redondear(i.precioUnitario * i.cantidad),
      })),
    };
  }

  listarComprobantes() {
    return this.pedidos.filter((p) => p.estadoActual !== 'PENDIENTE').map((p) => this.comprobanteDe(p));
  }

  comprobantePorPedido(idPedido: number) {
    return this.comprobanteDe(this.obtenerPedido(idPedido));
  }

  marcarCorreoEnviado(idComprobante: number) {
    const pedido = this.obtenerPedido(idComprobante);
    return { ...this.comprobanteDe(pedido), correoEnviado: true, fechaCorreoEnvio: ahora() };
  }

  listarPagos() {
    return this.pedidos
      .filter((p) => p.estadoActual !== 'PENDIENTE')
      .map((p) => ({
        idPago: p.idPedido,
        idPedido: p.idPedido,
        metodo: p.idPedido % 3 === 0 ? 'EFECTIVO' : 'TARJETA',
        estado: p.estadoActual === 'CANCELADO' ? 'REEMBOLSADO' : 'PAGADO',
        monto: p.total,
        proveedor: p.idPedido % 3 === 0 ? null : 'culqi-demo',
        proveedorTxnId: p.idPedido % 3 === 0 ? null : `txn_demo_${p.idPedido}`,
        idempotencyKey: `idem-${p.idPedido}`,
        urlPago: null,
        fechaCreacion: p.fechaCreacion,
        fechaActualizacion: p.fechaCreacion,
      }));
  }

  // ---------------------------------------------------------------- Cliente

  perfilCliente() {
    const usuario = this.usuarios.find((u) => u.idUsuario === this.sesionUsuarioId);
    if (!usuario) throw new ErrorDemo(404, 'Perfil no disponible.');
    return {
      idUsuario: usuario.idUsuario,
      email: usuario.email,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      telefono: usuario.telefono,
      docTipo: usuario.docTipo,
      docNumero: usuario.docNumero,
    };
  }

  listarDirecciones() {
    return this.direcciones.filter((d) => d.idUsuario === this.sesionUsuarioId);
  }

  crearDireccion(datos: Record<string, unknown>) {
    const direccion = {
      idDireccion: this.nuevoId(),
      idUsuario: this.sesionUsuarioId,
      alias: String(datos['alias'] ?? 'Nueva dirección'),
      direccion: String(datos['direccion'] ?? ''),
      referencia: (datos['referencia'] as string) ?? null,
      distrito: String(datos['distrito'] ?? ''),
      principal: this.listarDirecciones().length === 0,
      latitud: Number(datos['latitud'] ?? -12.05),
      longitud: Number(datos['longitud'] ?? -77.04),
    };
    if (!direccion.direccion.trim()) throw new ErrorDemo(400, 'La dirección es obligatoria.');
    this.direcciones.push(direccion);
    return direccion;
  }

  actualizarDireccion(idDireccion: number, datos: Record<string, unknown>) {
    const direccion = this.direcciones.find((d) => d.idDireccion === Number(idDireccion));
    if (!direccion) throw new ErrorDemo(404, 'Dirección no encontrada.');
    Object.assign(direccion, {
      alias: datos['alias'] ?? direccion.alias,
      direccion: datos['direccion'] ?? direccion.direccion,
      referencia: datos['referencia'] ?? direccion.referencia,
      distrito: datos['distrito'] ?? direccion.distrito,
    });
    return direccion;
  }

  eliminarDireccion(idDireccion: number) {
    const direccion = this.direcciones.find((d) => d.idDireccion === Number(idDireccion));
    if (!direccion) throw new ErrorDemo(404, 'Dirección no encontrada.');
    this.direcciones = this.direcciones.filter((d) => d.idDireccion !== Number(idDireccion));
    return { eliminado: true };
  }

  marcarDireccionPrincipal(idDireccion: number) {
    const direccion = this.direcciones.find((d) => d.idDireccion === Number(idDireccion));
    if (!direccion) throw new ErrorDemo(404, 'Dirección no encontrada.');
    this.direcciones.filter((d) => d.idUsuario === direccion.idUsuario).forEach((d) => (d.principal = false));
    direccion.principal = true;
    return direccion;
  }

  // ---------------------------------------------------------------- Administración

  listarUsuarios() {
    return this.usuarios;
  }

  cambiarEstadoUsuario(idUsuario: number, activo: boolean) {
    const usuario = this.usuarios.find((u) => u.idUsuario === Number(idUsuario));
    if (!usuario) throw new ErrorDemo(404, 'Usuario no encontrado.');
    usuario.activo = Boolean(activo);
    return usuario;
  }

  cambiarRolUsuario(idUsuario: number, rol: string) {
    const usuario = this.usuarios.find((u) => u.idUsuario === Number(idUsuario));
    if (!usuario) throw new ErrorDemo(404, 'Usuario no encontrado.');
    usuario.rol = rol;
    return usuario;
  }

  listarRoles() {
    return [
      { idRol: 1, nombre: 'ADMIN' },
      { idRol: 2, nombre: 'COCINA' },
      { idRol: 3, nombre: 'CLIENTE' },
    ];
  }

  crearProducto(datos: Record<string, unknown>) {
    const nombre = String(datos['nombre'] ?? '').trim();
    if (!nombre) throw new ErrorDemo(400, 'El nombre del producto es obligatorio.');
    const idCategoria = Number(datos['idCategoria'] ?? this.categorias[0].idCategoria);
    const producto: ProductoDemo = {
      idProducto: this.nuevoId(),
      nombre,
      slug: normalizar(nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      descripcion: (datos['descripcion'] as string) ?? null,
      idCategoria,
      categoriaNombre: this.categorias.find((c) => c.idCategoria === idCategoria)?.nombre ?? '',
      precioBase: Number(datos['precioBase'] ?? 0),
      visibleWeb: datos['visibleWeb'] !== false,
      disponible: datos['disponible'] !== false,
      estado: 'ACTIVO',
      imagenUrl: (datos['imagenUrl'] as string) || imagenProducto(nombre, idCategoria),
      ordenVisual: this.productos.length + 1,
      vecesPedido: 0,
    };
    this.productos.unshift(producto);
    return producto;
  }

  actualizarProducto(idProducto: number, datos: Record<string, unknown>) {
    const producto = this.productos.find((p) => p.idProducto === Number(idProducto));
    if (!producto) throw new ErrorDemo(404, 'Producto no encontrado.');
    const idCategoria = Number(datos['idCategoria'] ?? producto.idCategoria);
    Object.assign(producto, {
      nombre: datos['nombre'] ?? producto.nombre,
      descripcion: datos['descripcion'] ?? producto.descripcion,
      idCategoria,
      categoriaNombre: this.categorias.find((c) => c.idCategoria === idCategoria)?.nombre ?? producto.categoriaNombre,
      precioBase: datos['precioBase'] != null ? Number(datos['precioBase']) : producto.precioBase,
      visibleWeb: datos['visibleWeb'] != null ? Boolean(datos['visibleWeb']) : producto.visibleWeb,
      disponible: datos['disponible'] != null ? Boolean(datos['disponible']) : producto.disponible,
    });
    return producto;
  }

  crearCategoria(datos: Record<string, unknown>) {
    const nombre = String(datos['nombre'] ?? '').trim();
    if (!nombre) throw new ErrorDemo(400, 'El nombre de la categoría es obligatorio.');
    const categoria: CategoriaDemo = {
      idCategoria: this.nuevoId(),
      nombre,
      descripcion: (datos['descripcion'] as string) ?? null,
      ordenVisual: this.categorias.length + 1,
      activa: true,
    };
    this.categorias.push(categoria);
    return categoria;
  }

  actualizarCategoria(idCategoria: number, datos: Record<string, unknown>) {
    const categoria = this.categorias.find((c) => c.idCategoria === Number(idCategoria));
    if (!categoria) throw new ErrorDemo(404, 'Categoría no encontrada.');
    Object.assign(categoria, {
      nombre: datos['nombre'] ?? categoria.nombre,
      descripcion: datos['descripcion'] ?? categoria.descripcion,
      activa: datos['activa'] != null ? Boolean(datos['activa']) : categoria.activa,
    });
    this.productos
      .filter((p) => p.idCategoria === categoria.idCategoria)
      .forEach((p) => (p.categoriaNombre = categoria.nombre));
    return categoria;
  }

  /** Traduce el contrato del panel al modelo interno de la demo. */
  private desdePayloadOferta(datos: Record<string, unknown>, base?: OfertaDemo): OfertaDemo {
    const productos = (datos['idsProductos'] as number[]) ?? null;
    const tipoPanel = String(datos['tipo'] ?? base?.tipo ?? 'PORCENTAJE');
    return {
      idOferta: base?.idOferta ?? this.nuevoId(),
      nombre: String(datos['nombre'] ?? base?.nombre ?? 'Oferta'),
      descripcion: (datos['descripcion'] as string) ?? base?.descripcion ?? null,
      tipo: tipoPanel.startsWith('MONTO') ? 'MONTO' : 'PORCENTAJE',
      valor: Number(datos['valorDescuento'] ?? datos['valor'] ?? base?.valor ?? 0),
      idProducto:
        productos?.length ? Number(productos[0])
        : datos['idProducto'] != null ? Number(datos['idProducto'])
        : base?.idProducto ?? null,
      activo:
        datos['estado'] != null ? String(datos['estado']) === 'ACTIVA'
        : datos['activo'] != null ? Boolean(datos['activo'])
        : base?.activo ?? true,
      fechaInicio: (datos['fechaInicio'] as string) ?? base?.fechaInicio ?? ahora(),
      fechaFin: (datos['fechaFin'] as string) ?? base?.fechaFin ?? null,
    };
  }

  crearOferta(datos: Record<string, unknown>) {
    const oferta = this.desdePayloadOferta(datos);
    if (!oferta.nombre.trim()) throw new ErrorDemo(400, 'El nombre de la oferta es obligatorio.');
    this.ofertas.unshift(oferta);
    return oferta;
  }

  actualizarOferta(idOferta: number, datos: Record<string, unknown>) {
    const oferta = this.ofertas.find((o) => o.idOferta === Number(idOferta));
    if (!oferta) throw new ErrorDemo(404, 'Oferta no encontrada.');
    Object.assign(oferta, this.desdePayloadOferta(datos, oferta));
    return oferta;
  }

  obtenerConfiguracionGlobal() {
    return this.configuracionGlobal;
  }

  actualizarConfiguracionGlobal(datos: Record<string, unknown>) {
    Object.assign(this.configuracionGlobal, datos, { idConfig: this.configuracionGlobal.idConfig });
    return this.configuracionGlobal;
  }

  listarEmpresas() {
    return this.empresas;
  }

  listarSeries() {
    return this.series;
  }

  listarTransiciones() {
    return this.transiciones;
  }

  listarZonas() {
    return this.zonas;
  }

  crearZona(datos: Record<string, unknown>) {
    const zona = { ...this.zonas[0], ...datos, idZona: this.nuevoId() } as (typeof ZONAS_DELIVERY_SEMILLA)[number];
    if (!String(zona.nombre ?? '').trim()) throw new ErrorDemo(400, 'El nombre de la zona es obligatorio.');
    this.zonas.push(zona);
    return zona;
  }

  actualizarZona(idZona: number, datos: Record<string, unknown>) {
    const zona = this.zonas.find((z) => z.idZona === Number(idZona));
    if (!zona) throw new ErrorDemo(404, 'Zona no encontrada.');
    Object.assign(zona, datos, { idZona: zona.idZona });
    return zona;
  }

  /** El panel espera la lista de eventos, no una página. */
  listarAuditoria(filtros: { entidad?: string; accion?: string; actorTipo?: string } = {}) {
    return this.auditoria
      .filter(
        (e) =>
          (!filtros.entidad || e.entidad === filtros.entidad) &&
          (!filtros.accion || e.accion === filtros.accion) &&
          (!filtros.actorTipo || e.actorTipo === filtros.actorTipo)
      )
      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
  }

  listarLogs(filtros: { statusCode?: number; page?: number; size?: number } = {}) {
    const items = this.logs.filter((l) => !filtros.statusCode || l.statusCode === Number(filtros.statusCode));
    return this.paginar(items, Number(filtros.page ?? 0), Number(filtros.size ?? 20));
  }

  obtenerLog(idError: number) {
    const log = this.logs.find((l) => l.idError === Number(idError));
    if (!log) throw new ErrorDemo(404, 'Registro no encontrado.');
    return log;
  }

  private paginar<T>(items: T[], page: number, size: number) {
    const tamano = Math.max(1, size);
    const pagina = Math.max(0, page);
    const totalPages = Math.ceil(items.length / tamano);
    return {
      content: items.slice(pagina * tamano, pagina * tamano + tamano),
      totalElements: items.length,
      totalPages,
      size: tamano,
      number: pagina,
      first: pagina === 0,
      last: totalPages === 0 || pagina >= totalPages - 1,
    };
  }

  obtenerBackupConfiguracion() {
    return this.backupConfiguracion;
  }

  actualizarBackupConfiguracion(datos: Record<string, unknown>) {
    Object.assign(this.backupConfiguracion, datos, { fechaActualizacion: ahora() });
    return this.backupConfiguracion;
  }

  listarBackups() {
    return this.backups;
  }

  generarBackup() {
    const fecha = new Date();
    const backup = {
      idBackup: this.nuevoId(),
      nombreArchivo: `bambino-${fecha.toISOString().slice(0, 10)}-manual.sql.gz`,
      rutaArchivo: `${this.backupConfiguracion.rutaDestino}/manual.sql.gz`,
      tamanioBytes: 4830000,
      estado: 'COMPLETADO' as const,
      mensajeError: null,
      fechaInicio: ahora(),
      fechaFin: ahora(),
      tipoDisparo: 'MANUAL' as const,
    };
    this.backups.unshift(backup);
    return backup;
  }

  eliminarBackup(idBackup: number) {
    const existe = this.backups.some((b) => b.idBackup === Number(idBackup));
    if (!existe) throw new ErrorDemo(404, 'Copia no encontrada.');
    this.backups = this.backups.filter((b) => b.idBackup !== Number(idBackup));
    return { eliminado: true };
  }

  obtenerBackupPreview(idBackup: number) {
    const backup = this.backups.find((b) => b.idBackup === Number(idBackup));
    if (!backup) throw new ErrorDemo(404, 'Copia no encontrada.');
    return {
      idBackup: backup.idBackup,
      nombreArchivo: backup.nombreArchivo,
      tamanioBytes: backup.tamanioBytes,
      estado: backup.estado,
      fechaInicio: backup.fechaInicio,
      fechaFin: backup.fechaFin,
      tablas: ['usuarios', 'productos', 'categorias', 'pedidos', 'pedido_detalle', 'comprobantes', 'pagos'],
      primerasLineas: [
        '-- Copia de demostración de Bambino Chicken',
        '-- Los datos son ficticios y se generan en el navegador',
        'SET NAMES utf8mb4;',
      ],
    };
  }

  // ---------------------------------------------------------------- Público varios

  ubicacionPrincipal() {
    return {
      nombre: EMPRESA_SEMILLA.nombreComercial,
      direccion: EMPRESA_SEMILLA.direccionFiscal,
      latitud: -12.048,
      longitud: -77.031,
      telefono: EMPRESA_SEMILLA.telefono,
      horario: 'Todos los días de 11:00 a 23:00',
      zonas: this.zonas.filter((z) => z.activo),
    };
  }

  opcionesChatbot() {
    return OPCIONES_CHATBOT_SEMILLA;
  }

  consultarDocumento(numero: string) {
    const usuario = this.usuarios.find((u) => u.docNumero === numero);
    if (!usuario) throw new ErrorDemo(404, 'Documento no encontrado en el padrón de la demo.');
    return {
      tipo: usuario.docTipo,
      numero: usuario.docNumero,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      nombreCompleto: `${usuario.nombres} ${usuario.apellidos}`.trim(),
    };
  }

  prefillLibroReclamaciones() {
    const usuario = this.usuarios.find((u) => u.idUsuario === this.sesionUsuarioId);
    return {
      nombres: usuario?.nombres ?? '',
      apellidos: usuario?.apellidos ?? '',
      docTipo: usuario?.docTipo ?? 'DNI',
      docNumero: usuario?.docNumero ?? '',
      correo: usuario?.email ?? '',
      telefono: usuario?.telefono ?? '',
    };
  }

  configuracionCulqi() {
    return { llavePublica: 'pk_test_demo', habilitado: false, mensaje: 'Pagos deshabilitados en la demostración.' };
  }

  /**
   * Contrato completo de una media: el panel administrativo procesa todos estos
   * campos al cargarla, y si falta alguno la pantalla falla al construir su
   * formulario.
   */
  media(clave: string) {
    const base = {
      idMedia: 1,
      clave,
      mediaKey: clave,
      nombre: '',
      descripcion: '',
      tipo: 'IMAGEN' as 'IMAGEN' | 'PDF' | 'VIDEO',
      url: '',
      publicId: '',
      versionTag: null as string | null,
      activa: false,
      actualizadoEn: fechaRelativa(20),
    };

    if (clave === 'CARTA_PDF') {
      return {
        ...base,
        idMedia: 2,
        nombre: 'Carta en PDF',
        descripcion: 'Carta de demostración generada en el navegador.',
        tipo: 'PDF' as const,
        url: cartaPdfDemo(),
        activa: true,
        actualizadoEn: fechaRelativa(10),
      };
    }

    if (clave === 'HOME_HERO_BANNER') {
      return {
        ...base,
        nombre: 'Portada de inicio',
        descripcion: 'Ilustración de demostración generada en el navegador.',
        url: imagenHero(),
        activa: true,
      };
    }

    return { ...base, nombre: clave, descripcion: 'Sin contenido en la demostración.' };
  }
}

/** Instancia única usada por el interceptor durante toda la sesión de la demo. */
export const almacenDemo = new AlmacenDemo();
