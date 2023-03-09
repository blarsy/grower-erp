import { useRouter } from "next/router"
import CustomerOrder from "lib/components/shop/CustomerOrder"
import Connected from "lib/components/shop/Connected"
import { SHOP_TOKEN_KEY } from "lib/constants"
import { ApolloProvider } from "@apollo/client"
import { getAuthenticatedApolloClient } from "lib/uiCommon"
import AppContextProvider from "lib/components/shop/AppContextProvider"

const Order = () => {
    const router = useRouter()
    const { slug } = router.query

    return <ApolloProvider client={getAuthenticatedApolloClient(SHOP_TOKEN_KEY)}>
        <AppContextProvider>
            <Connected slug={slug as string}>
                <CustomerOrder slug={slug as string} />
            </Connected>
        </AppContextProvider>
    </ApolloProvider>
}

export default Order