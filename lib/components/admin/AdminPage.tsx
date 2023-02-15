import { Box, Container, IconButton } from "@mui/material"
import Link from 'next/link'
import { Stack } from "@mui/system"
import PersonIcon from '@mui/icons-material/Person'
import Connected from "./Connected"
import AppContextProvider from 'lib/components/admin/AppContextProvider'
import Footer from "../Footer"
import AdminContent from "./AdminContent"

const AdminPage = () => {
    return <AppContextProvider>
        <Connected>
            <Stack sx={{flex: '1'}}>
                <Container maxWidth="xl" sx={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                    <Stack flex="1">
                        <Stack spacing={2} justifyContent="space-between" alignItems="center" direction="row" height="4rem">
                            <Box component="img" sx={{ height: '70%', width: 'auto'}} src="/logo.png"></Box>
                            <Link href="/admin/profile"><IconButton><PersonIcon fontSize="large"/></IconButton></Link>
                        </Stack>
                        <AdminContent />
                    </Stack>
                </Container>
                <Footer/>
            </Stack>
        </Connected>
    </AppContextProvider>
}

export default AdminPage