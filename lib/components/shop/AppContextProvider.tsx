import { gql, useLazyQuery } from "@apollo/client"
import { SHOP_TOKEN_KEY, SLUG_TOKEN } from "lib/constants"
import { createContext, useEffect, useState } from "react"
import ConfirmDialog from "../ConfirmDialog"

export interface IdentifiedCustomerData {
    id: number,
    contactId: number,
    firstname: string,
    lastname: string,
    email: string,
    companyId: number,
    companyName: string
}

export interface CartItem {
  articleId: number
  should_include_vat: boolean
  price: number
  quantityPerContainer: number
  quantityOrdered: number
  fulfillmentDate: Date
  orderClosureDate: Date
  stockName: string
	unitAbbreviation: string
	productName: string
	containerName: string
  articleTaxRate: number
  containerRefundPrice: number
  containerRefundTaxRate: number
}

interface AppStateData {
  ownerCompany: {
    id: number,
    name: string
  },
  customer: IdentifiedCustomerData,
  auth: {
    token: string,
    error?: Error
  },
  cart: { nbArticles: number }
}

export interface AppContext {
  data: AppStateData
  loginComplete: (token: string, slug: string) => Promise<void>
  loginFailed: (e: Error) => void
  confirm: (question: string, title: string) => Promise<boolean>
  setNbCartArticles: (number: number) => void
}

interface Props {
  children: JSX.Element
}

const GET_SESSION = gql`query LoggedIn {
  allSettings {
    nodes {
      companyByOwnerId {
        addressLine1
        addressLine2
        city
        companyNumber
        id
        name
        zipCode
      }
    }
  }
  getCustomerSessionData {
    customerId
    contactId
    email
    firstname
    lastname
    companyId
    companyName
  }
}`

const blankAppContext = { data: { 
    ownerCompany: {
      id: 0,
      name: ''
    },
    customer: {
      id: 0,
      contactId: 0,
      firstname: '',
      lastname: '',
      email: '',
      companyId: 0,
      companyName: ''
    },
    auth: {
      token: '',
      error: undefined
    },
    cart: {
      nbArticles: 0
    }
  },
  loginComplete: () => { return Promise.resolve()},
  loginFailed: () => {},
  setNbCartArticles: (number: number) => {},
  confirm: async (question: string, title: string) => false
} as AppContext
export const AppContext = createContext<AppContext>(blankAppContext)

const AppContextProvider = ({ children }: Props) => {
    const [appState, setAppState] = useState(blankAppContext.data)
    const [loadSessionInfo] = useLazyQuery(GET_SESSION)
    const [confirmDialogData, setConfirmDialogData] = useState({ question: '', title: '', callback: (response: boolean) => {} })

    const loginComplete = async (token: string, slug: string): Promise<void> => {
        localStorage.setItem(SHOP_TOKEN_KEY, token)
        localStorage.setItem(SLUG_TOKEN, slug)
        return new Promise((resolve, reject) => {
            loadSessionInfo({ notifyOnNetworkStatusChange: true, onCompleted: data => {
                let newAppState: any = {}
                if(data && data.allSettings.nodes && data.allSettings.nodes.length > 0 && data.allSettings.nodes[0].companyByOwnerId) {
                  const companyData = data.allSettings.nodes[0].companyByOwnerId
                  newAppState.ownerCompany = { name: companyData.name, id: companyData.id }
                }
                const sessionData = data.getCustomerSessionData
                newAppState.customer = { id: sessionData.id, contactId: sessionData.contactId, 
                  firstname: sessionData.firstname, 
                  lastname: sessionData.lastname, 
                  email: sessionData.email,
                  companyId: sessionData.companyId,
                  companyName: sessionData.companyName
                }
                newAppState.auth = { error: undefined, token}
        
                setAppState({...appState, ...newAppState})
                resolve()
            }, onError: error => {
                reject(error)
            } })
        })
    }
    const loginFailed = (e: Error) => {
        setAppState({ ...appState, ...{ auth: { token: '', error: e } } })
    }

    const confirm = async (question: string, title: string, ) => {
      return new Promise<boolean>((resolve) => setConfirmDialogData({ question, title, callback: resolve }))
    }

    const setNbCartArticles = async (number: number) => {
      setAppState({ ...appState, ...{ cart: { nbArticles: number } } })
    }

    return <AppContext.Provider value={{ data: appState, loginComplete, loginFailed, confirm, setNbCartArticles}}>
        {children}
        <ConfirmDialog opened={!!confirmDialogData.question} question={confirmDialogData.question}
            title={confirmDialogData.title} onClose={async response => {
              confirmDialogData.callback(response)
              setConfirmDialogData({ question: '', title: '', callback: () => {}})
            }} />
    </AppContext.Provider>
}

export default AppContextProvider