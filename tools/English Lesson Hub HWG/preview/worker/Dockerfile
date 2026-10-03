# Build context: preview/. No deploy/build commands are run by this file.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY worker/package.json worker/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY worker/core.mjs worker/server.mjs worker/auth.mjs ./worker/
COPY scripts/video-transcode.mjs ./scripts/
USER node
ENV NODE_ENV=production
CMD ["node","worker/server.mjs"]
