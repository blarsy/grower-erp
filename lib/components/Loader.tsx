import { Alert, Box, CircularProgress } from "@mui/material"
import { extractUiError } from "lib/uiCommon"

interface Props {
    loading: boolean
    error?: Error
    children: JSX.Element
}

const Loader = ({ loading, error, children }: Props) => {
    if(loading) return <Box display="flex" justifyContent="center"><CircularProgress /></Box>
    if(error) return <Alert severity='error'>{extractUiError(error).message}</Alert>
    return children
}

export default Loader