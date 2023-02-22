import { LoadingButton } from "@mui/lab"
import { Stack, Typography, Alert, Snackbar, IconButton } from "@mui/material"
import { FieldInputProps, Form, Formik, FormikErrors, FormikTouched, FormikValues } from "formik"
import CloseIcon from "@mui/icons-material/Close"
import { parseUiError } from "lib/uiCommon"
import { ChangeEvent, useState } from "react"

interface Props<T> {
    initialValues: T,
    validationSchema: any,
    onSubmit: (values: T) => Promise<void>,
    title: string,
    buttonText?: string,
    makeControls: (errors: FormikErrors<T>, touched: FormikTouched<T>, values: T, handleChange: {
        (e: ChangeEvent<any>): void;
        <T = string | ChangeEvent<any>>(field: T): T extends ChangeEvent<any> ? void : (e: string | ChangeEvent<any>) => void;
    }, getFieldProps: <Value = any>(props: any) => FieldInputProps<Value>, setFieldValue:(field: string, value: any, shouldValidate?: boolean | undefined) => void) => JSX.Element[],
    handleSubmitError?: (error: Error, setError: (errorMessage: string) => void) => void
}


function ItemForm<T extends FormikValues> ({initialValues, validationSchema, onSubmit, title, makeControls, handleSubmitError, buttonText}: Props<T>) {
    const [ submitStatus, setSubmitStatus ] = useState({ error: '', showSuccess: false})
    const handleClose = () => setSubmitStatus({error: '', showSuccess: false})
    return <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={async (values) => {
        try {
            setSubmitStatus({error: '', showSuccess: false})
            await onSubmit(values)
            setSubmitStatus({error: '', showSuccess: true})
        } catch(e: any) {
            if(handleSubmitError) {
                handleSubmitError(e as Error, (errorMessage: string) => setSubmitStatus({error: errorMessage, showSuccess: false}) )
            } else {
                setSubmitStatus({error: parseUiError(e).message, showSuccess: false})
            }
        }
    }}>
    {({ isSubmitting, handleSubmit, errors, touched, handleChange, values, getFieldProps, setFieldValue }) => {
        return <Stack component={Form} spacing={2} margin="1rem">
            <Typography variant="h3">{title}</Typography>
            {makeControls(errors, touched, values, handleChange, getFieldProps, setFieldValue)}
            <LoadingButton loading={isSubmitting} variant="contained" sx={{alignSelf: 'center'}} onClick={() => handleSubmit()}>{buttonText || 'Changer'}</LoadingButton>
            {submitStatus.error && <Alert severity="error">{submitStatus.error}</Alert>}
            <Snackbar color="success" anchorOrigin={{vertical: 'top', horizontal: 'center'}} autoHideDuration={4000} open={submitStatus.showSuccess}
                onClose={handleClose}>
                    <Alert severity="success">Opération réussie !<IconButton
                        size="small"
                        color="inherit"
                        onClick={handleClose}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Alert>
                </Snackbar>
        </Stack>
    }}
    </Formik>
}

export default ItemForm