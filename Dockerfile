# /Dockerfile
# From alpine
FROM alpine:3.11.6

# Add nodejs and npm
RUN apk add --update --no-cache nodejs npm

# Add user
ARG USER=discord_bot
RUN adduser ${USER} -D

# Set the current working directory to user's home directory
WORKDIR /home/${USER}

# Copy all node files to /home/${USER}
COPY package-lock.json package.json ./

# Install node_modules asap
RUN npm install

# Copy all bot files to /home/${USER}
COPY app.js token.js ./

# Use the user created above
USER ${USER}

# Start bot
CMD ["node", "app.js"]
