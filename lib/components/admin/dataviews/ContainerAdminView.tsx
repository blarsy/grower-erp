import { gql } from "@apollo/client"
import * as yup from 'yup'
import DatagridAdminView from "./DatagridAdminView"


const GET = gql`query ContainerAdminViewAllContainersQuery {
  allContainers {
    nodes {
      id
      name
      description
      refundPrice
      refundTaxRate
    }
  }
}`

const UPDATE = gql`mutation UpdateContainer($description: String!, $name: String!, $refundPrice: Float, $refundTaxRate: BigFloat, $id: Int!) {
  updateContainerById(
    input: {containerPatch: {description: $description, name: $name, refundPrice: $refundPrice, refundTaxRate: $refundTaxRate}, id: $id}
  ) {
    container {
      id
      description
      name
      refundPrice
      refundTaxRate
    }
  }
}`

const CREATE = gql`mutation CreateContainer($description: String!, $name: String!, $refundPrice: Float, $refundTaxRate: BigFloat) {
  createContainer(
    input: {container: {name: $name, description: $description, refundPrice: $refundPrice, refundTaxRate: $refundTaxRate}}
  ) {
    container {
      description
      id
      name
      refundPrice
      refundTaxRate
    }
  }
}`

const ContainerAdminView = () => {
  return <DatagridAdminView title="Contenants" dataName="Container" getQuery={GET} createQuery={CREATE}
    updateQuery={UPDATE} columns={[
      { key: 'id', headerText: 'ID', widthPercent: 5, type: "number"},
      { key: 'name', headerText: 'Nom', widthPercent: 20, type: "string",  editable: {
        validation: yup.string().required('Ce champ est requis') 
      }},
      { key: 'description', headerText: 'Description', widthPercent: 30, type: "string", editable: {
        validation: yup.string().required('Ce champ est requis') 
      }},
      { key: 'refundPrice', headerText: 'Prix vidange', widthPercent: 10, type: "number", editable: {
        validation: yup.number().min(0, 'Veuillez entrer un nombre positif ou nul').required('Ce champ est requis')
      }},
      { key: 'refundTaxRate', headerText: 'Taux de TVA vidange (%)', type: "number", editable: {
        validation: yup.number().min(0, 'Veuillez entrer un nombre positif ou nul').required('Ce champ est requis')
      }}
    ]} />
}
   
export default ContainerAdminView