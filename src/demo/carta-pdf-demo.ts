/**
 * Carta en PDF generada para la demo.
 *
 * La página «Carta» del sitio es un visor de PDF que en producción muestra el
 * archivo subido desde el panel. Aquí se construye un PDF mínimo y válido en el
 * navegador, con los platos y precios del catálogo ficticio, para que la sección
 * se vea completa sin descargar nada.
 */
import { CATEGORIAS_SEMILLA, PRODUCTOS_SEMILLA } from './datos-semilla';

/** Escapa lo que el formato PDF trata como delimitadores dentro de una cadena. */
function escapar(texto: string): string {
  return texto.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

interface Linea {
  texto: string;
  tamano: number;
  fuente: 'F1' | 'F2';
  salto: number;
}

function lineasDeLaCarta(): Linea[] {
  const lineas: Linea[] = [
    { texto: 'BAMBINO CHICKEN', tamano: 22, fuente: 'F2', salto: 30 },
    { texto: 'Carta de demostración · precios referenciales en soles', tamano: 10, fuente: 'F1', salto: 26 },
  ];

  for (const categoria of CATEGORIAS_SEMILLA.filter((c) => c.activa)) {
    const productos = PRODUCTOS_SEMILLA.filter((p) => p.idCategoria === categoria.idCategoria && p.visibleWeb);
    if (!productos.length) continue;

    lineas.push({ texto: categoria.nombre.toUpperCase(), tamano: 13, fuente: 'F2', salto: 18 });
    for (const producto of productos) {
      const precio = `S/ ${producto.precioBase.toFixed(2)}`;
      const puntos = Math.max(3, 62 - producto.nombre.length - precio.length);
      lineas.push({
        texto: `${producto.nombre} ${'.'.repeat(puntos)} ${precio}`,
        tamano: 10,
        fuente: 'F1',
        salto: 15,
      });
    }
    lineas.push({ texto: '', tamano: 10, fuente: 'F1', salto: 10 });
  }

  lineas.push({ texto: 'Documento generado en el navegador. Datos ficticios.', tamano: 9, fuente: 'F1', salto: 0 });
  return lineas;
}

/** Reparte las líneas en páginas A4 y devuelve el flujo de contenido de cada una. */
function paginas(): string[] {
  const ALTO_UTIL = 842 - 60;
  const paginasTexto: string[] = [];
  let actual = '';
  let y = 782;

  for (const linea of lineasDeLaCarta()) {
    if (y - linea.salto < 842 - ALTO_UTIL) {
      paginasTexto.push(actual);
      actual = '';
      y = 782;
    }
    if (linea.texto) {
      actual += `BT /${linea.fuente} ${linea.tamano} Tf 56 ${y} Td (${escapar(linea.texto)}) Tj ET\n`;
    }
    y -= linea.salto;
  }
  paginasTexto.push(actual);
  return paginasTexto;
}

/** Ensambla el archivo PDF con su tabla de referencias cruzadas. */
function construirPdf(): string {
  const contenidos = paginas();
  const totalPaginas = contenidos.length;
  const objetos: string[] = [];

  // 1: catálogo · 2: páginas · 3..: cada página · luego contenidos · luego fuentes.
  const idPrimeraPagina = 3;
  const idPrimerContenido = idPrimeraPagina + totalPaginas;
  const idFuenteRegular = idPrimerContenido + totalPaginas;
  const idFuenteNegrita = idFuenteRegular + 1;

  objetos.push('<< /Type /Catalog /Pages 2 0 R >>');
  objetos.push(
    `<< /Type /Pages /Kids [${contenidos.map((_, i) => `${idPrimeraPagina + i} 0 R`).join(' ')}] /Count ${totalPaginas} >>`
  );
  contenidos.forEach((_, i) => {
    objetos.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
        `/Resources << /Font << /F1 ${idFuenteRegular} 0 R /F2 ${idFuenteNegrita} 0 R >> >> ` +
        `/Contents ${idPrimerContenido + i} 0 R >>`
    );
  });
  contenidos.forEach((contenido) => {
    objetos.push(`<< /Length ${contenido.length} >>\nstream\n${contenido}endstream`);
  });
  objetos.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objetos.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  let pdf = '%PDF-1.4\n';
  const posiciones: number[] = [];
  objetos.forEach((cuerpo, indice) => {
    posiciones.push(pdf.length);
    pdf += `${indice + 1} 0 obj\n${cuerpo}\nendobj\n`;
  });

  const inicioXref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  posiciones.forEach((posicion) => {
    pdf += `${String(posicion).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;
  return pdf;
}

let cache = '';

/** Data URI del PDF de la carta; se construye una sola vez por sesión. */
export function cartaPdfDemo(): string {
  if (!cache) {
    // El contenido usa sólo caracteres latin1, así que `btoa` puede codificarlo.
    cache = `data:application/pdf;base64,${btoa(construirPdf())}`;
  }
  return cache;
}
