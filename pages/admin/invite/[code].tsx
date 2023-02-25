import { gql, useQuery } from "@apollo/client"
import { Container, Stack, Typography } from "@mui/material"
import RegisterUserForm from "lib/components/admin/RegisterUserForm"
import Loader from "lib/components/Loader"
import { useRouter } from "next/router"
import { useEffect } from "react"

const GET_INVITATION = gql`query Invitation($code: String!) {
    usersInvitationByCode(code: $code) {
      acceptedDate
      email
      expirationDate
      role
      id
    }
}`

const Invite = () => {
    const router = useRouter()
    const { code } = router.query
    const { loading, error, data} = useQuery(GET_INVITATION, { variables: { code }})

    return <Stack sx={{flex: '1'}}>
        <Container maxWidth="xl" sx={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h3">Enregistrement</Typography>
            <Loader loading={loading} error={error}>
                <RegisterUserForm invitation={data && data.usersInvitationByCode} />
            </Loader>
        </Container>
    </Stack>
}

export default Invite