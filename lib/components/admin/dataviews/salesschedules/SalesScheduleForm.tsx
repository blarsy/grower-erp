import { gql, useQuery } from "@apollo/client"
import { DateTimePicker } from '@mui/x-date-pickers'
import { Typography, TextField, FormControl, FormControlLabel, Checkbox, InputLabel, Select, MenuItem, ListItemText } from "@mui/material"
import { ErrorMessage, FieldArray } from "formik"
import * as yup from 'yup'
import Loader from "lib/components/Loader"
import { useRouter } from "next/router"
import ItemForm from "../../ItemForm"

interface Values {
    id?: number,
    name: string, 
    fulfillmentDate: Date
    beginSalesDate: Date | null,
    orderClosureDate: Date
    disabled: boolean
    deliveryPrice: number | null
    freeDeliveryTurnover: number | null
    fulfillmentMethods: {id: number, name: string, needsCustomerAddress: boolean }[]
    customersCategories: {id: number, name: string}[]
}

const depsQuery = gql`query SalesSchedules {
    allFulfillmentMethods {
      nodes {
        name
        id
        needsCustomerAddress
        needsPickupAddress
      }
    }
    allCustomersCategories {
        nodes {
            id
            name
        }
    }
  }`

interface Props {
    initial: Values
    submit: (values: Values) => void
}

