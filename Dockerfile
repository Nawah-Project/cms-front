FROM node:24.22.2-alpine@sha256:4eefa1bfce4197942661ef9148247d779ddf1bb0ee006d3294a467609de60724 AS development-dependencies-env
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=optional

FROM node:24.22.2-alpine@sha256:4eefa1bfce4197942661ef9148247d779ddf1bb0ee006d3294a467609de60724 AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev --include=optional

FROM node:24.22.2-alpine@sha256:4eefa1bfce4197942661ef9148247d779ddf1bb0ee006d3294a467609de60724 AS build-env
ARG VITE_API_URL
ARG NAWAH_FRONTEND_APP=member
ENV VITE_API_URL=$VITE_API_URL NAWAH_FRONTEND_APP=$NAWAH_FRONTEND_APP
ENV NODE_OPTIONS="--max-old-space-size=4096"
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN if [ "$NAWAH_FRONTEND_APP" = "member" ]; then rm -rf public/founder-workspace public/strategic-relationships src/app/features/admin src/app/features/strategic-relationships; fi
# Unit checks run once in CI before either application image is packaged.
RUN npm run build && node scripts/check-frontend-bundle.mjs

FROM node:24.22.2-alpine@sha256:4eefa1bfce4197942661ef9148247d779ddf1bb0ee006d3294a467609de60724
COPY ./package.json package-lock.json /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
COPY ./monitoring/instrumentation.mjs /app/monitoring/instrumentation.mjs
COPY ./server.mjs /app/server.mjs
COPY ./server /app/server
ARG VITE_API_URL
ARG NAWAH_FRONTEND_APP=member
ENV VITE_API_URL=$VITE_API_URL NAWAH_FRONTEND_APP=$NAWAH_FRONTEND_APP
WORKDIR /app
CMD ["npm", "run", "start"]
