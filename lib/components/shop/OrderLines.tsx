import { Box, Stack, TextField, Tooltip, Typography } from "@mui/material"
import { FieldArray, Formik, FormikErrors, FormikTouched } from "formik"
import TimeOutMarker from '@mui/icons-material/AccessAlarm'
import * as yup from 'yup'
import dayjs from "dayjs"
import { asPrice, config } from "lib/uiCommon"
import { AppContext } from "./AppContextProvider"
import { useContext } from "react"
import { useMutation, useQuery } from "@apollo/client"
import { availableArticlesQry, draftOrderLinesQry, setOrderLineQry } from "../queriesLib"
import Loader from "../Loader"

interface ArticleForSale {
    articleId: number
	price: number
	quantityPerContainer: number
	stockName: string
	unitAbbreviation: string
	productName: string
	containerName: string
	available: number
    quantityOrdered: number
    fulfillmentDate: Date
    orderClosureDate: Date
    articleTaxRate: number
    containerRefundPrice: number
    containerRefundTaxRate: number
}

interface FormValues {
    orderLines: ArticleForSale[]
}

const OrderLines = () => {
    const appContext = useContext(AppContext)
    const { loading, error, data } = useQuery(availableArticlesQry)
    const { loading: orderLinesLoading, error: orderLinesError, data: orderLinesData } = useQuery(draftOrderLinesQry, { onCompleted: (data) => {
        appContext.setNbCartArticles(data.myDraftOrder.orderLinesByOrderId.nodes.length)
    }})
    const [setOrderLine, { data: reloadedOrderLinesData }] = useMutation(setOrderLineQry, { onCompleted: (data) => {
        appContext.setNbCartArticles(data.myDraftOrder.orderLinesByOrderId.nodes.length)
    }})
    const hasError = (touched: FormikTouched<FormValues>, errors: FormikErrors<FormValues>, idx: number): boolean => {
        return !!touched.orderLines && touched.orderLines[idx] && !!errors.orderLines  && Array.isArray(errors.orderLines) && !!errors.orderLines[idx]
    }
    const getError = (touched: FormikTouched<FormValues>, errors: FormikErrors<FormValues>, idx: number): string => {
        if(!!touched.orderLines && touched.orderLines[idx] && !!errors.orderLines && Array.isArray(errors.orderLines) && errors.orderLines[idx])
            return (errors.orderLines[idx] as FormikErrors<ArticleForSale>).quantityOrdered || ''
        return ''
    }
    const articlesInitialValue = (articles: ArticleForSale[], orderLinesQuantities: {[articleId: number]: number }): ArticleForSale[] => {
        return articles.map(art => ({...art, ...{ quantityOrdered: orderLinesQuantities[art.articleId] || 0}}))
    }

    let articles: ArticleForSale[] = []
    let orderLinesQuantities: {[articleId: number]: number} = {}

    if(data) {
        articles = data.getAvailableArticles.nodes
    }

    // if quantities reloaded, load it into orderLinesQuantities, so that it always takes
    // precedence over initial quantities
    if(reloadedOrderLinesData && reloadedOrderLinesData.myDraftOrder) {
        reloadedOrderLinesData.myDraftOrder.orderLinesByOrderId.nodes.forEach((orderLine: any) => {
            orderLinesQuantities[orderLine.articleId] = orderLine.quantityOrdered
        })
    } else if(orderLinesData && orderLinesData.myDraftOrder) {
         orderLinesData.myDraftOrder.orderLinesByOrderId.nodes.forEach((orderLine: any) => {
            orderLinesQuantities[orderLine.articleId] = orderLine.quantityOrdered
        })
    }

    let lineToSet: { articleId: number, quantity: number }
    
    return <Stack>
        <Stack direction="row" columnGap="0.5rem">
            <Typography sx={{ flex: '4 1' }} variant="overline">Produit</Typography>
            <Typography sx={{ flex: '4 1' }} variant="overline">Conditionnement</Typography>
            <Typography sx={{ flex: '1 1' }} variant="overline">Disponibles</Typography>
            <Typography sx={{ flex: '1 1', textAlign: 'right' }} variant="overline">Prix</Typography>
            <Typography sx={{ flex: '2 1' }} variant="overline">Votre commande</Typography>
        </Stack>
        <Loader loading={loading || orderLinesLoading} error={error || orderLinesError}>
            <Formik initialValues={{ orderLines: articlesInitialValue(articles, orderLinesQuantities) } as FormValues}
                validationSchema={yup.object().shape({
                    orderLines: yup.array(yup.object().shape({
                        quantityOrdered: yup.number().min(0,'Veuillez entrer un nombre positif').test('WithinAvailableStock', `Il n'y a pas assez de stock disponible`, (val, context) => {
                            return !val || val <= context.parent.available
                        })
                    })).test('SomeQuantityOrdered', `Aucune quantité n'a été commandée`, val => {
                        return !!val &&
                            val.length > 0 &&
                            val.reduce((prev, current) => prev + current.quantityOrdered!, 0) > 0
                    })
                })} onSubmit={async () => {
                    const res = await setOrderLine({ variables: { inputArticleId: lineToSet.articleId, inputQuantity: lineToSet.quantity }})
                    appContext.setNbCartArticles(res.data.setOrderLineFromShop.integer)
                }}>
                {({ handleSubmit, errors, touched, handleChange, values }) => <FieldArray name="orderLines">
                    {() => articles.map((article, idx) => <Stack key={article.articleId} direction="row" columnGap="0.5rem" alignItems="center" sx={{ backgroundColor: idx % 2 ? 'inherit': '#DDD', padding: '0.25rem' }}>
                        <Stack sx={{ flex: '4 1' }}>
                            <Stack direction="row" columnGap='0.5rem'>
                                {dayjs(article.orderClosureDate).diff(new Date(), 'day') < 1 && <Tooltip title={`commande jusqu'au ${dayjs(article.orderClosureDate).format(config.dateTimeFormat)}`}>
                                    <TimeOutMarker color="error" />
                                </Tooltip>}
                                <Typography variant="body1">{`${article.productName}${article.stockName && ' - ' + article.stockName}`}</Typography>
                            </Stack>
                            <Typography variant="body2">Livraison / retrait {dayjs(article.fulfillmentDate).format(config.dateTimeFormat)}</Typography>
                        </Stack>
                        <Typography sx={{ flex: '4 1' }} variant="body1">{`${article.containerName}, ${article.quantityPerContainer} ${article.unitAbbreviation}`}</Typography>
                        <Typography sx={{ flex: '1 1' }} variant="body1">{article.available}</Typography>
                        <Typography sx={{ flex: '1 1', textAlign: 'right' }} variant="body1">{asPrice(article.price)}</Typography>
                        <Box sx={{ flex: '2 1' }}>
                            <TextField size="small" type="number" name={`orderLines.${idx}.quantityOrdered`} 
                                value={values.orderLines[idx].quantityOrdered}
                                onChange={e => {
                                    handleChange(e)
                                    lineToSet = { articleId: article.articleId, quantity: Number(e.target.value) }
                                }}
                                error={hasError(touched, errors, idx)}
                                helperText={getError(touched, errors, idx)}
                                onBlur={() => handleSubmit()}/>
                        </Box>
                    </Stack>)}
                </FieldArray>}
            </Formik>
        </Loader>
    </Stack>
}

export default OrderLines