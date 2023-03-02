import sgMail from '@sendgrid/mail'
import { readFile } from 'fs/promises'
import Handlebars from 'handlebars'
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

export const sendNoReplyMail = async (to: string, subject: string, plainText: string, htmlContent: string) => {
    await sendMail(config.noreplyEmail, to, subject, plainText, htmlContent)
}

let partialsPreparePromise: Promise<void> | null = null
const preparePartials = async () => {
    if(!partialsPreparePromise) {
        partialsPreparePromise = new Promise(async (resolve, reject) => {
            try {
                const partial = (await readFile(`./lib/mailing/templates/headerPartial.html`)).toString()
                Handlebars.registerPartial(
                    "headerPartial", 
                    partial
                )
                resolve()
            } catch(e) {
                reject(e)
            }
        })
    }
    return partialsPreparePromise
}

export const sendAdminInvitation = async (email: string, code: string) => {
    const heading = 'Enregistrement sur Homeostasis'
    const text = 'Voici un lien pour vous enregistrer, et commencer immédiatement à gérer vos clients et produits: '
    const link = `${config.websiteUrl}admin/invite/${code}`

    await preparePartials()
    const source = await readFile(`./lib/mailing/templates/adminInvite.html`)
    const template = Handlebars.compile(source.toString())

    const data = { heading, text,
             "button": 'Enregistrement', link, header: {
                logoUrl: `${config.websiteUrl}/logo.png`
             }}
    const htmlContent = template(data)

    sendNoReplyMail(email, heading, 
        `${text}${link}`, 
        htmlContent)
}
export const sendPasswordRecovery = async (email: string, code: string) => {
    const heading = 'Récupération de mot de passe'
    const text = 'Voici un lien pour effectuer la récupération de votre mot de passe sur Homeostasis: '
    const link = `${config.websiteUrl}admin/recovery/${code}`

    await preparePartials()
    const source = await readFile(`./lib/mailing/templates/adminInvite.html`)
    const template = Handlebars.compile(source.toString())

    const data = { heading, text,
             "button": 'Enregistrement', link, header: {
                logoUrl: `${config.websiteUrl}/logo.png`
             }}
    const htmlContent = template(data)

    sendNoReplyMail(email, heading, 
        `${text}${link}`, 
        htmlContent)
}