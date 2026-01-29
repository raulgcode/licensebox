# 📦 LicenseBox

A modern license management system built with NestJS, React, and PostgreSQL.

## 🚀 Quick Start

Get up and running in 2 commands:

```bash
pnpm run setup
pnpm run dev
```

That's it! Your entire development environment will be ready. ✨

## 📋 Prerequisites

**Required:**

- [Docker Desktop](https://www.docker.com/products/docker-desktop) - Must be installed and running
- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (v8 or higher)

The setup script will automatically check for Docker and guide you through the installation if needed.

## 🏗️ What Gets Set Up

Running `pnpm run setup` automatically:

1. ✅ Verifies Docker is installed
2. ✅ Creates `.env` files for all apps
3. ✅ Installs all dependencies
4. ✅ Starts PostgreSQL in Docker
5. ✅ Configures Prisma ORM
6. ✅ Runs database migrations
7. ✅ Generates Prisma Client

## 📁 Project Structure

```
licensebox/
├── apps/
│   ├── api/                    # NestJS Backend API
│   │   ├── src/
│   │   │   ├── users.controller.ts
│   │   │   └── main.ts
│   │   └── .env
│   └── web/                    # React Frontend
│       ├── app/
│       └── .env
├── packages/
│   ├── database/               # Prisma ORM & Database Client
│   │   ├── prisma/
│   │   │   └── schema.prisma  # Database schema
│   │   └── src/
│   │       └── index.ts
│   └── shared/                 # Shared types & utilities
├── scripts/
│   └── setup.js               # Automated setup script
├── docker-compose.yml         # PostgreSQL container
└── turbo.json                 # Turborepo config
```

## 🛠️ Available Commands

### Root Commands

```bash
pnpm run setup        # Initial setup (run once)
pnpm run dev          # Start all services
pnpm run build        # Build all packages
pnpm run lint         # Lint all packages
pnpm run test         # Run all tests
pnpm run db:studio    # Open Prisma Studio (Database GUI)
```

### API Commands

```bash
pnpm --filter api dev     # Start API only
pnpm --filter api build   # Build API
```

### Database Commands

```bash
pnpm --filter database db:migrate    # Run migrations
pnpm --filter database db:generate   # Generate Prisma Client
pnpm --filter database db:studio     # Open Prisma Studio
pnpm --filter database db:seed       # Seed database with sample data
```

### Web Commands

```bash
pnpm --filter web dev     # Start web app only
pnpm --filter web build   # Build web app
```

## 🌐 Development URLs

After running `pnpm run dev`:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Prisma Studio:** Run `pnpm run db:studio`, then visit http://localhost:5555

## 🗄️ Database

### Connection Details

- **Host:** localhost
- **Port:** 5432
- **Database:** licensebox_db
- **Username:** licensebox
- **Password:** licensebox_dev

### Schema

The database includes two example models:

- **User** - User accounts
- **License** - License keys associated with users

### Modifying the Schema

1. Edit `apps/api/prisma/schema.prisma`
2. Run migrations:
   ```bash
   pnpm --filter api db:migrate
   ```

## 🔌 API Endpoints

Example endpoints available after setup:

- `GET /` - Health check
- `GET /users` - Get all users
- `POST /users` - Create a new user
  ```json
  {
    "email": "user@example.com",
    "name": "John Doe"
  }
  ```

## 🐛 Troubleshooting

### Docker Not Found

```bash
Error: Docker is not installed or not running
```

**Solution:** Install Docker Desktop and make sure it's running.

### Port Already in Use

```bash
Error: Port 5432 is already in use
```

**Solution:** Stop any existing PostgreSQL services or change the port in `docker-compose.yml`.

### Database Connection Failed

```bash
Error: Can't reach database server
```

**Solutions:**

1. Check Docker is running: `docker ps`
2. View logs: `docker-compose logs postgres`
3. Restart: `docker-compose restart postgres`

### Clean Slate

To reset everything:

```bash
docker-compose down -v    # Remove database
rm -rf node_modules       # Remove dependencies
rm apps/*/.env           # Remove env files
pnpm run setup           # Run setup again
```

## 🧪 Testing

```bash
pnpm run test           # Run all tests
pnpm run test:watch     # Watch mode
pnpm run test:cov       # Coverage report
```

## 📦 Building for Production

```bash
pnpm run build
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the UNLICENSED license.

## 🙋 Support

For detailed setup information, see [SETUP.md](SETUP.md).

---

**Built with:**

- ⚡ [NestJS](https://nestjs.com/) - Backend framework
- ⚛️ [React](https://react.dev/) - Frontend library
- 🔷 [TypeScript](https://www.typescriptlang.org/) - Type safety
- 🗄️ [PostgreSQL](https://www.postgresql.org/) - Database
- 🔺 [Prisma](https://www.prisma.io/) - ORM
- 🏎️ [Turborepo](https://turbo.build/) - Monorepo management
- 🐳 [Docker](https://www.docker.com/) - Containerization
