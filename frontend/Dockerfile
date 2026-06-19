# --- Inventory & Order Management System: Frontend Image ---
# Multi-stage build: compile the Vite app with Node, then serve the
# static output with a minimal nginx image.

# ---- Stage 1: build ----
FROM node:20-alpine AS build

WORKDIR /app

# Allows the API base URL to be baked in at build time, since Vite
# resolves import.meta.env.VITE_* values at build time, not runtime.
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# ---- Stage 2: serve ----
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O - http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
