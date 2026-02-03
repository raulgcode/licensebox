# Fresh Install Guide

## Overview

Este proyecto incluye dos scripts de instalación:

1. **`pnpm setup`** - Instalación normal (detecta si ya está configurado)
2. **`pnpm fresh-install`** - Instalación desde cero (borra todo y reinstala)

## Cuándo usar Fresh Install

Usa `pnpm fresh-install` cuando:

- El setup normal dice "Everything is already up to date" pero quieres reinstalar
- Tienes problemas con dependencias o caché corruptas
- Quieres empezar completamente desde cero
- Has hecho cambios importantes en la configuración y quieres limpiar todo

## ¿Qué hace Fresh Install?

El script `fresh-install` realiza las siguientes acciones:

### 1. Docker

- Para y elimina todos los contenedores de Docker
- Elimina volúmenes de base de datos

### 2. Node Modules

- Elimina `node_modules` de:
  - Raíz del proyecto
  - `apps/api`
  - `apps/web`
  - `packages/database`
  - `packages/shared`

### 3. Lock Files

- Elimina todos los archivos `pnpm-lock.yaml`

### 4. Build Artifacts

- Elimina carpetas `dist` y `build`
- Elimina caché de Turbo (`.turbo`)

### 5. Prisma

- Elimina cliente generado de Prisma
- Limpia archivos generados

### 6. Environment Files

- Elimina archivos `.env` (serán recreados por el setup)

### 7. pnpm Store

- Limpia el store de pnpm

### 8. Setup Automático

- Después de limpiar todo, ejecuta automáticamente `pnpm setup`

## Cómo usar

### Opción 1: Fresh Install (Recomendado para empezar desde cero)

```bash
pnpm fresh-install
```

**⚠️ ADVERTENCIA:** Este comando espera 5 segundos antes de empezar. Si quieres cancelar, presiona `Ctrl+C` durante ese tiempo.

### Opción 2: Setup Normal

```bash
pnpm setup
```

Este comando detecta si ya existe configuración y la preserva.

## Flujo de Fresh Install

1. Muestra advertencia y espera 5 segundos
2. Para contenedores de Docker
3. Limpia todas las dependencias y archivos generados
4. Ejecuta `pnpm setup` automáticamente
5. Al final tendrás un proyecto completamente limpio y configurado

## Tiempos Estimados

- **Fresh Install**: ~5-10 minutos (dependiendo de tu conexión a internet)
- **Setup Normal**: ~2-3 minutos (si ya tienes dependencias en caché)

## Solución de Problemas

### El fresh-install falla

Si el `fresh-install` falla a mitad de proceso:

```bash
# 1. Para Docker manualmente
docker-compose down -v

# 2. Intenta de nuevo
pnpm fresh-install
```

### Permiso denegado en Windows

Si tienes problemas de permisos:

```bash
# Ejecuta PowerShell como Administrador
# O asegúrate de que Docker Desktop esté corriendo
```

### Base de datos no inicia

```bash
# Verifica que Docker Desktop esté corriendo
docker ps

# Si no ves contenedores, inicia Docker Desktop
```

## Scripts Adicionales

Después de la instalación, estos comandos están disponibles:

```bash
# Desarrollo
pnpm dev              # Inicia modo desarrollo (API + Web)

# Base de datos
pnpm db:studio        # Abre Prisma Studio
pnpm db:migrate       # Ejecuta migraciones
pnpm db:generate      # Genera Prisma Client

# Build
pnpm build            # Construye todo el proyecto

# Linting y formato
pnpm lint             # Ejecuta linter
pnpm format           # Formatea código
```

## Notas Importantes

1. **Docker debe estar corriendo** antes de ejecutar cualquier script de setup
2. **El fresh-install es destructivo** - borra todo incluyendo la base de datos
3. **Guarda tus cambios** antes de ejecutar fresh-install
4. **No uses fresh-install en producción** - solo para desarrollo local

## Soporte

Si encuentras problemas:

1. Asegúrate de que Docker Desktop esté corriendo
2. Verifica que tienes Node.js 18+ y pnpm instalados
3. Revisa los logs en la terminal para errores específicos
4. Si todo falla, intenta reiniciar Docker Desktop y tu computadora
