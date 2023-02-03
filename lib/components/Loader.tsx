import { Alert, Box, CircularProgress } from "@mui/material"
import { extractUiError } from "lib/uiCommon"
import Feedback from "./Feedback"

interface Props {
    loading: boolean
    error?: Error
    children: JSX.Element
}

const Loader = ({ loading, error, children }: Props) => {
    if(loading) return <Box display="flex" justifyContent="center"><CircularProgress /></Box>
    if(error){
        const { message, detail } = extractUiError(error)
        return <Feedback severity='error' message={message} detail={detail} onClose={() => {}}/>
    }
    return children
}

export default Loader