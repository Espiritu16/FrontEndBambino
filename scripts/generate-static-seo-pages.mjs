import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DIST_BROWSER = 'dist/frontend-bambino-app/browser';
const INDEX_PATH = join(DIST_BROWSER, 'index.html');
const SITE_URL = 'https://bambino.proyectoutp.com';
const OG_IMAGE = `${SITE_URL}/og-bambino-chicken.png`;

const ROUTES = [
  {
    path: '/inicio',
    title: 'Bambino Chicken | Inicio',
    description: 'Bambino Chicken: promociones, carta digital y pedidos online de polleria y delivery.',
    robots: 'index,follow'
  },
  {
    path: '/promociones',
    title: 'Promociones | Bambino Chicken',
    description: 'Descubre promociones y combos disponibles en Bambino Chicken.',
    robots: 'index,follow'
  },
  {
    path: '/carta',
    title: 'Carta | Bambino Chicken',
    description: 'Consulta la carta digital de Bambino Chicken.',
    robots: 'index,follow'
  },
  {
    path: '/nosotros',
    title: 'Nosotros | Bambino Chicken',
    description: 'Conoce la mision y vision de Bambino Chicken.',
    robots: 'index,follow'
  },
  {
    path: '/cobertura-delivery',
    title: 'Cobertura de delivery | Bambino Chicken',
    description: 'Consulta la cobertura de delivery de Bambino Chicken.',
    robots: 'index,follow'
  },
  {
    path: '/terminos-condiciones',
    title: 'Terminos y condiciones | Bambino Chicken',
    description: 'Terminos y condiciones de uso del sitio web de Bambino Chicken.',
    robots: 'index,follow'
  },
  {
    path: '/politica-privacidad',
    title: 'Politica de privacidad | Bambino Chicken',
    description: 'Politica de privacidad y tratamiento de datos personales.',
    robots: 'index,follow'
  },
  {
    path: '/libro-reclamaciones',
    title: 'Libro de reclamaciones | Bambino Chicken',
    description: 'Registro oficial de reclamos y quejas para clientes.',
    robots: 'index,follow'
  }
];

const template = readFileSync(INDEX_PATH, 'utf8');

for (const route of ROUTES) {
  const canonical = `${SITE_URL}${route.path}`;
  let html = template;

  html = replaceTag(html, /<title>.*?<\/title>/s, `<title>${route.title}</title>`);
  html = replaceMetaName(html, 'description', route.description);
  html = replaceMetaName(html, 'robots', route.robots);
  html = replaceCanonical(html, canonical);
  html = replaceMetaProperty(html, 'og:site_name', 'Bambino Chicken');
  html = replaceMetaProperty(html, 'og:type', 'website');
  html = replaceMetaProperty(html, 'og:title', route.title);
  html = replaceMetaProperty(html, 'og:description', route.description);
  html = replaceMetaProperty(html, 'og:url', canonical);
  html = replaceMetaProperty(html, 'og:image', OG_IMAGE);
  html = replaceMetaName(html, 'twitter:card', 'summary_large_image');
  html = replaceMetaName(html, 'twitter:title', route.title);
  html = replaceMetaName(html, 'twitter:description', route.description);
  html = replaceMetaName(html, 'twitter:image', OG_IMAGE);

  const outputPath = join(DIST_BROWSER, route.path.replace(/^\//, ''), 'index.html');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, html, 'utf8');
}

function replaceTag(html, regex, replacement) {
  if (regex.test(html)) {
    return html.replace(regex, replacement);
  }
  return html;
}

function replaceMetaName(html, name, content) {
  const regex = new RegExp(`<meta\\s+name="${escapeRegExp(name)}"\\s+content="[^"]*"\\s*\\/?>`, 'i');
  const replacement = `<meta name="${name}" content="${escapeHtml(content)}">`;
  if (regex.test(html)) {
    return html.replace(regex, replacement);
  }
  return html.replace('</head>', `  ${replacement}\n</head>`);
}

function replaceMetaProperty(html, property, content) {
  const regex = new RegExp(`<meta\\s+property="${escapeRegExp(property)}"\\s+content="[^"]*"\\s*\\/?>`, 'i');
  const replacement = `<meta property="${property}" content="${escapeHtml(content)}">`;
  if (regex.test(html)) {
    return html.replace(regex, replacement);
  }
  return html.replace('</head>', `  ${replacement}\n</head>`);
}

function replaceCanonical(html, href) {
  const replacement = `<link rel="canonical" href="${escapeHtml(href)}">`;
  const regex = /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i;
  if (regex.test(html)) {
    return html.replace(regex, replacement);
  }
  return html.replace('</head>', `  ${replacement}\n</head>`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
