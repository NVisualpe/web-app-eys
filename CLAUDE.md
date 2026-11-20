# Proyecto EYS — Registro de personas

App web con **Vue 3** (frontend) y **API Node.js/Express** (backend) conectada a **Azure SQL Database**.

## Objetivo

1. **Página pública** (sin login): cualquier persona registra sus datos.
2. **Login sencillo**: usuarios internos ven el listado, buscan, registran y editan personas.
3. **Escalable en formularios**: la estructura debe permitir agregar nuevos formularios fácilmente (ver sección "Cómo agregar un formulario nuevo").

## Arquitectura

```
[Vue 3 (navegador)]  --HTTP/JSON-->  [API Express]  --mssql (TLS)-->  [Azure SQL]
```

- El frontend **nunca** se conecta a la base de datos. Solo la API tiene las credenciales.
- Autenticación con **JWT** (header `Authorization: Bearer <token>`), contraseñas con **bcryptjs**.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Vue 3 (Composition API, `<script setup>`), Vite, Vue Router 4, `fetch` nativo, CSS simple (sin framework UI salvo que se pida) |
| Backend | Node.js 20+, Express 4, ES Modules (`"type": "module"`) |
| BD | Azure SQL, paquete `mssql` |
| Seguridad | `helmet`, `cors`, `express-rate-limit`, `bcryptjs`, `jsonwebtoken`, `dotenv` |

## Estructura de carpetas

```
eys-app/
├── CLAUDE.md
├── README.md
├── database/
│   └── schema.sql              # Script de creación de tablas
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── scripts/
│   │   └── crear-usuario.js    # CLI para crear el primer usuario admin
│   └── src/
│       ├── server.js           # App Express, middlewares, montaje de rutas
│       ├── db.js               # Pool de conexión mssql (singleton)
│       ├── auth.js             # firmarToken() y middleware requiereLogin
│       ├── validators/
│       │   └── persona.js      # Validación de campos de Persona
│       └── routes/
│           ├── auth.routes.js      # POST /api/auth/login, GET /api/auth/me
│           ├── publico.routes.js   # POST /api/publico/personas
│           └── personas.routes.js  # CRUD protegido
└── frontend/
    ├── package.json
    ├── vite.config.js          # Proxy /api -> http://localhost:3000 en desarrollo
    ├── .env.example            # VITE_API_URL
    └── src/
        ├── main.js
        ├── App.vue
        ├── router.js           # Rutas + guard de autenticación
        ├── api.js              # Cliente fetch (agrega token, maneja 401)
        ├── store/auth.js       # Estado de sesión (reactive + localStorage)
        ├── components/
        │   └── forms/
        │       └── PersonaFields.vue   # Campos reutilizables del formulario
        └── views/
            ├── publico/RegistroPublico.vue
            ├── LoginView.vue
            ├── personas/PersonasLista.vue
            └── personas/PersonaForm.vue    # Crear / editar (interno)
```

## Base de datos (`database/schema.sql`)

Usar `IF OBJECT_ID(...) IS NULL` para que el script sea re-ejecutable.

La base de datos **ya existe y es compartida**: todas las tablas del proyecto van en el esquema **`EYS`** (nunca en `dbo`). Siempre referenciar las tablas con el esquema (`EYS.Personas`). Nombres de constraints/índices con prefijo `_EYS_` (ej. `PK_EYS_Personas`) para no chocar con objetos de otros esquemas.

### Tabla `EYS.Usuarios`
| Columna | Tipo | Notas |
|---|---|---|
| Id | INT IDENTITY PK | |
| Usuario | NVARCHAR(50) | UNIQUE, NOT NULL |
| PasswordHash | NVARCHAR(200) | bcrypt |
| Nombre | NVARCHAR(150) | NOT NULL |
| Activo | BIT | DEFAULT 1 |
| CreadoEn | DATETIME2 | DEFAULT SYSUTCDATETIME() |

