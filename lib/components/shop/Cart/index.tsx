import { gql, useQuery } from "@apollo/client"
import { Button, Container, Stack, Typography } from "@mui/material"
import { useContext } from "react"
import Trash from '@mui/icons-material/Delete'
import LeftArrow from '@mui/icons-material/ArrowBack'
import ShopIcon from '@mui/icons-material/Storefront'
import Loader from "../../Loader"
import { AppContext } from "../AppContextProvider"
import CartItemRow from "./CartItemRow"
import { useRouter } from "next/router"

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

const Cart = () => {
    const appContext = useContext(AppContext)
    const router = useRouter()
    const { loading, error, data} = useQuery(ARTICLES_SALES_INFO, { variables: {
        articleIds: appContext.data.cart.articles.map(art => art.articleId)
    }})
    
    return <Container maxWidth="lg">
        <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h3" margin="1rem 0">Votre panier</Typography>
            <Stack direction="row" gap="0.5rem">
                <Button variant="outlined" startIcon={<LeftArrow/>} endIcon={<ShopIcon/>} onClick={() => router.back()}>Boutique</Button>
                <Button variant="outlined" endIcon={<Trash/>} onClick={async () =>{
                    const response = await appContext.confirm('Etes-vous sûr(e) de vouloir vider votre panier ?', 'Vider') 
                    if(response){
                        appContext.clearCart()
                    }
                }}>Vider</Button>
            </Stack>
        </Stack>
        <Loader loading={loading} error={error}>
            <Stack>
                <Stack direction="row" columnGap="0.5rem">
                    <Typography sx={{ flex: '6 1' }} variant="overline">Produit</Typography>
                    <Typography sx={{ flex: '4 1' }} variant="overline">Conditionnement</Typography>
                    <Typography sx={{ flex: '1 1' }} variant="overline">Dispo le</Typography>
                    <Typography sx={{ flex: '1 1', textAlign: 'right' }} variant="overline">Prix</Typography>
                    <Typography sx={{ flex: '2 1' }} variant="overline">Votre commande</Typography>
                </Stack>
                {data && appContext.data.cart.articles.map(art => 
                    <CartItemRow key={art.articleId} article={art} articlesSalesInfo={data.getArticlesSalesInfo.nodes} />)}
            </Stack>
        </Loader>
    </Container>
}

export default Cart