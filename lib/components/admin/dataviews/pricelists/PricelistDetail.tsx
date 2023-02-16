import { gql } from "@apollo/client"
import { IconButton, Stack, Typography } from "@mui/material"
import { useRouter } from "next/router"
import BackIcon from '@mui/icons-material/ArrowBack'
import * as yup from 'yup'
import DatagridAdminView from "../DatagridAdminView"

interface Props {
    pricelist: {
        id: string
        name: string
        vatIncluded: boolean
    }
}
const GET = gql`query ArticlespricesByPricelistId($id: Int!) {
  pricelistById(id: $id) {
    articlesPricesByPriceListId {
      nodes {
        id
        articleId
        price
        priceListId
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

const PricelistDetail = ({ pricelist }: Props) => {
    const router = useRouter()
    const { id, name, vatIncluded } = pricelist
    return <Stack>
        <Stack direction="row" alignItems="center">
            <IconButton onClick={() => router.push('/admin/pricelist')}><BackIcon /></IconButton>
            <Typography>Tarifs</Typography>
        </Stack>
        <DatagridAdminView title={`Liste de prix "${name}"`} dataName="ArticlesPrice"
            getQuery={GET} filter={{ id }} updateQuery={UPDATE} createQuery={CREATE} getFromQueried={data => data.pricelistById.articlesPricesByPriceListId.nodes}
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
                { key: 'price', headerText: `Prix ${vatIncluded ? 'TVAC': 'HTVA'}`, type: "number", editable: {
                        validation: yup.number().positive().required('Ce champ est requis')
                    }}
            ]} />
    </Stack>

}

export default PricelistDetail