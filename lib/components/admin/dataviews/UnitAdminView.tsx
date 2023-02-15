import { gql } from '@apollo/client'
import * as yup from 'yup'
import DatagridAdminView from './DatagridAdminView'

const GET = gql`query UnitAdminViewAllUnitsQuery {
  allUnits {
    nodes {
      id
      abbreviation
      name
    }
  }
}`

const UPDATE = gql`
  mutation UpdateUnit($abbreviation: String, $name: String, $id: Int!) {
    updateUnitById(
      input: {unitPatch: {abbreviation: $abbreviation, name: $name}, id: $id}
    ) {
      unit { id, abbreviation, name }
    }
  }
`

const CREATE = gql`
  mutation CreateUnit($abbreviation: String!, $name: String!) {
    createUnit(input: {unit: {name: $name, abbreviation: $abbreviation}}) {
      unit { id, abbreviation, name }
    }
  }
`

const UnitAdminView = () => {
  return <DatagridAdminView title="Unités" dataName="Unit" getQuery={GET} updateQuery={UPDATE}
    createQuery={CREATE} columns={[
      { key: 'id', headerText: 'ID', widthPercent: 5, type: "number"},
      { key: 'abbreviation', headerText: 'Abbréviation', widthPercent: 20, type: "string", editable: {
          validation: yup.string().required('Ce champ est requis') 
        }
      },
      { key: 'name', headerText: 'Nom', type: "string",  editable: {
        validation: yup.string().required('Ce champ est requis') 
      }
    }
  ]}/>
}

export default UnitAdminView