### Tabla `EYS.Personas`
| Columna | Tipo | Notas |
|---|---|---|
| Id | INT IDENTITY PK | |
| DNI | CHAR(8) | UNIQUE, solo dígitos (CHECK) |
| NombresApellidos | NVARCHAR(200) | NOT NULL |
| FechaNacimiento | DATE | NOT NULL |
| LugarNacimiento | NVARCHAR(150) | NOT NULL |
| Telefono | NVARCHAR(20) | NULL |
| Direccion | NVARCHAR(250) | NULL |
| Bautizado | BIT | NOT NULL, DEFAULT 0 |
| FechaBautismo | DATE | NULL; debe ser NULL si Bautizado = 0 (CHECK) |
| Origen | NVARCHAR(10) | `'publico'` o `'interno'` |
| CreadoPor | INT NULL | FK a Usuarios (NULL si vino de la página pública) |
| CreadoEn | DATETIME2 | DEFAULT SYSUTCDATETIME() |
| ActualizadoEn | DATETIME2 | NULL |

## Reglas de validación (Persona)

Validar **en el frontend (UX) y en el backend (obligatorio)** con el mismo criterio:

- **DNI**: exactamente 8 dígitos. Si ya existe → HTTP 409 con mensaje "Este DNI ya está registrado".
- **Nombres y apellidos**: requerido, 3–200 caracteres, se guarda con `trim()`.
- **Fecha de nacimiento**: requerida, no puede ser futura.
- **Lugar de nacimiento**: requerido.
- **Teléfono**: opcional; si se envía, 6–20 caracteres (dígitos, `+`, espacios, guiones).
- **Dirección**: opcional, máx. 250.
- **Bautizado**: booleano (en el form: Sí / No).
- **Fecha de bautismo**: se muestra **solo si Bautizado = Sí**; en ese caso es requerida, no futura y no anterior a la fecha de nacimiento. Si Bautizado = No, se envía `null`.

Errores de validación → HTTP 400 con `{ error: string, campos?: { [campo]: mensaje } }`.

## Endpoints de la API

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | No | `{ usuario, password }` → `{ token, usuario: { id, usuario, nombre } }`. Rate limit: 10 intentos / 15 min por IP |
| GET | `/api/auth/me` | Sí | Datos del usuario del token |
| POST | `/api/publico/personas` | No | Registro público. Origen = `'publico'`. Rate limit: 20 / hora por IP. Respuesta mínima `{ ok: true }` (no devolver datos) |
| GET | `/api/personas?q=&page=&pageSize=` | Sí | Lista paginada; `q` busca por DNI o nombre. Respuesta `{ items, total, page, pageSize }` |
| GET | `/api/personas/:id` | Sí | Detalle |
| POST | `/api/personas` | Sí | Crear (Origen = `'interno'`, CreadoPor = id del usuario) |
| PUT | `/api/personas/:id` | Sí | Editar (actualiza `ActualizadoEn`) |
| GET | `/api/health` | No | Prueba de conexión a la BD (`SELECT 1`) |

Reglas del backend:
- **Siempre** consultas parametrizadas (`request.input('dni', sql.Char(8), dni)`). Nunca concatenar strings en SQL.
- Capturar error de clave única de SQL Server (número 2627 / 2601) y responder 409.
- Middleware de errores central que no filtre detalles internos al cliente (loguear en consola).
- `db.js` exporta un pool singleton que se reintenta si la primera conexión falla.

## Frontend

### Rutas
| Ruta | Vista | Acceso |
|---|---|---|
| `/` y `/registro` | RegistroPublico | Pública |
| `/login` | LoginView | Pública (si ya hay sesión → redirige a `/personas`) |
| `/personas` | PersonasLista | Requiere login |
| `/personas/nueva` | PersonaForm | Requiere login |
| `/personas/:id` | PersonaForm (edición) | Requiere login |

