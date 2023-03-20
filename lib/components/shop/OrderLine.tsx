import { Stack, Typography } from "@mui/material"
import dayjs from "dayjs"
import { asPrice, config } from "lib/uiCommon"
import { CartItem } from "./AppContextProvider"

interface Props {
    article: CartItem
}

const OrderLine = ({ article }: Props) => <Stack direction="row" columnGap="0.5rem">
    <Typography sx={{ flex: '4 1' }} variant="body1">{article.productName} {article.stockName && ' - ' + article.stockName}</Typography>
    <Typography sx={{ flex: '4 1' }} variant="body1">{`${article.containerName}, ${article.quantityPerContainer} ${article.unitAbbreviation}`}</Typography>
    <Typography sx={{ flex: '1 1' }} variant="body1">{article.fulfillmentDate && dayjs(article.fulfillmentDate).format(config.dateTimeFormat)}</Typography>
    <Typography sx={{ flex: '1 1', textAlign: 'right' }} variant="body1">{article.price && `${asPrice(article.price)}`}</Typography>
    <Typography sx={{ flex: '2 1', textAlign: 'right' }} variant="body1">{article.quantityOrdered}</Typography>
    <Typography sx={{ flex: '2 1', textAlign: 'right' }} variant="body1">{article.price ? `${asPrice(article.quantityOrdered * article.price)}` : '-'}</Typography>
    <Typography sx={{ flex: '2 1', textAlign: 'right' }} variant="body1">{article.price ? `${asPrice(article.quantityOrdered * article.price / 100 * article.articleTaxRate)}` : '-'}</Typography>
    <Typography sx={{ flex: '2 1', textAlign: 'right' }} variant="body1">{article.price ? `${asPrice(article.quantityOrdered * article.price * (1 + article.articleTaxRate / 100))}` : '-'}</Typography>
</Stack>

export default OrderLine