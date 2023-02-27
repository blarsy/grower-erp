import { gql, useQuery } from "@apollo/client"
import { Container, Stack, Typography } from "@mui/material"
import RecoverPasswordForm from "lib/components/admin/RecoverPasswordForm"
import Loader from "lib/components/Loader"
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
    const { loading, error, data} = useQuery(GET_RECOVERY, { variables: { recoveryCode: code }})

    return <Stack sx={{flex: '1'}}>
        <Container maxWidth="xl" sx={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h3">Restauration de mot de passe</Typography>
            <Loader loading={loading} error={error}>
                <RecoverPasswordForm recovery={data && data.passwordRecoveryByCode} />
            </Loader>
        </Container>
    </Stack>
}

export default Recover