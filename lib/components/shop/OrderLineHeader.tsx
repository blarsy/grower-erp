import { Stack, Typography } from "@mui/material"

const OrderLineHeader = () => <Stack direction="row" columnGap="0.5rem">
    <Typography sx={{ flex: '6 1' }} variant="overline">Produit</Typography>
    <Typography sx={{ flex: '4 1' }} variant="overline">Conditionnement</Typography>
    <Typography sx={{ flex: '1 1' }} variant="overline">Dispo le</Typography>
    <Typography sx={{ flex: '1 1', textAlign: 'right' }} variant="overline">Prix</Typography>
    <Typography sx={{ flex: '2 1', textAlign: 'right' }} variant="overline">Votre commande</Typography>
    <Typography sx={{ flex: '2 1', textAlign: 'right' }} variant="overline">Sous-total</Typography>
</Stack>

export default OrderLineHeader