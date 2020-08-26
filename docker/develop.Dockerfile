FROM strapi/base
WORKDIR /srv/app
ENV PATH /srv/app/node_modules/.bin:$PATH
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install --silent
COPY . .
CMD ["strapi", "develop"]
