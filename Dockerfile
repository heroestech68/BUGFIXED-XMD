# Use Node 20 official image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install --force

# Copy all project files
COPY . .

# Expose port 3000 if your API uses it (safe even if not)
EXPOSE 3000

# Start bot
CMD ["npm", "start"]
