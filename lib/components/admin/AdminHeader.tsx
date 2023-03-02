import PersonIcon from '@mui/icons-material/Person'
import { Stack, Box, IconButton, Menu, MenuItem } from "@mui/material"
import { useContext, useState } from 'react'
import { AppContext } from './AppContextProvider'


const AdminHeader = () => {
    const [anchorEl, setAnchorEl] = useState(null as Element | null)
    const appContext = useContext(AppContext)
    return <Stack spacing={2} justifyContent="space-between" alignItems="center" direction="row" height="4rem">
        <Box component="img" sx={{ height: '70%', width: 'auto'}} src="/logo.png"></Box>
        <IconButton onClick={e => {
            if(anchorEl) setAnchorEl(null)
            else setAnchorEl(e.currentTarget)
        }}><PersonIcon fontSize="large"/></IconButton>
        <Menu
            anchorEl={anchorEl}
            open={!!anchorEl}
            onClose={() => setAnchorEl(null)}>
            <MenuItem onClick={() => {
                appContext.logout()
                setAnchorEl(null)
            }}>Déconnexion</MenuItem>
        </Menu>
    </Stack>
}

export default AdminHeader