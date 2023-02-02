import { Stack, Typography, TextField, Button, Alert } from "@mui/material"
import { Formik, Form } from "formik"
import * as yup from 'yup'
import { extractUiError, isValidVatNumber } from "lib/uiCommon"
import { DocumentNode } from "graphql"
import { useMutation } from "@apollo/client"
import { useState } from "react"
import { LoadingButton } from "@mui/lab"

interface Props {
    data: any,
    updateQuery: DocumentNode,
    createQuery: DocumentNode,
}

const CompanyForm = ({data, updateQuery, createQuery}: Props) => {
    const [ update ] = useMutation(updateQuery)
    const [ create ] = useMutation(createQuery)
    const [ companyData, setCompanyData ] = useState(data || { name: '', addressLine1: '', addressLine2: '', vatNumber: '' })
    const [ error, setError ] = useState('')
    return <Formik initialValues={companyData} validationSchema={yup.object().shape({
        name: yup.string().required('Ce champ est requis'),
        addressLine1: yup.string().required('Ce champ est requis'),
        addressLine2: yup.string().required('Ce champ est requis'),
        vatNumber: yup.string().test({
            test: val => {
                if(!val) return false
                return isValidVatNumber(val)
            }, message: 'Format de numéro de TVA invalide'
        })
    })} onSubmit={async (values) => {
        try {
            setError('')
            if(companyData.id) {
                const result = await update({ variables: { id: companyData.id, 
                    vatNumber: values.vatNumber, name: values.name, 
                    addressLine1: values.addressLine1, addressLine2: values.addressLine2 }})
                setCompanyData(result.data.updateCompanyById)
            } else {
                const result = await create({ variables: { 
                    vatNumber: values.vatNumber, name: values.name, 
                    addressLine1: values.addressLine1, addressLine2: values.addressLine2 }})
                setCompanyData(result.data.company)
            }
        } catch(e: any) {
            setError(extractUiError(e).message)
        }

    }}>
    {({ isSubmitting, handleSubmit, errors, touched, handleChange, values }) => {
        return <Stack spacing={2} margin="1rem" onSubmit={() => handleSubmit()}>
            <Typography variant="h3">Données de l'entreprise</Typography>
            <Typography variant="subtitle1">Utilisées sur les documents générés (bons de commande, de livraison, factures, ...), et dans les pages du webshop.</Typography>
            <TextField id="name" label="Nom de l'entreprise" variant="standard" value={values.name} onChange={handleChange} error={touched.name && !!errors.name} helperText={touched.name && errors.name as string}/>
            <TextField id="addressLine1" label="Addresse ligne 1" variant="standard" value={values.addressLine1} onChange={handleChange} error={touched.addressLine1 && !!errors.addressLine1} helperText={touched.addressLine1 && errors.addressLine1 as string}/>
            <TextField id="addressLine2" label="Addresse ligne 2" variant="standard" value={values.addressLine2} onChange={handleChange} error={touched.addressLine2 && !!errors.addressLine2} helperText={touched.addressLine2 && errors.addressLine2 as string} />
            <TextField id="vatNumber" label="Numéro de TVA" variant="standard" value={values.vatNumber} onChange={handleChange} error={touched.vatNumber && !!errors.vatNumber} helperText={touched.vatNumber && errors.vatNumber as string} />
            <LoadingButton loading={isSubmitting} variant="contained" sx={{alignSelf: 'center'}} onClick={() => handleSubmit()}>Sauver</LoadingButton>
            {error && <Alert severity="error">{error}</Alert>}
        </Stack>
    }}
    </Formik>
}

export default CompanyForm