import { ApolloProvider, gql } from "@apollo/client"
import RecoverPassword from "lib/components/admin/RecoverPassword"
import { TOKEN_KEY } from "lib/constants"
import { getAuthenticatedApolloClient } from "lib/uiCommon"
import { useRouter } from "next/router"

const GET_RECOVERY = gql`query PasswordRecovery($recoveryCode: String!) {
    passwordRecoveryByCode(recoveryCode: $recoveryCode) {
      code
      expirationDate
    }
  }`

const client = getAuthenticatedApolloClient(TOKEN_KEY)
const Recover = () => {
    const router = useRouter()
    const { code } = router.query

    return <ApolloProvider client={client}>
        <RecoverPassword code={code as string} />
    </ApolloProvider>
}

export default Recover