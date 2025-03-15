FROM node:23-alpine 

WORKDIR /app

COPY package.json . 

# Install pnpm
RUN npm install -g pnpm 

RUN pnpm install 

COPY . .

EXPOSE 8040

CMD ["bun", "start"]