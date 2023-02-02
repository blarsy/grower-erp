import { gql, useMutation, useQuery } from "@apollo/client"
import { Alert, CircularProgress } from "@mui/material"
import * as yup from 'yup'
import Datagrid, { Column } from "../datagrid/Datagrid"


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
    const { loading, error, data } = useQuery(GET)
    const [ update, {error: updateError }] = useMutation(UPDATE)
    const [ create, {error: createError }] = useMutation(CREATE)
    if(loading) return <CircularProgress />
    if(error) return <Alert severity='error'>{error.message}</Alert>
 
    const columns: Column[] = [
        { key: 'id', headerText: 'ID', widthPercent: 5, type: "number"},
        { key: 'name', headerText: 'Nom', widthPercent: 20, type: "string",  editable: {
          validation: yup.string().required('Ce champ est requis') 
        }},
        { key: 'description', headerText: 'description', type: "string", editable: {
            validation: yup.string().required('Ce champ est requis') 
          }
        }]

    const rows = data.allContainers.nodes
    return <Datagrid title="Contenants"
      columns={columns} 
      lines={rows}
      onCreate={async values => {
        const result = await create({ variables: {name: values.name, description: values.description} })
        return { data: result.data?.createContainer?.container, error: createError }
      }}
      onUpdate={async (values, line) => {
        const result = await update({ variables: {name: values.name, description: values.description, id: line.id}})
        return { error: updateError?.message || '', data: result.data?.updateContainerById.container }
      }}
      getDeleteMutation = {(paramIndex: string) => `deleteContainerById(input: {id: $id${paramIndex}}){deletedContainerId}`} />
}
   
export default ContainerAdminView