import { gql, useMutation, useQuery } from "@apollo/client"
import { Alert, CircularProgress } from "@mui/material"
import { isValidVatNumber } from "lib/uiCommon"
import * as yup from 'yup'
import Datagrid, { Column } from "../datagrid/Datagrid"

const GET = gql`query CustomerAdminViewAllCustomersQuery {
  allCustomers {
    nodes {
      addressLine1
      addressLine2
      eshopAccess
      id
      name
      priceListId
      slug
      vatNumber
    }
  }
}`

const UPDATE = gql`
  mutation UpdateCustomer($name: String!, $addressLine1: String, $addressLine2: String, 
    $eshopAccess: Boolean!, $priceListId: Int!, $slug: String!, $vatNumber: String,
    $id: Int!) {
    updateCustomerById(
      input: {customerPatch: {name: $name, addressLine1: $addressLine1, addressLine2: $addressLine2,
        eshopAccess: $eshopAccess, priceListId: $priceListId, slug: $slug, vatNumber: $vatNumber}, id: $id}
    ) {
        customer { 
            addressLine1
            addressLine2
            eshopAccess
            id
            name
            priceListId
            slug
            vatNumber 
        }
    }
  }
`

const CREATE = gql`
  mutation CreateCustomer($name: String!, $addressLine1: String, $addressLine2: String, 
    $eshopAccess: Boolean!, $priceListId: Int!, $slug: String!, $vatNumber: String) {
    createCustomer(input: {customer: {name: $name, addressLine1: $addressLine1, addressLine2: $addressLine2,
        eshopAccess: $eshopAccess, priceListId: $priceListId, slug: $slug, vatNumber: $vatNumber}}) {
        customer { 
            addressLine1
            addressLine2
            eshopAccess
            id
            name
            priceListId
            slug
            vatNumber 
        }
    }
  }`

const createSlug = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for(let i = 0; i < 12; i ++) {
        result += chars[Math.floor(Math.random() * 36)]
    }
    return result
}

const CustomerAdminView = () => {
    const { loading, error, data } = useQuery(GET)
    const [ update, {error: updateError }] = useMutation(UPDATE)
    const [ create, {error: createError }] = useMutation(CREATE)
    if(loading) return <CircularProgress />
    if(error) return <Alert severity='error'>{error.message}</Alert>
 
    const columns: Column[] = [
        { key: 'id', headerText: 'Id', widthPercent: 5, type: "number"},
        { key: 'name', headerText: 'Nom', widthPercent: 15, type: "string",  editable: {
          validation: yup.string().required('Ce champ est requis') 
        }},
        { key: 'addressLine1', headerText: 'Adresse ligne 1', widthPercent: 17.5, type: "string", editable: {
            validation: yup.string()
          }
        },
        { key: 'addressLine2', headerText: 'Adresse ligne 2', widthPercent: 17.5, type: "string", editable: {
            validation: yup.string()
          }
        },
        { key: 'eshopAccess', headerText: 'Eshop ?', widthPercent: 7, type: "boolean", editable: {
            validation: yup.string()
          }
        }, { key: 'priceListId', headerText: 'Liste de prix', widthPercent: 10, type: "number", editable: {
            validation: yup.number().required('Ce champ est requis')
          }, relation: {
            query: gql`query priceListsByName($search: String) {
                filterPricelists(searchTerm: $search) {
                  nodes {
                      id
                      name
                  }
              }
            }`
          }
        },
        { key: 'slug', headerText: 'code eshop', widthPercent: 10, type: "string", valueForNew: 'autogénéré' },
        { key: 'vatNumber', headerText: 'N° TVA', type: "string", editable: {
            validation: yup.string().test({
                test: val => {
                    if(!val) return true
                    return isValidVatNumber(val)
                }, message: 'Format de numéro de TVA invalide'
            })
          }
        }
    ]

    const rows = data.allCustomers.nodes
    return <Datagrid title="Clients"
      columns={columns} 
      lines={rows}
      onCreate={async values => {
        const result = await create({ variables: {name: values.name, addressLine1: values.addressLine1, addressLine2: values.addressLine2,
            eshopAccess: values.eshopAccess, priceListId: values.priceListId, slug: createSlug(), vatNumber: values.vatNumber} })
        return { data: result.data?.createCustomer?.customer, error: createError }
      }}
      onUpdate={async (values, line) => {
        const result = await update({ variables: {name: values.name, addressLine1: values.addressLine1, addressLine2: values.addressLine2,
            eshopAccess: values.eshopAccess, priceListId: values.priceListId, slug: values.slug, vatNumber: values.vatNumber, id: line.id}})
        return { error: updateError?.message || '', data: result.data?.updateCustomerById.customer }
      }}
      getDeleteMutation = {(paramIndex: string) => `deleteCustomerById(input: {id: $id${paramIndex}}){deletedCustomerId}`} />
}
   
export default CustomerAdminView
