import { LoadingButton } from "@mui/lab"
import { Stack, Dialog, DialogTitle, DialogContent, DialogActions, Button, Backdrop, CircularProgress, Typography, TextField } from "@mui/material"
import { Formik } from "formik"
import * as yup from 'yup'
import { parseUiError } from "lib/uiCommon"
import { useState } from "react"
import Feedback from "../Feedback"
import { gql, useMutation } from "@apollo/client"

const RECOVER_PASSWORD = gql`mutation RecoverPassword($recoveryEmail: String!) {
    createPasswordRecovery(input: {recoveryEmail: $recoveryEmail}) {
      string
    }
  }`

interface Props {
    opened: boolean
    onClose: () => void
}

const ForgotPasswordDialog = ({ opened, onClose }: Props) => {
    const [status, setStatus] = useState({ processing: false, error: undefined as Error | undefined })
    const [recoverPassword] = useMutation(RECOVER_PASSWORD)
    return <Stack>
        <Dialog
            open={opened}
            onClose={() => onClose()}>
            <DialogTitle>Mot de passe oublié ?</DialogTitle>
            <DialogContent>
                <Typography variant="body1">Un lien de restauration vous sera envoyé à votre adresse email:</Typography>
                <Formik initialValues={{ email: '' }} validationSchema={yup.object().shape({
                    email: yup.string().required('Ce champ est requis').email()
                })} onSubmit={async values => {
                    setStatus({ processing: true, error: undefined })
                    try {
                        setStatus({ processing: false, error: undefined })
                        const res = await recoverPassword({ variables: { recoveryEmail: values.email } })
                        onClose()
                    } catch(e: any) {
                        setStatus({ processing: false, error: e as Error })
                    }
                }}>
                    {({ getFieldProps, submitForm, errors, touched }) => {
                        return <Stack spacing={1}>
                            <TextField size="small" id="email" type="text" {...getFieldProps('email')} error={!!errors.email} helperText={touched.email && errors.email}/>
                            <LoadingButton sx={{ alignSelf: 'center' }} variant="contained" type="submit" loading={status.processing} onClick={submitForm}>Ok</LoadingButton>
                            {status.error && <Feedback severity="error" onClose={() => { setStatus({ processing: false, error: undefined }) }} {...parseUiError(status.error)} />}
                        </Stack>
                    }}
                </Formik>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose()} autoFocus>Annuler</Button>
            </DialogActions>
        </Dialog>
        <Backdrop
            open={status.processing}>
            <CircularProgress sx={{ color: 'primary.light'}} />
        </Backdrop>
    </Stack>
}

export default ForgotPasswordDialog