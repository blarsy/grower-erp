import { ApolloProvider, gql, useQuery } from "@apollo/client"
import { Container, Stack, Typography } from "@mui/material"
import RecoverPassword from "lib/components/admin/RecoverPassword"
import RecoverPasswordForm from "lib/components/admin/RecoverPasswordForm"
import Loader from "lib/components/Loader"
import { TOKEN_KEY } from "lib/constants"
import { getAuthenticatedApolloClient } from "lib/uiCommon"
import { useRouter } from "next/router"

const GET_RECOVERY = gql`query PasswordRecovery($recoveryCode: String!) {
    passwordRecoveryByCode(recoveryCode: $recoveryCode) {
      code
      expirationDate
    }
  }`

const Recover = () => {
    const router = useRouter()
    const { code } = router.query

    return <ApolloProvider client={getAuthenticatedApolloClient(TOKEN_KEY)}>
        <RecoverPassword code={code as string} />
    </ApolloProvider>
}

export default Recover