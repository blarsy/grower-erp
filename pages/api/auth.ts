// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import config from 'lib/serverSettings'
import { utils } from 'ethers'
import { ErrorResponse, makeErrorResponse } from 'lib/apiCommon'
import { checkToken, registerToken } from '../../lib/auth'

type TokenResponse = {
  token: string
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
          const response = { token: await registerToken() }
          res.status(200).json(response)
        } catch(e: any) {
          res.status(500).json(makeErrorResponse(e))
        }
      } else {
        res.status(500).json({ error: 'Unauthorized' })
      }
    } else {
      res.status(500).json({ error: 'Missing parameter' })
    }
  } else if (req.method === 'GET') {
    if(!req.query.token) {
      res.status(500).json({ error: 'Missing parameter' })
    } else {
      const sessionValid = await checkToken(req.query.token as string)
      if(!sessionValid) {
        res.status(500).json({ error: 'Unauthorized' })
      } else {
        res.status(200).end()
      }
    } 
  } else {
    res.status(501)
  }
}
