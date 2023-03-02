import { run } from 'graphile-worker'
import { config } from './apiCommon'
import taskList from './tasks'

export default async () => {
  // Run a worker to execute jobs:
  const runner = await run({
    connectionString: `postgres://${config.user}:${config.dbPassword}@${config.host}:${config.port}/${config.db}`,
    concurrency: 5,
    // Install signal handlers for graceful shutdown on SIGINT, SIGTERM, etc
    noHandleSignals: false,
    taskList,
    schema: 'worker'
  })

  // Immediately await (or otherwise handled) the resulting promise, to avoid
  // "unhandled rejection" errors causing a process crash in the event of
  // something going wrong.
  await runner.promise
}