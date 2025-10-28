# Navish 
# Use node version 22.19.0
FROM node:22.19.0

LABEL maintainer="Navish <Navish@myseneca.ca>"
LABEL description="Fragments node.js microservice"

# Default port
ENV PORT=8080

# Reduce npm spam
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_COLOR=false

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY ./src ./src

# Copy HTPASSWD file
COPY ./tests/.htpasswd ./tests/.htpasswd

# Expose port
EXPOSE 8080

# Start the container (JSON notation)
CMD ["npm", "start"]
