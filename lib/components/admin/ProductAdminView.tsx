import { gql, useMutation, useQuery } from "@apollo/client"
import { Alert, CircularProgress } from "@mui/material"
import * as yup from 'yup'
import Datagrid, { Column } from "../datagrid/Datagrid"
import DatagridAdminvView from "./DatagridAdminView"


const GET = gql`query ProductAdminViewAllProductsQuery {
  allProducts {
    nodes {
      id
      name
      description
      parentProduct
    }
  }
}`

const UPDATE = gql`
  mutation UpdateProduct($name: String, $description: String, $parentProduct: Int, $id: Int!) {
    updateProductById(
      input: {productPatch: {name: $name, description: $description, parentProduct: $parentProduct}, id: $id}
    ) {
      product { id name description }
    }
  }
`

const CREATE = gql`
  mutation CreateProduct($name: String!, $description: String!, $parentProduct: Int) {
    createProduct(input: {product: {name: $name, description: $description, parentProduct: $parentProduct}}) {
      product { id, name, description, parentProduct }
    }
  }`

const ProductAdminView = () => {
  return <DatagridAdminvView title="Produits" dataName="Product" getQuery={GET} updateQuery={UPDATE}
    createQuery={CREATE} columns={[
      { key: 'id', headerText: 'ID', widthPercent: 5, type: "number"},
      { key: 'name', headerText: 'Nom', widthPercent: 20, type: "string",  editable: {
        validation: yup.string().required('Ce champ est requis') 
      }},
      { key: 'description', headerText: 'description', widthPercent: 50, type: "string", editable: {
          validation: yup.string().required('Ce champ est requis') 
        }
      },
      { key: 'parentProduct', headerText: 'Produit parent', editable: {
              validation: yup.number().nullable()
          }, relation: { query: gql`query productsByName($search: String) {
                filterProducts(searchTerm: $search) {
                  nodes {
                      id
                      name
                  }
              }
            }`
      }}]} />
}
   
export default ProductAdminView