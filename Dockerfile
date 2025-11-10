# Stage 1: Build stage
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies (only prod + dev)
RUN npm ci

# Copy the rest of the source code
COPY . .

# Run tests (optional for CI, can skip in prod)
# RUN npm test

# Build (if you have a build step, otherwise skip)
# RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine

# Create and set working directory
WORKDIR /app

# Copy only necessary files from the build stage
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled or necessary files from the build stage
COPY --from=build /app .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port your app runs on
EXPOSE 8080

# Run the server
CMD ["npm", "start"]
