import { useContext, useEffect } from "react"
import { LoadingButton } from '@mui/lab'
import LoginIcon from '@mui/icons-material/Login'
import { ethers, providers } from "ethers"
import axios from "axios"
import { CircularProgress, Stack } from "@mui/material"
import { parseUiError } from "lib/uiCommon"
import Feedback from "../Feedback"
import { AppContext, TOKEN_KEY } from './AppContextProvider'
import { errorHandlerHolder } from './apolloErrorLink'

interface Props {
    children: JSX.Element
}

declare global {
    interface Window {
        ethereum?: providers.ExternalProvider;
    }
}

const Connected = ({ children } : Props) => {
    const appContext = useContext(AppContext)

    useEffect(() => {
        errorHandlerHolder.handle = (e) => {
            console.log('graphql error trapped', e)
        }
        const token = localStorage.getItem(TOKEN_KEY)
        if (token) {
            appContext.loginComplete(token)
        }
    }, [])

    const connect = async () => {
        appContext.beginLogin()
        if(window.ethereum) {
            try {
                const provider = new ethers.providers.Web3Provider(window.ethereum)
                await provider.send("eth_requestAccounts", [])
                const signer = provider.getSigner()
                const message = new Date().toString()
                const res = await axios.post('/api/auth', { message, signature: await signer.signMessage(message) })
                appContext.loginComplete(res.data.token)
            } catch (e: any) {
                appContext.loginFailed(e)
            }
        } else {
            appContext.loginFailed(new Error('Metamask non détecté, est-il installé ?'))
        }
    }

    if(appContext.data.authState.loading){
        return <CircularProgress/>
    } else if (appContext.data.authState.token) {
        return children
    } else {
        let message
        if(appContext.data.authState.error) {
            const errorFeedback = parseUiError(appContext.data.authState.error)
            message = errorFeedback.message
        }
        return <Stack alignItems="center" padding="0.5rem 0">
            <LoadingButton loading={appContext.data.authState.loading}
            loadingPosition="start"
            startIcon={<LoginIcon />}
            variant="contained"
            onClick={connect}>Login</LoadingButton>
            {message && <Feedback severity="error" message={message} onClose={() => {}}/>}
        </Stack>
    }
}

export default Connected