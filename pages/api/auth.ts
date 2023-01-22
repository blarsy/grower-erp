// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import config from 'lib/serverSettings'
import { utils } from 'ethers'
import { ErrorResponse, makeErrorResponse } from 'lib/apiCommon'
import { registerToken } from '../../lib/auth'

type TokenResponse = {
  token: string
}

const makeTokenResponse = (): TokenResponse => {
  return { token: registerToken() }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenResponse | ErrorResponse>
) {
  if(req.method === 'POST') {
    if(req.body.signature && req.body.message) {
      const authorizedPublicKeys = config.authorizedPublicKeys
      if(authorizedPublicKeys.includes(utils.verifyMessage(req.body.message, req.body.signature))) {
        try{
          res.status(200).json(makeTokenResponse())
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
