import { gql } from "@apollo/client"
import { filterCompanies, filterContacts } from "lib/components/queriesLib"
import * as yup from 'yup'
import DatagridAdminView from "./DatagridAdminView"

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
  return <DatagridAdminView title="Clients" dataName="Customer" getQuery={GET} createQuery={CREATE}
    updateQuery={UPDATE} columns={[
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
  ]} fixedMutationVariables={() => ({slug: createSlug()})}/>
}
   
export default CustomerAdminView
