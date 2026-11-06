FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY heavy/server.js ./server.js
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
