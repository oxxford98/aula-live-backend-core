# aula-live-backend-core
Backend Core para proyecto Aula Live - Proyecto Integrador Univalle

## CI con GitHub Actions

Se agrego un workflow:

- `.github/workflows/ci.yml`
	- Ejecuta en Pull Request hacia `main`.
	- Valida compilacion (`npm ci` + `npm run build`).

