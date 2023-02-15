// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { config } from 'lib/apiCommon'
import { utils } from 'ethers'
import { ErrorResponse, makeErrorResponse } from 'lib/apiCommon'
import { ApolloClient, gql, InMemoryCache } from '@apollo/client'

type TokenResponse = {
  token: string
}

const client = new ApolloClient({
  cache: new InMemoryCache(),
  uri: config.graphQlUrl
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenResponse | ErrorResponse>
) {
  if(req.method === 'POST') {
    if(req.body.signature && req.body.message) {
      const authorizedPublicKeys = config.authorizedPublicKeys
      const pubKey = utils.verifyMessage(req.body.message, req.body.signature)
      if(authorizedPublicKeys.includes(pubKey)) {
        try{
          const response = await client.mutate({ mutation: gql`mutation authenticatePubKey($pubKey: String) {
            authenticatePubKey(input: {pubKey: $pubKey}) {
              jwtToken
            }
          }`, variables: { pubKey } })
          res.status(200).json({ token: response.data.authenticatePubKey.jwtToken })
        } catch(e: any) {
          res.status(500).json(makeErrorResponse(e))
        }
      } else {
        res.status(500).json({ error: 'Unauthorized' })
      }
    } else {
      res.status(500).json({ error: 'Missing parameter' })
    }
  } else {
    res.status(501)
  }
}
