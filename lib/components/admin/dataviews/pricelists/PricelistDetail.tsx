import { gql, useMutation, useQuery } from "@apollo/client"
import { Checkbox, CircularProgress, FormControl, FormControlLabel, IconButton, Stack, Typography } from "@mui/material"
import { useRouter } from "next/router"
import BackIcon from '@mui/icons-material/ArrowBack'
import * as yup from 'yup'
import DatagridAdminView from "../DatagridAdminView"
import Loader from "lib/components/Loader"
import { Formik } from "formik"
import { useState } from "react"
import Feedback from "lib/components/Feedback"
import { parseUiError } from "lib/uiCommon"

interface Props {
    pricelistId: number
}

interface Values {
    customersCategories: {
        id: number
    }[]
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

const UPDATE_CUSTOMERS_CATEGORIES = gql`mutation updateCustomersCategories($newCustomersCategoriesSet: [Int]!, $targetPricelistId: Int!) {
    updatePricelistCustomersCategories(
      input: {newCustomersCategoriesSet: $newCustomersCategoriesSet, targetPricelistId: $targetPricelistId}
    ) {
      clientMutationId
    }
  }`

const PRICELIST_DATA = gql`query PricelistById($id: Int!) {
    pricelistById(id: $id) {
      id
      name
      pricelistsCustomersCategoriesByPricelistId {
        nodes {
            customersCategoryId
        }
      }
    }
    allCustomersCategories {
        nodes {
            id
            name
        }
    }
  }`

const PricelistDetail = ({ pricelistId }: Props) => {
    const router = useRouter()
    const { loading, error, data } = useQuery(PRICELIST_DATA, { variables: { id: pricelistId }})
    const [updateCustomersCategories] = useMutation(UPDATE_CUSTOMERS_CATEGORIES)
    const [updateCustomersCategoriesStatus, setUpdateCustomersCategoriesStatus] = useState({ loading: false, error: undefined as Error | undefined})
    
    let message: string, detail: string
    if(updateCustomersCategoriesStatus.error) {
        const feedback = parseUiError(updateCustomersCategoriesStatus.error)
        message = feedback.message
        detail = feedback.detail
    }

    return <Loader loading={loading} error={error}>
        {data && <Stack>
            <Stack direction="row" alignItems="center">
                <IconButton onClick={() => router.push('/admin/pricelist')}><BackIcon /></IconButton>
                <Typography>Listes de prix</Typography>
            </Stack>
            <Typography variant="h4" margin="0 1rem">{`Details liste de prix "${data.pricelistById.name}"`}</Typography>
            <Formik initialValues={{
                customersCategories: data.pricelistById.pricelistsCustomersCategoriesByPricelistId.nodes.map((cc: any) => ({ id: cc.customersCategoryId }))
            } as Values} validate={() => {}} onSubmit={async values => {
                try {
                    setUpdateCustomersCategoriesStatus({ loading: true, error: undefined })
                    await updateCustomersCategories({ variables: { newCustomersCategoriesSet: values.customersCategories.map(cc => cc.id), targetPricelistId: pricelistId } })
                    setUpdateCustomersCategoriesStatus({ loading: false, error: undefined })
                } catch(error: any) {
                    setUpdateCustomersCategoriesStatus({ loading: false, error })
                }
            }}>
            {({ values, setFieldValue, handleSubmit }) => <Stack alignItems="center">
                <Typography variant="overline">S'applique aux catégores de clients:{updateCustomersCategoriesStatus.loading && <CircularProgress size="1rem" />}</Typography>
                <Stack direction="row">
                    {data.allCustomersCategories.nodes.map((customersCategory: any) => <Stack key={customersCategory.id} direction="row">
                        <FormControl key="disabled">
                            <FormControlLabel
                                control={<Checkbox size="small" checked={values.customersCategories.some(cc => cc.id === customersCategory.id)} />}
                                label={customersCategory.name}
                                onChange={() => {
                                    if(values.customersCategories.some(cc => cc.id === customersCategory.id)) {
                                        setFieldValue('customersCategories', values.customersCategories.filter(cc => cc.id !== customersCategory.id))
                                    } else {
                                        setFieldValue('customersCategories', [...values.customersCategories, { id: customersCategory.id }])
                                    }
                                    handleSubmit()
                                }}
                            />
                        </FormControl>
                    </Stack>)}
                </Stack>
                {message && <Feedback onClose={() => setUpdateCustomersCategoriesStatus({ loading: false, error: undefined })}
                    message={message} detail={detail} severity="error"/>}
            </Stack>}
            </Formik>
            <DatagridAdminView title={`Articles`} dataName="ArticlesPrice"
                getQuery={GET} filter={{ id: pricelistId }} updateQuery={UPDATE} createQuery={CREATE} getFromQueried={data => data && data.pricelistById.articlesPricesByPriceListId.nodes}
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
                    { key: 'price', headerText: `Prix HTVA`, type: "number", editable: {
                        validation: yup.number().positive().required('Ce champ est requis')
                    }}
                ]} fixedMutationVariables={{ priceListId: pricelistId }} />
        </Stack>}
    </Loader>
}

export default PricelistDetail