import { Backdrop, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack } from "@mui/material"
import { useState } from "react"

interface Props {
    onClose: (response: boolean) => Promise<void>
    opened: boolean
    title: string
    question: string
}

const ConfirmDialog = ({ onClose, opened, title, question }: Props) => {
    const [processing, setProcessing] = useState(false)
    return <Stack>
        <Dialog
            open={opened}
            onClose={() => onClose(false)}>
            <DialogTitle>
                {title}
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {question}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(false)} autoFocus>Non</Button>
                <Button onClick={async () => {
                    setProcessing(true)
                    await onClose(true)
                    setProcessing(false)
                }}>Oui</Button>
            </DialogActions>
        </Dialog>
        <Backdrop
            open={processing}>
            <CircularProgress sx={{ color: 'primary.light'}} />
        </Backdrop>
    </Stack>
}

export default ConfirmDialog