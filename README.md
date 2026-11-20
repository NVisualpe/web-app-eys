# EYS — Registro de personas

Aplicación web para registrar personas:

- **Página pública** (sin login) para que cualquiera registre sus datos. Se puede compartir por WhatsApp.
- **Zona interna** con login para ver el listado, buscar, registrar y editar personas.

```
[Vue 3 (navegador)]  --HTTP/JSON-->  [API Express]  --mssql (TLS)-->  [Azure SQL]
```

| Carpeta | Contenido |
|---|---|
| `database/` | Script SQL de creación de tablas |
| `backend/` | API Node.js / Express |
| `frontend/` | Aplicación Vue 3 (Vite) |

---

## 1. Instalación local (desarrollo)

### Requisitos
- Node.js 20 o superior
- Una base de datos Azure SQL creada
- En Azure → servidor SQL → **Redes**: agregar la **IP de tu PC** a las reglas de firewall

### 1.1 Base de datos
Abre tu base de datos en el portal de Azure → **Query editor** (o Azure Data Studio / SSMS), pega el contenido de `database/schema.sql` y ejecútalo. Se puede ejecutar varias veces sin problema.

### 1.2 API
```bash
cd backend
npm install
cp .env.example .env      # en Windows: copy .env.example .env
```
Completa `.env`:

| Variable | Ejemplo / descripción |
|---|---|
| `DB_SERVER` | `miservidor.database.windows.net` |
| `DB_NAME` | nombre de la base de datos |
| `DB_USER` / `DB_PASSWORD` | usuario SQL |
| `DB_PORT` | `1433` |
| `JWT_SECRET` | cadena larga aleatoria. Genérala con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES` | duración de la sesión, ej. `8h` |
| `PORT` | `3000` |
| `CORS_ORIGIN` | `http://localhost:5173` |

```bash
npm run probar-bd                                    # verifica la conexión a Azure SQL
npm run crear-usuario -- admin MiClave123 "Administrador"   # crea el primer usuario
npm run dev                                          # inicia la API en http://localhost:3000
```
Prueba: abre <http://localhost:3000/api/health> → debe responder `{"ok":true}`.

### 1.3 Frontend
En otra terminal:
```bash
cd frontend
npm install
npm run dev
```
Abre <http://localhost:5173>:
- `/` → registro público
- `/login` → ingreso de usuarios internos
- `/personas` → listado (requiere login)

---

## 2. Endpoints de la API

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | No | `{ usuario, password }` → `{ token, usuario }` (máx. 10 intentos / 15 min) |
| GET | `/api/auth/me` | Sí | Datos del usuario de la sesión |
| POST | `/api/publico/personas` | No | Registro público (máx. 20 / hora por IP) |
| GET | `/api/personas?q=&page=&pageSize=` | Sí | Listado paginado; `q` busca por DNI o nombre |
| GET | `/api/personas/:id` | Sí | Detalle |
| POST | `/api/personas` | Sí | Crear |
| PUT | `/api/personas/:id` | Sí | Editar |
| GET | `/api/health` | No | Prueba de conexión a la BD |

Rutas con Auth: enviar el header `Authorization: Bearer <token>`.

---

## 3. Despliegue en hosting con cPanel

```
https://tudominio.com        → frontend Vue (archivos estáticos en public_html)
https://api.tudominio.com    → API Node.js (app de cPanel)
                                   ↓ puerto 1433 (TLS)
                              Azure SQL
```

> En todos los pasos, reemplaza **tudominio.com** por tu dominio real.

### Paso 1 — Consultar con soporte del hosting
Pregunta a soporte: *“¿Mi plan permite aplicaciones Node.js (Setup Node.js App) y conexiones salientes al puerto 1433?”*
Si la respuesta es **no**, ve al **Plan B** (al final).

### Paso 2 — Autorizar la IP del hosting en Azure
1. Averigua la IP del hosting (aparece en cPanel, en la columna derecha “Dirección IP compartida”, o pregúntala a soporte).
2. Portal de Azure → tu **servidor SQL** → **Redes** → **Reglas de firewall** → **Agregar regla**: pon esa IP como inicio y fin → **Guardar**.

### Paso 3 — Crear el subdominio y activar SSL
1. cPanel → **Dominios** → **Crear un nuevo dominio** → `api.tudominio.com`.
2. cPanel → **SSL/TLS Status** → marca `tudominio.com`, `www.tudominio.com` y `api.tudominio.com` → **Run AutoSSL**.

