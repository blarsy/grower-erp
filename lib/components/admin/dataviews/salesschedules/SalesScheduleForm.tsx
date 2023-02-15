import { gql, useQuery } from "@apollo/client"
import { LoadingButton } from "@mui/lab"
import { DateTimePicker } from '@mui/x-date-pickers'
import { Stack, Typography, TextField, FormControl, FormControlLabel, Checkbox, InputLabel, Select, MenuItem, ListItemText } from "@mui/material"
import { Formik, ErrorMessage, FieldArray } from "formik"
import * as yup from 'yup'
import Loader from "lib/components/Loader"
import { parseUiError } from "lib/uiCommon"
import { useRouter } from "next/router"
import { useContext, useState } from "react"
import Feedback from "lib/components/Feedback"
import { AppContext } from "../../AppContextProvider"

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
    pricelists: {id: number, name: string}[]
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
    allPricelists {
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
    const appContext = useContext(AppContext)
    const {loading, error, data} = useQuery(depsQuery) 
    const [ submitError, setSubmitError ] = useState({message: '', detail: ''})

    const anyFmRequiresCustomerAddress = (fulfillmentMethodIds: {id: number}[]) => {
        const ids = fulfillmentMethodIds.map(fm => fm.id)
        return data.allFulfillmentMethods.nodes.some((fm: any) => ids.includes(fm.id) && fm.needsCustomerAddress)
    }
    
    return <Formik initialValues={initial} validationSchema={yup.object().shape({
        name: yup.string(),
        fulfillmentDate: yup.date().typeError('Veuillez entrer une date valide').required('Ce champ est requis'),
        beginSalesDate: yup.date().transform((value: Date) => isNaN(value.valueOf()) ? undefined : value).typeError('Veuillez entrer une date valide')
            .test('beginSalesDateBeforeFulfillmentDate', 'La date de début de la vente doit avoir lieu avant la date de délivrance', (val, ctx) => !val || val < ctx.parent.fulfillmentDate)
            .test('beginSalesDateBeforOrderClosureDate', 'La date de début de la vente doit avoir lieu avant la date de clôture des commandes', (val, ctx) => !val || val < ctx.parent.orderClosureDate),
        orderClosureDate: yup.date().typeError('Veuillez entrer une date valide').required('Ce champ est requis')
            .test('orderClosureDateBeforeFulfillmentDate', 'La date de clôture des commandes doit avoir lieu avant la date de délivrance', (val, ctx) => !!val && val < ctx.parent.fulfillmentDate)
            .required('Ce champ est requis'),
        disabled: yup.boolean().required('Ce champ est requis'),
        deliveryPrice: yup.number().min(0, 'Valeur positive ou nulle uniquement')
            .test('FulfillmentDeliveryRequiresDeliveryPrice', 'Une ou plusieurs méthode de délivrance sélectionnée exige que ce champ soit remplit.)', (val, ctx) => anyFmRequiresCustomerAddress(ctx.parent.fulfillmentMethods) ? !!val : true),
        freeDeliveryTurnover: yup.number().min(0, 'Valeur positive ou nulle uniquement'),
        fulfillmentMethods: yup.array().of(yup.object({
            id: yup.number()
        })).min(1, 'Veuillez sélectionner au moins une méthode de délivrance.'),
        pricelists: yup.array().of(yup.object({
            id: yup.number()
        })).min(1, 'Veuillez sélectionner au moins un tarif auquel la vente s\'applique')
    })} onSubmit={async (values) => {
        console.log('submitting', values)
        try {
            setSubmitError({ message: '', detail: ''})
            await submit(values)
            router.push('/admin/salesschedule')
        } catch(e: any) {
            const { message, detail } = parseUiError(e)
            setSubmitError({ message, detail})
        }

    }}>
    {({ isSubmitting, handleSubmit, errors, touched, handleChange, values, getFieldProps, setFieldValue }) => {
        return <Stack spacing={2} margin="1rem" onSubmit={() => handleSubmit()}>
            <Typography variant="h3">{ initial.id ? 'Détails de la vente' : 'Nouvelle vente'}</Typography>
            <TextField size="small" id="name" label="Nom (facultatif - apparaît aux clients sur l'e-shop)" {...getFieldProps('name')} error={touched.name && !!errors.name} helperText={touched.name && errors.name as string}/>
            <DateTimePicker InputProps={{size: 'small'}}
                    label="Date de délivrance"
                    onChange={(value: any) => {
                        setFieldValue('fulfillmentDate', value, true)
                    }}
                    disablePast
                    value={values.fulfillmentDate}
                    renderInput={(params: any) => <TextField size="small" {...params} />}
            />
            <Typography color="error"><ErrorMessage name="fulfillmentDate"/></Typography>
            <DateTimePicker InputProps={{size: 'small'}}
                    disablePast
                    label="Date de début de vente"
                    onChange={(value: any) => {
                        setFieldValue('beginSalesDate', value, true)
                    }}
                    value={values.beginSalesDate}
                    renderInput={(params: any) => <TextField size="small" {...params} />}
            />
            <Typography color="error"><ErrorMessage name="beginSalesDate"/></Typography>
            <DateTimePicker InputProps={{size: 'small'}}
                    label="Date de clôture des commandes"
                    onChange={(value: any) => {
                        setFieldValue('orderClosureDate', value, true)
                    }}
                    disablePast
                    value={values.orderClosureDate}
                    renderInput={(params: any) => <TextField size="small" {...params} />}
            />
            <Typography color="error"><ErrorMessage name="orderClosureDate"/></Typography>
            <FormControl>
                <FormControlLabel
                    control={<Checkbox size="small" checked={values.disabled} />}
                    label="Suspendue ?"
                    name="disabled"
                    onChange={handleChange}
                />
            </FormControl>
            <FormControl size="small">
                <InputLabel id="labelFulfillmentMethods">Méthode de délivrance</InputLabel>
                <Loader loading={loading} error={error}>
                    <FieldArray name="fulfillmentMethods" render={ArrayHelpers => {
                        return <Select labelId="labelFulfillmentMethod" 
                            label="Méthode de délivrance" 
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
            </FormControl>
            <FormControl size="small">
                <InputLabel id="labelPricelists">Tarifs</InputLabel>
                <Loader loading={loading} error={error}>
                    <FieldArray name="pricelists" render={ArrayHelpers => {
                        return <Select labelId="labelPricelists" 
                            label="Tarifs" 
                            multiple value={values.pricelists}
                            renderValue={value => value.map(val => val.name).join(', ')}>
                        {
                            data.allPricelists.nodes.map((pl: any, idx: number) => (<MenuItem key={pl.id} value={pl.id} onClick={() => values.pricelists.some(selected => selected.id === pl.id) ? ArrayHelpers.remove(values.pricelists.findIndex(selected => selected.id === pl.id)) : ArrayHelpers.push(pl)}>
                                <Checkbox checked={values.pricelists.some(selected => selected.id === pl.id)} />
                                <ListItemText primary={pl.name} />
                            </MenuItem>))
                        }
                        </Select>
                    }} />
                </Loader>
                { touched.pricelists && errors.pricelists && <Typography color="error">{errors.pricelists as string}</Typography> }
            </FormControl>
            { values.fulfillmentMethods.some(fm => fm.needsCustomerAddress) && [
                <TextField key="deliveryPrice" size="small" type="number" {...getFieldProps('deliveryPrice')} label="Prix de la livraison" error={touched.deliveryPrice && !!errors.deliveryPrice} helperText={touched.deliveryPrice && errors.deliveryPrice as string}/>,
                <TextField key="freeDeliveryTurnover" disabled={values.deliveryPrice === 0} size="small" type="number" {...getFieldProps('freeDeliveryTurnover')} label="Montant à commander pour livraison gratuite" error={touched.freeDeliveryTurnover && !!errors.freeDeliveryTurnover} helperText={touched.freeDeliveryTurnover && errors.freeDeliveryTurnover as string}/>
            ]}
            <LoadingButton loading={isSubmitting} variant="contained" sx={{alignSelf: 'center'}} onClick={() => handleSubmit()}>Sauver</LoadingButton>
            {submitError.message && <Feedback onClose={() => { setSubmitError({ message: '', detail: ''})}} message={submitError.message!}
            detail={submitError.detail} severity="error" /> }
        </Stack>
    }}
    </Formik>
}

export default SalesScheduleForm