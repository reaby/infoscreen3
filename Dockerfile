# Nice fresh and new base
FROM node:10-alpine

# Create directory for our app
WORKDIR /usr/src/infoscreen

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .
COPY config-default.js config.js

# Port will be 8000 by default unless run wih ex. -e PORT=8080
EXPOSE 8000 8001 1935

# Let's GO!
CMD [ "npm", "start" ]