- Guard global en el router con `meta: { requiresAuth: true }`.
- `api.js`: base URL desde `import.meta.env.VITE_API_URL` (por defecto `/api`), agrega el token, y ante un 401 cierra sesión y redirige a `/login`.
- Sesión guardada en `localStorage` (token + datos del usuario).

### UX
- Todo el texto de la interfaz en **español**.
- Diseño limpio, responsive (debe verse bien en celular, la página pública se compartirá por WhatsApp).
- `PersonaFields.vue` es el componente reutilizable con todos los campos; lo usan tanto `RegistroPublico` como `PersonaForm` vía `v-model`.
- Mostrar errores por campo debajo de cada input.
- Botón de envío deshabilitado mientras se envía.
- En la página pública, tras registrar con éxito: mensaje de agradecimiento y opción "Registrar otra persona".
- Lista: tabla con buscador, paginación y botón "Nueva persona". En celular, mostrar como tarjetas.
- Fechas mostradas como `dd/mm/aaaa`; enviadas a la API como `YYYY-MM-DD`.

## Variables de entorno

**backend/.env**
```
DB_SERVER=xxxx.database.windows.net
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_PORT=1433
JWT_SECRET=          # cadena larga aleatoria
JWT_EXPIRES=8h
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

**frontend/.env** (desarrollo)
```
VITE_API_URL=/api
```

**frontend/.env.production**
```
VITE_API_URL=https://api.tudominio.com/api
```

Nunca commitear `.env`; incluir `.gitignore` con `node_modules`, `.env`, `dist`.

Conexión mssql a Azure: `options: { encrypt: true, trustServerCertificate: false }`.

## Crear el primer usuario

Script `backend/scripts/crear-usuario.js` (ejecutar con `npm run crear-usuario -- <usuario> <password> "<Nombre>"`): genera el hash bcrypt e inserta en `EYS.Usuarios`. No habrá registro de usuarios desde la web.

## Cómo agregar un formulario nuevo (convención)

Para cada formulario/entidad nueva `X`:
1. Agregar la tabla en `database/` como nuevo script numerado (`002_x.sql`, …).
2. Backend: `validators/x.js` + `repositories/x.js` (consultas SQL) + `routes/x.routes.js`, montar en `server.js`. Decidir si es público (`/api/publico/x`) o protegido (`/api/x`).
3. Frontend: `components/forms/XFields.vue` + `validators/x.js` (mismo criterio que el backend) + vistas en `views/x/` + rutas en `router.js` + enlace en el menú de `App.vue`.
4. Seguir las mismas reglas: validación en ambos lados, consultas parametrizadas, textos en español.

## Comandos

```bash
# Backend
cd backend && npm install && cp .env.example .env && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

## Requisitos en Azure (recordar al usuario)

- En el servidor de Azure SQL → **Redes**: agregar a las reglas de firewall la IP de la PC de desarrollo **y la IP del hosting** donde correrá la API.
- Ejecutar `database/schema.sql` desde el Query Editor del portal o Azure Data Studio / SSMS.

## Despliegue (hosting compartido con cPanel + dominio propio)

Destino: **un solo hosting con cPanel** que tenga la opción **"Setup Node.js App"** (Phusion Passenger).

```
https://tudominio.com        → frontend Vue (archivos estáticos en public_html)
https://api.tudominio.com    → API Node.js (app de cPanel)
                                   ↓ puerto 1433 (TLS)
                              Azure SQL
```

### Requisitos que el código debe cumplir para Passenger
- La API debe escuchar en `process.env.PORT` (Passenger lo asigna). Nunca fijar el puerto en el código.
- Archivo de arranque: `backend/app.js` en la raíz del backend, que solo hace `import './src/server.js'`. (cPanel pide un "Application startup file").
- No usar `node --watch` ni procesos extra en producción; `npm start` = `node app.js`.
- Sin dependencias nativas (que compilen con node-gyp). `mssql`, `bcryptjs` (no `bcrypt`) y el resto son JS puro.
- Leer config desde variables de entorno; en producción se cargan desde el panel de cPanel (sección "Environment variables" de la app), no desde `.env`.
- Montar todas las rutas bajo `/api` igual que en desarrollo.

