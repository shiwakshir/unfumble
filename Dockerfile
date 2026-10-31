# FileFix Production Container
FROM node:22-alpine

WORKDIR /app

# Copy application files
COPY package.json ./
COPY public ./public
COPY server ./server

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Run as non-root user
USER node

CMD ["node", "server/server.mjs"]
