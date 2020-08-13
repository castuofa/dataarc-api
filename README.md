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

- `ADMIN_JWT_SECRET` Token to secure the admin login for strapi
- `HOST` Where the API server will run
- `PORT` Port for the API server
- `DATABASE_HOST` - localhost
- `DATABASE_SRV` - false for local dev
- `DATABASE_SSL` - false for local dev
- `DATABASE_PORT` - 27017 for local dev
- `DATABASE_NAME` - the name of the database "dataarc"
- `DATABASE_USERNAME` - database username
- `DATABASE_PASSWORD` - database password
- `AUTHENTICATION_DATABASE` - maybe 'admin' or blank depending on mongodb instance

The following are used in setting up a new/blank database. It will not hurt to leave them configured after the initial setup since there are checks in place to make sure duplicate entries are not created.

- `SEED_DATA` - (eg: ../dataarc-data) relative to the project root, data is pulled from dataarc-data git repo
  - _IMPORTANT_: If you decided to put the data repo within the project folder make sure you add it to .gitignore
- `SEED` - true only if you want to add data from the data folder

#### Installing node modules and launch application

Install node packages

`yarn install`

Build

`yarn develop`

Or if it's built already, use:

`yarn start`

#### Using the graphql/rest interface

After everything is up and running, you will have access to the GRAPHQL playground where you can view the docs, schema, and test queries. You will also be able to do the same with the swagger documentation interface for the REST api.

- [Graphql Playground](http://localhost:1337/graphql)
- [Swagger Documentation](http://localhost:1337/documentation)

## Built With

- [Mongodb](https://www.mongodb.com/)
- [Strapi](https://strapi.io/)
