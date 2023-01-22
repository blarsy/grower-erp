export type ErrorResponse = {
    error: string
}

export const makeErrorResponse = (e: any): ErrorResponse => {
    if(e.message) return { error: e.message }
    if(e instanceof Error) return {
        error: `Name : ${e.name}
        Cause: ${e.cause}
        Message: ${e.message}
        Stack: ${e.stack}`
    }
    if(typeof e === 'object') return { error: e.toString()}
    return { error: `${e}` }
}