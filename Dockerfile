# Stage 1: Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files for caching
COPY package*.json ./
RUN npm ci

# Copy rest of the source code
COPY . .

# Stage 2: Production stage
FROM node:20-alpine

WORKDIR /app

# Copy only package files first
COPY package*.json ./
RUN npm ci --only=production

# Copy the built files from the build stage
COPY --from=build /app .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port your app runs on
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
