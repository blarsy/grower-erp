import { ErrorResponse, onError } from '@apollo/client/link/error'

export const errorHandlerHolder = {
    handle: (e: ErrorResponse) => {}
}

const errorLink = onError((e) => {
    errorHandlerHolder.handle(e)
})

export default errorLink