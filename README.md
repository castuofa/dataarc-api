# DataARC Admin API

This api is based off Strapi.

## Getting Started

These instructions will get you up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

This software requires the following to be insalled:

- MongoDB >= 3.6
- Node.js >= 12.x
- npm >= 6.x
- yarn >= 1.22.4

### Installing

#### Configure .env

Copy the `.env.example` file to `.env` and add the database information.

Variable definitions

- `HOST` Where the API server will run
- `PORT` Port for the API server
- `URL` Url that will be used to access the api
- `DATABASE_HOST` - localhost
- `DATABASE_SRV` - false for local dev
- `DATABASE_SSL` - false for local dev
- `DATABASE_PORT` - 27017 for local dev
- `DATABASE_NAME` - the name of the database "dataarc"
- `DATABASE_USERNAME` - database username
- `DATABASE_PASSWORD` - database password
- `AUTHENTICATION_DATABASE` - maybe 'admin' or blank depending on mongodb instance
- `ADMIN_JWT_SECRET` Token to secure the admin login for strapi

#### Installing node modules and launch application

Install node packages

`yarn install`

Build

`yarn build`

Or if it's built already, use:

`yarn start`

For development use:

`yarn develop`

#### Using the graphql/rest interface

After everything is up and running, you will have access to the GRAPHQL playground where you can view the docs, schema, and test queries. You will also be able to do the same with the swagger documentation interface for the REST api.

- [Graphql Playground](http://localhost:1337/graphql)
- [Swagger Documentation](http://localhost:1337/documentation)

## Built With

- [Mongodb](https://www.mongodb.com/)
- [Strapi](https://strapi.io/)
