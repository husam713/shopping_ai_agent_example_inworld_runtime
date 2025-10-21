# Use Ubuntu 22.04 as base image
FROM ubuntu:22.04

# Set environment variables to avoid interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_VERSION=20.x

# Update package list and install basic dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg \
    lsb-release \
    ca-certificates \
    build-essential \
    python3 \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Add NodeSource repository and install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Install Yarn globally
RUN npm install -g yarn

# Verify Node.js, npm, and yarn installation
RUN node --version && npm --version && yarn --version

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json from voice_agent/server folder
COPY voice_agent/server/package*.json ./voice_agent/server/

# Install npm dependencies in voice_agent/server folder
WORKDIR /app/voice_agent/server
RUN npm install

# Set working directory back to app root
WORKDIR /app

# Copy the rest of the application code (all subdirectories)
COPY . .

# Expose the port (adjust if your app uses a different port)
EXPOSE 4000

# Start the application from voice_agent/server directory
WORKDIR /app/voice_agent/server

# Start the application
CMD ["npm", "start"]

# Optional: Add bash as an alternative entrypoint for debugging
# To start bash instead: docker run -it -v ./:/app --entrypoint /bin/bash voice-agent-server:latest


