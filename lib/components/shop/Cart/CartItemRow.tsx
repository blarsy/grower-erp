import { AlertColor, Stack, List, ListItem, Alert, Button } from "@mui/material"
import dayjs from "dayjs"
import { useContext } from "react"
import { config } from "lib/uiCommon"
import { CartItem, AppContext } from "../AppContextProvider"
import { ArticleSaleInfo, CartItemMessages } from "."
import OrderLine from "../OrderLine"
import { setOrderLineQry } from "lib/components/queriesLib"
import { useMutation } from "@apollo/client"

interface CartItemProps {
    article: CartItem
    articlesSalesInfo: ArticleSaleInfo[]
    articlesMessages: {[articleId: number]:CartItemMessages[]}
}

interface OrderLineMessage {
    severity: AlertColor
    message: string
    actions: {
        name: string
        operation: (article: CartItem, articleSaleInfo: ArticleSaleInfo | undefined) => void
    }[]
}

const CartItemRow = ({ article, articlesSalesInfo, articlesMessages }: CartItemProps) => {
    const appContext = useContext(AppContext)
    const [setOrderLine] = useMutation(setOrderLineQry)
    const articleSaleInfo = articlesSalesInfo.find(art => art.articleId === article.articleId)

    const makeOrderLineMessages = (appContext: AppContext, articleInCart: CartItem, articlesMessages: {[articleId: number]: CartItemMessages[]}, articleSaleInfo?: ArticleSaleInfo): OrderLineMessage[] => {
        const removeArticleAction = {
            name: 'Enlever l\'article',
            operation: async (article: CartItem) => {
                const res = await setOrderLine({ variables: { inputArticleId: article.articleId, inputQuantity: article.quantityOrdered } })
                appContext.setNbCartArticles(res.data.setOrderLineFromShop.integer)
            },
        }
        if(articlesMessages[articleInCart.articleId] && articlesMessages[articleInCart.articleId].length > 0) {
            return articlesMessages[articleInCart.articleId].map(articleMsg => {
                switch(articleMsg) {
                    case CartItemMessages.NotSoldAnymore:
                        return {
                            severity: "error",
                            message: `Cet article n'est plus vendu, désolé.`,
                            actions: [removeArticleAction]
                        }
                    case CartItemMessages.FulfillmentDateChanged:
                        return {
                            severity: "warning",
                            message: `La date de retrait/livraison annoncée ne pourra pas être honorée: elle a changé vers le ${dayjs(articleSaleInfo!.fulfillmentDate).format(config.dateTimeFormat)} (au lieu du ${dayjs(articleInCart.fulfillmentDate).format(config.dateTimeFormat)} précedemment).`,
                            actions: [{
                                name: 'Utiliser la nouvelle date',
                                operation: async (article) => { 
                                    setOrderLine({ variables: { inputArticleId: article.articleId, inputQuantity: article.quantityOrdered } })
                                }
                            }, removeArticleAction]
                        }
                    case CartItemMessages.PriceChanged:
                        return {
                            severity: articleSaleInfo!.articleLatestPrice < articleInCart.price ? "info" : "warning",
                            message: `Le prix unitaire de cet article a changé: il est de ${articleSaleInfo!.articleLatestPrice}€ (au lieu de ${articleInCart.price}€ précedemment).`,
                            actions: [{
                                name: 'Utiliser le nouveau prix',
                                operation: (article) => { 
                                    setOrderLine({ variables: { inputArticleId: article.articleId, inputQuantity: article.quantityOrdered } })
                                }
                            }, removeArticleAction]
                        }
                    case CartItemMessages.QuantityPerContainerChanged:
                        return {
                            severity: "warning",
                            message: `La quantité par contenant de cet article a changé: il est de ${articleSaleInfo!.quantityPerContainer} (au lieu de ${articleInCart.quantityPerContainer} précedemment). Le prix passe de ${articleInCart.price}€ à ${articleSaleInfo!.articleLatestPrice}€`,
                            actions: [{
                                name: 'Utiliser le nouveau conditionnement',
                                operation: (article) => { 
                                    setOrderLine({ variables: { inputArticleId: article.articleId, inputQuantity: article.quantityOrdered } })
                                }
                            }, removeArticleAction] 
                        }
                    case CartItemMessages.InsufficientStock:
                        return {
                            severity: "warning",
                            message: `Vous avez demandé ${articleInCart.quantityOrdered} unités, mais il n'en reste que ${articleSaleInfo!.availableQuantity}`,
                            actions: [{
                                name: "Commander le maximum",
                                operation: (article) => {
                                    setOrderLine({ variables: { inputArticleId: article.articleId, inputQuantity: articleSaleInfo!.availableQuantity } })
                                }
                            }, removeArticleAction]
                        }
                    default:
                        throw new Error('Unexpected message type')
                }
            })
        } else {
            return []
        }
    }
    
    const orderLineMessages = makeOrderLineMessages(appContext, article, articlesMessages, articleSaleInfo)
    return <Stack>
        <OrderLine article={article} />
        {orderLineMessages && orderLineMessages.length > 0 && <List>
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