import { Stack, Typography, TextField, Alert } from "@mui/material"
import { Formik } from "formik"
import * as yup from 'yup'
import { parseUiError, isValidVatNumber } from "lib/uiCommon"
import { DocumentNode, useMutation } from "@apollo/client"
import { useContext, useState } from "react"
import { LoadingButton } from "@mui/lab"
import { AppContext } from "./AppContextProvider"

interface Props {
    data: any,
    updateQuery: DocumentNode,
    createQuery: DocumentNode | ((values: CompanyValues) => Promise<number>),
}

interface CompanyValues {
    id: number
    name: string
    addressLine1: string
    addressLine2: string
    zipCode: string
    city: string
    companyNumber: string
}

const ensureTextValuesNotNull = (values: CompanyValues): CompanyValues => ({
    id: values.id,
    name: values.name || '',
    addressLine1: values.addressLine1 || '',
    addressLine2: values.addressLine2 || '',
    zipCode: values.zipCode || '',
    city: values.city || '',
    companyNumber: values.companyNumber || ''
})

const CompanyForm = ({data, updateQuery, createQuery}: Props) => {
    const [ update ] = useMutation(updateQuery)
    let create: Function|undefined = undefined
    if(typeof (createQuery) !== 'function') {
        create = useMutation(createQuery)[0]
    }
    
    const [ companyData, setCompanyData ] = useState(data || { name: '', addressLine1: '', 
        addressLine2: '', companyNumber: '', zipCode: '', city: '' })
    const [ error, setError ] = useState('')
    const appContext = useContext(AppContext)
    return <Formik initialValues={ensureTextValuesNotNull(companyData)} validationSchema={yup.object().shape({
        name: yup.string().required('Ce champ est requis'),
        addressLine1: yup.string().nullable(),
        addressLine2: yup.string().nullable(),
        zipCode: yup.string().nullable().matches(/\w{4,7}/, 'Veuille entrer entre 4 et 7 caractères.'),
        city: yup.string().nullable(),
        companyNumber: yup.string().nullable().test({
            test: val => {
                if(!val) return true
                return isValidVatNumber(val)
            }, message: 'Format de numéro de TVA invalide'
        })
    })} onSubmit={async (values) => {
        try {
            setError('')
            if(values.id) {
                const result = await update({ variables: { id: values.id, 
                    companyNumber: values.companyNumber, name: values.name, 
                    addressLine1: values.addressLine1, addressLine2: values.addressLine2,
                    zipCode: values.zipCode, city: values.city }})
                setCompanyData(result.data.updateCompanyById)
            } else {
                if(create) {
                    const result = await create({ variables: { 
                        companyNumber: values.companyNumber, name: values.name, 
                        addressLine1: values.addressLine1, addressLine2: values.addressLine2,
                        zipCode: values.zipCode, city: values.city }})
                    setCompanyData(result.data.company)
                } else {
                    values.id = await (createQuery as (values: CompanyValues) => Promise<number>)(values)
                }
            }
            appContext?.changeCompanyName(values.name)
        } catch(e: any) {
            setError(parseUiError(e).message)
        }

    }}>
    {({ isSubmitting, handleSubmit, errors, touched, handleChange, values }) => {
        return <Stack spacing={2} margin="1rem" onSubmit={() => handleSubmit()}>
            <Typography variant="h3">Données de l'entreprise</Typography>
            <Typography variant="subtitle1">Utilisées sur les documents générés (bons de commande, de livraison, factures, ...), et dans les pages du webshop.</Typography>
            <TextField id="name" label="Nom de l'entreprise" variant="standard" value={values.name} onChange={handleChange} error={touched.name && !!errors.name} helperText={touched.name && errors.name as string}/>
            <TextField id="addressLine1" label="Addresse ligne 1" variant="standard" value={values.addressLine1} onChange={handleChange} error={touched.addressLine1 && !!errors.addressLine1} helperText={touched.addressLine1 && errors.addressLine1 as string}/>
            <TextField id="addressLine2" label="Addresse ligne 2" variant="standard" value={values.addressLine2} onChange={handleChange} error={touched.addressLine2 && !!errors.addressLine2} helperText={touched.addressLine2 && errors.addressLine2 as string} />
            <TextField id="zipCode" label="Code postal" variant="standard" value={values.zipCode} onChange={handleChange} error={touched.zipCode && !!errors.zipCode} helperText={touched.zipCode && errors.zipCode as string} />
            <TextField id="city" label="Localité" variant="standard" value={values.city} onChange={handleChange} error={touched.city && !!errors.city} helperText={touched.city && errors.city as string} />
            <TextField id="companyNumber" label="Numéro de TVA" variant="standard" value={values.companyNumber} onChange={handleChange} error={touched.companyNumber && !!errors.companyNumber} helperText={touched.companyNumber && errors.companyNumber as string} />
            <LoadingButton loading={isSubmitting} variant="contained" sx={{alignSelf: 'center'}} onClick={() => handleSubmit()}>Sauver</LoadingButton>
            {error && <Alert severity="error">{error}</Alert>}
        </Stack>
    }}
    </Formik>
}

export default CompanyForm