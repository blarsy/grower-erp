import { gql } from "@apollo/client"
import * as yup from 'yup'
import DatagridAdminvView from "./DatagridAdminView"


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
  return <DatagridAdminvView title="Articles" dataName="Article" getQuery={GET} updateQuery={UPDATE}
    createQuery={CREATE} columns={[
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
  ]}/>
}

export default ArticleAdminView