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