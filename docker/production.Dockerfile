FROM strapi/base
WORKDIR /srv/app
ENV PATH /srv/app/node_modules/.bin:$PATH
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install
COPY . .
ENV NODE_ENV production
RUN yarn build
EXPOSE 1337
CMD ["yarn", "start"]