const SalesScheduleForm = ({ initial, submit }: Props) => {
    const router = useRouter()
    const {loading, error, data} = useQuery(depsQuery) 

    const anyFmRequiresCustomerAddress = (fulfillmentMethodIds: {id: number}[]) => {
        const ids = fulfillmentMethodIds.map(fm => fm.id)
        return data.allFulfillmentMethods.nodes.some((fm: any) => ids.includes(fm.id) && fm.needsCustomerAddress)
    }

    return <ItemForm initialValues={initial} validationSchema={yup.object().shape({
        name: yup.string(),
        fulfillmentDate: yup.date().typeError('Veuillez entrer une date valide').required('Ce champ est requis'),
        beginSalesDate: yup.date().transform((value: Date) => isNaN(value.valueOf()) ? undefined : value).typeError('Veuillez entrer une date valide')
            .test('beginSalesDateBeforeFulfillmentDate', 'La date de début de la vente doit avoir lieu avant la date d\'acheminement', (val, ctx) => !val || val < ctx.parent.fulfillmentDate)
            .test('beginSalesDateBeforOrderClosureDate', 'La date de début de la vente doit avoir lieu avant la date de clôture des commandes', (val, ctx) => !val || val < ctx.parent.orderClosureDate),
        orderClosureDate: yup.date().typeError('Veuillez entrer une date valide').required('Ce champ est requis')
            .test('orderClosureDateBeforeFulfillmentDate', 'La date de clôture des commandes doit avoir lieu avant la date d\'acheminement', (val, ctx) => !!val && val < ctx.parent.fulfillmentDate)
            .required('Ce champ est requis'),
        disabled: yup.boolean().required('Ce champ est requis'),
        deliveryPrice: yup.number().min(0, 'Valeur positive ou nulle uniquement')
            .test('FulfillmentDeliveryRequiresDeliveryPrice', 'Une ou plusieurs méthode d\'acheminement sélectionnée exige que ce champ soit remplit.)', (val, ctx) => anyFmRequiresCustomerAddress(ctx.parent.fulfillmentMethods) ? !!val : true),
        freeDeliveryTurnover: yup.number().min(0, 'Valeur positive ou nulle uniquement'),
        fulfillmentMethods: yup.array().of(yup.object({
            id: yup.number()
        })).min(1, 'Veuillez sélectionner au moins une méthode d\'acheminement.'),
        customersCategories: yup.array().of(yup.object({
            id: yup.number()
        })).min(1, 'Veuillez sélectionner au moins une catégorie de clients à laquelle la vente s\'applique')
    })} onSubmit={async (values) => {
            await submit(values)
            router.push('/admin/salesschedule')
    }} title={initial.id ? 'Détails de la vente' : 'Nouvelle vente'}
        buttonText={initial.id ? 'Changer' : 'Créer'}
        makeControls={(errors, touched, values, handleChange, getFieldProps, setFieldValue) => {
        const controls = [
            <TextField key="name" size="small" id="name" label="Nom (facultatif - apparaît aux clients sur l'e-shop)" {...getFieldProps('name')} error={touched.name && !!errors.name} helperText={touched.name && errors.name as string}/>,
            <DateTimePicker key="fulfillmentDate" InputProps={{size: 'small'}}
                    label="Date d\'acheminement"
                    onChange={(value: any) => {
                        setFieldValue('fulfillmentDate', value, true)
                    }}
                    disablePast
                    value={values.fulfillmentDate}
                    renderInput={(params: any) => <TextField size="small" {...params} />}
            />,
            <Typography key="fulfillmentDate-error" color="error"><ErrorMessage name="fulfillmentDate"/></Typography>,
            <DateTimePicker key="beginSalesDate" InputProps={{size: 'small'}}
                    disablePast
                    label="Date de début de vente"
                    onChange={(value: any) => {
                        setFieldValue('beginSalesDate', value, true)
                    }}
                    value={values.beginSalesDate}
                    renderInput={(params: any) => <TextField size="small" {...params} />}
            />,
            <Typography key="beginSalesDate-error" color="error"><ErrorMessage name="beginSalesDate"/></Typography>,
            <DateTimePicker key="orderClosureDate" InputProps={{size: 'small'}}
                    label="Date de clôture des commandes"
                    onChange={(value: any) => {
                        setFieldValue('orderClosureDate', value, true)
                    }}
                    disablePast
                    value={values.orderClosureDate}
                    renderInput={(params: any) => <TextField size="small" {...params} />}
            />,
            <Typography key="orderClosureDate-error" color="error"><ErrorMessage name="orderClosureDate"/></Typography>,
            <FormControl key="disabled">
                <FormControlLabel
                    control={<Checkbox size="small" checked={values.disabled} />}
                    label="Suspendue ?"
                    name="disabled"
                    onChange={handleChange}
                />
            </FormControl>,
            <FormControl key="fulfillmentMethods" size="small">
                <InputLabel id="labelFulfillmentMethods">Méthode d'acheminement</InputLabel>
                <Loader loading={loading} error={error}>
                    <FieldArray name="fulfillmentMethods" render={ArrayHelpers => {
                        return <Select labelId="labelFulfillmentMethod" 
                            label="Méthode d\'acheminement" 
                            multiple value={values.fulfillmentMethods}
                            renderValue={value => value.map(val => val.name).join(', ')}>
                        {
                            data.allFulfillmentMethods.nodes.map((fm: any, idx: number) => (<MenuItem key={fm.id} value={fm.id} onClick={() => values.fulfillmentMethods.some(selected => selected.id === fm.id) ? ArrayHelpers.remove(values.fulfillmentMethods.findIndex(selected => selected.id === fm.id)) : ArrayHelpers.push(fm)}>
                                <Checkbox checked={values.fulfillmentMethods.some(selected => selected.id === fm.id)} />
                                <ListItemText primary={fm.name} />
                            </MenuItem>))
                        }
                        </Select>
                    }} />
                </Loader>
                { touched.fulfillmentMethods && errors.fulfillmentMethods && <Typography color="error">{errors.fulfillmentMethods as string}</Typography> }
            </FormControl>,
            <FormControl key="customersCategories" size="small">
                <InputLabel id="labelCustomersCategories">Catégories de clients</InputLabel>
                <Loader loading={loading} error={error}>
                    <FieldArray name="customersCategories" render={ArrayHelpers => {
                        return <Select labelId="labelCustomersCategories" 
                            label="Catégories clients" 
                            multiple value={values.customersCategories}
                            renderValue={value => value.map(val => val.name).join(', ')}>
                        {
                            data.allCustomersCategories.nodes.map((cust: any, idx: number) => (<MenuItem key={cust.id} value={cust.id} onClick={() => values.customersCategories.some(selected => selected.id === cust.id) ? ArrayHelpers.remove(values.customersCategories.findIndex(selected => selected.id === cust.id)) : ArrayHelpers.push(cust)}>
                                <Checkbox checked={values.customersCategories.some(selected => selected.id === cust.id)} />
                                <ListItemText primary={cust.name} />
                            </MenuItem>))
                        }
                        </Select>
                    }} />
                </Loader>
                { touched.customersCategories && errors.customersCategories && <Typography color="error">{errors.customersCategories as string}</Typography> }
            </FormControl>
        ]
        if(values.fulfillmentMethods.some(fm => fm.needsCustomerAddress)) {
            controls.push(<TextField key="deliveryPrice" size="small" type="number" {...getFieldProps('deliveryPrice')} label="Prix de la livraison" error={touched.deliveryPrice && !!errors.deliveryPrice} helperText={touched.deliveryPrice && errors.deliveryPrice as string}/>)
            controls.push(<TextField key="freeDeliveryTurnover" disabled={values.deliveryPrice === 0} size="small" type="number" {...getFieldProps('freeDeliveryTurnover')} label="Montant à commander pour livraison gratuite" error={touched.freeDeliveryTurnover && !!errors.freeDeliveryTurnover} helperText={touched.freeDeliveryTurnover && errors.freeDeliveryTurnover as string}/>)
        }
        return controls
    }} />
}

export default SalesScheduleForm