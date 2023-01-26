import { ApolloError } from "@apollo/client"
import { AxiosError } from "axios"

export const extractUiError = (e: any): { message: string, detail: string} => {
  if (e as ApolloError) {
    const apolloError = e as ApolloError
    if(apolloError.message.includes('foreign key')) {
      return { message : `Cette opération viole l'intégrité des données. Soit la donnée que vous tentez d'effacer est liée à une autre, soit la mise à jour tentée rendrait orpheline une relation avec une autre donnée.`,
        detail: apolloError.message }
    } else if(apolloError.message.includes('duplicate key')) {
      return { message : `Cette opération viole l'intégrité des données, en tentant de créer une donnée en double. Il y a probablement déjà une enregistrement existant pour la donnée que vous tentez de créer ou modifier.`,
        detail: apolloError.message }
    } else {
      return { message: e.toString(), detail: ''}
    }
  } else if(e as AxiosError) {
      const res = (e as AxiosError).response!
      if(res){
        const resData = res.data
        if (resData) {
          const errorProp = (resData as {error: string}).error
          if(errorProp) {
            return { message: errorProp, detail: e.toString() }
          } else {
            return { message: `Erreur serveur: code ${res.status}, status: ${res.statusText}, data: ${res.data}`, detail: '' }
          }
        }
      } else {
        return { message: e.toString(), detail: (e as AxiosError).message }
      }
  }
  return { message: e.toString(), detail: ''}
}

export const isValidVatNumber = (vatNumber: string): boolean => {
    if(vatNumber.toLowerCase().startsWith('be')) {
        return /^be[0-9]{9,10}$/i.test(vatNumber)
    } else if(vatNumber.toLowerCase().startsWith('fr')) {
        return /^fr[0-9A-HJ-NP-Z][0-9A-HJ-NP-Z][0-9]{9}$/i.test(vatNumber)
    } else if(vatNumber.toLowerCase().startsWith('de')) {
        return /^de[0-9]{9}$/i.test(vatNumber)
    } else if(vatNumber.toLowerCase().startsWith('lu')) {
        return /^lu[0-9]{8}$/i.test(vatNumber)
    } else if(vatNumber.toLowerCase().startsWith('nl')) {
        return /^nl[0-9]{9}B[0-9]{2}$/i.test(vatNumber)
    }
    return false
}