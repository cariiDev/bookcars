# syntax=docker/dockerfile:1

FROM node:lts-alpine
WORKDIR /bookcars/api
COPY ./api ./
COPY ./api/.env.docker .env
COPY ./packages /bookcars/packages
RUN npm install
CMD [ "npm", "start"]
EXPOSE 4002
