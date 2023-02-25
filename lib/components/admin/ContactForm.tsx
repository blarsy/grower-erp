import { TextField } from "@mui/material"
import * as yup from 'yup'
import { DocumentNode, useMutation } from "@apollo/client"
import { useContext, useState } from "react"
import { AppContext } from "./AppContextProvider"
import ItemForm from "./ItemForm"

interface Props {
    data: any,
    updateQuery: DocumentNode
}

interface ContactValues {
    id: number
    firstname: string
    lastname: string
    email: string
    phone: string
    addressLine1: string
    addressLine2: string
    zipCode: string
    city: string
}

const ensureTextValuesNotNull = (values: ContactValues): ContactValues => ({
    id: values.id,
    firstname: values.firstname || '',
    lastname: values.lastname,
    email: values.email || '',
    phone: values.phone || '',
    addressLine1: values.addressLine1 || '',
    addressLine2: values.addressLine2 || '',
    zipCode: values.zipCode || '',
    city: values.city || ''
})

const ContactForm = ({data, updateQuery }: Props) => {
    const [ update ] = useMutation(updateQuery)
    let create: Function|undefined = undefined
    
    const [ contactData, setcontactData ] = useState(data || { firstname: '', lastname: '', phone: '', email: '', 
        addressLine1: '', addressLine2: '', zipCode: '', city: '' })
    const appContext = useContext(AppContext)

    return <ItemForm initialValues={ensureTextValuesNotNull(contactData)} validationSchema={yup.object().shape({
        firstname: yup.string().nullable(),
        lastname: yup.string().required('Ce champ est requis'),
        email: yup.string().nullable(),
        phone: yup.string().nullable(),
        addressLine1: yup.string().nullable(),
        addressLine2: yup.string().nullable(),
        zipCode: yup.string().nullable().matches(/\w{4,7}/, 'Veuille entrer entre 4 et 7 caractères.'),
        city: yup.string().nullable()
    })} onSubmit={async (values) => {
            const result = await update({ variables: { id: values.id, 
                firstname: values.firstname, lastname: values.lastname, 
                email: values.email, phone: values.phone,
                addressLine1: values.addressLine1, addressLine2: values.addressLine2,
                zipCode: values.zipCode, city: values.city }})
            setcontactData(result.data.updateContactById)
            appContext?.changeSessionInfo(undefined, undefined, values.id, values.firstname, values.lastname, values.email)
    }} title="Vos données personnelles" makeControls={(errors, touched, values, handleChange) => [
        <TextField key="firstname" id="firstname" label="Prénom" variant="standard" value={values.firstname} onChange={handleChange} error={touched.firstname && !!errors.firstname} helperText={touched.firstname && errors.firstname as string}/>,
        <TextField key="lastname" id="lastname" label="Nom de famille" variant="standard" value={values.lastname} onChange={handleChange} error={touched.lastname && !!errors.lastname} helperText={touched.lastname && errors.lastname as string}/>,
        <TextField key="email" id="email" label="Email" variant="standard" value={values.email} onChange={handleChange} error={touched.email && !!errors.email} helperText={touched.email && errors.email as string}/>,
        <TextField key="phone" id="phone" label="Téléphone" variant="standard" value={values.phone} onChange={handleChange} error={touched.phone && !!errors.phone} helperText={touched.phone && errors.phone as string}/>,
        <TextField key="addressLine1" id="addressLine1" label="Addresse ligne 1" variant="standard" value={values.addressLine1} onChange={handleChange} error={touched.addressLine1 && !!errors.addressLine1} helperText={touched.addressLine1 && errors.addressLine1 as string}/>,
        <TextField key="addressLine2" id="addressLine2" label="Addresse ligne 2" variant="standard" value={values.addressLine2} onChange={handleChange} error={touched.addressLine2 && !!errors.addressLine2} helperText={touched.addressLine2 && errors.addressLine2 as string} />,
        <TextField key="zipCode" id="zipCode" label="Code postal" variant="standard" value={values.zipCode} onChange={handleChange} error={touched.zipCode && !!errors.zipCode} helperText={touched.zipCode && errors.zipCode as string} />,
        <TextField key="city" id="city" label="Localité" variant="standard" value={values.city} onChange={handleChange} error={touched.city && !!errors.city} helperText={touched.city && errors.city as string} />
    ]}/>
}

export default ContactForm