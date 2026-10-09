# Migrar de Fly Managed Postgres a Fly Postgres (legacy)

Objetivo: bajar el costo moviendo la base de datos de `licensebox-api` desde Managed Postgres (MPG)
a una app de Fly Postgres de un solo nodo (`shared-cpu-1x`, volumen de 1 GB), sin perder datos.

Todo se ejecuta con `scripts/fly-migrate-postgres.sh` (bash: Linux, macOS, WSL o Git Bash).
Solo necesitas `flyctl` con sesión iniciada (`fly auth login`); `pg_dump` y `psql` corren dentro de Fly.

## Antes de empezar

```bash
fly mpg list                 # anota el id del cluster y la versión de Postgres
export FLY_ORG=personal      # tu organización en Fly (fly orgs list)
```

Si la versión de MPG es 17, usa `export PG_IMAGE=flyio/postgres-flex:17`.

## Pasos

```bash
# 1. Crear el Postgres legacy (guarda las credenciales que imprime)
scripts/fly-migrate-postgres.sh create

# 2. Crear base de datos y usuario para la API (secret temporal NEW_DATABASE_URL)
scripts/fly-migrate-postgres.sh attach
export DST_URL='postgres://...licensebox-db.flycast:5432/licensebox_db?sslmode=disable'   # valor impreso

# 3. Copiar los datos (dump de MPG guardado en /data del nuevo Postgres + restore)
scripts/fly-migrate-postgres.sh copy

# 4. Verificar que los conteos por tabla sean idénticos (debe decir VERIFY-OK)
scripts/fly-migrate-postgres.sh verify

# 5. Bajar el dump a ./backups/ como respaldo local
scripts/fly-migrate-postgres.sh backup

# 6. Apuntar DATABASE_URL al nuevo Postgres y redeployar la API
scripts/fly-migrate-postgres.sh switch
```

Haz los pasos 3 a 6 seguidos: cualquier escritura en MPG después del paso 3 no se copia.
Si `verify` falla, vuelve a correr `copy` sobre una base vacía (`fly postgres connect -a licensebox-db`,
`DROP DATABASE licensebox_db;` y repetir `attach`) antes de seguir.

El paso `copy` lee la conexión de MPG del `DATABASE_URL` actual de la API. Si ese valor apunta al pooler
(pgbouncer) y `pg_dump` falla, copia la cadena **directa** desde el dashboard de MPG y pásala como
`export SRC_URL='postgres://...'`.

## Eliminar Managed Postgres (irreversible)

Solo después de que `verify` dio `VERIFY-OK`, la API funciona con el nuevo Postgres y existe el dump en `./backups/`:

```bash
export MPG_CLUSTER=<id de fly mpg list>
scripts/fly-migrate-postgres.sh destroy
```

## Volver atrás

Mientras MPG exista, revertir es poner de nuevo su cadena en `DATABASE_URL`
(`fly secrets set -a licensebox-api DATABASE_URL='...'`).
Después de eliminarlo, el respaldo es el dump: `pg_restore --no-owner -d <url> backups/mpg-backup-*.dump`.
