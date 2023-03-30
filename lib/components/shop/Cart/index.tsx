import { gql, useMutation } from "@apollo/client"
import { Alert, Button, Stack, Typography } from "@mui/material"
import { useContext, useEffect, useState } from "react"
import Trash from '@mui/icons-material/Delete'
import LeftArrow from '@mui/icons-material/ArrowBack'
import ShopIcon from '@mui/icons-material/Storefront'
import { useApolloClient } from "@apollo/client"
import Loader from "../../Loader"
import { AppContext, CartItem } from "../AppContextProvider"
import CartItemRow from "./CartItemRow"
import { useRouter } from "next/router"
import { LoadingButton } from "@mui/lab"
import Feedback from "lib/components/Feedback"
import { asPrice, parseUiError } from "lib/uiCommon"
import OrderLineHeader from "../OrderLineHeader"
import { draftOrderLinesQry } from "lib/components/queriesLib"

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

const CONFIRM_ORDER = gql`mutation ConfirmOrder($fulfillmentMethodId: Int) {
  confirmOrder(
    input: { inputFulfillmentMethodId: $fulfillmentMethodId}
  ) {
    integer
  }
}`

const CLEAR_DRAFT_ORDER = gql`mutation ClearDraftOrder {
    clearMyDraftOrder(input: {clientMutationId: ""}) {
        clientMutationId
    }
}`

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
            if(Number(articleSaleInfo.quantityPerContainer) !== Number(articleInCart.quantityPerContainer)) {
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
        if(Number(articleSaleInfo.availableQuantity) < Number(articleInCart.quantityOrdered)) {
            messages.push(CartItemMessages.InsufficientStock)
        }
    }
    return messages
}

const Cart = () => {
    const appContext = useContext(AppContext)
    const client = useApolloClient()
    const [ loadStatus, setLoadStatus ] = useState({ loading: true, error: undefined as Error | undefined })
    const [ draftOrderLines, setDraftOrderLines ] = useState([] as any[])
    const [ articlesSalesInfo, setArticlesSalesInfo ] = useState([] as any[])
    const router = useRouter()
    const [articlesMessages, setArticlesMessages] = useState({} as {[articleId: number]: CartItemMessages[]})
    const [confirmOrder] = useMutation(CONFIRM_ORDER)
    const [clearDraftOrder] = useMutation(CLEAR_DRAFT_ORDER)
    const [submitInfo, setSubmitInfo] = useState({ processing: false, error: undefined as Error | undefined})
    const [success, setSuccess] = useState(false)

    const load = async() => {
        setLoadStatus({ loading: true, error: undefined })
        try {
            const res = await client.query({ query: draftOrderLinesQry})
            if(res.data && res.data.myDraftOrder) {
                setDraftOrderLines(res.data.myDraftOrder.orderLinesByOrderId.nodes)
                appContext.setNbCartArticles(res.data.myDraftOrder.orderLinesByOrderId.nodes.length)
                const resArticlesSalesInfo = await client.query({ query: ARTICLES_SALES_INFO, variables: { articleIds: res.data.myDraftOrder.orderLinesByOrderId.nodes.map((orderLine: any) => orderLine.articleId) }})
                const artSalesInfos = resArticlesSalesInfo.data.getArticlesSalesInfo.nodes
                setArticlesSalesInfo(artSalesInfos)
                const newArticleMessage: {[articleId: number]: CartItemMessages[]} = {}
                res.data.myDraftOrder.orderLinesByOrderId.nodes.forEach((art: any) => {
                    newArticleMessage[art.articleId] = createMessages(art, artSalesInfos.find((artInfo: ArticleSaleInfo) => artInfo.articleId === art.articleId))
                    setArticlesMessages(newArticleMessage)
                })
            } else {
                setDraftOrderLines([])
            }
            setLoadStatus({ loading: false, error: undefined })
        } catch (error: any) {
            setLoadStatus({ loading: false, error })
        }
    }

    useEffect(() => {
        load()
    }, [])

    const hasMessages = Object.values(articlesMessages).reduce((p, c) => p + c.length, 0) > 0

    const emptyCart = async () => {
        await clearDraftOrder()
        appContext.setNbCartArticles(0)
        await load()
    }
    
    return <Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h3" margin="1rem 0 0 0">Votre panier</Typography>
            <Stack direction="row" gap="0.5rem">
                <Button variant="outlined" startIcon={<LeftArrow/>} endIcon={<ShopIcon/>} onClick={() => router.push(`/shop/${router.query.slug![0]}`)}>Boutique</Button>
                <Button variant="outlined" endIcon={<Trash/>} disabled={draftOrderLines.length === 0} onClick={async () =>{
                    const response = await appContext.confirm('Etes-vous sûr(e) de vouloir vider votre panier ?', 'Vider') 
                    if(response){
                        await emptyCart()
                    }
                }}>Vider</Button>
            </Stack>
        </Stack>
        {draftOrderLines.length === 0 && !success && <Typography textAlign="center" variant="h5">Le panier est vide.</Typography>}
        {draftOrderLines.length === 0 && success && <Alert severity="success">Votre commande a bien été enregistrée. Merci.</Alert>}
        {draftOrderLines.length > 0 && <Loader loading={loadStatus.loading} error={loadStatus.error}>
            <Stack margin="1rem 0">
                <OrderLineHeader />
                {draftOrderLines && draftOrderLines.map(art => 
                    <CartItemRow key={art.articleId} article={art} articlesMessages={articlesMessages} articlesSalesInfo={articlesSalesInfo} />)}
                <Stack direction="row" columnGap="0.5rem">
                    <Typography sx={{ flex: '15 1', textAlign: 'right' }} variant="overline">Total TVAC</Typography>
                    <Typography sx={{ flex: '2 1', textAlign: 'right' }} variant="body1">
                        {asPrice(draftOrderLines.reduce((prev, art) => prev + (art.price * art.quantityOrdered * (1 + art.articleTaxRate / 100)), 0))}
                    </Typography>
                </Stack>
                <LoadingButton loading={submitInfo.processing} sx={{alignSelf: 'center'}} variant="contained" type="submit" disabled={hasMessages} onClick={async () => {
                    const response = await appContext.confirm('Etes-vous sûr(e) de vouloir confirmer cette commande ?', 'Commander') 
                    if(response){
                        setSubmitInfo({ processing: true, error: undefined })
                        try {
                            await confirmOrder({ variables: {
                                fulfillmentMethodId: 1
                            }})
                            await emptyCart()
                            setSubmitInfo({ processing: false, error: undefined })
                            setSuccess(true)
                        } catch(error: any) {
                            setSubmitInfo({ processing: false, error })
                        }
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
