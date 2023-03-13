import { gql, useQuery } from "@apollo/client"
import { Stack, Container, Typography } from "@mui/material"
import Loader from "../Loader"
import RecoverPasswordForm from "./RecoverPasswordForm"

const GET_RECOVERY = gql`query PasswordRecovery($recoveryCode: String!) {
    passwordRecoveryByCode(recoveryCode: $recoveryCode) {
      code
      expirationDate
    }
}`

interface Props {
    code: string
}

const RecoverPassword = ({ code }: Props) => {
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

export default RecoverPassword