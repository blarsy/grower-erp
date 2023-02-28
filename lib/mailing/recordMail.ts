import { randomUUID } from 'crypto'
import { writeFile, appendFile } from 'fs/promises'

interface Message {
    to: string,
    from: string,
    subject: string,
    text: string,
    html: string
  }

export const recordMail = async (msg: Message) => {
    const uuid = randomUUID()
    const promises: Promise<any>[] = []
    const logPath = './lib/mailing/logs/' 

    promises.push(writeFile(`${logPath}${uuid}.txt`, msg.text))
    promises.push(writeFile(`${logPath}${uuid}.html`, msg.html))
    promises.push(appendFile(`${logPath}mails.txt`, JSON.stringify({ date: new Date(), to: msg.to, subject: msg.subject })+ '\n')) 

    await Promise.all(promises)
}