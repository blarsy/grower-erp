import PersonIcon from '@mui/icons-material/Person'
import { Stack, Box, IconButton, Menu, MenuItem, Typography, Button } from "@mui/material"
import { useRouter } from 'next/router'
import { useContext, useState } from 'react'
import { AppContext } from './AppContextProvider'


const AdminHeader = () => {
    const [anchorEl, setAnchorEl] = useState(null as Element | null)
    const appContext = useContext(AppContext)
    const router = useRouter()
    return <Stack spacing={2} justifyContent="space-between" alignItems="center" direction="row" height="4rem">
        <Box component="img" sx={{ height: '70%', width: 'auto'}} src="/logo.png"></Box>
        <Button variant="outlined" onClick={e => {
            if(anchorEl) setAnchorEl(null)
            else setAnchorEl(e.currentTarget)
        }}><Stack direction="row" spacing={1} alignItems="center">
                <PersonIcon fontSize="large"/>
                <Stack>
                    <Typography variant="body1">{appContext.data.user.firstname && appContext.data.user.firstname + ' '}{appContext.data.user.lastname}</Typography>
                    <Typography variant="body2">{appContext.data.user.email}</Typography>
                </Stack>
            </Stack>
        </Button>
        <Menu
            anchorEl={anchorEl}
            open={!!anchorEl}
            onClose={() => setAnchorEl(null)}>
            <MenuItem onClick={() => {
                router.push('/admin/user')
                setAnchorEl(null)
            }}>Profil</MenuItem>
            <MenuItem onClick={() => {
                appContext.logout()
                setAnchorEl(null)
            }}>Déconnexion</MenuItem>
        </Menu>
    </Stack>
}

export default AdminHeader