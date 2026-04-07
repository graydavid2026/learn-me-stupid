# Stage 1: Build client
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Copy built client
COPY --from=build /app/dist/client ./dist/client

# Copy server + shared source
COPY server/ ./server/
COPY shared/ ./shared/
COPY tsconfig*.json ./

# Copy pre-built flashcard database and media (SVG symbols, images)
RUN mkdir -p server/uploads server/db
COPY server/db/mnemonic.db ./server/db/
COPY server/uploads/ ./server/uploads/

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -q --spider http://localhost:3001/api/health || exit 1

CMD ["npx", "tsx", "server/index.ts"]
