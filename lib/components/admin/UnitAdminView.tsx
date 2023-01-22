import { useQuery, useMutation, gql, NetworkStatus } from '@apollo/client'
import { Alert, CircularProgress } from '@mui/material'
import * as yup from 'yup'
import Datagrid, { Column } from '../datagrid/Datagrid'

const GET_UNITS = gql`query UnitAdminViewAllUnitsQuery {
  allUnits {
    edges {
      node {
        id
        abbreviation
        name
      }
    }
  }
}`

const UPDATE_UNIT = gql`
  mutation UpdateUnit($abbreviation: String, $name: String, $id: Int!) {
    updateUnitById(
      input: {unitPatch: {abbreviation: $abbreviation, name: $name}, id: $id}
    ) {
      unit { id, abbreviation, name }
    }
  }
`

const CREATE_UNIT = gql`
  mutation CreateUnit($abbreviation: String!, $name: String!) {
    createUnit(input: {unit: {name: $name, abbreviation: $abbreviation}}) {
      unit { id, abbreviation, name }
    }
  }
`

const UnitAdminView = () => {
    const { loading, error, data } = useQuery(GET_UNITS)
    const [ updateUnit, {error: updateError }] = useMutation(UPDATE_UNIT)
    const [ createUnit, {error: createError }] = useMutation(CREATE_UNIT)
    if(loading) return <CircularProgress />
    if(error) return <Alert severity='error'>{error.message}</Alert>
 
    const columns: Column[] = [
        { key: 'id', headerText: 'ID', widthPercent: 5, type: "number"},
        { key: 'abbreviation', headerText: 'Abbréviation', widthPercent: 20, type: "string", editable: {
            validation: yup.string().required('Ce champ est requis') 
          }
        },
        { key: 'name', headerText: 'Nom', type: "string",  editable: {
          validation: yup.string().required('Ce champ est requis') 
        }
      }
    ]

    const rows = data.allUnits.edges.map((edge: any) => edge.node)
    return <Datagrid title="Unités"
      columns={columns} 
      lines={rows}
      onCreate={async values => {
        const result = await createUnit({ variables: {abbreviation: values.abbreviation, name: values.name} })
        return { data: result.data?.createUnit?.unit, error: createError }
      }}
      onUpdate={async (values, line) => {
        const result = await updateUnit({ variables: {abbreviation: values.abbreviation, name: values.name, id: line.id}})
        return {error: updateError?.message || '', data: result.data?.updateUnitById.unit }
      }}
      getDeleteMutation = {(paramIndex: string) => `deleteUnitById(input: {id: $id${paramIndex}}){deletedUnitId}`} />
}

export default UnitAdminView