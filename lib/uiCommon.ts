import { AxiosError } from "axios"
import { ApolloClient, from, InMemoryCache, createHttpLink,ApolloError } from "@apollo/client"
import { setContext } from "@apollo/client/link/context"
import apolloErrorLink from "./components/admin/apolloErrorLink"

export const parseUiError = (e: Error): { message: string, detail: string} => {
  console.error(e)
  if(e instanceof AxiosError) {
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
  } else if (e instanceof ApolloError) {
    const apolloError = e as ApolloError
    if(apolloError.message.includes('foreign key')) {
      return { message : `Cette opération viole l'intégrité des données. Soit la donnée que vous tentez d'effacer est liée à une autre, soit la mise à jour tentée rendrait orpheline une relation avec une autre donnée.`,
        detail: apolloError.message }
      } else if(apolloError.message.includes('duplicate key')) {
        return { message : `Cette opération viole l'intégrité des données, en tentant de créer une donnée en double. Il y a probablement déjà une enregistrement existant pour la donnée que vous tentez de créer ou modifier.`,
          detail: apolloError.message }
    } else {
      if((apolloError.networkError as any)?.result?.errors){
        return { message: 'Erreur lors de l\'exécution de la requête', detail: (e.networkError! as any).result.errors.map((error: { message: any }) => error.message).join('\n') }
      } else {
        return { message: e.toString(), detail: ''}
      }
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

export const isValidPassword = (password?: string) => !!password && password.length > 7 && !!password.match(/[A-Z]/) && !!password.match(/[^\w]/)

const dateTimeFormat = process.env.NEXT_PUBLIC_DATETIME_FORMAT!
const graphQlUrl = process.env.NEXT_PUBLIC_CLIENT_GRAPHQL_URL!

interface ClientConfig {
    dateTimeFormat: string
    graphQlUrl: string
    [prop: string]: any
}
export const config = <ClientConfig> {
    dateTimeFormat, graphQlUrl
}

export const setConfig = (data: {[prop: string]:any}): void => {
    Object.keys(data).forEach(prop => config[prop] = data[prop])
}

const currencyFormat = new Intl.NumberFormat('fr-BE', {style: 'currency' ,currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2})
export const asPrice = (num: number): string => currencyFormat.format(num)

export const getAuthenticatedApolloClient = (tokenKey: string) => {
  const httpLink = createHttpLink({
      uri: config.graphQlUrl,
    })
    
    const authLink = setContext((_, { headers }) => {
      // get the authentication token from local storage if it exists
      const token = localStorage.getItem(tokenKey);
      // return the headers to the context so httpLink can read them
      if(token) {
        return {
          headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : "",
          }
        }
      } else {
        return headers
      }
    
    })
    return new ApolloClient({
      link: from([
        apolloErrorLink,
        authLink,
        httpLink
      ]),
      cache: new InMemoryCache(),
      defaultOptions: {
        watchQuery: {
          fetchPolicy: 'cache-and-network'
        }
      }
    })
}
