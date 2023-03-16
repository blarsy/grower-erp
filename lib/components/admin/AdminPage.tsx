import { Container } from "@mui/material"
import { Stack } from "@mui/system"
import Connected from "./Connected"
import AppContextProvider from 'lib/components/admin/AppContextProvider'
import Footer from "../Footer"
import AdminContent from "./AdminContent"
import AdminHeader from "./AdminHeader"
import { HotkeysProvider } from "react-hotkeys-hook"
import { ApolloProvider } from "@apollo/client"
import { getAuthenticatedApolloClient } from "lib/uiCommon"
import { TOKEN_KEY } from "lib/constants"

const client = getAuthenticatedApolloClient(TOKEN_KEY)
// HotkeysProvider: passing an empty array to initiallyActiveScopes does not seem to make every scopes disabled (the '*' is still used)
// thus, passing a dummy scope, so that all other are disabled by default.
const AdminPage = () => {
    return <ApolloProvider client={client}>
        <AppContextProvider>
            <HotkeysProvider initiallyActiveScopes={['none']}>
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
            </HotkeysProvider>
        </AppContextProvider>
    </ApolloProvider>
}

export default AdminPage