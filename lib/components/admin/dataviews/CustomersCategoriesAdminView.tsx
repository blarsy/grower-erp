import { gql } from "@apollo/client"
import DatagridAdminView from "./DatagridAdminView"
import * as yup from 'yup'

const GET = gql`query CustomersCategoriesAdminViewAllCustomersCategoriesQuery {
    allCustomersCategories {
      nodes {
          id
          name
      }
    }
  }`
  
  const UPDATE = gql`
    mutation UpdateCustomersCategory($name: String!, $id: Int!) {
      updateCustomersCategoryById(
        input: {customersCategoryPatch: {name: $name }, id: $id}
      ) {
          customersCategory { 
            id
            name
          }
      }
    }
  `
  
  const CREATE = gql`
    mutation CreateCustomersCategory($name: String!) {
      createCustomersCategory(input: {customersCategory: {name: $name}}) {
          customersCategory { 
            id
            name
          }
      }
    }`

const CustomersCategoriesAdminView = () => {
    return <DatagridAdminView dataName="CustomersCategory" getFromQueried={(data) => data && data[`allCustomersCategories`].nodes}
    title="Catégories de clients" getQuery={GET} createQuery={CREATE} updateQuery={UPDATE}
    columns={[
      { key: 'id', headerText: 'Id', widthPercent: 5, type: "number"},
      { key: 'name', headerText: 'Nom', type: "string",  editable: {
        validation: yup.string().required('Ce champ est requis') 
      }}
  ]} />
}
   
export default CustomersCategoriesAdminView