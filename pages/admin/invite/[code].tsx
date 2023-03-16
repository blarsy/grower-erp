import { ApolloProvider } from "@apollo/client"
import RegisterUser from "lib/components/admin/RegisterUser"
import { TOKEN_KEY } from "lib/constants"
import { getAuthenticatedApolloClient } from "lib/uiCommon"
import { useRouter } from "next/router"

const client = getAuthenticatedApolloClient(TOKEN_KEY)
const Invite = () => {
    const router = useRouter()
    const { code } = router.query

    return <ApolloProvider client={client}>
        <RegisterUser code={code as string} />
    </ApolloProvider>
}

export default Invite