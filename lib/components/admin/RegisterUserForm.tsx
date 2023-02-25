import { LoadingButton } from "@mui/lab"
import { Alert, Stack, TextField, Typography } from "@mui/material"
import { Form, Formik } from "formik"
import { parseUiError } from "lib/uiCommon"
import { useState } from "react"
import * as yup from 'yup'
import RegisterIcon from '@mui/icons-material/HowToReg'
import Feedback from "../Feedback"
import { gql, useMutation } from "@apollo/client"
import { useRouter } from "next/router"

const REGISTER_USER = gql`mutation RegisterUser($firstname: String!, $invitationId: Int!, $lastname: String!, $password: String!) {
    registerUser(
      input: {firstname: $firstname, invitationId: $invitationId, lastname: $lastname, password: $password}
    ) {
        clientMutationId
    }
  }`

interface Props {
    invitation: {
        acceptedDate: Date,
        expirationDate: Date,
        role: string,
        email: string,
        id: number
    }
}

const translateRole = (role: string)=> {
    switch(role.toLowerCase()) {
        case 'administrator':
            return 'administrateur'
        default:
            throw new Error('Unexpected role name')
    }
}

const RegisterUserForm = ({ invitation }: Props) => {
    const { acceptedDate, expirationDate, role,  email, id } = invitation
    const [registerUser] = useMutation(REGISTER_USER)
    const [errorInfo, setErrorInfo] = useState({ message: '', detail: '' })
    const router = useRouter()
    const now = new Date()

    if(acceptedDate || new Date(expirationDate) < now) return <Alert severity="error">Cette invitation n'est plus valable.</Alert>

    return <Formik initialValues={{
        password: '',
        repeatPassword: '',
        firstname: '',
        lastname: ''
    }} validationSchema={yup.object().shape({
        password: yup.string().required('Ce champ est requis').test('passwordStrongEnough', 'Le mot de passe doit comporter au moins 8 caractères, dont au moins une majuscule ou chiffre, et un caractére spécial.', val => !!val && val.length > 7 && !!val.match(/[A-Z]/) && !!val.match(/[^\w]/)),
        repeatPassword: yup.string().required('Ce champ est requis').test('passwordRepeatedMustBeSameAsPassword', 'Le mot de passe n\est pas identique.', (val, ctx) => val == ctx.parent.password),
        firstname: yup.string(),
        lastname: yup.string().required('Ce champ est requis'),
    })} onSubmit={async values => {
        try {
            setErrorInfo({ message: '', detail: '' })
            await registerUser({variables: { password: values.password, invitationId: id, 
                firstname: values.firstname, lastname: values.lastname }})
            router.push('/admin/profile')
        } catch(error: any) {
            const errorInfo = parseUiError(error)
            setErrorInfo({ message: errorInfo.message, detail: errorInfo.detail })
        }
    } }>
        {({ isSubmitting, handleSubmit, errors, touched, handleChange, values }) => {
            return <Stack component={Form} alignItems="center" padding="0.5rem 0" spacing={2}>
                <Typography variant="body1">Bonjour, comme expliqué dans le mail envoyé à {email}, voici votre invitation à  prendre le role "{translateRole(role)}":</Typography>
                <TextField key="firstname" id="firstname" label="Prénom" variant="standard" value={values.firstname} onChange={handleChange} error={touched.firstname && !!errors.firstname} helperText={touched.firstname && errors.firstname as string}/>
                <TextField key="lastname" id="lastname" label="Nom de famille" variant="standard" value={values.lastname} onChange={handleChange} error={touched.lastname && !!errors.lastname} helperText={touched.lastname && errors.lastname as string}/>
                <TextField id="password" name="password" label="Mot de passe" type="password" variant="standard" value={values.password} onChange={handleChange} error={touched.password && !!errors.password} helperText={touched.password && errors.password as string}/>
                <TextField id="repeatPassword" name="repeatPassword" label="Répétez le mot de passe" type="password" variant="standard" value={values.repeatPassword} onChange={handleChange} error={touched.repeatPassword && !!errors.repeatPassword} helperText={touched.repeatPassword && errors.repeatPassword as string}/>
                <LoadingButton loading={isSubmitting}
                    loadingPosition="start"
                    startIcon={<RegisterIcon />}
                    variant="contained"
                    onClick={() => handleSubmit()}>Enregistrement</LoadingButton>
                {errorInfo.message && <Feedback severity="error" message={errorInfo.message} detail={errorInfo.detail} onClose={() => setErrorInfo({ message: '', detail: '' })}/>}
            </Stack>}
        }
    </Formik>
}

export default RegisterUserForm