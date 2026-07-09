# Runs both the Fastify server and the BullMQ worker in a single container
# (see docker-entrypoint.sh) — the Railway trial plan's resource cap doesn't
# allow a separate service per process.

FROM node:20-slim AS build
WORKDIR /app

# Prisma's query/schema engines link against OpenSSL; node:20-slim doesn't
# ship it by default.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY packages/api/package.json packages/api/package.json
RUN npm ci

COPY packages/api packages/api

# Prisma's generate step only reads the schema file — it never connects to a
# database — but it does require DATABASE_URL to be set to *something*.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npx prisma generate --schema=packages/api/prisma/schema.prisma

RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# The Prisma query engine binary at runtime also needs OpenSSL, not just at
# generate-time.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy the whole build output rather than cherry-picking paths — npm
# workspaces hoists some deps to the root node_modules and leaves others
# nested under packages/api/node_modules, so a partial copy silently drops
# packages depending on npm's hoisting decisions for a given install.
COPY --from=build /app ./
COPY config ./config
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

CMD ["./docker-entrypoint.sh"]
