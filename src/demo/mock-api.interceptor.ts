/**
 * Interceptor que resuelve toda la API de Bambino contra el almacén en memoria.
 *
 * Se registra el primero en `provideHttpClient`, así que ninguna petición sale a
 * la red: si una ruta no está cubierta responde 404 en lugar de dejarla pasar.
 */
import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpParams,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AlmacenDemo, almacenDemo, ErrorDemo } from './almacen-demo';
import { RETARDO_RED_MS } from './demo.config';

/** `http://localhost:8080/api/admin/pedidos` -> `/api/admin/pedidos`. */
function rutaRelativa(url: string): string {
  const sinConsulta = url.split('?')[0];
  const indice = sinConsulta.indexOf('/api/');
  const ruta = indice >= 0 ? sinConsulta.slice(indice) : sinConsulta;
  return ruta.startsWith('/') ? ruta : `/${ruta}`;
}

function filtroDesdeParams(params: HttpParams): Record<string, string> {
  const filtro: Record<string, string> = {};
  params.keys().forEach((clave) => {
    const valor = params.get(clave);
    if (valor !== null && valor !== '') filtro[clave] = valor;
  });
  return filtro;
}

function ok<T>(body: T): Observable<HttpEvent<unknown>> {
  return of(new HttpResponse({ status: 200, body })).pipe(delay(RETARDO_RED_MS));
}

function fallo(status: number, mensaje: string, url: string): Observable<never> {
  const error = new HttpErrorResponse({
    status,
    statusText: mensaje,
    url,
    error: { timestamp: new Date().toISOString(), status, error: mensaje, mensaje, message: mensaje, path: url },
  });
  return throwError(() => error).pipe(delay(RETARDO_RED_MS)) as Observable<never>;
}

/** Archivo de relleno: la demo no genera Excel ni PDF reales. */
function archivoDemo(descripcion: string): Blob {
  return new Blob(
    [`Documento de demostración — ${descripcion}.\nLos datos son ficticios y se generan en el navegador.\n`],
    { type: 'text/plain' }
  );
}

type Manejador = (
  almacen: AlmacenDemo,
  contexto: {
    request: HttpRequest<unknown>;
    filtro: Record<string, string>;
    cuerpo: any;
    partes: string[];
    autorizacion: string | null;
  }
) => unknown;

interface Ruta {
  metodo: string;
  patron: RegExp;
  manejar: Manejador;
}

