import { gql, useQuery } from "@apollo/client"
import { IconButton, Stack, Typography } from "@mui/material"
import dayjs from "dayjs"
import { asPrice, config } from "lib/uiCommon"
import Loader from "../Loader"
import OrderLine from "./OrderLine"
import OrderLineHeader from "./OrderLineHeader"
import ExpandMore from '@mui/icons-material/ExpandMore'
import ExpandLess from '@mui/icons-material/ExpandLess'
import { useState } from "react"

const ORDERS = gql`query Orders($since: Datetime) {
    myOrders(since: $since) {
      nodes {
        confirmationDate
        fulfillmentMethodByFulfillmentMethodId {
            name
        }
        id
        orderLinesByOrderId {
          nodes {
            quantityOrdered
            price
            articleId
            containerId
            containerName
            fulfillmentDate
            inStock
            id
            nodeId
            productId
            productName
            quantityPerContainer
            stockShapeId
            stockShapeName
            unitAbbreviation
            unitId
            unitName
          }
        }
      }
    }
  }
  `

const Orders = () => {
    const oneWeekAgo = dayjs(new Date()).startOf('day').subtract(7, "days").toDate()
    const { loading, error, data } = useQuery(ORDERS, { variables: { since: oneWeekAgo }})
    const [expanded, setExpanded] = useState({} as {[orderId: number]: boolean})

    return <Stack gap="1rem">
        <Typography variant="h3" margin="1rem 0 0 0">Vos commandes des 7 derniers jours</Typography>
        <Loader loading={loading} error={error}>
            { data && data.myOrders.nodes.map((order: any) => <Stack key={order.id}>
                    <Stack direction="row" alignItems="center" gap="0.5rem">
                        <IconButton onClick={() => {
                            const current = expanded[order.id]
                            expanded[order.id] = !current
                            setExpanded({...expanded})
                        }}>{ expanded[order.id] ? <ExpandLess /> : <ExpandMore/>}</IconButton>
                        <Stack flex="1">
                            <Stack direction="row">
                                <Typography flex="1 1" variant="overline">Confirmée le</Typography>
                                <Typography flex="1 1" variant="overline">Acheminement</Typography>
                                <Typography flex="1 1" variant="overline">Nombre d'articles</Typography>
                                <Typography flex="1 1" variant="overline">Total</Typography>
                            </Stack>
                            <Stack direction="row">
                                <Typography flex="1 1" variant="body2">{dayjs(new Date(order.confirmationDate)).format(config.dateTimeFormat)}</Typography>
                                <Typography flex="1 1" variant="body2">{order.fulfillmentMethodByFulfillmentMethodId.name}</Typography>
                                <Typography flex="1 1" variant="body2">{order.orderLinesByOrderId.nodes.length}</Typography>
                                <Typography flex="1 1" variant="body2">{asPrice(order.orderLinesByOrderId.nodes.reduce((prev:number, line: any) => prev + line.price * line.quantityOrdered, 0))}</Typography>
                            </Stack>
                        </Stack>
                    </Stack>
                    {expanded[order.id] && <Stack margin="1rem 0 0 0">
                        <OrderLineHeader />
                        {order.orderLinesByOrderId.nodes.map((line: any) => <OrderLine key={line.articleId} article={line} /> )}
                    </Stack>}
               </Stack>
            ) }
        </Loader>
    </Stack>

}

export default Orders