# CI/CD Pipeline Documentation

Este documento describe la configuración de CI/CD para el proyecto LicenseBox usando GitHub Actions y Semantic Release.

## 📁 Estructura

```
.github/
└── workflows/
    ├── ci-cd.yml          # Pipeline principal (automático)
    └── manual-deploy.yml  # Deploy manual con opciones
```

## 🔄 Pipeline Automático (ci-cd.yml)

El pipeline principal se ejecuta automáticamente en cada push a `main` y en pull requests.

### Flujo de Trabajo

```
┌─────────────────┐
│ Detect Changes  │ ─────── Detecta cambios en api/, web/, database/, shared/
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Build & Test   │ ─────── Build, lint y tests
└────────┬────────┘
         │
    ┌────┴────┬─────────────────┐
    │         │                 │
    ▼         ▼                 ▼
┌────────┐ ┌────────┐     ┌────────────┐
│Release │ │Release │     │  Release   │
│Database│ │  Web   │     │    API     │ ── Depende de Database
└────┬───┘ └───┬────┘     └─────┬──────┘
     │         │                │
     └────┬────┘                │
          │                     │
          ▼                     ▼
    ┌──────────┐          ┌──────────┐
    │Deploy Web│          │Deploy API│
    └──────────┘          └──────────┘
```

### Detección de Cambios

El pipeline usa `dorny/paths-filter` para detectar cambios:

| Componente | Se activa cuando cambia...                                  |
| ---------- | ----------------------------------------------------------- |
| API        | `apps/api/**`, `packages/database/**`, `packages/shared/**` |
| Web        | `apps/web/**`, `packages/shared/**`                         |
| Database   | `packages/database/**`                                      |

### Semantic Release

Cada componente tiene su propia configuración de semantic release con tags únicos:

- **API**: `api-v1.0.0`
- **Web**: `web-v1.0.0`
- **Database**: `database-v1.0.0`

### Formato de Commits (Conventional Commits)

```bash
# Minor release (nueva funcionalidad)
feat(api): add new license validation endpoint

# Patch release (corrección de bugs)
fix(web): correct form validation error

# Major release (breaking change)
feat(api)!: change API response format

BREAKING CHANGE: The response format has been updated
```

## 🚀 Deploy Manual (manual-deploy.yml)

Permite hacer deploy manual desde GitHub Actions.

### Opciones

| Opción                  | Descripción                                                         |
| ----------------------- | ------------------------------------------------------------------- |
| `target`                | Selecciona qué desplegar: `api`, `web`, o `both`                    |
| `skip_semantic_release` | Si es `true`, fuerza el deploy sin verificar si hay nuevos releases |

### Cómo usar

1. Ve a **Actions** → **Manual Deploy**
2. Click en **Run workflow**
3. Selecciona el target y opciones
4. Click en **Run workflow**

### Flujo del Deploy Manual

```
┌─────────────────┐
│ Build & Validate│
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Check   │ │Check   │
│API     │ │Web     │ ─── Verifica si hay nuevos commits con semantic-release
└───┬────┘ └───┬────┘
    │          │
    ▼          ▼
┌────────┐ ┌────────┐
│Deploy  │ │Deploy  │ ─── Solo si hay cambios (o force deploy)
│API     │ │Web     │
└────────┘ └────────┘
```

## ⚙️ Configuración Requerida

### Secrets de GitHub

Configura los siguientes secrets en tu repositorio:

| Secret          | Descripción                      |
| --------------- | -------------------------------- |
| `FLY_API_TOKEN` | Token de autenticación de Fly.io |

### Obtener FLY_API_TOKEN

```bash
# Login en Fly.io
fly auth login

# Crear token
fly tokens create deploy -x 999999h

# Copiar el token y agregarlo como secret en GitHub
```

### Permisos del GITHUB_TOKEN

El workflow usa `GITHUB_TOKEN` automático. Asegúrate de que tenga permisos de escritura:

1. Ve a **Settings** → **Actions** → **General**
2. En "Workflow permissions", selecciona **Read and write permissions**
3. Marca **Allow GitHub Actions to create and approve pull requests**

## 📝 Archivos de Configuración

### .releaserc.json (por componente)

Cada componente tiene su propio archivo `.releaserc.json`:

- `apps/api/.releaserc.json`
- `apps/web/.releaserc.json`
- `packages/database/.releaserc.json`

### Configuración Principal

```json
{
  "tagFormat": "api-v${version}", // Tag único por componente
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/git",
    "@semantic-release/github"
  ]
}
```

## 🏷️ Versionado

El proyecto usa [Conventional Commits](https://www.conventionalcommits.org/) para determinar automáticamente las versiones:

| Tipo de Commit               | Versión       |
| ---------------------------- | ------------- |
| `fix:`, `perf:`, `refactor:` | Patch (0.0.X) |
| `feat:`                      | Minor (0.X.0) |
| `feat!:` o `BREAKING CHANGE` | Major (X.0.0) |

### Scopes Recomendados

```bash
feat(api): ...      # Cambios en el API
feat(web): ...      # Cambios en el Web
feat(db): ...       # Cambios en Database
feat(shared): ...   # Cambios en Shared
```

## 🔍 Debugging

### Ver logs de los workflows

1. Ve a **Actions**
2. Selecciona el workflow
3. Click en el job específico
4. Expande los steps para ver los logs

### Forzar un deploy

Si necesitas desplegar sin cambios en los commits:

1. Usa **Manual Deploy**
2. Activa **Skip semantic release check**
3. Esto desplegará el código actual sin crear un nuevo release

### Re-ejecutar un workflow fallido

1. Ve a **Actions**
2. Selecciona el workflow fallido
3. Click en **Re-run all jobs** o **Re-run failed jobs**

## 📊 Resumen del Pipeline

Al final de cada ejecución en `main`, el pipeline genera un resumen con:

- Cambios detectados por componente
- Versiones liberadas
- Estado de los deploys

Este resumen aparece en la pestaña **Summary** del workflow run.
