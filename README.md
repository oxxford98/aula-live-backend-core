# aula-live-backend-core
Backend Core para proyecto Aula Live - Proyecto Integrador Univalle

## Endpoints de usuarios con Firestore

Base URL: /api/users

## Documentacion Swagger

Con el servidor en ejecucion:

- UI Swagger: http://localhost:3000/api/docs
- OpenAPI JSON: http://localhost:3000/api/docs.json

Si cambias el puerto en .env, reemplaza 3000 por el valor configurado.

1. Registro manual

POST /manual-register

Body JSON:

{
	"email": "usuario@correo.com",
	"password": "123456",
	"username": "usuario_01",
	"displayName": "Usuario Demo"
}

Reglas:

- username obligatorio
- username unico (no se permite duplicado)
- username entre 3 y 20 caracteres, solo letras, numeros y guion bajo

2. Login con Google

POST /google-login

Body JSON:

{
	"idToken": "TOKEN_DE_FIREBASE_AUTH",
	"username": "usuario_01"
}

Reglas:

- se valida que el token sea de Google
- en el primer login con Google, username es obligatorio
- si el usuario ya existe, username no es obligatorio

3. Verificar disponibilidad de username

GET /username/:username/availability

Respuesta JSON:

{
	"available": true
}

## CI con GitHub Actions

Se agrego un workflow:

- `.github/workflows/ci.yml`
	- Ejecuta en Pull Request hacia `main`.
	- Valida compilacion (`npm ci` + `npm run build`).

