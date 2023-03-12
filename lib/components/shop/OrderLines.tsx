import { Box, Container, Stack, TextField, Tooltip, Typography } from "@mui/material"
import { FieldArray, Formik, FormikErrors, FormikTouched } from "formik"
import TimeOutMarker from '@mui/icons-material/AccessAlarm'
import * as yup from 'yup'
import dayjs from "dayjs"
import { config } from "lib/uiCommon"
import { AppContext, CartItem } from "./AppContextProvider"
import { useContext } from "react"

interface ArticleForSale {
    articleId: number
    should_include_vat: boolean
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
}

interface FormValues {
    orderLines: ArticleForSale[]
}

interface Props {
    articles: ArticleForSale[]
}

const OrderLines = ({ articles }: Props) => {
    const appContext = useContext(AppContext)
    const hasError = (touched: FormikTouched<FormValues>, errors: FormikErrors<FormValues>, idx: number): boolean => {
        return !!touched.orderLines && touched.orderLines[idx] && !!errors.orderLines  && Array.isArray(errors.orderLines) && !!errors.orderLines[idx]
    }
    const getError = (touched: FormikTouched<FormValues>, errors: FormikErrors<FormValues>, idx: number): string => {
        if(!!touched.orderLines && touched.orderLines[idx] && !!errors.orderLines && Array.isArray(errors.orderLines) && errors.orderLines[idx])
            return (errors.orderLines[idx] as FormikErrors<ArticleForSale>).quantityOrdered || ''
        return ''
    }
    const articlesInitialValue = (articles: ArticleForSale[]): ArticleForSale[] => {
        return articles.map(art => {
            const articleInCart = appContext.data.cart.articles.find(cartArt => cartArt.articleId === art.articleId)
            if(articleInCart) return {...art, ...{ quantityOrdered: (articleInCart as CartItem).quantityOrdered}}
            return {...art, ...{ quantityOrdered: 0}}
        })
    }
    
    return <Container maxWidth="lg">
        <Stack>
            <Stack direction="row" columnGap="0.5rem">
                <Typography sx={{ flex: '6 1' }} variant="overline">Produit</Typography>
                <Typography sx={{ flex: '4 1' }} variant="overline">Conditionnement</Typography>
                <Typography sx={{ flex: '1 1' }} variant="overline">Disponibles</Typography>
                <Typography sx={{ flex: '1 1', textAlign: 'right' }} variant="overline">Prix</Typography>
                <Typography sx={{ flex: '2 1' }} variant="overline">Votre commande</Typography>
            </Stack>
            <Formik initialValues={{ orderLines: articlesInitialValue(articles) } as FormValues}
                validationSchema={yup.object().shape({
                    orderLines: yup.array(yup.object().shape({
                        quantityOrdered: yup.number().min(0,'Veuillez entrer un nombre positif')
                    })).test('SomeQuantityOrdered', `Aucune quantité n'a été commandée`, val => {
                        return !!val &&
                            val.length > 0 &&
                            val.reduce((prev, current) => prev + current.quantityOrdered!, 0) > 0
                    })
                })} onSubmit={values => {
                    appContext.setCartArticles(values.orderLines)
                }} >
                {({ handleSubmit, errors, touched, handleChange, values }) => <FieldArray name="orderLines">
                    {() => articles.map((article, idx) => <Stack key={article.articleId} direction="row" columnGap="0.5rem" alignItems="center" sx={{ backgroundColor: idx % 2 ? 'inherit': '#DDD', padding: '0.25rem' }}>
                        <Stack sx={{ flex: '6 1' }}>
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
                        <Typography sx={{ flex: '1 1', textAlign: 'right' }} variant="body1">{article.price.toLocaleString()}€</Typography>
                        <Box sx={{ flex: '2 1' }}>
                            <TextField size="small" type="number" name={`orderLines.${idx}.quantityOrdered`} 
                                value={values.orderLines[idx].quantityOrdered}
                                onChange={handleChange}
                                error={hasError(touched, errors, idx)}
                                helperText={getError(touched, errors, idx)}
                                onBlur={() => handleSubmit()}/>
                        </Box>
                    </Stack>)}
                </FieldArray>}
            </Formik>
        </Stack>
    </Container>
}

export default OrderLines