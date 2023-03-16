import { Container, Stack } from "@mui/material"
import { useRouter } from "next/router"
import Cart from "./Cart"
import Header from "./Header"
import OrderLines from "./OrderLines"
import Orders from "./Orders"

const CustomerOrder = () => {
  const router = useRouter()
  let page = ''
  if(router.query.slug && router.query.slug.length > 1) {
    page = router.query.slug[1].toLowerCase()
  }
  return <Stack>
      <Header />
      <Container maxWidth="lg">
      { page === 'cart' && <Cart />}
      { page === 'orders' && <Orders/>}
      { page === '' && <OrderLines  /> }
      </Container>
  </Stack>

}

export default CustomerOrder