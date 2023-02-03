import { Alert, AlertColor, Stack, Tooltip, Typography } from "@mui/material"
import InfoIcon from '@mui/icons-material/Info'

interface Props {
    message: string
    detail?: string
    severity: AlertColor
    onClose: () => void
}

const Feedback = ({ message, detail, severity, onClose }: Props) => {
    return <Alert severity={severity} onClose={onClose}>
        <Stack>
            <Stack direction="row" justifyItems="space-between">
                <Typography>{message}</Typography>
                {detail &&  <Tooltip title={detail}>
                    <InfoIcon/>
                </Tooltip>}
            </Stack>
        </Stack>
    </Alert>
}

export default Feedback