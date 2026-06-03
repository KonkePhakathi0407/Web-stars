FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Remove .env file if it exists (Railway will provide env vars)
RUN rm -f .env

EXPOSE 3000

CMD ["node", "server.js"]