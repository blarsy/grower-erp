import { gql } from "@apollo/client"
import * as yup from 'yup'
import DatagridAdminView from "./DatagridAdminView"


const GET = gql`query ContainerAdminViewAllContainersQuery {
  allContainers {
    nodes {
      id
      name
      description
    }
  }
}`

const UPDATE = gql`
  mutation UpdateContainer($name: String, $description: String, $id: Int!) {
    updateContainerById(
      input: {containerPatch: {name: $name, description: $description}, id: $id}
    ) {
      container { id, name, description }
    }
  }
`

const CREATE = gql`
  mutation CreateContainer($name: String!, $description: String!) {
    createContainer(input: {container: {name: $name, description: $description}}) {
      container { id, name, description }
    }
  }`

const ContainerAdminView = () => {
  return <DatagridAdminView title="Contenants" dataName="Container" getQuery={GET} createQuery={CREATE}
    updateQuery={UPDATE} columns={[
      { key: 'id', headerText: 'ID', widthPercent: 5, type: "number"},
      { key: 'name', headerText: 'Nom', widthPercent: 20, type: "string",  editable: {
        validation: yup.string().required('Ce champ est requis') 
      }},
      { key: 'description', headerText: 'description', type: "string", editable: {
          validation: yup.string().required('Ce champ est requis') 
        }
      }]} />
}
   
export default ContainerAdminView