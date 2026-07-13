# aula-live-backend-core

Backend Core para el proyecto **Aula Live** - Proyecto Integrador Univalle.

## Tecnologías

- Node.js
- TypeScript
- Express
- Firebase Admin SDK
- Firestore
- Swagger (OpenAPI)

## Requisitos

- Node.js 20 o superior
- npm
- Una cuenta y proyecto de Firebase con Firestore habilitado

## Instalación

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd aula-live-backend-core
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
PORT=3000

FIREBASE_PROJECT_ID=aula-live-xxxxxxxx

FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@aula-live-xxxxx.iam.gserviceaccount.com

FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_CLAVE_PRIVADA\n-----END PRIVATE KEY-----\n"
```

> **Importante:** La variable `FIREBASE_PRIVATE_KEY` debe conservar los caracteres `\n` para representar correctamente los saltos de línea de la clave privada.

### 4. Ejecutar el proyecto

Modo desarrollo:

```bash
npm run dev
```

Compilar el proyecto:

```bash
npm run build
```

Ejecutar la versión compilada:

```bash
npm start
```

---

## Scripts disponibles

| Comando | Descripción |
|----------|-------------|
| `npm install` | Instala todas las dependencias del proyecto. |
| `npm run dev` | Inicia el servidor en modo desarrollo. |
| `npm run build` | Compila el proyecto TypeScript. |
| `npm start` | Ejecuta la aplicación compilada. |

---

## Documentación Swagger

Con el servidor en ejecución:

- UI Swagger: http://localhost:3000/api/docs
- OpenAPI JSON: http://localhost:3000/api/docs.json

> Si cambias el puerto en el archivo `.env`, reemplaza `3000` por el valor configurado.

---

# Endpoints de usuarios con Firestore

**Base URL**

```
/api/users
```

## 1. Registro manual

**POST** `/manual-register`

### Body JSON

```json
{
  "email": "usuario@correo.com",
  "password": "123456",
  "username": "usuario_01",
  "displayName": "Usuario Demo"
}
```

### Reglas

- `username` es obligatorio.
- `username` debe ser único.
- Debe tener entre **3 y 20 caracteres**.
- Solo se permiten letras, números y guion bajo (`_`).

---

## 2. Login con Google

**POST** `/google-login`

### Body JSON

```json
{
  "idToken": "TOKEN_DE_FIREBASE_AUTH",
  "username": "usuario_01"
}
```

### Reglas

- Se valida que el token corresponda a una autenticación válida de Google.
- En el primer inicio de sesión mediante Google, `username` es obligatorio.
- Si el usuario ya existe, `username` es opcional.

---

## 3. Verificar disponibilidad de username

**GET** `/username/:username/availability`

### Respuesta

```json
{
  "available": true
}
```

---

# Integración Continua (CI)

El proyecto cuenta con un flujo de integración continua mediante **GitHub Actions** ubicado en:

```
.github/workflows/ci.yml
```

### Características

- Se ejecuta automáticamente al crear o actualizar un **Pull Request** hacia la rama `main`.
- Instala las dependencias utilizando:

```bash
npm ci
```

- Compila el proyecto utilizando:

```bash
npm run build
```

Este proceso permite validar automáticamente que el proyecto compile correctamente antes de integrar cambios en la rama principal.
