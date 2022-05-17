# Use node alpine build
FROM node:18-alpine3.15

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
COPY bot.js token.js avatar.png ./

# Use the user created above
USER ${USER}

# Start bot
CMD ["node", "bot.js"]
