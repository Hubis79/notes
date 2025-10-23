# Notes FE (Angular + Ionic)

Minimal frontend for the Notes app built with Angular and Ionic.

## Prerequisites
- **Node.js** 18+ (LTS recommended)
- **npm** 9+
- (Optional) **Angular CLI** if you want to use `ng` directly: `npm i -g @angular/cli`
- (Optional) **Docker** if you want to run the API via Docker

## Install
```bash
npm install
```

## Run (frontend)
```bash
npm start
```
- App runs at: http://localhost:4200

## Backend API helpers
Convenience scripts to work with the backend located in `../notes-api/`.
```bash
# Run API locally (uses ../notes-api/run-local.sh)
npm run api:local

# Run API in Docker (uses ../notes-api/run-docker.sh which invokes docker-compose.yml)
npm run api:up

# Show API container logs
npm run api:logs

# Restart API container
npm run api:restart

# Stop API containers
npm run api:down

# Stop and remove volumes
npm run api:down:all

# Show API container status
npm run api:ps
```

## Build
```bash
npm run build
```
- Production build artifacts go to `notes/www/`

## Lint & Test
```bash
npm run lint
npm test
```

## Environment
- Dev config: `src/environments/environment.ts`
- Prod config: `src/environments/environment.prod.ts`

If you need custom runtime values (e.g., API URL), add them to the environment files and consume via Angular DI where needed.

## Troubleshooting
- If `ng` is not found, use `npm start` (it runs the local CLI) or install the global CLI.
- If API calls fail, ensure the backend is running (`npm run api:local` or `npm run api:up`).
