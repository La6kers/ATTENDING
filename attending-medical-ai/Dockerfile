# Backend
FROM node:20-slim AS backend
WORKDIR /app
COPY package.json ./
COPY apps/backend/package.json apps/backend/
RUN npm install --workspace=apps/backend
COPY apps/backend apps/backend
COPY scripts scripts
EXPOSE 3001
CMD ["node", "apps/backend/server.js"]

# Frontend build
FROM node:20-slim AS frontend-build
WORKDIR /app
COPY package.json ./
COPY apps/frontend/package.json apps/frontend/
RUN npm install --workspace=apps/frontend
COPY apps/frontend apps/frontend
RUN npm run build --workspace=apps/frontend

# Frontend serve
FROM nginx:alpine AS frontend
COPY --from=frontend-build /app/apps/frontend/dist /usr/share/nginx/html
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        try_files \$uri /index.html;
    }
    location /api/ {
        proxy_pass http://backend:3001;
    }
}
EOF
EXPOSE 80
