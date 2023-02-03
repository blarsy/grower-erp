import { useEffect, useState } from "react"
import { LoadingButton } from '@mui/lab'
import LoginIcon from '@mui/icons-material/Login'
import { ethers, providers } from "ethers"
import axios from "axios"
import { Alert, CircularProgress, Stack } from "@mui/material"
import { extractUiError } from "lib/uiCommon"
import Feedback from "../Feedback"

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
    const [authState, setAuthState] = useState({ loading: true, message: '', token: '', detail: ''} as { loading: boolean, message: string, token: string, detail?: string })
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
                setAuthState({ loading: false, message: '', token: res.data.token })
                setConnectionStatus({ loading: false, error: '' })
            } catch (ex) {
                let reason = extractUiError(ex).message
                if(reason === 'Unauthorized') reason = 'Accès refusé'
                setConnectionStatus({ loading: false, error: `Un problème est survenu en tentant de vous connecter avec ce compte: ${reason}` })
            }
        } else {
            setConnectionStatus({ loading: false, error: 'Metamask non détecté, est-il installé ?' })
        }
    }

    useEffect(() => {
        const load = async () => {
            const storedToken = localStorage.getItem(TOKEN_KEY)
            if(storedToken) {
                try {
                    const res = await axios.get(`/api/auth?token=${storedToken}`)
                    setAuthState({ loading: false, message: '', token: storedToken, detail: '' })
                } catch(e : any) {
                    setAuthState({ loading: false, token: '', ...extractUiError(e)})
                }
            } else {
                setAuthState({ loading: false, token: '', message: ''})
            }
        }
        load()
    }, [])

    if(authState.loading){
        return <CircularProgress/>
    } else if (authState.token) {
        return children
    } else if(authState.message) {
        return <Feedback message={authState.message} severity="error" detail={authState.detail} onClose={() => setAuthState({ loading: false, token:'', message: '' })} />
    } else {
        return <Stack alignItems="center" padding="0.5rem 0">
            <LoadingButton loading={connectionStatus.loading}
            loadingPosition="start"
            startIcon={<LoginIcon />}
            variant="contained"
            onClick={connect}>Login</LoadingButton>
            {connectionStatus.error && <Feedback severity="error" message={connectionStatus.error} onClose={() => {}}/>}
        </Stack>
    }
}

export default Connected