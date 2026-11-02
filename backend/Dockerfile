# Backend Dockerfile
FROM node:20-slim

WORKDIR /app

# Install build dependencies for native modules and Prisma query engine
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    openssl \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 5000

# Default command
CMD ["npm", "run", "dev"]
