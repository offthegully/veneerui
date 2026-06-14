# syntax=docker/dockerfile:1

# Veneer playground (veneerui.dev) image. Two stages: build the Vite SPA in a
# full Node toolchain, then ship only the static `dist/` behind nginx.

# ── Build stage ───────────────────────────────────────────────────────────
FROM node:22-slim AS build
WORKDIR /app

# The playground depends on the @offthegully/veneerui workspace package and the
# gen:theme/gen:builtin scripts read the gallery, so we install against the whole
# monorepo rather than a single workspace.
COPY package.json package-lock.json tsconfig.json ./
COPY packages ./packages
COPY apps ./apps
COPY scripts ./scripts
COPY gallery ./gallery
RUN npm ci

# Build the theme runtime first (the playground imports it), then the SPA.
# build:theme also regenerates schemas/theme-v1.json into the playground bundle,
# so it ships at the canonical https://veneerui.dev/schemas/theme-v1.json URL.
RUN npm run build:theme && npm run build -w playground

# ── Runtime stage ─────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# SPA fallback + asset/schema caching (see nginx.conf).
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/playground/dist /usr/share/nginx/html

EXPOSE 8080
