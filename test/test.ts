/**
 * @jest-environment node
 */

import { sendMail } from "../lib/mailing"

test('send mail', async () => {
    await sendMail('bertrand.larsy@gmail.com', 'salvador.a5bce098@nicoric.com', 'Test email', 'Test email from Grower ERP', '<strong>Test email from Grower ERP</strong>')
})
export default {}