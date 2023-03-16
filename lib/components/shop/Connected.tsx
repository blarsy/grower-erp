import { gql, useMutation } from "@apollo/client"
import { SHOP_TOKEN_KEY } from "lib/constants"
import { useRouter } from "next/router"
import { useContext, useEffect, useState } from "react"
import { errorHandlerHolder } from "../admin/apolloErrorLink"
import Loader from "../Loader"
import { AppContext } from "./AppContextProvider"

interface Props {
    children: JSX.Element,
    slug: string
}

const GET_JWT = gql`mutation AuthenticateCustomer($slug: String!) {
    authenticateCustomer(input: {inputSlug: $slug}) {
      jwtToken
    }
  }`

const Connected = ({ children, slug }: Props)  => {
    const appContext = useContext(AppContext)
    const [loading, setLoading] = useState(true)
    const [authenticate] = useMutation(GET_JWT)
    const router = useRouter()
    
    useEffect(() => {
        const authenticateFromSlug = async () => {
            try {
                const res = await authenticate({ variables: { slug } })
                if(!res.data.authenticateCustomer.jwtToken) {
                    appContext.loginFailed(new Error('Echec lors de la connexion.'))
                    return 
                }
                await appContext.loginComplete(res.data.authenticateCustomer.jwtToken)
            } catch(e: any) {
                appContext.loginFailed(e)
            }
        }
        const load = async() => {
            errorHandlerHolder.handle = (e) => {
                if(e.graphQLErrors && e.graphQLErrors.length > 0 && e.graphQLErrors.some(error => error.message === 'jwt expired')){
                    // login again, silently
                    localStorage.removeItem(SHOP_TOKEN_KEY)
                    authenticateFromSlug()
                    router.reload()
                }
            }
            const token = localStorage.getItem(SHOP_TOKEN_KEY)
            try {
                if (token) {
                    await appContext.loginComplete(token)
                } else {
                    await authenticateFromSlug()
                }
            } catch(e: any) {
                appContext.loginFailed(e)
            } finally {
                setLoading(false)
            }
        }
        if(slug) load()
    }, [slug])

    return <Loader loading={loading} error={appContext.data.auth.error}>
        {children}
    </Loader>
}

export default Connected