### Paso 4 — Subir la API
1. En tu PC, comprime la carpeta `backend/` en un `.zip` **sin** la carpeta `node_modules` y **sin** el archivo `.env`.
2. cPanel → **Administrador de archivos** → en tu carpeta de inicio (`/home/tuusuario`, **fuera** de `public_html`) crea la carpeta `eys-api`.
3. Entra a `eys-api`, **Cargar** el `.zip` y luego **Extraer**. Deben quedar `app.js`, `package.json`, `src/` y `scripts/` directamente dentro de `eys-api`.

### Paso 5 — Crear la aplicación Node.js
cPanel → **Setup Node.js App** → **Create Application**:

| Campo | Valor |
|---|---|
| Node.js version | 20 (o la más alta disponible) |
| Application mode | Production |
| Application root | `eys-api` |
| Application URL | `api.tudominio.com` |
| Application startup file | `app.js` |

En **Environment variables** agrega una por una:
`DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` (1433), `JWT_SECRET` (cadena larga aleatoria, **distinta** a la de desarrollo), `JWT_EXPIRES` (8h) y
`CORS_ORIGIN` = `https://tudominio.com,https://www.tudominio.com`

Pulsa **Create**. (No agregues `PORT`: cPanel lo asigna solo.)

### Paso 6 — Instalar dependencias
En la misma pantalla de la app: **Run NPM Install** y después **Restart**.

### Paso 7 — Probar la API
Abre en el navegador `https://api.tudominio.com/api/health` → debe mostrar `{"ok":true}`.

Si muestra un error, prueba la conexión desde la Terminal (siguiente paso) con `npm run probar-bd`; el mensaje indica si el problema es el firewall de Azure, el puerto bloqueado o la contraseña.

### Paso 8 — Crear el usuario administrador
1. En **Setup Node.js App**, arriba de la app aparece un comando del tipo
   `source /home/tuusuario/nodevenv/eys-api/20/bin/activate && cd /home/tuusuario/eys-api` → cópialo.
2. cPanel → **Terminal** → pega el comando y Enter.
3. Ejecuta:
   ```bash
   npm run probar-bd
   npm run crear-usuario -- admin TuClaveSegura "Nombre del administrador"
   ```

### Paso 9 — Publicar el frontend
En tu PC:
1. Edita `frontend/.env.production` → `VITE_API_URL=https://api.tudominio.com/api`
2. Ejecuta:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
3. Se crea la carpeta `frontend/dist/`. Sube **su contenido** (no la carpeta) a `public_html` con el Administrador de archivos (puedes comprimirlo en .zip y extraerlo allá).
   ⚠ El archivo `.htaccess` está oculto: en el Administrador de archivos activa **Configuración → Mostrar archivos ocultos** y verifica que se haya subido.

### Paso 10 — Probar todo
- Abre `https://tudominio.com` → registra una persona de prueba.
- Abre `https://tudominio.com/login` → ingresa con el usuario admin → verifica que la persona aparezca en el listado.
- Recarga la página estando en `/personas`: debe seguir funcionando (si da 404, falta el `.htaccess`).

### Actualizar después de cambios
- **API**: sube los archivos modificados a `eys-api` → **Restart** en Setup Node.js App (si cambió `package.json`, antes **Run NPM Install**).
- **Frontend**: `npm run build` y reemplaza el contenido de `public_html` por el de `dist/`.

### Plan B — si el hosting bloquea el puerto 1433 o no tiene Node.js
Publica **solo la API** en **Azure App Service** (Linux, Node 20), que está en la misma red que la base de datos:
- Comando de inicio: `npm start`
- Variables de entorno: las mismas del paso 5 (en *Configuración → Variables de entorno*).
- En el firewall del servidor SQL activa “Permitir que los servicios de Azure accedan a este servidor”.

Deja el frontend en el hosting y cambia únicamente `VITE_API_URL` en `frontend/.env.production` a la URL de App Service (ej. `https://eys-api.azurewebsites.net/api`), vuelve a hacer `npm run build` y sube `dist/`. El código no requiere cambios.

---

## 4. Cómo agregar un formulario nuevo

Ver la sección *“Cómo agregar un formulario nuevo”* en `CLAUDE.md`. En resumen, para una entidad `X`:
1. `database/002_x.sql`
2. Backend: `src/validators/x.js`, `src/repositories/x.js`, `src/routes/x.routes.js` y montarla en `src/server.js`
3. Frontend: `src/components/forms/XFields.vue`, `src/validators/x.js`, vistas en `src/views/x/`, rutas en `src/router.js` y enlace en el menú de `App.vue`
