const authorizedPublicKeys = process.env.AUTHORIZED_PUBLIC_KEYS!

interface ServerConfig {
    authorizedPublicKeys: string[],
    [prop: string]: any
}
let config = <ServerConfig> {
    authorizedPublicKeys: JSON.parse(authorizedPublicKeys)
}

export const setConfig = (data: {[prop: string]:any}): void => {
    Object.keys(data).forEach(prop => config[prop] = data[prop])
}

export default config