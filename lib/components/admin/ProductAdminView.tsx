import { gql, useMutation, useQuery } from "@apollo/client"
import { Alert, CircularProgress } from "@mui/material"
import * as yup from 'yup'
import Datagrid, { Column } from "../datagrid/Datagrid"


const GET = gql`query ProductAdminViewAllProductsQuery {
  allProducts {
    edges {
      node {
        id
        name
        description
        parentProduct
      }
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
        }}]

    const rows = data.allProducts.edges.map((edge: any) => edge.node)
    return <Datagrid title="Produits"
      columns={columns} 
      lines={rows}
      onCreate={async values => {
        const result = await create({ variables: {name: values.name, description: values.description, parentProduct: values.parentProduct} })
        return { data: result.data?.createProduct?.product, error: createError }
      }}
      onUpdate={async (values, line) => {
        const result = await update({ variables: {name: values.name, description: values.description, parentProduct: values.parentProduct, id: line.id}})
        return { error: updateError?.message || '', data: result.data?.updateProductById.product }
      }}
      getDeleteMutation = {(paramIndex: string) => `deleteProductById(input: {id: $id${paramIndex}}){deletedProductId}`} />
}
   
export default ProductAdminView