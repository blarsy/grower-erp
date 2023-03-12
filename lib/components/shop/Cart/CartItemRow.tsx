import { AlertColor, Stack, Typography, List, ListItem, Alert, Button } from "@mui/material"
import dayjs from "dayjs"
import { useContext, ReactNode } from "react"
import WarnIcon from '@mui/icons-material/WarningAmber'
import { config } from "lib/uiCommon"
import { CartItem, AppContext } from "../AppContextProvider"

interface ArticleSaleInfo {
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

interface CartItemProps {
    article: CartItem
    articlesSalesInfo: ArticleSaleInfo[]
}

interface OrderLineMessage {
    severity: AlertColor
    message: string
    actions: {
        name: string
        operation: (article: CartItem, articleSaleInfo: ArticleSaleInfo | undefined) => void
    }[]
}

const makeOrderLineMessages = (appContext: AppContext, articleInCart: CartItem, articleSaleInfo?: ArticleSaleInfo): OrderLineMessage[] => {
    const removeArticleAction = {
        name: 'Enlever l\'article',
        operation: (article: CartItem) => {
            appContext.setCartArticles(appContext.data.cart.articles.filter(art => art.articleId !== article.articleId))
        },
    }
    if(!articleSaleInfo) {
        return [{
            severity: "error",
            message: `Cet article n'est plus vendu, désolé.`,
            actions: [removeArticleAction]
        }]
    } else {
        let messages = [] as OrderLineMessage[]
        if(articleSaleInfo && articleSaleInfo.articleLatestPrice !== articleInCart.price) {
            messages.push({
                severity: articleSaleInfo.articleLatestPrice < articleInCart.price ? "info" : "warning",
                message: `Le prix unitaire de cet article a changé: il est de ${articleSaleInfo.articleLatestPrice}€ (au lieu de ${articleInCart.price}€ précedemment).`,
                actions: [{
                    name: 'Utiliser le nouveau prix',
                    operation: (article, articleSaleInfo) => { 
                        appContext.setCartArticles(appContext.data.cart.articles.map(art => {
                            if(art.articleId === article.articleId) {
                                art.price = articleSaleInfo!.articleLatestPrice
                            }
                            return art
                        })) 
                    }
                }, removeArticleAction]
            })
        }
        return messages
    }
}

const CartItemRow = ({ article, articlesSalesInfo }: CartItemProps) => {
    const appContext = useContext(AppContext)
    const articleSaleInfo = articlesSalesInfo.find(art => art.articleId === article.articleId)
    
    let orderLineComponent = undefined as ReactNode | undefined
    const orderLineMessages = makeOrderLineMessages(appContext, article, articleSaleInfo)
    if(!articleSaleInfo) {
        orderLineComponent = <Stack direction="row" columnGap="0.5rem">
            <Typography sx={{ flex: '6 1' }} variant="body1">{article.productName} {article.stockName && ' - ' + article.stockName}</Typography>
            <Typography sx={{ flex: '4 1' }} variant="body1">{`${article.containerName}, ${article.quantityPerContainer} ${article.unitAbbreviation}`}</Typography>
            <Typography sx={{ flex: '1 1' }} variant="body1">{article.fulfillmentDate && dayjs(article.fulfillmentDate).format(config.dateTimeFormat)}</Typography>
            <Typography sx={{ flex: '1 1', textAlign: 'right' }} variant="body1">{article.price && `${article.price}€`}</Typography>
            <Typography sx={{ flex: '2 1' }} alignItems="flex-end" variant="body1">{article.quantityOrdered}</Typography>
        </Stack>
    } else {
        orderLineComponent = <Stack direction="row" columnGap="0.5rem">
            <Typography sx={{ flex: '6 1' }} variant="body1">{article.productName} {article.stockName && ' - ' + article.stockName}</Typography>
            <Typography sx={{ flex: '4 1' }} variant="body1">{`${article.containerName}, ${article.quantityPerContainer} ${article.unitAbbreviation}`}</Typography>
            <Typography sx={{ flex: '1 1' }} variant="body1">{article.fulfillmentDate && dayjs(article.fulfillmentDate).format(config.dateTimeFormat)}</Typography>
            <Typography sx={{ flex: '1 1', textAlign: 'right' }} variant="body1">{article.price && `${article.price}€`}</Typography>
            <Stack direction="column" sx={{ flex: '2 1' }} alignItems="flex-end">
                <Typography variant="body1">{article.quantityOrdered <= articleSaleInfo.availableQuantity ? 
                    article.quantityOrdered : 
                    <span><WarnIcon color="warning" />{articleSaleInfo.availableQuantity}</span>
                }</Typography>
            </Stack>
        </Stack>
    }
    return <Stack>
        {orderLineComponent}
        {orderLineMessages && <List>
            {orderLineMessages.map((msg, idx) => <ListItem key={idx} sx={{ flexDirection: 'column' }}>
                <Alert severity={msg.severity} sx={{ flex: 1 }}>
                    <Stack alignItems="center" gap="0.5rem">
                        {msg.message}
                        {msg.actions && <Stack direction="row" gap="0.5rem">
                            {msg.actions.map(act => <Button key={act.name} size="small" variant="outlined" onClick={() => act.operation(article, articleSaleInfo)}>{act.name}</Button>)}
                        </Stack>}
                    </Stack>
                </Alert>
            </ListItem>)}
        </List>}
    </Stack>
}

export default CartItemRow