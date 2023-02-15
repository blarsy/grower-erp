import { gql } from "@apollo/client"
import * as yup from 'yup'
import DatagridAdminView from "./DatagridAdminView"

const GET = gql`query FulfillmentMethodAdminViewAllFulfillmentMethodsQuery {
    allFulfillmentMethods {
      nodes {
          id
          name
          needsCustomerAddress
          needsPickupAddress
      }
    }
  }`
  
  const UPDATE = gql`
    mutation UpdateFulfillmentMethod($name: String!, $needsCustomerAddress: Boolean!, $needsPickupAddress: Boolean!,
      $id: Int!) {
      updateFulfillmentMethodById(
        input: {fulfillmentMethodPatch: {name: $name, needsCustomerAddress: $needsCustomerAddress,
            needsPickupAddress: $needsPickupAddress}, id: $id}
      ) {
          fulfillmentMethod { 
            id
            name
            needsCustomerAddress
            needsPickupAddress
          }
      }
    }
  `
  
  const CREATE = gql`
    mutation CreateFulfillmentMethod($name: String!, $needsCustomerAddress: Boolean!, $needsPickupAddress: Boolean!) {
      createFulfillmentMethod(input: {fulfillmentMethod: {name: $name, needsCustomerAddress: $needsCustomerAddress,
            needsPickupAddress: $needsPickupAddress}}) {
          fulfillmentMethod { 
            id
            name
            needsCustomerAddress
            needsPickupAddress
          }
      }
    }`
  

const FulfillmentMethodAdminView = () => {
    return <DatagridAdminView dataName="FulfillmentMethod"
      title="Méthodes de livraison" getQuery={GET} createQuery={CREATE} updateQuery={UPDATE}
      columns={[
        { key: 'id', headerText: 'Id', widthPercent: 5, type: "number"},
        { key: 'name', headerText: 'Nom', widthPercent: 40, type: "string",  editable: {
          validation: yup.string().required('Ce champ est requis') 
        }},
        { key: 'needsCustomerAddress', headerText: 'Requiert l\'adresse de livraison ?', widthPercent: 27.5, type: "boolean", editable: {
            validation: yup.boolean()
          }
        },
        { key: 'needsPickupAddress', headerText: 'Requiert point d\'enlèvement ?', type: "boolean", editable: {
            validation: yup.boolean()
          }
        }
    ]} />
}

export default FulfillmentMethodAdminView