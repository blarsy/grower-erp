import { useQuery } from "@apollo/client"
import { Stack } from "@mui/material"
import { useRouter } from "next/router"
import Loader from "../Loader"
import { availableArticles } from "../queriesLib"
import Cart from "./Cart"
import Header from "./Header"
import OrderLines from "./OrderLines"

const CustomerOrder = () => {
  const { loading, error, data } = useQuery(availableArticles)
  const router = useRouter()
  let page = ''
  if(router.query.slug && router.query.slug.length > 1) {
    page = router.query.slug[1].toLowerCase()
  }
  return <Stack>
      <Header />
      { page === 'cart' && <Cart />}
      { page === '' && <Loader loading={loading} error={error}>
        {data && <OrderLines articles={data.articlesAvailable.nodes} />}
      </Loader>}
  </Stack>

}

export default CustomerOrder