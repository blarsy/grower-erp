import { useEffect, useState } from "react"
import { LoadingButton } from '@mui/lab'
import LoginIcon from '@mui/icons-material/Login'
import { ethers, providers } from "ethers"
import axios from "axios"
import { Alert, Stack } from "@mui/material"
import { extractUiError } from "lib/uiCommon"

const TOKEN_KEY = 'token'

interface Props {
    children: JSX.Element
}

declare global {
    interface Window {
        ethereum?: providers.ExternalProvider;
    }
}

const Connected = ({ children } : Props) => {
    const [token, setToken] = useState('')
    const [connectionStatus, setConnectionStatus] = useState({ loading: false, error: '' })

    const connect = async () => {
        setConnectionStatus({ loading: true, error: '' })
        if(window.ethereum) {
            try {
                const provider = new ethers.providers.Web3Provider(window.ethereum)
                await provider.send("eth_requestAccounts", [])
                const signer = provider.getSigner()
                const message = new Date().toString()
                const res = await axios.post('/api/auth', { message, signature: await signer.signMessage(message) })
                localStorage.setItem(TOKEN_KEY, res.data.token)
                setToken(res.data.token)
                setConnectionStatus({ loading: false, error: '' })
            } catch (ex) {
                setConnectionStatus({ loading: false, error: `There was a failure connecting your wallet account: ${extractUiError(ex).message}` })
            }
        } else {
            setConnectionStatus({ loading: false, error: 'Could not detect Metamask, is it installed ?' })
        }
    }

    useEffect(() => {
        const load = async () => {
            const storedToken = localStorage.getItem(TOKEN_KEY)
            if(storedToken) {
                try {
                    const res = await axios.get(`/api/auth?token=${storedToken}`)
                    setToken(storedToken)
                } catch(e : any) {
                    setToken('')
                }
            } else {
                setToken('')
            }
        }
        load()
    }, [token])

    if(token) {
        return children
    } else {
        return <Stack alignItems="center" padding="0.5rem 0">
            <LoadingButton loading={connectionStatus.loading}
            loadingPosition="start"
            startIcon={<LoginIcon />}
            variant="contained"
            onClick={connect}>Login</LoadingButton>
            {connectionStatus.error && <Alert severity="error">{connectionStatus.error}</Alert>}
        </Stack>
    }
}

export default Connected