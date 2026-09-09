/**
 * Configuración de la demo pública de Bambino Chicken.
 *
 * Esta carpeta sólo existe en la rama `demo`: permite recorrer el sistema sin la
 * API de Spring Boot. Todos los datos son ficticios.
 */

/** Retardo simulado de red, para que los indicadores de carga se vean trabajando. */
export const RETARDO_RED_MS = 200;

export interface CuentaDemo {
  email: string;
  password: string;
  nombres: string;
  apellidos: string;
  rol: 'CLIENTE' | 'ADMIN' | 'COCINA';
  descripcion: string;
}

/**
 * El rol COCINA existe en el sistema (usuarios, transiciones de pedido), pero su
 * panel es una maqueta sin implementar en el repositorio original, así que no se
 * ofrece como acceso rápido: llevaría al visitante a una pantalla vacía.
 */
export const CUENTAS_DEMO: readonly CuentaDemo[] = [
  {
    email: 'cliente@bambino.demo',
    password: 'demo1234',
    nombres: 'Lucía',
    apellidos: 'Ramírez',
    rol: 'CLIENTE',
    descripcion: 'Carta, carrito, pedidos y comprobantes',
  },
  {
    email: 'admin@bambino.demo',
    password: 'demo1234',
    nombres: 'Rosa',
    apellidos: 'Delgado',
    rol: 'ADMIN',
    descripcion: 'Panel completo: pedidos, catálogo y configuración',
  },
];

/** Token Basic que la aplicación guarda en localStorage tras autenticar. */
export function tokenBasico(email: string, password: string): string {
  return btoa(`${email}:${password}`);
}
