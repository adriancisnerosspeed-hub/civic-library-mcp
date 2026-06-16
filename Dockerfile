# Dockerfile for civic-library-mcp.
# Builds the MCP server into a stdio container. Glama builds this image, starts
# it, and verifies the server responds to MCP introspection (tools/list).
# Run locally: docker build -t civic-library-mcp . && docker run -i --rm civic-library-mcp

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY data ./data
# stdio MCP server — Glama (and MCP clients) connect over stdin/stdout.
ENTRYPOINT ["node", "dist/index.js"]
