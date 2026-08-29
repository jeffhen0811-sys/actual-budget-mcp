FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    ACTUAL_DATA_DIR=/var/lib/actual-budget-mcp
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
RUN mkdir -p /var/lib/actual-budget-mcp && chown node:node /var/lib/actual-budget-mcp
USER node
VOLUME ["/var/lib/actual-budget-mcp"]
ENTRYPOINT ["node", "dist/index.js"]
