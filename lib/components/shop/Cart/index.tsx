import { gql, useMutation, useQuery } from "@apollo/client"
import { Alert, Button, Stack, Typography } from "@mui/material"
import { useContext, useEffect, useState } from "react"
import Trash from '@mui/icons-material/Delete'
import LeftArrow from '@mui/icons-material/ArrowBack'
import ShopIcon from '@mui/icons-material/Storefront'
import Loader from "../../Loader"
import { AppContext, CartItem } from "../AppContextProvider"
import CartItemRow from "./CartItemRow"
import { useRouter } from "next/router"
import { LoadingButton } from "@mui/lab"
import Feedback from "lib/components/Feedback"
import { asPrice, parseUiError } from "lib/uiCommon"
import OrderLineHeader from "../OrderLineHeader"

export interface ArticleSaleInfo {
    unitAbbreviation: string
    stockName: string
    productName: string
    orderClosureDate: Date
    fulfillmentDate: Date
    containerName: string
    disabledSalesSchedule: boolean
    availableQuantity: number
    articleLatestPrice: number
    articleId: number
    quantityPerContainer: number
}

const ARTICLES_SALES_INFO = gql`query ArticlesSalesInfo($articleIds: [Int]!) {
    getArticlesSalesInfo(
      articleIds: $articleIds
    ) {
      nodes {
        unitAbbreviation
        stockName
        productName
        orderClosureDate
        fulfillmentDate
        containerName
        disabledSalesSchedule
        availableQuantity
        articleLatestPrice
        articleId
        quantityPerContainer
      }
    }
  }`

const CONFIRM_ORDER = gql`mutation ConfirmOrder($articlesQuantities: [ArticleQuantityInput], $fulfillmentMethodId: Int) {
    confirmOrder(
      input: {articlesQuantities: $articlesQuantities, inputFulfillmentMethodId: $fulfillmentMethodId}
    ) {
      integer
    }
  }
  `

export enum CartItemMessages {
    NotSoldAnymore,
    QuantityPerContainerChanged,
    PriceChanged,
    FulfillmentDateChanged,
    InsufficientStock
}

const createMessages = (articleInCart: CartItem, articleSaleInfo: ArticleSaleInfo): CartItemMessages[] => {
    const messages: CartItemMessages[] = []
    if(!articleSaleInfo) {
        messages.push(CartItemMessages.NotSoldAnymore)
    } else {
        if(articleSaleInfo.articleLatestPrice === null || articleSaleInfo.fulfillmentDate === null) {
            messages.push(CartItemMessages.NotSoldAnymore)
        } else {
            if(articleSaleInfo.quantityPerContainer !== articleInCart.quantityPerContainer) {
                messages.push(CartItemMessages.QuantityPerContainerChanged)
            } else {
                if(articleSaleInfo.articleLatestPrice !== articleInCart.price) {
                    messages.push(CartItemMessages.PriceChanged)
                }
            }
            if(articleSaleInfo.fulfillmentDate !== articleInCart.fulfillmentDate) {
                messages.push(CartItemMessages.FulfillmentDateChanged)
            }
        }
        if(articleSaleInfo.availableQuantity < articleInCart.quantityOrdered) {
            messages.push(CartItemMessages.InsufficientStock)
        }
    }
    return messages
}

const Cart = () => {
    const appContext = useContext(AppContext)
    const router = useRouter()
    const [articlesMessages, setArticlesMessages] = useState({} as {[articleId: number]: CartItemMessages[]})
    const { loading, error, data} = useQuery(ARTICLES_SALES_INFO, { variables: {
        articleIds: appContext.data.cart.articles.map(art => art.articleId)
    }})
    const [confirmOrder] = useMutation(CONFIRM_ORDER)
    const [submitInfo, setSubmitInfo] = useState({ processing: false, error: undefined as Error | undefined})
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        if(data) {
            const newArticleMessage: {[articleId: number]: CartItemMessages[]} = {}
            appContext.data.cart.articles.forEach(art => {
                newArticleMessage[art.articleId] = createMessages(art, data.getArticlesSalesInfo.nodes.find((artInfo: ArticleSaleInfo) => artInfo.articleId === art.articleId))
                setArticlesMessages(newArticleMessage)
            })
        }
    }, [data, appContext.data])

    const hasMessages = Object.values(articlesMessages).reduce((p, c) => p + c.length, 0) > 0
    
    return <Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h3" margin="1rem 0 0 0">Votre panier</Typography>
            <Stack direction="row" gap="0.5rem">
                <Button variant="outlined" startIcon={<LeftArrow/>} endIcon={<ShopIcon/>} onClick={() => router.push(`/shop/${router.query.slug![0]}`)}>Boutique</Button>
                <Button variant="outlined" endIcon={<Trash/>} disabled={appContext.data.cart.articles.length === 0} onClick={async () =>{
                    const response = await appContext.confirm('Etes-vous sûr(e) de vouloir vider votre panier ?', 'Vider') 
                    if(response){
                        appContext.clearCart()
                    }
                }}>Vider</Button>
            </Stack>
        </Stack>
        {appContext.data.cart.articles.length === 0 && !success && <Typography textAlign="center" variant="h5">Le panier est vide.</Typography>}
        {appContext.data.cart.articles.length === 0 && success && <Alert severity="success">Votre commande a bien été enregistrée. Merci.</Alert>}
        {appContext.data.cart.articles.length > 0 && <Loader loading={loading} error={error}>
            <Stack margin="1rem 0">
                <OrderLineHeader />
                {data && appContext.data.cart.articles.map(art => 
                    <CartItemRow key={art.articleId} article={art} articlesMessages={articlesMessages} articlesSalesInfo={data.getArticlesSalesInfo.nodes} />)}
                <Stack direction="row" columnGap="0.5rem">
                    <Typography sx={{ flex: '15 1', textAlign: 'right' }} variant="overline">Total</Typography>
                    <Typography sx={{ flex: '2 1', textAlign: 'right' }} variant="body1">
                        {asPrice(appContext.data.cart.articles.reduce((prev, art) => prev + (art.price * art.quantityOrdered * (1 + art.articleTaxRate / 100)), 0))}
                    </Typography>
                </Stack>
                <LoadingButton loading={submitInfo.processing} sx={{alignSelf: 'center'}} variant="contained" type="submit" disabled={hasMessages} onClick={async () => {
                    setSubmitInfo({ processing: true, error: undefined })
                    try {
                        await confirmOrder({ variables: { 
                            fulfillmentMethodId: 1,
                            articlesQuantities: appContext.data.cart.articles.map(art => ({ articleId: art.articleId, quantity: art.quantityOrdered }))
                        }})
                        setSubmitInfo({ processing: false, error: undefined })
                        appContext.clearCart()
                        setSuccess(true)
                    } catch(error: any) {
                        setSubmitInfo({ processing: false, error })
                    }
                }}>Confirmer</LoadingButton>
                {hasMessages && <Alert severity="warning">Veuillez d'abord traiter toutes les notifications sur les articles ci-dessus.</Alert>}
                {submitInfo.error && <Feedback severity="error" 
                    onClose={() => setSubmitInfo({processing: false, error: undefined})} 
                    {...parseUiError(submitInfo.error)}/>}
            </Stack>
        </Loader>}
    </Stack>
}

export default Cart
