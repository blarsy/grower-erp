import { useMutation } from '@apollo/client'
import { TextField } from '@mui/material'
import * as yup from 'yup'
import { setSettings } from '../queriesLib'
import ItemForm from "./ItemForm"

interface Props {
    data: {
        defaultTaxRate: number,
        defaultContainerRefundTaxRate: number,
        id?: number
    }
}

const SettingsForm = ({ data }: Props) => {
    const [save] = useMutation(setSettings)
    return <ItemForm initialValues={data || { defaultTaxRate: 0 }} title="Paramètres système" validationSchema={yup.object().shape({ 
        defaultTaxRate: yup.number().min(0, 'Veuillez entrer une valeur numérique positive').required('Ce champs est requis')
    })} onSubmit={async (values) =>  {
        await save({ variables: { defaultTaxRate: values.defaultTaxRate, defaultContainerRefundTaxRate: values.defaultContainerRefundTaxRate }})
    }} makeControls={(errors, touched, values, handleChange) => [
        <TextField key="defaultTaxRate" type="number" id="defaultTaxRate" label="Taux de taxation par défaut (TVA)" variant="standard" value={values.defaultTaxRate} onChange={handleChange} error={touched.defaultTaxRate && !!errors.defaultTaxRate} helperText={touched.defaultTaxRate && errors.defaultTaxRate as string} />,
        <TextField key="defaultContainerRefundTaxRate" type="number" id="defaultContainerRefundTaxRate" label="Taux de taxation par défaut des vidanges (TVA)" variant="standard" value={values.defaultContainerRefundTaxRate} onChange={handleChange} error={touched.defaultContainerRefundTaxRate && !!errors.defaultContainerRefundTaxRate} helperText={touched.defaultContainerRefundTaxRate && errors.defaultContainerRefundTaxRate as string} />
    ]}/>
}

export default SettingsForm