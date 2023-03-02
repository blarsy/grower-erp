import { Container } from "@mui/material"
import { Stack } from "@mui/system"
import Connected from "./Connected"
import AppContextProvider from 'lib/components/admin/AppContextProvider'
import Footer from "../Footer"
import AdminContent from "./AdminContent"
import AdminHeader from "./AdminHeader"

const AdminPage = () => {
    return <AppContextProvider>
        <Connected>
            <Stack sx={{flex: '1'}}>
                <Container maxWidth="xl" sx={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                    <Stack flex="1">
                        <AdminHeader />
                        <AdminContent />
                    </Stack>
                </Container>
                <Footer/>
            </Stack>
        </Connected>
    </AppContextProvider>
}

export default AdminPage