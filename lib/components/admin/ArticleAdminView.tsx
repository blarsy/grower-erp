import { gql, useMutation, useQuery } from "@apollo/client"
import { Alert, CircularProgress } from "@mui/material"
import * as yup from 'yup'
import Datagrid, { Column } from "../datagrid/Datagrid"


const GET = gql`query ArticleAdminViewAllArticlesQuery {
  allArticles {
    nodes {
        id
        stockShapeId
        containerId
        quantityPerContainer
    }
  }
}`

const UPDATE = gql`
  mutation UpdateArticle($stockShapeId: Int!, $containerId: Int!, $quantityPerContainer: BigFloat!, $id: Int!) {
    updateArticleById(
      input: {articlePatch: {stockShapeId: $stockShapeId, containerId: $containerId, quantityPerContainer: $quantityPerContainer }, id: $id}
    ) {
        article {
            id
            stockShapeId
            containerId
            quantityPerContainer
        }
    }
  }
`

const CREATE = gql`
  mutation CreateArticle($stockShapeId: Int!, $containerId: Int!, $quantityPerContainer: BigFloat!) {
    createArticle(input: {article: {stockShapeId: $stockShapeId, containerId: $containerId, quantityPerContainer: $quantityPerContainer}}) {
        article {
            id
            stockShapeId
            containerId
            quantityPerContainer
        }
    }
  }`

const ArticleAdminView = () => {
    const { loading, error, data } = useQuery(GET)
    const [ update, {error: updateError }] = useMutation(UPDATE)
    const [ create, {error: createError }] = useMutation(CREATE)
    if(loading) return <CircularProgress />
    if(error) return <Alert severity='error'>{error.message}</Alert>
 
    const columns: Column[] = [
        { key: 'id', headerText: 'ID', widthPercent: 5, type: "number"},
        { key: 'stockShapeId', headerText: 'Stock', type: "number", widthPercent: 40, editable: {
          validation: yup.number().required('Ce champ est requis'), 
        }, relation: { query: gql`query StockShapesByTerm($search: String) {
            filterStockshapes(searchTerm: $search) {
                nodes {
                    id
                    productName
                    stockShapeName
                    unitAbbreviation
                }
            }
          }`, getLabel: item => `${item.productName} / ${item.stockShapeName} (${item.unitAbbreviation})`}},
        { key: 'containerId', headerText: 'Contenant', type: "number", widthPercent: 35, editable: {
                validation: yup.number().required('Ce champ est requis')
            }, relation: { query: gql`query containersByName($search: String) {
                filterContainers(searchTerm: $search) {
                  nodes {
                      id
                      name
                  }
              }
            }`
        }},
        { key: 'quantityPerContainer', headerText: 'Quantité par contenant', type: "number", editable: {
            validation: yup.number().positive().required('Ce champ est requis')
        }},
    ]

    const rows = data.allArticles.nodes
    return <Datagrid title="Articles"
      columns={columns} 
      lines={rows}
      onCreate={async values => {
        const result = await create({ variables: {stockShapeId: values.stockShapeId, containerId: values.containerId, quantityPerContainer: values.quantityPerContainer } })
        return { data: result.data?.createArticle?.article, error: createError }
      }}
      onUpdate={async (values, line) => {
        const result = await update({ variables: {stockShapeId: values.stockShapeId, containerId: values.containerId, quantityPerContainer: values.quantityPerContainer, id: line.id}})
        return {error: updateError?.message, data: result.data.updateArticleById.article}
      }}
      getDeleteMutation = {(paramIndex: string) => `deleteArticleById(input: {id: $id${paramIndex}}){deletedArticleId}`} />
}

export default ArticleAdminView