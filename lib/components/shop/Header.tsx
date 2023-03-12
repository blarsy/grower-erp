import { Badge, Box, Button, Stack, Typography } from "@mui/material"
import { useContext } from "react"
import CartIcon from '@mui/icons-material/ShoppingCart'
import { AppContext, Cart, IdentifiedCustomerData } from "../shop/AppContextProvider"
import { useRouter } from "next/router"

const OwnerCompanyLabel = ({ data} : {data: { id: number,name: string }}) => <Typography variant="overline">{data.name}</Typography>
const CustomerMenu = ({ data }: { data: IdentifiedCustomerData }) => <Stack>
    <Typography variant="body1">{data.firstname && data.firstname + ' '}{data.lastname}</Typography>
    {data.email && <Typography variant="body2">{data.email}</Typography>}
    {data.companyName && <Typography variant="caption">{data.companyName}</Typography>}
</Stack>
const CartMenu = ({ cart }: { cart: Cart}) => {
    const router = useRouter()
    return <Box>
        <Button variant="contained" onClick={() => router.push(router.asPath + `/cart`)}
            endIcon={<Badge showZero badgeContent={Number(cart.articles.length)} color="secondary">
                <CartIcon/>
            </Badge>}>Panier
        </Button>
    </Box>
}
const Header = () => {
    const appContext = useContext(AppContext)
    return <Box display="flex" flexDirection="row" justifyContent="space-around" alignItems="center" columnGap="1rem" sx={{ backgroundColor: '#90caf9', padding: '1rem 0' }}>
        <OwnerCompanyLabel data={appContext.data.ownerCompany}/>
        <CustomerMenu data={appContext.data.customer} />
        <CartMenu cart={appContext.data.cart} />
    </Box>
}

export default Header