const RUTAS: Ruta[] = [
  // ----- Sesión
  { metodo: 'GET', patron: /^\/api\/auth\/yo$/, manejar: (a, { autorizacion }) => a.perfilSesion(autorizacion) },
  { metodo: 'GET', patron: /^\/api\/seguridad\/perfil$/, manejar: (a, { autorizacion }) => a.perfilSesion(autorizacion) },
  { metodo: 'POST', patron: /^\/api\/auth\/registro$/, manejar: (a, { cuerpo }) => a.registrar(cuerpo ?? {}) },
  {
    metodo: 'POST',
    patron: /^\/api\/auth\/recuperar\/solicitar$/,
    manejar: () => ({ mensaje: 'En la demo no se envían correos. Usa el código 123456.' }),
  },
  {
    metodo: 'POST',
    patron: /^\/api\/auth\/recuperar\/validar-codigo$/,
    manejar: (_a, { cuerpo }) => {
      if (String(cuerpo?.codigo ?? '').trim() !== '123456') {
        throw new ErrorDemo(400, 'Código inválido. En la demo el código es 123456.');
      }
      return { token: 'demo-reset-token', valido: true };
    },
  },
  {
    metodo: 'POST',
    patron: /^\/api\/auth\/recuperar\/confirmar$/,
    manejar: () => ({ mensaje: 'Contraseña restablecida (simulado en la demo).' }),
  },

  // ----- Catálogo público
  { metodo: 'GET', patron: /^\/api\/public\/catalogo\/categorias$/, manejar: (a) => a.listarCategorias() },
  {
    metodo: 'GET',
    patron: /^\/api\/public\/catalogo\/productos\/slug\/(.+)$/,
    manejar: (a, { partes }) => a.obtenerProductoPorSlug(decodeURIComponent(partes[0])),
  },
  {
    metodo: 'GET',
    patron: /^\/api\/public\/catalogo\/productos\/(\d+)$/,
    manejar: (a, { partes }) => a.obtenerProducto(Number(partes[0])),
  },
  { metodo: 'GET', patron: /^\/api\/public\/catalogo\/productos$/, manejar: (a, { filtro }) => a.listarProductos(filtro) },
  { metodo: 'GET', patron: /^\/api\/public\/catalogo\/ofertas$/, manejar: (a) => a.listarProductosEnOferta() },
  { metodo: 'GET', patron: /^\/api\/public\/configuracion\/empresas$/, manejar: (a) => a.listarEmpresas() },
  {
    metodo: 'GET',
    patron: /^\/api\/public\/configuracion\/media\/([\w-]+)$/,
    manejar: (a, { partes }) => a.media(partes[0]),
  },
  { metodo: 'GET', patron: /^\/api\/public\/delivery\/ubicacion-principal$/, manejar: (a) => a.ubicacionPrincipal() },
  { metodo: 'GET', patron: /^\/api\/public\/chatbot\/opciones$/, manejar: (a) => a.opcionesChatbot() },
  {
    metodo: 'GET',
    patron: /^\/api\/public\/documentos\/consultar$/,
    manejar: (a, { filtro }) => a.consultarDocumento(filtro['numero'] ?? filtro['docNumero'] ?? ''),
  },
  { metodo: 'GET', patron: /^\/api\/public\/pagos\/culqi\/configuracion$/, manejar: (a) => a.configuracionCulqi() },
  {
    metodo: 'POST',
    patron: /^\/api\/public\/libro-reclamaciones$/,
    manejar: () => ({ mensaje: 'Reclamo registrado (simulado en la demo).', codigo: 'LR-DEMO-001' }),
  },

  // ----- Cliente
  { metodo: 'GET', patron: /^\/api\/cliente\/perfil$/, manejar: (a) => a.perfilCliente() },
  { metodo: 'GET', patron: /^\/api\/cliente\/perfil\/documentos$/, manejar: (a) => a.perfilCliente() },
  { metodo: 'POST', patron: /^\/api\/cliente\/perfil\/documentos$/, manejar: (a) => a.perfilCliente() },
  { metodo: 'GET', patron: /^\/api\/cliente\/direcciones$/, manejar: (a) => a.listarDirecciones() },
  { metodo: 'POST', patron: /^\/api\/cliente\/direcciones$/, manejar: (a, { cuerpo }) => a.crearDireccion(cuerpo ?? {}) },
  {
    metodo: 'PATCH',
    patron: /^\/api\/cliente\/direcciones\/(\d+)\/principal$/,
    manejar: (a, { partes }) => a.marcarDireccionPrincipal(Number(partes[0])),
  },
  {
    metodo: 'PUT',
    patron: /^\/api\/cliente\/direcciones\/(\d+)$/,
    manejar: (a, { partes, cuerpo }) => a.actualizarDireccion(Number(partes[0]), cuerpo ?? {}),
  },
  {
    metodo: 'DELETE',
    patron: /^\/api\/cliente\/direcciones\/(\d+)$/,
    manejar: (a, { partes }) => a.eliminarDireccion(Number(partes[0])),
  },
  { metodo: 'GET', patron: /^\/api\/cliente\/pedidos$/, manejar: (a) => a.listarPedidosCliente() },
  { metodo: 'POST', patron: /^\/api\/cliente\/pedidos$/, manejar: (a, { cuerpo }) => a.crearPedido(cuerpo ?? {}) },
  {
    metodo: 'GET',
    patron: /^\/api\/cliente\/pedidos\/(\d+)$/,
    manejar: (a, { partes }) => a.obtenerPedido(Number(partes[0])),
  },
  {
    metodo: 'GET',
    patron: /^\/api\/cliente\/comprobantes\/pedido\/(\d+)\/pdf$/,
    manejar: (_a, { partes }) => archivoDemo(`comprobante del pedido ${partes[0]}`),
  },
  {
    metodo: 'GET',
    patron: /^\/api\/cliente\/comprobantes\/pedido\/(\d+)$/,
    manejar: (a, { partes }) => a.comprobantePorPedido(Number(partes[0])),
  },
  { metodo: 'GET', patron: /^\/api\/cliente\/libro-reclamaciones\/prefill$/, manejar: (a) => a.prefillLibroReclamaciones() },
  { metodo: 'GET', patron: /^\/api\/cliente\/carrito$/, manejar: (a) => a.listarCarrito() },
  {
    metodo: 'POST',
    patron: /^\/api\/cliente\/carrito\/items\/bulk$/,
    manejar: (a, { cuerpo }) => {
      const items = Array.isArray(cuerpo) ? cuerpo : cuerpo?.items ?? [];
      items.forEach((i: any) => a.agregarAlCarrito(i?.idProducto, i?.cantidad ?? 1, i?.notas ?? null));
      return a.listarCarrito();
    },
  },
  {
    metodo: 'POST',
    patron: /^\/api\/cliente\/carrito\/items$/,
    manejar: (a, { cuerpo }) => a.agregarAlCarrito(cuerpo?.idProducto, cuerpo?.cantidad ?? 1, cuerpo?.notas ?? null),
  },
  {
    metodo: 'PUT',
    patron: /^\/api\/cliente\/carrito\/items\/(\d+)$/,
    manejar: (a, { partes, cuerpo }) => a.actualizarItemCarrito(Number(partes[0]), Number(cuerpo?.cantidad ?? 1)),
  },
  {
    metodo: 'DELETE',
    patron: /^\/api\/cliente\/carrito\/items\/(\d+)$/,
    manejar: (a, { partes }) => a.eliminarItemCarrito(Number(partes[0])),
  },
  { metodo: 'DELETE', patron: /^\/api\/cliente\/carrito\/items$/, manejar: (a) => a.vaciarCarrito() },

  // ----- Administración
  { metodo: 'GET', patron: /^\/api\/admin\/pedidos\/exportar-excel$/, manejar: () => archivoDemo('pedidos') },
  { metodo: 'GET', patron: /^\/api\/admin\/pedidos$/, manejar: (a) => a.listarPedidosAdmin() },
  {
    metodo: 'PATCH',
    patron: /^\/api\/admin\/pedidos\/(\d+)\/estado$/,
    manejar: (a, { partes, cuerpo }) => a.cambiarEstadoPedido(Number(partes[0]), cuerpo?.estado),
  },
  { metodo: 'GET', patron: /^\/api\/admin\/pagos\/exportar-excel$/, manejar: () => archivoDemo('pagos') },
  { metodo: 'GET', patron: /^\/api\/admin\/pagos$/, manejar: (a) => a.listarPagos() },
  { metodo: 'GET', patron: /^\/api\/admin\/comprobantes\/exportar-excel$/, manejar: () => archivoDemo('comprobantes') },
  {
    metodo: 'GET',
    patron: /^\/api\/admin\/comprobantes\/(\d+)\/pdf$/,
    manejar: (_a, { partes }) => archivoDemo(`comprobante ${partes[0]}`),
  },
  {
    metodo: 'POST',
    patron: /^\/api\/admin\/comprobantes\/(\d+)\/enviar-correo$/,
    manejar: (a, { partes }) => a.marcarCorreoEnviado(Number(partes[0])),
  },
  { metodo: 'GET', patron: /^\/api\/admin\/comprobantes$/, manejar: (a) => a.listarComprobantes() },
  { metodo: 'GET', patron: /^\/api\/admin\/configuracion\/global$/, manejar: (a) => a.obtenerConfiguracionGlobal() },
  {
    metodo: 'PUT',
    patron: /^\/api\/admin\/configuracion\/global$/,
    manejar: (a, { cuerpo }) => a.actualizarConfiguracionGlobal(cuerpo ?? {}),
  },
  { metodo: 'GET', patron: /^\/api\/admin\/configuracion\/empresas$/, manejar: (a) => a.listarEmpresas() },
  { metodo: 'GET', patron: /^\/api\/admin\/configuracion\/series-comprobante$/, manejar: (a) => a.listarSeries() },
  { metodo: 'GET', patron: /^\/api\/admin\/configuracion\/transiciones-pedido$/, manejar: (a) => a.listarTransiciones() },
  { metodo: 'GET', patron: /^\/api\/admin\/configuracion\/zonas-delivery$/, manejar: (a) => a.listarZonas() },
  {
    metodo: 'POST',
    patron: /^\/api\/admin\/configuracion\/zonas-delivery$/,
    manejar: (a, { cuerpo }) => a.crearZona(cuerpo ?? {}),
  },
  {
    metodo: 'PUT',
    patron: /^\/api\/admin\/configuracion\/zonas-delivery\/(\d+)$/,
    manejar: (a, { partes, cuerpo }) => a.actualizarZona(Number(partes[0]), cuerpo ?? {}),
  },
  {
    metodo: 'GET',
    patron: /^\/api\/admin\/configuracion\/media\/([\w-]+)$/,
    manejar: (a, { partes }) => a.media(partes[0]),
  },
  {
    metodo: 'PUT',
    patron: /^\/api\/admin\/configuracion\/media\/([\w-]+)(\/archivo)?$/,
    manejar: (a, { partes }) => a.media(partes[0]),
  },
  { metodo: 'GET', patron: /^\/api\/admin\/auditoria\/eventos\/exportar-excel$/, manejar: () => archivoDemo('auditoría') },
  { metodo: 'GET', patron: /^\/api\/admin\/auditoria\/eventos$/, manejar: (a, { filtro }) => a.listarAuditoria(filtro) },
  {
    metodo: 'GET',
    patron: /^\/api\/admin\/logs\/errores\/(\d+)$/,
    manejar: (a, { partes }) => a.obtenerLog(Number(partes[0])),
  },
  { metodo: 'GET', patron: /^\/api\/admin\/logs\/errores$/, manejar: (a, { filtro }) => a.listarLogs(filtro as never) },
  { metodo: 'GET', patron: /^\/api\/admin\/backups\/configuracion$/, manejar: (a) => a.obtenerBackupConfiguracion() },
  {
    metodo: 'PUT',
    patron: /^\/api\/admin\/backups\/configuracion$/,
    manejar: (a, { cuerpo }) => a.actualizarBackupConfiguracion(cuerpo ?? {}),
  },
  { metodo: 'POST', patron: /^\/api\/admin\/backups\/generar$/, manejar: (a) => a.generarBackup() },
  {
    metodo: 'GET',
    patron: /^\/api\/admin\/backups\/(\d+)\/preview$/,
    manejar: (a, { partes }) => a.obtenerBackupPreview(Number(partes[0])),
  },
  {
    metodo: 'GET',
    patron: /^\/api\/admin\/backups\/(\d+)\/descargar$/,
    manejar: (_a, { partes }) => archivoDemo(`copia de seguridad ${partes[0]}`),
  },
  {
    metodo: 'DELETE',
    patron: /^\/api\/admin\/backups\/(\d+)$/,
    manejar: (a, { partes }) => a.eliminarBackup(Number(partes[0])),
  },
  { metodo: 'GET', patron: /^\/api\/admin\/backups$/, manejar: (a) => a.listarBackups() },
  { metodo: 'GET', patron: /^\/api\/admin\/seguridad\/usuarios\/roles$/, manejar: (a) => a.listarRoles() },
  { metodo: 'GET', patron: /^\/api\/admin\/seguridad\/usuarios$/, manejar: (a) => a.listarUsuarios() },
  {
    metodo: 'PATCH',
    patron: /^\/api\/admin\/seguridad\/usuarios\/(\d+)\/estado$/,
    manejar: (a, { partes, cuerpo }) => a.cambiarEstadoUsuario(Number(partes[0]), cuerpo?.activo ?? true),
  },
  {
    metodo: 'PATCH',
    patron: /^\/api\/admin\/seguridad\/usuarios\/(\d+)\/rol$/,
    manejar: (a, { partes, cuerpo }) => a.cambiarRolUsuario(Number(partes[0]), cuerpo?.rol ?? 'CLIENTE'),
  },
  // Catálogo administrable
  { metodo: 'GET', patron: /^\/api\/admin\/catalogo\/categorias$/, manejar: (a) => a.listarCategorias() },
  {
    metodo: 'POST',
    patron: /^\/api\/admin\/catalogo\/categorias$/,
    manejar: (a, { cuerpo }) => a.crearCategoria(cuerpo ?? {}),
  },
  { metodo: 'PUT', patron: /^\/api\/admin\/catalogo\/categorias\/orden$/, manejar: (a) => a.listarCategorias() },
  {
    metodo: 'PUT',
    patron: /^\/api\/admin\/catalogo\/categorias\/(\d+)$/,
    manejar: (a, { partes, cuerpo }) => a.actualizarCategoria(Number(partes[0]), cuerpo ?? {}),
  },
  { metodo: 'GET', patron: /^\/api\/admin\/catalogo\/ofertas$/, manejar: (a) => a.listarOfertasAdmin() },
  { metodo: 'POST', patron: /^\/api\/admin\/catalogo\/ofertas$/, manejar: (a, { cuerpo }) => a.crearOferta(cuerpo ?? {}) },
  {
    metodo: 'PUT',
    patron: /^\/api\/admin\/catalogo\/ofertas\/(\d+)$/,
    manejar: (a, { partes, cuerpo }) => a.actualizarOferta(Number(partes[0]), cuerpo ?? {}),
  },
  { metodo: 'POST', patron: /^\/api\/admin\/catalogo\/productos\/imagen$/, manejar: () => ({ url: '', nombreArchivo: 'imagen-demo.png' }) },
  { metodo: 'PUT', patron: /^\/api\/admin\/catalogo\/productos\/orden$/, manejar: (a) => a.listarProductos() },
  { metodo: 'GET', patron: /^\/api\/admin\/catalogo\/productos-adicionales$/, manejar: (a) => a.listarProductos() },
  { metodo: 'GET', patron: /^\/api\/admin\/catalogo\/productos$/, manejar: (a, { filtro }) => a.listarProductos(filtro) },
  {
    metodo: 'POST',
    patron: /^\/api\/admin\/catalogo\/productos$/,
    manejar: (a, { cuerpo }) => a.crearProducto(cuerpo ?? {}),
  },
  {
    metodo: 'GET',
    patron: /^\/api\/admin\/catalogo\/productos\/(\d+)$/,
    manejar: (a, { partes }) => a.obtenerProducto(Number(partes[0])),
  },
  {
    metodo: 'PUT',
    patron: /^\/api\/admin\/catalogo\/productos\/(\d+)$/,
    manejar: (a, { partes, cuerpo }) => a.actualizarProducto(Number(partes[0]), cuerpo ?? {}),
  },
];

/**
 * Resuelve una petición contra el almacén. Se usa desde el interceptor y también
 * desde `BackendDemo`, porque algunas partes de la aplicación construyen su
 * propio `HttpClient(HttpBackend)` y así se saltarían la cadena de interceptores.
 */
export function resolverPeticionDemo(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
  const ruta = rutaRelativa(request.url);
  const coincidencia = RUTAS.find((c) => c.metodo === request.method && c.patron.test(ruta));

  if (!coincidencia) {
    return fallo(404, `La demo no cubre ${request.method} ${ruta}`, request.url);
  }

  try {
    const partes = ruta.match(coincidencia.patron)?.slice(1) ?? [];
    const resultado = coincidencia.manejar(almacenDemo, {
      request,
      filtro: filtroDesdeParams(request.params),
      cuerpo: request.body as any,
      partes,
      autorizacion: request.headers.get('Authorization'),
    });
    return ok(resultado);
  } catch (error) {
    if (error instanceof ErrorDemo) {
      return fallo(error.status, error.message, request.url);
    }
    return fallo(500, 'Error inesperado en la demo', request.url);
  }
}

export const mockApiInterceptor: HttpInterceptorFn = (request, _next) => resolverPeticionDemo(request);
