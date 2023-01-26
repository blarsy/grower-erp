import { RedisClientType } from '@redis/client'
import { createClient } from 'redis'

let client: RedisClientType

type Session = {
    ttl: number,
    creationTimestamp: number,
    lastTimestamp: number
}

const getClient = async(): Promise<RedisClientType> => {
    if(!client) {
        client = createClient()
        await client.connect()
    }
    return client  
}
const getActiveTokens = async (): Promise<{[token: string]: Session}> => {
    const client = await getClient()
    const rawTokens = await client.hGetAll('tokens')
    const activeTokens: {[token: string]: Session} = {}
    Object.keys(rawTokens).forEach(token => {
        activeTokens[token] = JSON.parse(rawTokens[token])})
    return activeTokens
}


const DEFAULT_TTL = 24 * 60 * 60 * 1000 //24 hours
const TOKEN_LENGTH = 32
  
export const registerToken = async (): Promise<string> => {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let token = ''
    for (let i = TOKEN_LENGTH; i > 0; --i) token += chars[Math.floor(Math.random() * chars.length)]
  
    const now = new Date().valueOf()
    const client = await getClient()
    await client.hSet('tokens', token, JSON.stringify({
        ttl: DEFAULT_TTL,
        creationTimestamp: now,
        lastTimestamp: now
    }))
    // seems like a good moment to scan through the sessions and remove expired ones
    await removeExpired(now)

    return token
}
  
const removeExpired = async (now: number): Promise<void> => {
    const clientPromise = getClient()
    const activeTokens = await getActiveTokens()
    const client = await clientPromise
    Object.keys(activeTokens).reverse().forEach(token => {
        if(sessionExpired(activeTokens[token], now)) {
            client.hDel('tokens', token)
        }
    })
}

const sessionExpired = (session: Session, now: number): boolean => {
   return (session.creationTimestamp + session.ttl) < now
}

export const checkToken = async (token: string): Promise<boolean> => {
    const client = await getClient()
    const session = await client.hGet('tokens', token)
    if(!session) return false
    const now = new Date().valueOf()
    return !sessionExpired(JSON.parse(session), now)
}