import { beforeEach, describe, expect, it } from 'vitest';
import { AlmacenDemo } from './almacen-demo';
import { tokenBasico } from './demo.config';

const BASIC_CLIENTE = `Basic ${tokenBasico('cliente@bambino.demo', 'demo1234')}`;
const BASIC_ADMIN = `Basic ${tokenBasico('admin@bambino.demo', 'demo1234')}`;

describe('AlmacenDemo', () => {
  let almacen: AlmacenDemo;

  beforeEach(() => {
    almacen = new AlmacenDemo();
  });

  describe('sesión', () => {
    it('acepta una cuenta de demo por Basic auth', () => {
      expect(almacen.perfilSesion(BASIC_ADMIN).rol).toBe('ADMIN');
    });

    it('rechaza credenciales inválidas', () => {
      expect(() => almacen.perfilSesion(`Basic ${btoa('otro@correo.com:x')}`)).toThrowError(/credenciales/i);
    });

    it('rechaza una petición sin cabecera', () => {
      expect(() => almacen.perfilSesion(null)).toThrowError(/credenciales/i);
    });

    it('al entrar cambia de quién son los pedidos', () => {
      almacen.perfilSesion(BASIC_CLIENTE);
      const mios = almacen.listarPedidosCliente();

      expect(mios.length).toBeGreaterThan(0);
      expect(mios.every((p) => p.codigoPedido.startsWith('BMB-'))).toBe(true);
    });

    it('no deja registrar dos veces el mismo correo', () => {
      expect(() => almacen.registrar({ email: 'admin@bambino.demo' })).toThrowError(/correo/i);
    });
  });

  describe('catálogo', () => {
    it('ordena la carta por el orden visual', () => {
      const productos = almacen.listarProductos({ idCategoria: '1' });
      const ordenes = productos.map((p) => p.ordenVisual);

      expect([...ordenes].sort((a, b) => a - b)).toEqual(ordenes);
    });

    it('aplica la oferta de porcentaje sobre el precio base', () => {
      const pollo = almacen.obtenerProducto(1); // 20% de descuento

      expect(pollo.precioBase).toBe(69.9);
      expect(pollo.precioFinal).toBe(55.92);
      expect(pollo.ofertaNombre).toBe('Martes de brasa');
    });

    it('aplica la oferta de monto fijo', () => {
      const broaster = almacen.obtenerProducto(5); // S/ 10 de descuento

      // El almacén redondea a dos decimales, como los importes de la API.
      expect(broaster.precioFinal).toBe(54.9);
      expect(broaster.descuentoAplicado).toBe(10);
    });

    it('deja el precio intacto cuando no hay oferta vigente', () => {
      const papas = almacen.obtenerProducto(12);

      expect(papas.precioFinal).toBe(papas.precioBase);
      expect(papas.idOfertaActiva).toBeNull();
    });

    it('el filtro de más pedidos devuelve los más solicitados primero', () => {
      const top = almacen.listarProductos({ filtro: 'mas-pedidos' });

      expect(top.length).toBeLessThanOrEqual(8);
      expect(top[0].vecesPedido).toBeGreaterThanOrEqual(top[top.length - 1].vecesPedido);
    });

    it('busca por nombre sin distinguir acentos ni mayúsculas', () => {
      expect(almacen.listarProductos({ busqueda: 'SALCHIPAPA' }).length).toBe(1);
    });

    it('resuelve un producto por su slug', () => {
      expect(almacen.obtenerProductoPorSlug('medio-pollo-a-la-brasa').idProducto).toBe(2);
    });

    it('devuelve 404 para un producto inexistente', () => {
      expect(() => almacen.obtenerProducto(9999)).toThrowError(/no encontrado/i);
    });
  });

  describe('carrito', () => {
    it('agrega un producto con el precio de oferta', () => {
      almacen.agregarAlCarrito(1, 1);
      expect(almacen.listarCarrito()[0].precioUnitario).toBe(55.92);
    });

    it('suma la cantidad si el producto ya estaba', () => {
      almacen.agregarAlCarrito(12, 1);
      almacen.agregarAlCarrito(12, 2);

      expect(almacen.listarCarrito()).toHaveLength(1);
      expect(almacen.listarCarrito()[0].cantidad).toBe(3);
    });

    it('cambiar la cantidad a cero retira el ítem', () => {
      almacen.agregarAlCarrito(12, 2);
      const item = almacen.listarCarrito()[0];
      almacen.actualizarItemCarrito(item.idCarritoItem, 0);

      expect(almacen.listarCarrito()).toHaveLength(0);
    });

    it('no permite agregar un producto no disponible', () => {
      expect(() => almacen.agregarAlCarrito(22, 1)).toThrowError(/disponible/i);
    });
  });

  describe('pedidos', () => {
    it('convierte el carrito en un pedido pendiente y lo vacía', () => {
      almacen.perfilSesion(BASIC_CLIENTE);
      almacen.agregarAlCarrito(2, 1);
      almacen.agregarAlCarrito(16, 1);

      const pedido = almacen.crearPedido({ modalidad: 'DELIVERY' });

      expect(pedido.estadoActual).toBe('PENDIENTE');
      expect(pedido.items).toHaveLength(2);
      expect(almacen.listarCarrito()).toHaveLength(0);
      expect(almacen.listarPedidosCliente()[0].idPedido).toBe(pedido.idPedido);
    });

    it('el impuesto y el subtotal suman el total', () => {
      almacen.agregarAlCarrito(2, 1);
      const pedido = almacen.crearPedido();

      expect(Math.round((pedido.subtotal + pedido.impuestoTotal) * 100) / 100).toBe(pedido.total);
    });

    it('no deja crear un pedido con el carrito vacío', () => {
      expect(() => almacen.crearPedido()).toThrowError(/vac/i);
    });

    it('cambiar el estado deja rastro en la auditoría', () => {
      const antes = almacen.listarAuditoria().totalElements;
      almacen.cambiarEstadoPedido(12, 'CONFIRMADO');

      expect(almacen.obtenerPedido(12).estadoActual).toBe('CONFIRMADO');
      expect(almacen.listarAuditoria().totalElements).toBe(antes + 1);
    });

    it('no permite mover un pedido ya entregado', () => {
      expect(() => almacen.cambiarEstadoPedido(1, 'EN_CAMINO')).toThrowError(/cerrado/i);
    });
  });

  describe('comprobantes y pagos', () => {
    it('el comprobante cuadra con el pedido', () => {
      const pedido = almacen.obtenerPedido(3);
      const comprobante = almacen.comprobantePorPedido(3);

      expect(comprobante.total).toBe(pedido.total);
      expect(comprobante.serie).toBe('F001');
      expect(comprobante.detalle).toHaveLength(pedido.items.length);
    });

    it('no emite comprobante para pedidos aún pendientes', () => {
      const emitidos = almacen.listarComprobantes().map((c) => c.idPedido);
      expect(emitidos).not.toContain(12);
    });

    it('marcar el correo como enviado actualiza la fecha', () => {
      const resultado = almacen.marcarCorreoEnviado(3);

      expect(resultado.correoEnviado).toBe(true);
      expect(resultado.fechaCorreoEnvio).toBeTruthy();
    });

    it('los pagos reflejan el total de su pedido', () => {
      const pago = almacen.listarPagos().find((p) => p.idPedido === 3)!;
      expect(pago.monto).toBe(almacen.obtenerPedido(3).total);
    });
  });

  describe('administración', () => {
    it('crea un producto y lo deja en la carta', () => {
      const creado = almacen.crearProducto({ nombre: 'Pollo al horno', idCategoria: 1, precioBase: 59.9 });

      expect(creado.slug).toBe('pollo-al-horno');
      expect(creado.categoriaNombre).toBe('Pollos a la brasa');
      expect(almacen.listarProductos({ busqueda: 'al horno' })).toHaveLength(1);
    });

    it('exige nombre al crear un producto', () => {
      expect(() => almacen.crearProducto({ nombre: '  ' })).toThrowError(/obligatorio/i);
    });

    it('renombrar una categoría se propaga a sus productos', () => {
      almacen.actualizarCategoria(1, { nombre: 'Brasas de la casa' });
      expect(almacen.obtenerProducto(1).categoriaNombre).toBe('Brasas de la casa');
    });

    it('desactivar una oferta devuelve el precio base', () => {
      almacen.actualizarOferta(1, { activo: false });
      expect(almacen.obtenerProducto(1).precioFinal).toBe(69.9);
    });

    it('cambia el rol y el estado de un usuario', () => {
      expect(almacen.cambiarRolUsuario(5, 'COCINA').rol).toBe('COCINA');
      expect(almacen.cambiarEstadoUsuario(5, false).activo).toBe(false);
    });

    it('genera una copia de seguridad manual', () => {
      const antes = almacen.listarBackups().length;
      const backup = almacen.generarBackup();

      expect(backup.tipoDisparo).toBe('MANUAL');
      expect(almacen.listarBackups()).toHaveLength(antes + 1);
    });

    it('los logs se pueden filtrar por código de estado', () => {
      const pagina = almacen.listarLogs({ statusCode: 500 });
      expect(pagina.content.every((l) => l.statusCode === 500)).toBe(true);
    });

    it('la auditoría filtra por entidad', () => {
      const pagina = almacen.listarAuditoria({ entidad: 'PEDIDO' });
      expect(pagina.content.every((e) => e.entidad === 'PEDIDO')).toBe(true);
    });
  });

  it('reiniciar deja el almacén como al principio', () => {
    almacen.agregarAlCarrito(1, 3);
    almacen.actualizarOferta(1, { activo: false });
    almacen.reiniciar();

    expect(almacen.listarCarrito()).toHaveLength(0);
    expect(almacen.obtenerProducto(1).precioFinal).toBe(55.92);
  });
});
