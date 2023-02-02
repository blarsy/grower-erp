import { Box, Container, Typography } from "@mui/material"
import { AppContext } from "lib/AppContextProvider"
import { useContext } from "react"


const Footer = () => {
    const appContext = useContext(AppContext)
    return <Box sx={{ backgroundColor: '#90caf9', padding: '1rem 0'}}>
        <Container>
        {appContext?.data.companyName && <Typography variant="overline">{appContext?.data.companyName}</Typography>}
        </Container>
    </Box>
}

export default Footer