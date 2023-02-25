import { AppContext } from "./AppContextProvider"
import * as yup from 'yup'
import { TextField } from "@mui/material"
import { ApolloError, gql, useMutation } from "@apollo/client"
import { useContext } from "react"
import { isValidPassword, parseUiError } from "lib/uiCommon"
import ItemForm from "./ItemForm"

const CHANGE_PASSWORD = gql`mutation ChangePassword($contactId: Int!, $currentPassword: String!, $newPassword: String!) {
    changePassword(
      input: {contactId: $contactId, currentPassword: $currentPassword, newPassword: $newPassword}
    ) { clientMutationId }
  }`

interface Props{
    userId: number
}
const ChangePasswordForm = ({ userId }: Props) => {
    const [ changePassword ] = useMutation(CHANGE_PASSWORD)
    
    const appContext = useContext(AppContext)

    return <ItemForm initialValues={{ currentPassword: '', repeatCurrentPassword: '', newPassword: '' }}
        validationSchema={yup.object().shape({
            currentPassword: yup.string().required('Ce champ est requis'),
            repeatCurrentPassword: yup.string().required('Ce champ est requis')
                .test('CurrentPasswordRepeated', 'Le mot de passe actuel et le mot de passe actuel répétés ne sont pas identiques', (val, ctx) => !val || val === ctx.parent.currentPassword),
            newPassword: yup.string().required('Ce champ est requis')
                .test('PasswordSecureEnough', 'Le mot de passe doit comporter minimum 8 caractères, au moins une majuscule ou un chiffre, et un caractère spécial', isValidPassword)
                .test('NewPasswordIsDifferent', 'Le nouveau mot de passe doit être différent de l\'ancien', (val, ctx) => val !== ctx.parent.currentPassword)
        })} onSubmit={async (values) => {
                await changePassword({ variables: { contactId: userId, 
                    currentPassword: values.currentPassword, 
                    newPassword: values.newPassword }})
        }} title="Changement du mot de passe" handleSubmitError={(e, setError) => {
            if((e as ApolloError) && (e as ApolloError).graphQLErrors.length > 0 && (e as ApolloError).graphQLErrors[0].message === 'Operation failed'){
                setError(`L'opération à échoué`)
            } else {
                setError(parseUiError(e).message)
            }
        }} makeControls={(errors, touched, values, handleChange) => {
            return [<TextField key="currentPassword" id="currentPassword" autoComplete="current-password" label="Mot de passe actuel" variant="standard" type="password" value={values.currentPassword} onChange={handleChange} error={touched.currentPassword && !!errors.currentPassword} helperText={touched.currentPassword && errors.currentPassword as string}/>,
                <TextField key="repeatCurrentPassword" id="repeatCurrentPassword" autoComplete="current-password" label="Répétez le mot de passe actuel" variant="standard" type="password" value={values.repeatCurrentPassword} onChange={handleChange} error={touched.repeatCurrentPassword && !!errors.repeatCurrentPassword} helperText={touched.repeatCurrentPassword && errors.repeatCurrentPassword as string}/>,
                <TextField key="newPassword" id="newPassword" autoComplete="new-password" label="Nouveau mot de passe actuel" variant="standard" type="password" value={values.newPassword} onChange={handleChange} error={touched.newPassword && !!errors.newPassword} helperText={touched.newPassword && errors.newPassword as string}/>
            ]
        }} />
}

export default ChangePasswordForm