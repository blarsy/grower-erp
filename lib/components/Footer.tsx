import { Box, Container, Typography } from "@mui/material"
import { AppContext } from "lib/components/admin/AppContextProvider"
import { useContext } from "react"

const Footer = () => {
    const appContext = useContext(AppContext)
    return <Box sx={{ backgroundColor: '#90caf9', padding: '1rem 0'}}>
        <Container>
        {appContext?.data.company.name && <Typography variant="overline">{appContext?.data.company.name}</Typography>}
        </Container>
    </Box>
}

export default Footer