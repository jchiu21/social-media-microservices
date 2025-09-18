# use nodejs 18 as base image
FROM node:18-alpine

# set working directory
WORKDIR /usr/src/app

# copy package and package-lock from local machine into container
COPY package*.json ./

# npm clean install, only install production dependencies
RUN npm ci --only=production

# copy all source code into container
COPY . .

# documents which port the container will listen on
EXPOSE 3000

# default command to run when container starts
CMD ["node", "src/server.js"]