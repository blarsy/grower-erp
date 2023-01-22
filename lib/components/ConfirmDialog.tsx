import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material"

interface Props {
    onClose: (response: boolean) => void
    opened: boolean
    title: string
    question: string
}

const ConfirmDialog = ({ onClose, opened, title, question }: Props) => {
    return <Dialog
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
            <Button onClick={() => onClose(true)}>Oui</Button>
        </DialogActions>
    </Dialog>
}

export default ConfirmDialog