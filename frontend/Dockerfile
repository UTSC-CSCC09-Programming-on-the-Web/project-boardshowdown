# Build the Angular App
FROM node:20-alpine AS build
WORKDIR /app
ENV PATH=/app/node_modules/.bin:$PATH
COPY package.json ./
COPY package-lock.json ./
RUN npm install --legacy-peer-deps
COPY . ./
RUN npm run build

# Serve these static files with NGINX.
FROM nginx:1.21.6-alpine
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
CMD ["nginx", "-g", "daemon off;"]
