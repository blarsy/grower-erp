import { gql, useMutation, useQuery } from "@apollo/client"
import { Alert, CircularProgress } from "@mui/material"
import Datagrid, { Column } from "lib/components/datagrid/Datagrid"
import { filterCompanies, filterContacts } from "lib/components/queriesLib"
import * as yup from 'yup'

const GET = gql`query CustomerAdminViewAllCustomersQuery {
  allCustomers {
    nodes {
      contactId
      companyId
      eshopAccess
      id
      pricelistId
      slug
    }
  }
}`

const UPDATE = gql`
  mutation UpdateCustomer($contactId: Int, $companyId: Int, $eshopAccess: Boolean!, $pricelistId: Int!,
    $id: Int!) {
    updateCustomerById(
      input: {customerPatch: {contactId: $contactId, companyId: $companyId, eshopAccess: $eshopAccess, pricelistId: $pricelistId}, id: $id}
    ) {
        customer { 
            contactId
            companyId
            eshopAccess
            id
            pricelistId
            slug
        }
    }
  }
`

const CREATE = gql`
  mutation CreateCustomer($contactId: Int, $companyId: Int, $eshopAccess: Boolean!, $pricelistId: Int!, $slug: String!) {
    createCustomer(input: {customer: {contactId: $contactId, companyId: $companyId, eshopAccess: $eshopAccess, pricelistId: $pricelistId, slug: $slug}}) {
        customer { 
            contactId
            companyId
            eshopAccess
            id
            pricelistId
            slug
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
        { key: 'contactId', headerText: 'Personne', widthPercent: 25, type: "number",  editable: {
          validation: yup.number().nullable()
        }, relation: {
          query: filterContacts, getLabel: (rec) => {
            if(rec.companyByCompanyId && rec.companyByCompanyId.name) return `${rec.firstname} ${rec.lastname} (${rec.companyByCompanyId.name})`
            else return `${rec.firstname} ${rec.lastname}`
          }
        }},
        { key: 'companyId', headerText: 'Entreprise', widthPercent: 25, type: "number",  editable: {
          validation: yup.number().nullable()
        }, relation: {
          query: filterCompanies, getLabel: (rec) => {
            if(rec.companyNumber) return `${rec.name} - ${rec.companyNumber}`
            else return rec.name
          }
        }},
        { key: 'eshopAccess', headerText: 'Eshop ?', widthPercent: 7, type: "boolean", editable: {
            validation: yup.string()
          }
        }, { key: 'pricelistId', headerText: 'Tarif', widthPercent: 15, type: "number", editable: {
            validation: yup.number().typeError('Ce champ est requis.')
          }, relation: {
            query: gql`query pricelistsByName($search: String) {
                filterPricelists(searchTerm: $search) {
                  nodes {
                      id
                      name
                  }
              }
            }`
          }
        },
        { key: 'slug', headerText: 'code eshop', type: "string", valueForNew: 'autogénéré' }
    ]

    const rows = data.allCustomers.nodes
    return <Datagrid title="Clients"
      columns={columns} 
      lines={rows}
      onCreate={async values => {
        const result = await create({ variables: { contactId: values.contactId, companyId: values.companyId, eshopAccess: values.eshopAccess, pricelistId: values.pricelistId, slug: createSlug()} })
        return { data: result.data?.createCustomer?.customer, error: createError }
      }}
      onUpdate={async (values, line) => {
        const result = await update({ variables: { contactId: values.contactId, companyId: values.companyId, eshopAccess: values.eshopAccess, pricelistId: values.pricelistId, id: line.id}})
        return { error: updateError?.message || '', data: result.data?.updateCustomerById.customer }
      }}
      getDeleteMutation = {(paramIndex: string) => `deleteCustomerById(input: {id: $id${paramIndex}}){deletedCustomerId}`} />
}
   
export default CustomerAdminView
