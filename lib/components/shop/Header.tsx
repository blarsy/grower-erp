import { Badge, Box, Button, Menu, MenuItem, Stack, Typography } from "@mui/material"
import { useContext, useState } from "react"
import CartIcon from '@mui/icons-material/ShoppingCart'
import Avatar from '@mui/icons-material/AccountCircle'
import { AppContext, Cart, IdentifiedCustomerData } from "../shop/AppContextProvider"
import { useRouter } from "next/router"

const OwnerCompanyLabel = ({ data} : {data: { id: number,name: string }}) => <Typography variant="overline">{data.name}</Typography>
const CustomerMenu = ({ data }: { data: IdentifiedCustomerData }) => {
    const [anchorEl, setAnchorEl] = useState(null as Element | null)
    const router = useRouter()

    return <Stack>
        <Button startIcon={<Avatar/>} variant="outlined" onClick={e => setAnchorEl(e.currentTarget)}>Compte</Button>
        <Menu
            anchorEl={anchorEl}
            open={!!anchorEl}
            onClose={() => setAnchorEl(null)}>
            <Stack margin="0 1rem">
                <Typography variant="body1">{data.firstname && data.firstname + ' '}{data.lastname}</Typography>
                {data.email && <Typography variant="body2">{data.email}</Typography>}
                {data.companyName && <Typography variant="caption">{data.companyName}</Typography>}
            </Stack>
            <MenuItem onClick={() => {
                router.push(`/shop/${router.query.slug![0]}/orders`)
                setAnchorEl(null)
            } }>Commandes</MenuItem>
        </Menu>
        
    </Stack>
}
const CartMenu = ({ cart }: { cart: Cart}) => {
    const router = useRouter()

    return <Box>
        <Button variant="contained" onClick={() => router.push(`/shop/${router.query.slug![0]}/cart`)}
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
        <Stack direction="row" gap="1rem">
            <CustomerMenu data={appContext.data.customer} />
            <CartMenu cart={appContext.data.cart} />
        </Stack>
    </Box>
}

export default Header