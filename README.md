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

Copy the `.env.example` file to `.env` and
- add the database information.
- add admin username/pass/email (otherwise you'll seed an empty admin user and can't register a new one)

#### Installing node modules and launch application

Install packages

`yarn install`

Build

`yarn develop`

Or if it's built already, use:

`yarn start`

#### Using the graphql interface

After everything is up and running, you will have access to the graphql playground where you can view the docs, schema, and test queries.

- [Graphql Playground](http://localhost:1337/graphql)

## Built With

- [Mongodb](https://www.mongodb.com/)
- [Strapi](https://strapi.io/)
