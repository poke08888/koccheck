# --- build the React frontend ---
FROM node:22-alpine AS web
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# --- runtime: Express API + static UI ---
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=4000

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY server/ ./server/
COPY project/uploads ./project/uploads
COPY --from=web /web/dist ./web/dist

# data dir for the SQLite file (mount a volume here to persist)
RUN mkdir -p /app/server/data
VOLUME ["/app/server/data"]

EXPOSE 4000
# The server auto-seeds from the bundled sample on an empty DB.
CMD ["node", "--no-warnings", "server/src/server.js"]
