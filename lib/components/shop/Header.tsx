import { Box, Button, Stack, Typography } from "@mui/material"
import { useContext } from "react"
import CartIcon from '@mui/icons-material/ShoppingCart'
import { AppContext, IdentifiedCustomerData } from "../shop/AppContextProvider"

const OwnerCompanyLabel = ({ data} : {data: { id: number,name: string }}) => <Typography variant="overline">{data.name}</Typography>
const CustomerMenu = ({ data }: { data: IdentifiedCustomerData }) => <Stack>
    <Typography variant="body1">{data.firstname && data.firstname + ' '}{data.lastname}</Typography>
    {data.email && <Typography variant="body2">{data.email}</Typography>}
    {data.companyName && <Typography variant="caption">{data.companyName}</Typography>}
</Stack>
const CartMenu = () => <Box>
    <Button variant="contained" endIcon={<CartIcon/>}>Panier</Button>
</Box>
const Header = () => {
    const appContext = useContext(AppContext)
    return <Box display="flex" flexDirection="row" justifyContent="space-around" alignItems="center" columnGap="1rem" sx={{ backgroundColor: '#90caf9', padding: '1rem 0' }}>
        <OwnerCompanyLabel data={appContext.data.ownerCompany}/>
        <CustomerMenu data={appContext.data.customer} />
        <CartMenu />
    </Box>
}

export default Header