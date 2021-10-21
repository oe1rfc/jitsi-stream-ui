FROM node:lts

WORKDIR /usr/src/app

COPY package*.json .
COPY yarn.lock .

RUN yarn install

COPY *.js ./
COPY static static

EXPOSE 3000
ENTRYPOINT [ "yarn" ]
CMD [ "server" ]
