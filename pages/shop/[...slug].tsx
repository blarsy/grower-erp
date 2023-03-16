import { useRouter } from "next/router"
import CustomerOrder from "lib/components/shop/CustomerOrder"
import Connected from "lib/components/shop/Connected"
import { SHOP_TOKEN_KEY } from "lib/constants"
import { ApolloProvider } from "@apollo/client"
import { getAuthenticatedApolloClient } from "lib/uiCommon"
import AppContextProvider from "lib/components/shop/AppContextProvider"

const client = getAuthenticatedApolloClient(SHOP_TOKEN_KEY)
const Order = () => {
    const router = useRouter()
    const { slug } = router.query
    let slugFromUrl = ''
    if(slug && slug.length > 0){
        slugFromUrl = slug[0]
    }

    return <ApolloProvider client={client}>
        <AppContextProvider>
            {slugFromUrl ? <Connected slug={slugFromUrl}>
                <CustomerOrder/>
            </Connected> : <span />}
        </AppContextProvider>
    </ApolloProvider>
}

export default Order