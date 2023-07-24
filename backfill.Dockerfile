FROM node:16

COPY . /uploader
WORKDIR /uploader

RUN corepack enable
RUN yarn install
RUN yarn build

ENTRYPOINT yarn start:backfill /dashboards
