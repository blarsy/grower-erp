import { LoadingButton } from "@mui/lab"
import { Button, Stack, TextField } from "@mui/material"
import { Form, Formik } from "formik"
import LoginIcon from '@mui/icons-material/Login'
import * as yup from 'yup'
import { gql, useMutation } from "@apollo/client"
import { useContext, useState } from "react"
import { AppContext } from "./AppContextProvider"
import Feedback from "../Feedback"
import { parseUiError } from "lib/uiCommon"
import ForgotPasswordDialog from "./ForgotPasswordDialog"

interface Values {
    email: string
    password: string 
}

const GET_JWT = gql`mutation Authenticate($login: String, $password: String) {
    authenticate(input: {login: $login, password: $password}) {
      jwtToken
    }
  }`

export const LoginForm = () => {
    const [authenticate] = useMutation(GET_JWT)
    const appContext = useContext(AppContext)
    const [errorInfo, setErrorInfo] = useState({ message: '', detail: '' })
    const [forgotPassword, setForgotPassword] = useState(false)

    return <Formik initialValues={{
        email: '',
        password: ''
    } as Values} validationSchema={yup.object().shape({
        email: yup.string().email('Veuillez entrer une adresse email valide').required('Ce champ est requis'),
        password: yup.string().required('Ce champ est requis')
    })} onSubmit={async values => {
        try {
            setErrorInfo({ message: '', detail: '' })
            const res = await authenticate({variables: { login: values.email, password: values.password }})
            if(!res.data.authenticate.jwtToken) {
                setErrorInfo({ message: 'Echec lors de la connexion.', detail: '' })
                return 
            }
            appContext.loginComplete(res.data.authenticate.jwtToken)
        } catch(error: any) {
            const errorInfo = parseUiError(error)
            setErrorInfo({ message: errorInfo.message, detail: errorInfo.detail })
        }
    } }>
        {({ isSubmitting, handleSubmit, errors, touched, handleChange, values }) => {
            return <Stack component={Form} alignItems="center" padding="0.5rem 0" spacing={2}>
                <TextField id="email" name="email" autoComplete="username" label="Email" type="email" variant="standard" value={values.email} onChange={handleChange} error={touched.email && !!errors.email} helperText={touched.email && errors.email as string}/>
                <TextField id="password" name="password" autoComplete="current-password" label="Mot de passe" type="password" variant="standard" value={values.password} onChange={handleChange} error={touched.password && !!errors.password} helperText={touched.password && errors.password as string}/>
                <LoadingButton loading={isSubmitting}
                    loadingPosition="start"
                    startIcon={<LoginIcon />}
                    type="submit"
                    variant="contained"
                    onClick={() => handleSubmit()}>Connection</LoadingButton>
                {errorInfo.message && <Feedback severity="error" message={errorInfo.message} detail={errorInfo.detail} onClose={() => setErrorInfo({ message: '', detail: '' })}/>}
                <Button variant="text" onClick={() => { setForgotPassword(true) }}>Mot de passe oublié</Button>
                <ForgotPasswordDialog onClose={() => setForgotPassword(false)} opened={forgotPassword}/>
            </Stack>}
        }
    </Formik>

}

export default LoginForm