const DEFAULT_TTL = 24 * 60 * 60 * 1000 //24 hours
const TOKEN_LENGTH = 32
type Session = {
    ttl: number,
    creationTimestamp: number,
    lastTimestamp: number
}

const activeTokens = {} as {
    [token: string]: Session
}
  
export const registerToken = (): string => {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let token = ''
    for (let i = TOKEN_LENGTH; i > 0; --i) token += chars[Math.floor(Math.random() * chars.length)]
  
    const now = new Date().valueOf()
    activeTokens[token] = {
        ttl: DEFAULT_TTL,
        creationTimestamp: now,
        lastTimestamp: now
    }
    // seems like a good moment to scan through the sessions and remove expired ones
    removeExpired(now)

    return token
}
  
const removeExpired = (now: number): void => {
    Object.keys(activeTokens).reverse().forEach(token => {
        if(sessionExpired(token, now)) {
            delete activeTokens[token]
        }
    })
}

const sessionExpired = (token: string, now: number): boolean => {
    return activeTokens[token].creationTimestamp + activeTokens[token].ttl < now
}

export const checkToken = (token: string): boolean => {
    if(!activeTokens[token]) return false
    const now = new Date().valueOf()
    return sessionExpired(token, now)
}