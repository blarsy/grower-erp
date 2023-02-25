import { gql, useQuery } from "@apollo/client"
import Loader from "lib/components/Loader"
import ContactForm from "lib/components/admin/ContactForm"
import { useApolloClient } from "@apollo/client"
import { updateContact } from "lib/components/queriesLib"
import { Stack } from "@mui/material"
import ChangePasswordForm from "../ChangePasswordForm"

interface Props {
    contactId: number
}

const GET = gql`query GetCurrentUser {
    getCurrentUser {
      zipCode
      phone
      lastname
      firstname
      id
      email
      city
      addressLine2
      addressLine1
    }
  }`

const ProfileAdminView = () => {
    const client = useApolloClient()
    const { loading, error, data } = useQuery(GET)
    return <Loader loading={loading} error={error}>
        { data && <Stack>
            <ContactForm data={ data.getCurrentUser } updateQuery={updateContact}/>
            <ChangePasswordForm userId={ data.getCurrentUser.id }/>
        </Stack>}
    </Loader>
}

export default ProfileAdminView