### Requisitos del frontend para hosting Apache
- `frontend/.env.production` con `VITE_API_URL=https://api.tudominio.com/api`.
- Vue Router en modo `createWebHistory()`: crear `frontend/public/.htaccess` para que cualquier ruta sirva `index.html`:
  ```apache
  <IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
  </IfModule>
  ```
- `CORS_ORIGIN` de la API en producción: `https://tudominio.com,https://www.tudominio.com`.

### Script de prueba de conexión
Crear `backend/scripts/probar-bd.js` (`npm run probar-bd`): se conecta a Azure SQL, ejecuta `SELECT 1` y muestra un mensaje claro si falla, distinguiendo:
- timeout / ECONNREFUSED → el hosting bloquea el puerto 1433 o falta la IP en el firewall de Azure;
- error de login → usuario/contraseña incorrectos.

### Guía paso a paso (incluirla en README.md, en español y para alguien no experto)
1. **Verificar con soporte del hosting** que se permiten conexiones salientes al puerto **1433**.
2. **Azure**: en el servidor SQL → Redes → agregar la **IP del hosting** (la muestra cPanel o soporte) a las reglas de firewall.
3. **Subdominio**: en cPanel → Dominios → crear `api.tudominio.com`. Activar SSL (AutoSSL / Let's Encrypt) para el dominio y el subdominio.
4. **Subir la API**: comprimir `backend/` **sin** `node_modules` ni `.env`, subir por Administrador de archivos a una carpeta fuera de public_html (ej. `/home/usuario/eys-api`) y descomprimir.
5. **Crear la app Node**: cPanel → Setup Node.js App → Create Application:
   - Node.js version: 20 o la más alta disponible
   - Application mode: Production
   - Application root: `eys-api`
   - Application URL: `api.tudominio.com`
   - Application startup file: `app.js`
   - Agregar variables de entorno (DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT, JWT_SECRET, JWT_EXPIRES, CORS_ORIGIN)
6. Pulsar **Run NPM Install**, luego **Restart**.
7. Probar `https://api.tudominio.com/api/health` en el navegador → debe responder `{ ok: true }`.
8. **Crear el usuario admin**: desde la Terminal de cPanel, entrar al entorno virtual (cPanel muestra el comando `source .../activate` arriba de la app) y ejecutar `npm run crear-usuario -- admin <password> "Nombre"`.
9. **Frontend**: en la PC local, `cd frontend && npm run build`, subir el **contenido** de `dist/` (incluido `.htaccess`) a `public_html`.
10. Abrir `https://tudominio.com` y probar el registro público y el login.

### Actualizar después de cambios
- API: subir los archivos cambiados → Restart en Setup Node.js App (Run NPM Install si cambió `package.json`).
- Frontend: `npm run build` y reemplazar el contenido de `public_html`.

### Plan B (si el hosting bloquea el puerto 1433 o no tiene Node.js)
Desplegar **solo la API** en Azure App Service (Linux, Node 20) — está en la misma red que la BD — y dejar el frontend en el hosting. Cambia únicamente `VITE_API_URL` a la URL de App Service. El código no debe requerir cambios.

## Orden de implementación

1. `schema.sql`
2. Backend: `db.js`, `/api/health` → probar conexión
3. Backend: auth + script de usuario
4. Backend: rutas de personas (pública y protegidas)
5. Frontend: base (router, api, store)
6. Frontend: RegistroPublico + PersonaFields
7. Frontend: Login, Lista, Form
8. `app.js`, `.htaccess`, script `probar-bd`
9. README con instrucciones de instalación local y la guía de despliegue en cPanel
