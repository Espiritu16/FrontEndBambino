import { environment } from '../../../environments/environment';

export const API_BASE_URL = environment.apiBaseUrl;

export const API_ENDPOINTS = {
  auth: `${API_BASE_URL}/api/auth`,
  seguridad: {
    perfil: `${API_BASE_URL}/api/seguridad/perfil`
  },
  public: {
    catalogo: `${API_BASE_URL}/api/public/catalogo`,
    chatbot: `${API_BASE_URL}/api/public/chatbot`,
    configuracion: `${API_BASE_URL}/api/public/configuracion`,
    configuracionMedia: `${API_BASE_URL}/api/public/configuracion/media`,
    delivery: `${API_BASE_URL}/api/public/delivery`,
    pagos: `${API_BASE_URL}/api/public/pagos`,
    libroReclamaciones: `${API_BASE_URL}/api/public/libro-reclamaciones`
  },
  cliente: {
    chatbot: `${API_BASE_URL}/api/cliente/chatbot`,
    perfil: `${API_BASE_URL}/api/cliente/perfil`,
    direcciones: `${API_BASE_URL}/api/cliente/direcciones`,
    carrito: `${API_BASE_URL}/api/cliente/carrito`,
    pedidos: `${API_BASE_URL}/api/cliente/pedidos`,
    comprobantes: `${API_BASE_URL}/api/cliente/comprobantes`,
    pagos: `${API_BASE_URL}/api/cliente/pagos`,
    libroReclamaciones: `${API_BASE_URL}/api/cliente/libro-reclamaciones`
  },
  admin: {
    catalogo: `${API_BASE_URL}/api/admin/catalogo`,
    pedidos: `${API_BASE_URL}/api/admin/pedidos`,
    pagos: `${API_BASE_URL}/api/admin/pagos`,
    comprobantes: `${API_BASE_URL}/api/admin/comprobantes`,
    configuracion: `${API_BASE_URL}/api/admin/configuracion`,
    configuracionEmpresas: `${API_BASE_URL}/api/admin/configuracion/empresas`,
    configuracionMedia: `${API_BASE_URL}/api/admin/configuracion/media`,
    auditoria: `${API_BASE_URL}/api/admin/auditoria`,
    logsErrores: `${API_BASE_URL}/api/admin/logs/errores`,
    backups: `${API_BASE_URL}/api/admin/backups`,
    seguridadUsuarios: `${API_BASE_URL}/api/admin/seguridad/usuarios`,
    zonasDelivery: `${API_BASE_URL}/api/admin/configuracion/zonas-delivery`
  }
} as const;
