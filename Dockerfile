# Nice fresh and new base
FROM node:current-alpine

# Create directory for our app
WORKDIR /usr/src/infoscreen

# Install app dependencies
COPY package*.json ./
RUN apk add --no-cache --virtual .gyp python3 make g++ \
    && rm /usr/bin/python \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && npm install \
    && apk del .gyp

# Bundle app source
COPY . .
COPY config.js config.js

# Port will be 8000 by default unless run wih ex. -e PORT=8080
EXPOSE 8000 8001 1935

# Let's GO!
CMD [ "npm", "start" ]
