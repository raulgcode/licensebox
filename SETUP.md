# LicenseBox Setup Guide

## Quick Start

Get your entire development environment running with just 2 commands:

```bash
pnpm run setup
pnpm run dev
```

That's it! 🎉

## What the setup script does

The `pnpm run setup` command automatically:

1. ✅ Checks if Docker is installed
2. ✅ Creates environment file (`.env` at project root)
3. ✅ Installs all project dependencies
4. ✅ Starts PostgreSQL database in Docker
5. ✅ Sets up the database schema with Prisma
6. ✅ Runs database migrations

## Prerequisites

**Only requirement:** [Docker Desktop](https://www.docker.com/products/docker-desktop) must be installed and running.

- On Windows: Download and install Docker Desktop
- The setup script will check for Docker and guide you if it's not found

## What you get

After running `pnpm run setup`:

- 🗄️ PostgreSQL database running on `localhost:5432`
- 🔐 Database credentials:
  - Username: `licensebox`
  - Password: `licensebox_dev`
  - Database: `licensebox_db`
- 📊 Prisma schema with example models (User, License)
- 🔧 Environment file (`.env`) at project root configured with all required variables

## Available Commands

### Root Level

- `pnpm run setup` - Initial project setup (run once)
- `pnpm run dev` - Start all services in development mode
- `pnpm run build` - Build all packages
- `pnpm run db:studio` - Open Prisma Studio (Database GUI)

### API Commands

```bash
# Run from root with --filter
pnpm --filter api dev           # Start API in development mode
```

### Database Commands

```bash
# Run from root with --filter
pnpm --filter database db:migrate    # Run database migrations
pnpm --filter database db:generate   # Generate Prisma Client
pnpm --filter database db:studio     # Open Prisma Studio
pnpm --filter database db:seed       # Seed with sample data
```

## Project Structure

```
licensebox/
├── .env                        # Environment variables (project root)
├── apps/
│   ├── api/                    # NestJS backend
│   └── web/                    # React frontend
├── packages/
│   └── database/               # Shared database package
│       └── prisma/
│           └── schema.prisma  # Database schema
├── docker-compose.yml          # PostgreSQL container config
└── scripts/
    └── setup.js                # Automated setup script
```

**Note:** All environment variables are centralized in the root `.env` file, eliminating circular dependencies between packages.

## Troubleshooting

### Docker not found

If you see "Docker is not installed", please:

1. Install Docker Desktop from https://www.docker.com/products/docker-desktop
2. Start Docker Desktop
3. Run `pnpm run setup` again

### Port already in use

If port 5432 is already in use:

1. Stop any existing PostgreSQL services
2. Or modify the port in `docker-compose.yml`

### Database connection issues

If you can't connect to the database:

1. Ensure Docker container is running: `docker ps`
2. Check logs: `docker-compose logs postgres`
3. Restart the database: `docker-compose restart postgres`

### Starting fresh

To completely reset your development environment:

```bash
docker-compose down -v  # Stop and remove database
pnpm run setup          # Run setup again
```

## Development URLs

After running `pnpm run dev`:

- 🌐 Web App: http://localhost:5173
- 🔌 API: http://localhost:3000
- 📊 Prisma Studio: Run `pnpm run db:studio` then visit http://localhost:5555

## Next Steps

1. Copy `.env.example` to `.env` at the project root and customize if needed
2. Customize the Prisma schema in `packages/database/prisma/schema.prisma`
3. Run `pnpm --filter database db:migrate` after schema changes
4. Start building your license management system!

---

**Note:** The `.env` file at the project root is configured for local development. For production, you'll need to update it with your actual credentials.
