import { gql, useQuery } from "@apollo/client"
import Loader from "lib/components/Loader"
import { useEffect } from "react"
import * as yup from 'yup'
import DatagridAdminView from "./DatagridAdminView"

const SETTING = gql`query Owner {
  allSettings {
    nodes {
      defaultTaxRate
  }
}}`

const GET = gql`query ArticleAdminViewAllArticlesQuery {
  allArticles {
    nodes {
        id
        stockShapeId
        containerId
        quantityPerContainer
        taxRate
    }
  }
}`

const UPDATE = gql`mutation UpdateArticle($stockShapeId: Int!, $containerId: Int!, $quantityPerContainer: BigFloat!, $id: Int!, $taxRate: BigFloat!) {
  updateArticleById(
    input: {articlePatch: {stockShapeId: $stockShapeId, containerId: $containerId, quantityPerContainer: $quantityPerContainer, taxRate: $taxRate}, id: $id}
  ) {
    article {
      id
      stockShapeId
      containerId
      quantityPerContainer
      taxRate
    }
  }
}`

const CREATE = gql`mutation CreateArticle($stockShapeId: Int!, $containerId: Int!, $quantityPerContainer: BigFloat!, $taxRate: BigFloat!) {
  createArticle(
    input: {article: {stockShapeId: $stockShapeId, containerId: $containerId, quantityPerContainer: $quantityPerContainer, taxRate: $taxRate}}
  ) {
    article {
      id
      stockShapeId
      containerId
      quantityPerContainer
      taxRate
    }
  }
}`

const ArticleAdminView = () => {
  const {loading, error, data} = useQuery(SETTING)
  return <Loader loading={loading} error={error}>
    <DatagridAdminView title="Articles" dataName="Article" getQuery={GET} updateQuery={UPDATE}
      createQuery={CREATE} columns={[
        { key: 'id', headerText: 'ID', widthPercent: 5, type: "number"},
        { key: 'stockShapeId', headerText: 'Stock', type: "number", widthPercent: 35, editable: {
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
          }`, getLabel: (item:any) => `${item.productName} / ${item.stockShapeName} (${item.unitAbbreviation})`}},
        { key: 'containerId', headerText: 'Contenant', type: "number", widthPercent: 30, editable: {
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
        { key: 'quantityPerContainer', headerText: 'Qté par contenant', widthPercent: 15, type: "number", editable: {
          validation: yup.number().positive().required('Ce champ est requis')
        }},
        { key: 'taxRate', headerText: 'Taux TVA (%)', type: "number", editable: {
          validation: yup.number().required('Ce champ est requis').test('taxRateBetween0and100', 'Ce taux doit être entre 0 et 100', (val) => {
            return !!val && val >= 0 && val <= 100
        })
      }, valueForNew: data && Number(data.allSettings.nodes[0].defaultTaxRate)},
    ]}/>
  </Loader>

}

export default ArticleAdminView