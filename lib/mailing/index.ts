import sgMail from '@sendgrid/mail'
import { config } from '../apiCommon'
import { recordMail } from './recordMail'

export const sendMail = async (from: string, to: string, subject: string, plainText: string, htmlContent: string) => {
    const msg = {
      to,
      from,
      subject,
      text: plainText,
      html: htmlContent
    }

    if(config.production){
        sgMail.setApiKey(config.mailApiKey)
        await sgMail.send(msg)
    } else {
        recordMail(msg)
    }
}