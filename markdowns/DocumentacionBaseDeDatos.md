# 🗄️ Documentación de Base de Datos - BambinoChicken

> Nota: Este documento describe la conexión actual de base de datos del proyecto y su operación en entorno nube.

## 🗂️ Índice
- [🎯 1) Objetivo](#1-objetivo)
- [☁️ 2) Estado actual de conexión (nube)](#2-estado-actual-de-conexión-nube)
- [🔌 3) Configuración técnica activa](#3-configuración-técnica-activa)
- [🧱 4) Migraciones y consistencia de esquema](#4-migraciones-y-consistencia-de-esquema)
- [🧪 5) Verificación operativa](#5-verificación-operativa)
- [🔐 6) Seguridad y buenas prácticas](#6-seguridad-y-buenas-prácticas)
- [📎 7) Referencias](#7-referencias)

## 1) Objetivo
Documentar de forma clara cómo se conecta hoy el backend `BackendBambino` a la base de datos en la nube, qué parámetros técnicos están activos y cómo validar que la conexión esté operativa.

## 2) Estado actual de conexión (nube)
Actualmente la aplicación usa una base de datos **MySQL en nube**.

Datos de conexión detectados en configuración del backend:

- Motor: `MySQL`
- Host: `viaduct.proxy.rlwy.net`
- Puerto: `54225`
- Base de datos: `bambino_db`
- Driver JDBC: `com.mysql.cj.jdbc.Driver`
- Zona horaria aplicada en la URL: `America/Lima`

Cadena JDBC activa (sin credenciales):

```text
jdbc:mysql://viaduct.proxy.rlwy.net:54225/bambino_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Lima
```

## 3) Configuración técnica activa
Configuración principal en:

- `BackendBambino/src/main/resources/application.properties`

Parámetros relevantes actualmente activos:

- `spring.datasource.url`: apunta al host cloud MySQL.
- `spring.datasource.username`: usuario de conexión.
- `spring.datasource.password`: contraseña de conexión.
- `spring.datasource.driver-class-name`: driver MySQL.
- `spring.jpa.hibernate.ddl-auto=none`: no altera esquema automáticamente.
- `spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect`.
- `spring.jpa.show-sql=true`: muestra SQL en logs.

## 4) Migraciones y consistencia de esquema
La gestión de esquema está centralizada con **Flyway**:

- `spring.flyway.enabled=true`
- `spring.flyway.locations=classpath:db/migration`

Implicación operativa:

- El esquema de `bambino_db` se mantiene mediante scripts versionados.
- Con `ddl-auto=none`, los cambios de modelo no deben depender de creación automática por Hibernate.

## 5) Verificación operativa
Pasos rápidos para validar conexión backend ↔ base cloud:

1. Levantar backend desde `BackendBambino`:

```bash
./mvnw spring-boot:run
```

2. Confirmar que no existan errores de conexión JDBC en logs (ejemplo: `Communications link failure`, `Access denied`, `Unknown database`).

3. Validar endpoints funcionales que dependen de base de datos (por ejemplo catálogo o autenticación).

4. Validar ejecución de migraciones al arranque (logs de Flyway).

## 6) Seguridad y buenas prácticas
Para entorno productivo o preproductivo, se recomienda:

- No versionar credenciales reales en `application.properties`.
- Mover `spring.datasource.username` y `spring.datasource.password` a variables de entorno/secret manager.
- Usar perfiles (`application-dev.properties`, `application-prod.properties`) para separar configuración local y nube.
- Restringir acceso por red a la base cloud (IP allowlist si el proveedor lo permite).
- Rotar credenciales cuando se hayan expuesto en repositorio o canales compartidos.

## 7) Referencias
- Configuración backend:
  - `BackendBambino/src/main/resources/application.properties`
- Documentación backend:
  - `markdowns/DocumentacionBackend.md`
- Diccionario de datos funcional/técnico:
  - `markdowns/Diccionaro de Datos.md`
