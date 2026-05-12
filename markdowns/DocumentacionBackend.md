# 🧠 Documentación Backend - BambinoChicken

> Nota: Documento técnico del estado actual del backend `BackendBambino`, construido sobre Spring Boot con arquitectura modular por dominio.

## 🗂️ Índice
- [🎯 1) Objetivo](#1-objetivo)
- [📌 2) Estado actual del backend](#2-estado-actual-del-backend)
- [🧩 3) Arquitectura modular por dominio](#3-arquitectura-modular-por-dominio)
- [🔐 4) Seguridad, autenticación y roles](#4-seguridad-autenticación-y-roles)
- [🗄️ 5) Persistencia y base de datos](#5-persistencia-y-base-de-datos)
- [🌐 6) Contrato API y namespaces](#6-contrato-api-y-namespaces)
- [🔌 7) Integraciones externas](#7-integraciones-externas)
- [🚀 8) Ejecución y operación local](#8-ejecución-y-operación-local)
- [🧪 9) Verificación técnica mínima](#9-verificación-técnica-mínima)
- [📎 10) Referencias](#10-referencias)

## 1) Objetivo
Describir cómo está implementado hoy el backend del sistema Bambino Chicken, incluyendo organización del código, seguridad, acceso a datos, integraciones y forma de operación.

## 2) Estado actual del backend
- Proyecto: `BackendBambino`.
- Plataforma: `Java 21` + `Spring Boot 4.0.6`.
- Estilo arquitectónico: API REST modular por dominios de negocio.
- Persistencia: Spring Data JPA + MySQL.
- Migraciones: Flyway.
- Seguridad: autenticación por `HTTP Basic` sobre backend `STATELESS`.

## 3) Arquitectura modular por dominio
El backend organiza cada dominio con patrón homogéneo:

- `controller`
- `service`
- `repository`
- `entity`
- `dto`
- `mapper` (según dominio)
- `exception` (según dominio)

Dominios detectados en `src/main/java/com/bambino`:

- `auditoria`
- `carrito`
- `catalogo`
- `chatbot`
- `clientes`
- `cocina`
- `comprobantes`
- `configuracion`
- `delivery`
- `pagos`
- `pedidos`
- `reclamaciones`
- `seguridad`
- `shared` (infraestructura transversal)

Infraestructura transversal relevante (`shared`):

- `shared/security/SecurityConfig`: reglas de seguridad HTTP + CORS.
- `shared/security/DatabaseUserDetailsService`: carga de usuario desde BD.
- `shared/exception/GlobalExceptionHandler`: manejo global de errores.

## 4) Seguridad, autenticación y roles
Configuración actual (`SecurityConfig`):

- `SessionCreationPolicy.STATELESS`.
- CSRF desactivado para API.
- CORS habilitado con orígenes permitidos (`localhost:5173`, dominios `vercel.app`, etc.).
- Autenticación activa por `httpBasic()`.

Reglas de autorización por prefijo:

- Público: `/api/public/**`, `/api/auth/**`.
- Admin: `/api/admin/**`.
- Cocina/Admin: `/api/cocina/**`, `/api/seguridad/**`.
- Cliente/Admin: `/api/cliente/**`.

Carga de identidad:

- Usuarios desde tabla de seguridad (vía `UsuarioRepository`).
- Roles normalizados como `ROLE_<ROL>`.
- Solo usuarios `ACTIVO` quedan habilitados para autenticarse.

## 5) Persistencia y base de datos
Configuración activa del backend:

- `spring.jpa.hibernate.ddl-auto=none`.
- `spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect`.
- `spring.flyway.enabled=true`.
- `spring.flyway.locations=classpath:db/migration`.

Migraciones detectadas en `db/migration`:

- `V1` a `V12` (sin `V9` presente en esta carpeta).
- Cobertura de seguridad, carrito, delivery, pedidos, cocina, reclamos y documentos de cliente.

Documento detallado de conexión cloud:

- `markdowns/DocumentacionBaseDeDatos.md`

## 6) Contrato API y namespaces
Namespaces base detectados en controladores:

- `/api/public/catalogo`
- `/api/public/configuracion`
- `/api/public/delivery`
- `/api/public/libro-reclamaciones`
- `/api/public/pagos`
- `/api/auth`
- `/api/cliente/carrito`
- `/api/cliente/pedidos`
- `/api/cliente/pagos`
- `/api/cliente/perfil`
- `/api/cliente/direcciones`
- `/api/cliente/comprobantes`
- `/api/cliente/libro-reclamaciones`
- `/api/admin/catalogo`
- `/api/admin/pedidos`
- `/api/admin/pagos`
- `/api/admin/comprobantes`
- `/api/admin/configuracion`
- `/api/admin/seguridad/usuarios`
- `/api/admin/auditoria`
- `/api/cocina/pedidos`
- `/api/seguridad/perfil`

## 7) Integraciones externas
Integraciones activas detectadas:

- SMTP para recuperación de contraseña.
- Cloudinary para carga y gestión de medios/imágenes.

Servicios relevantes:

- `catalogo/service/CloudinaryImageService`
- `configuracion/service/CloudinaryMediaService`
- `seguridad/service/CorreoRecuperacionService`

## 8) Ejecución y operación local
Desde carpeta `BackendBambino`:

```bash
./mvnw clean install
./mvnw spring-boot:run
```

Comandos frecuentes:

```bash
./mvnw test
./mvnw clean package
java -jar target/backend-bambino-0.0.1-SNAPSHOT.jar
```

Referencia operativa de endpoints (si están habilitados):

- `http://localhost:8080/swagger-ui.html`
- `http://localhost:8080/v3/api-docs`

## 9) Verificación técnica mínima
Checklist recomendado después de cambios:

1. Backend levanta sin error de conexión a BD/Flyway.
2. `GET /api/auth/ping` responde `ok`.
3. Flujo de login básico y `GET /api/auth/yo` operativo.
4. Endpoints públicos (`catalogo`, `configuracion`, `delivery`) responden sin autenticación.
5. Endpoints por rol (`/api/admin`, `/api/cliente`, `/api/cocina`) respetan autorización.

## 10) Referencias
- `BackendBambino/README.md`
- `BackendBambino/src/main/resources/application.properties`
- `markdowns/DocumentacionBaseDeDatos.md`
- `markdowns/Diccionaro de Datos.md`
