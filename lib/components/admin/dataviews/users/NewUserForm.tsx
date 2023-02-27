import { gql, useMutation } from "@apollo/client"
import { TextField } from "@mui/material"
import * as yup from 'yup'
import ItemForm from "../../ItemForm"

const INVITE_USER = gql`mutation Invite($email: String!, $role: String!) {
    promoteUser(input: {emailInvited: $email, role: $role}) {
      usersInvitation {
        id
      }
    }
  }`

const NewUserForm = () => {
    const [inviteUser] = useMutation(INVITE_USER)

    return <ItemForm initialValues={{ email: '', role: 'administrator' }} title="Promouvoir un utilisateur"
        makeControls={(errors, touched, values, handleChange) => [
            <TextField key="email" id="email" label="Email" variant="standard" value={values.email} onChange={handleChange} error={touched.email && !!errors.email} helperText={touched.email && errors.email as string}/>,
            <TextField key="role" id="role" label="Role" variant="standard" value={values.role} />
        ]} buttonText="Envoyer l'invitation" validationSchema={yup.object().shape({
            email: yup.string().email('Veuillez fournir une adresse email valide').required('Ce champ est requis')
        })} onSubmit={async values => {
            await inviteUser({ variables: { email: values.email, role: values.role }})
        }} />
}

export default NewUserForm