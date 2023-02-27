import { AppContext } from "./AppContextProvider"
import * as yup from 'yup'
import { TextField } from "@mui/material"
import { ApolloError, gql, useMutation } from "@apollo/client"
import { useContext } from "react"
import { isValidPassword, parseUiError } from "lib/uiCommon"
import ItemForm from "./ItemForm"

const CHANGE_PASSWORD = gql`mutation ChangePassword($userId: Int!, $currentPassword: String!, $newPassword: String!) {
    changePassword(
      input: {userId: $userId, currentPassword: $currentPassword, newPassword: $newPassword}
    ) { clientMutationId }
  }`

interface Props{
    userId: number
}
const ChangePasswordForm = ({ userId }: Props) => {
    const [ changePassword ] = useMutation(CHANGE_PASSWORD)

    return <ItemForm initialValues={{ currentPassword: '', newPassword: '', repeatNewPassword: '' }}
        validationSchema={yup.object().shape({
            currentPassword: yup.string().required('Ce champ est requis'),
            newPassword: yup.string().required('Ce champ est requis')
                .test('PasswordSecureEnough', 'Le mot de passe doit comporter minimum 8 caractères, au moins une majuscule ou un chiffre, et un caractère spécial', isValidPassword)
                .test('NewPasswordIsDifferent', 'Le nouveau mot de passe doit être différent de l\'ancien', (val, ctx) => val !== ctx.parent.currentPassword),
            repeatNewPassword: yup.string().required('Ce champ est requis')
                .test('CurrentPasswordRepeated', 'Le nouveau mot de passe et le nouveau mot de passe répétés ne sont pas identiques', (val, ctx) => !val || val === ctx.parent.newPassword)
        })} onSubmit={async (values) => {
                await changePassword({ variables: { userId: userId, 
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
                <TextField key="newPassword" id="newPassword" autoComplete="new-password" label="Nouveau mot de passe" variant="standard" type="password" value={values.newPassword} onChange={handleChange} error={touched.newPassword && !!errors.newPassword} helperText={touched.newPassword && errors.newPassword as string}/>,
                <TextField key="repeatNewPassword" id="repeatNewPassword" autoComplete="new-password" label="Répétez le nouveau mot de passe" variant="standard" type="password" value={values.repeatNewPassword} onChange={handleChange} error={touched.repeatNewPassword && !!errors.repeatNewPassword} helperText={touched.repeatNewPassword && errors.repeatNewPassword as string}/>,
            ]
        }} />
}

export default ChangePasswordForm