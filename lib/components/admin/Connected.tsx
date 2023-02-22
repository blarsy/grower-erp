import { useContext, useEffect, useState } from "react"
import { parseUiError } from "lib/uiCommon"
import Feedback from "../Feedback"
import { AppContext, TOKEN_KEY } from './AppContextProvider'
import { errorHandlerHolder } from './apolloErrorLink'
import LoginForm from "./loginForm"
import Loader from "../Loader"

interface Props {
    children: JSX.Element
}

const Connected = ({ children } : Props) => {
    const appContext = useContext(AppContext)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async() => {
            errorHandlerHolder.handle = (e) => {
                console.log('graphql error trapped', e)
            }
            const token = localStorage.getItem(TOKEN_KEY)
            if (token) {
                await appContext.loginComplete(token)
            }
            setLoading(false)
        }
        load()
    }, [appContext.data.auth.token])

    let content
    if (appContext.data.auth.token) {
        content = children
    } else {
        let message, detail
        if(appContext.data.auth.error) {
            const errorFeedback = parseUiError(appContext.data.auth.error)
            message = errorFeedback.message
            detail = errorFeedback.detail
            content = <Feedback severity="error" message={message} detail={detail} onClose={() => {}}/>
        } else {
            content = <Loader loading={loading}>
                <LoginForm/>
            </Loader>
        }
    }
    return content
}

export default Connected