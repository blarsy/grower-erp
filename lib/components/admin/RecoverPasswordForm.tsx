import { gql, useMutation } from "@apollo/client"
import { Alert, LoadingButton } from "@mui/lab"
import { Stack, TextField, Typography } from "@mui/material"
import { Form, Formik } from "formik"
import { isValidPassword, parseUiError } from "lib/uiCommon"
import { useRouter } from "next/router"
import { useState } from "react"
import RecoverIcon from '@mui/icons-material/LockOpen'
import * as yup from 'yup'
import Feedback from "../Feedback"

interface Props {
    recovery: {
        code: string,
        expiration: Date
    }
}

const RECOVER = gql`mutation Recover($recoveryCode: String!, $newPassword: String!) {
    recoverPassword(input: {newPassword: $newPassword, recoveryCode: $recoveryCode}) {
        clientMutationId
    }
}`

const RecoverPasswordForm = ({ recovery }: Props) => {
    const { code, expiration } = recovery
    const [recoverPassword] = useMutation(RECOVER)
    const [errorInfo, setErrorInfo] = useState({ message: '', detail: '' })
    const router = useRouter()
    const now = new Date()

    if(expiration || new Date(expiration) < now) return <Alert severity="error">Cette opération n'est plus possible.</Alert>

    return <Formik initialValues={{
        password: '',
        repeatPassword: ''
    }} validationSchema={yup.object().shape({
        password: yup.string().required('Ce champ est requis').test('passwordStrongEnough', 'Le mot de passe doit comporter au moins 8 caractères, dont au moins une majuscule ou chiffre, et un caractére spécial.', isValidPassword),
        repeatPassword: yup.string().required('Ce champ est requis').test('passwordRepeatedMustBeSameAsPassword', 'Le mot de passe n\est pas identique.', (val, ctx) => val == ctx.parent.password)
    })} onSubmit={async values => {
        try {
            setErrorInfo({ message: '', detail: '' })
            await recoverPassword({variables: { recoveryCode: code, 
                newPassword: values.password }})
            router.push('/admin/profile')
        } catch(error: any) {
            const errorInfo = parseUiError(error)
            setErrorInfo({ message: errorInfo.message, detail: errorInfo.detail })
        }
    } }>
        {({ isSubmitting, handleSubmit, errors, touched, handleChange, values }) => {
            return <Stack component={Form} alignItems="center" padding="0.5rem 0" spacing={2}>
                <Typography variant="body1">Veullez entrer le nouveau mot de passe</Typography>
                <TextField id="password" name="password" label="Mot de passe" type="password" variant="standard" value={values.password} onChange={handleChange} error={touched.password && !!errors.password} helperText={touched.password && errors.password as string}/>
                <TextField id="repeatPassword" name="repeatPassword" label="Répétez le mot de passe" type="password" variant="standard" value={values.repeatPassword} onChange={handleChange} error={touched.repeatPassword && !!errors.repeatPassword} helperText={touched.repeatPassword && errors.repeatPassword as string}/>
                <LoadingButton loading={isSubmitting}
                    loadingPosition="start"
                    startIcon={<RecoverIcon />}
                    variant="contained"
                    onClick={() => handleSubmit()}>Changer le mot de passe</LoadingButton>
                {errorInfo.message && <Feedback severity="error" message={errorInfo.message} detail={errorInfo.detail} onClose={() => setErrorInfo({ message: '', detail: '' })}/>}
            </Stack>}
        }
    </Formik>
}

export default RecoverPasswordForm