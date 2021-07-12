FROM node:lts

WORKDIR /usr/src/app

COPY package*.json .
COPY yarn.lock .

RUN yarn install

COPY server.js .
COPY static static

EXPOSE 3000
CMD [ "node", "server.js" ]
