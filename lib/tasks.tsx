import { TaskList } from "graphile-worker"
import { sendAdminInvitation, sendPasswordRecovery } from "./mailing"

const taskList: TaskList = {
    mailPasswordRecovery: async (payload: any, helpers) => {
        const { email, code } = payload
        await sendPasswordRecovery(email, code)
    },
    mailInviteAdmin: async (payload: any, helpers) => {
        const { email, code } = payload
        await sendAdminInvitation(email, code)
    },
}

export default taskList