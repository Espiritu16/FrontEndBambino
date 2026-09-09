/**
 * Ilustraciones generadas para la demo.
 *
 * La demo no tiene servidor de imágenes ni descarga nada de internet: cada
 * imagen es un SVG embebido como data URI, así que la carta y la portada se ven
 * completas sin salir a la red y sin usar fotografías de terceros.
 */

const PALETAS: Record<number, [string, string, string]> = {
  1: ['#7f1d1d', '#b91c1c', '#fbbf24'], // brasas
  2: ['#92400e', '#d97706', '#fde68a'], // broaster
  3: ['#7c2d12', '#c2410c', '#fed7aa'], // parrillas
  4: ['#365314', '#65a30d', '#d9f99d'], // guarniciones
  5: ['#0c4a6e', '#0284c7', '#bae6fd'], // bebidas
  6: ['#701a75', '#c026d3', '#f5d0fe'], // postres
  7: ['#334155', '#64748b', '#e2e8f0'], // temporada
};

function comoDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Imagen de portada: degradado cálido con formas suaves. */
export function imagenHero(): string {
  return comoDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-label="Ilustración de portada">
      <defs>
        <linearGradient id="f" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#7f1d1d"/>
          <stop offset="55%" stop-color="#b91c1c"/>
          <stop offset="100%" stop-color="#f59e0b"/>
        </linearGradient>
        <radialGradient id="b" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stop-color="#fde68a" stop-opacity=".9"/>
          <stop offset="100%" stop-color="#fde68a" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#f)"/>
      <circle cx="620" cy="420" r="330" fill="url(#b)"/>
      <g fill="#fff" opacity=".13">
        <circle cx="220" cy="180" r="90"/>
        <circle cx="980" cy="720" r="130"/>
        <circle cx="1050" cy="180" r="60"/>
      </g>
      <g transform="translate(600 430)">
        <ellipse cx="0" cy="150" rx="300" ry="42" fill="#000" opacity=".18"/>
        <path d="M-215 60 C-215 -85 -120 -175 0 -175 C120 -175 215 -85 215 60 Z" fill="#fbbf24"/>
        <path d="M-215 60 C-215 -85 -120 -175 0 -175 C120 -175 215 -85 215 60 Z" fill="#f59e0b" opacity=".55"/>
        <path d="M-150 62 h300 a26 26 0 0 1 0 52 h-300 a26 26 0 0 1 0 -52 z" fill="#fef3c7"/>
        <g fill="#fff" opacity=".5">
          <circle cx="-95" cy="-60" r="15"/>
          <circle cx="20" cy="-105" r="11"/>
          <circle cx="110" cy="-40" r="14"/>
        </g>
      </g>
      <text x="600" y="835" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="34"
            font-weight="700" fill="#fff" fill-opacity=".72" text-anchor="middle" letter-spacing="6">
        IMAGEN DE DEMOSTRACIÓN
      </text>
    </svg>
  `);
}

/** Imagen de producto: degradado por categoría con las iniciales del plato. */
export function imagenProducto(nombre: string, idCategoria: number): string {
  const [oscuro, medio, claro] = PALETAS[idCategoria] ?? PALETAS[7];
  return comoDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" role="img" aria-label="${nombre}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${oscuro}"/>
          <stop offset="100%" stop-color="${medio}"/>
        </linearGradient>
      </defs>
      <rect width="600" height="450" fill="url(#g)"/>
      <g fill="${claro}" opacity=".2">
        <circle cx="90" cy="70" r="70"/>
        <circle cx="520" cy="380" r="95"/>
      </g>
      <circle cx="300" cy="205" r="112" fill="${claro}" opacity=".93"/>
      <text x="300" y="205" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="88"
            font-weight="800" fill="${oscuro}" text-anchor="middle" dominant-baseline="central">
        ${iniciales(nombre) || 'BC'}
      </text>
      <text x="300" y="392" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="21"
            font-weight="600" fill="#fff" fill-opacity=".8" text-anchor="middle" letter-spacing="3">
        DEMOSTRACIÓN
      </text>
    </svg>
  `);
}
