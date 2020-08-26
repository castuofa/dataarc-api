# develop stage
FROM strapi/base as develop-stage
WORKDIR /app
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install
COPY . .

# build stage
FROM develop-stage as build-stage
RUN yarn build

# production stage
FROM strapi/base as production-stage
ENV NODE_ENV production
EXPOSE 1337
CMD ["yarn", "start"]
