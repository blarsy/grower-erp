import { gql, useLazyQuery } from "@apollo/client"
import { SHOP_TOKEN_KEY } from "lib/constants"
import { createContext, useState } from "react"

export interface IdentifiedCustomerData {
    id: number,
    contactId: number,
    firstname: string,
    lastname: string,
    email: string,
    companyId: number,
    companyName: string
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
  }
}

export interface AppContext {
  data: AppStateData
  loginComplete: (token: string) => Promise<void>
  loginFailed: (e: Error) => void
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
    }
  },
  loginComplete: () => { return Promise.resolve()},
  loginFailed: () => {}
} as AppContext
export const AppContext = createContext<AppContext>(blankAppContext)

const AppContextProvider = ({ children }: Props) => {
    const [appState, setAppState] = useState(blankAppContext.data)
    const [loadSessionInfo] = useLazyQuery(GET_SESSION)

    const loginComplete = async (token: string): Promise<void> => {
        localStorage.setItem(SHOP_TOKEN_KEY, token)
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

    return <AppContext.Provider value={{ data: appState, loginComplete, loginFailed}}>
        {children}
    </AppContext.Provider>
}

export default AppContextProvider