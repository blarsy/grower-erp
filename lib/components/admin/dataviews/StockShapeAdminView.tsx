import { gql, useMutation, useQuery } from "@apollo/client"
import { Alert, CircularProgress } from "@mui/material"
import * as yup from 'yup'
import Datagrid, { Column } from "lib/components/datagrid/Datagrid"
import DatagridAdminView from "./DatagridAdminView"


const GET = gql`query StockShapeAdminViewAllStockShapesQuery {
  allStockShapes {
    nodes {
      id
      inStock
      name
      productId
      unitId
    }
  }
}`

const UPDATE = gql`
  mutation UpdateStockShape($unitId: Int!, $productId: Int!, $name: String!, $inStock: BigFloat!, $id: Int!) {
  updateStockShapeById(
    input: {stockShapePatch: {inStock: $inStock, name: $name, productId: $productId, unitId: $unitId}, id: $id}
  ){
    stockShape { id, name, productId, unitId, inStock }
  }
}
`

const CREATE = gql`
  mutation ($unitId: Int!, $productId: Int!, $name: String!, $inStock: BigFloat) {
  createStockShape(input: {stockShape: {name: $name, productId: $productId, unitId: $unitId, inStock: $inStock}}){
    stockShape { id, name, productId, unitId, inStock }
  }
}`

const StockShapeAdminView = () => {
  return <DatagridAdminView title="Stocks" dataName="StockShape" getQuery={GET} updateQuery={UPDATE}
    createQuery={CREATE} columns={[
      { key: 'id', headerText: 'ID', widthPercent: 5, type: "number"},
      { key: 'name', headerText: 'Nom', widthPercent: 20, type: "string",  editable: {
        validation: yup.string().required('Ce champ est requis') 
      }},
      { key: 'productId', headerText: 'Produit', widthPercent: 30, type: "string", editable: {
          validation: yup.number().nullable().required('Ce champ est requis') 
        }, relation: { query: gql`query productsByName($search: String) {
            filterProducts(searchTerm: $search) {
              nodes {
                  id
                  name
              }
          }
        }`
      }},
      { key: 'unitId', headerText: 'Unité de stock', editable: {
              validation: yup.number().nullable().required('Ce champ est requis')
          }, relation: { query: gql`query unitsByName($search: String) {
                filterUnits(searchTerm: $search) {
                  nodes {
                      id
                      name
                  }
              }
            }`
      }},
      { key: 'inStock', headerText: 'En stock', type: "number",  editable: {
        validation: yup.number().positive().required('Ce champ est requis') 
      }}
    ]}/>
}
   
export default StockShapeAdminView