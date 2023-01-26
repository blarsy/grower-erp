import { gql, useMutation, useQuery } from "@apollo/client"
import { CircularProgress, Alert } from "@mui/material"
import * as yup from 'yup'
import { useRouter } from "next/router"
import Datagrid, { Column } from "lib/components/datagrid/Datagrid"
import AdminPage from "lib/components/admin/AdminPage"

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
    mutation UpdateArticlesPrice($articleId: Int!, $priceListId: Int!, $price: BigFloat!, $id: Int!) {
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
    mutation CreateArticle($articleId: Int!, $priceListId: Int!, $price: BigFloat!) {
        createArticlesPrice(input: { articlesPrice: { articleId: $articleId, priceListId: $priceListId, price: $price } }
        ) {
            articlesPrice {
                id
                articleId
                price
            }
        }
    }`

const PriceList = () => {
    const router = useRouter()
    const { id: priceListId } =router.query
    const { loading, error, data } = useQuery(GET, { variables: {id: Number(priceListId)}})
    const [ update, {error: updateError }] = useMutation(UPDATE)
    const [ create, {error: createError }] = useMutation(CREATE)
    if(loading) return <CircularProgress />
    if(error) return <Alert severity='error'>{error.message}</Alert>

    const columns: Column[] = [
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
    ]

    const rows = data.pricelistById.articlesPricesByPriceListId.nodes
    return <AdminPage>
        <Datagrid title={`Liste de prix "${data.pricelistById.name}"`}
            columns={columns} 
            lines={rows}
            onCreate={async values => {
                const result = await create({ variables: {articleId: values.articleId, priceListId: Number(priceListId), price: values.price } })
                return { data: result.data?.createArticlesPrice?.articlesPrice, error: createError }
            }}
            onUpdate={async (values, line) => {
                const result = await update({ variables: {articleId: values.articleId, priceListId: Number(priceListId), price: values.price, id: line.id}})
                return {error: updateError?.message, data: result.data.updateArticlesPriceById.articlesPrice}
            }}
            getDeleteMutation = {(paramIndex: string) => `deleteArticlesPriceById(input: {id: $id${paramIndex}}){deletedArticlesPriceId}`} />
    </AdminPage>
}

export default PriceList