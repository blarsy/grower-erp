import { Pool } from 'pg'
import { postgraphile, PostGraphileOptions } from "postgraphile"
import { config } from './apiCommon'

const env = process.env.NODE_ENV
const pool = new Pool({
    user: config.user,
    host: config.host,
    database: config.db,
    password: config.dbPassword,
    port: Number(config.port),
})

const pgConfig: PostGraphileOptions = env.toLowerCase() === 'production' ? {
    retryOnInitFail: true,
    extendedErrors: ["errcode"],
    graphiql: false,
    disableQueryLog: true,
  }: {
    watchPg: true,
    showErrorStack: "json",
    extendedErrors: ["hint", "detail", "errcode"],
    exportGqlSchemaPath: "schema.graphql",
    graphiql: true,
    enhanceGraphiql: true
}



export {pool as pg}

export default postgraphile(
    pool,
    "erp",
    { ...pgConfig, ...{
        // Settings common to all environments
        subscriptions: true,
        legacyRelations: "omit",
        graphqlRoute: "/api/graphql",
        graphiqlRoute: "/api/graphiql",
        enableQueryBatching: true,
        ignoreRBAC: false,
        dynamicJson: true,
        setofFunctionsContainNulls: false,
        jwtSecret: config.jwtSecret,
        jwtPgTypeIdentifier: config.jwtType,
        pgDefaultRole: 'anonymous'
    }}
)