import { gql, useQuery } from '@apollo/client'
import Loader from 'lib/components/Loader'
import * as yup from 'yup'
import DatagridAdminView from "./DatagridAdminView"

interface Props {
    pricelistId: number
}

const GET = gql`query ArticlespricesByPricelistId($id: Int!) {
    pricelistById(id: $id) {
        name
        vatIncluded
        articlesPricesByPriceListId {
            nodes {
                id
                articleId
                price
            }
        }
    }
}`
  
const UPDATE = gql`
    mutation UpdateArticlesPrice($articleId: Int!, $priceListId: Int!, $price: Float!, $id: Int!) {
        updateArticlesPriceById(
        input: {articlesPricePatch: {articleId: $articleId, priceListId: $priceListId, price: $price }, id: $id}
        ) {
            articlesPrice {
                id
                articleId
                price
            }
        }
    }`
  
const CREATE = gql`
    mutation CreateArticlePrice($articleId: Int!, $priceListId: Int!, $price: Float!) {
        createArticlesPrice(input: { articlesPrice: { articleId: $articleId, priceListId: $priceListId, price: $price } }
        ) {
            articlesPrice {
                id
                articleId
                price
            }
        }
    }`

const PriceByPriceListAdminView = ({ pricelistId }:Props) => {
    const {loading, data, error} = useQuery(gql`query pricelistById($id: Int) {
        pricelistById(id: $id) {
          name
          vatIncluded
        }
      }`, { variables: { id: pricelistId } })
    return <Loader loading={loading} error={error}>
    <DatagridAdminView title="Tarifs" dataName="Pricelist" getQuery={GET} createQuery={CREATE}
        updateQuery={UPDATE} filter={{ id: pricelistId }}
        columns={[
            { key: 'id', headerText: 'ID', widthPercent: 5, type: "number"},
            { key: 'articleId', headerText: 'Article', type: "number", widthPercent: 80, editable: {
                validation: yup.number().required('Ce champ est requis'), 
                }, relation: { query: gql`query ArticleByTerm($search: String) {
                    filterArticles(searchTerm: $search) {
                        nodes {
                            id
                            productName
                            stockshapeName
                            unitAbbreviation
                            containerName
                            quantityPerContainer
                        }
                    }
                }`, getLabel: item => `${item.productName} / ${item.stockshapeName} (${item.containerName}, ${item.quantityPerContainer} ${item.unitAbbreviation})`}},
            { key: 'price', headerText: `Prix ${data.pricelistById.vatIncluded ? 'TVAC': 'HTVA'}`, type: "number", editable: {
                    validation: yup.number().positive().required('Ce champ est requis')
                }}
        ]} />
    </Loader>
}

export default PriceByPriceListAdminView