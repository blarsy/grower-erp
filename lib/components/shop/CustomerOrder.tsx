import { gql, useQuery } from "@apollo/client"
import { Stack, Typography } from "@mui/material"
import { useContext } from "react"
import Loader from "../Loader"
import { AppContext } from "./AppContextProvider"
import Header from "./Header"
import OrderLines from "./OrderLines"

interface Props {
  slug: string
}

const GET_ARTICLES = gql`query Articles {
  articlesAvailable {
    nodes {
      articleId
      containerName
      available
      productName
      price
      quantityPerContainer
      shouldIncludeVat
      stockName
      unitName
      fulfillmentDate
      orderClosureDate
    }
  }
}`

const CustomerOrder = ({ slug }: Props) => {
  const { loading, error, data } = useQuery(GET_ARTICLES)
  return <Stack>
    <Header />
    <Loader loading={loading} error={error}>
      {data && <OrderLines articles={data.articlesAvailable.nodes} />}
    </Loader>
  </Stack>

}

export default CustomerOrder