import { Box, CircularProgress } from "@mui/material"
import { parseUiError } from "lib/uiCommon"
import { useContext } from "react"
import { AppContext } from "./admin/AppContextProvider"
import Feedback from "./Feedback"

interface Props {
    loading: boolean
    error?: Error
    children: JSX.Element
}

const Loader = ({ loading, error, children }: Props) => {
    if(loading) return <Box display="flex" justifyContent="center" padding="0.5rem 0"><CircularProgress /></Box>
    if(error){
        const { message, detail } = parseUiError(error)
        return <Feedback severity='error' message={message} detail={detail} onClose={() => {}}/>
    }
    return children
}

export default Loader