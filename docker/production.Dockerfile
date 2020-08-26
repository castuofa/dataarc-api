FROM strapi/base
WORKDIR /srv/app
ENV PATH /srv/app/node_modules/.bin:$PATH
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install --silent
COPY . .
ENV NODE_ENV production
RUN yarn build
RUN rm -rf /srv/app/build
EXPOSE 1337
CMD ["yarn", "start"]
