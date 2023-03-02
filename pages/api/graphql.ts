import postgraphile from "lib/postgraphile"
import worker from 'lib/jobWorker'

worker().catch(e => console.log('Job worker crashed', e))

export const config = {
    api: {
      bodyParser: false,
    },
}
export default postgraphile
