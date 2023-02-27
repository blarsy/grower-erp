import { gql, useLazyQuery } from "@apollo/client"
import { createContext, useState } from "react"
import { owner } from "../queriesLib"

interface AppStateData {
  company: {
    id: number,
    name: string
  },
  user: {
    id: number,
    contactId: number,
    firstname: string,
    lastname: string,
    email: string,
    role: string
  },
  auth: {
    token: string,
    error?: Error
  }
}

export const TOKEN_KEY = 'token'

export interface AppContext {
  data: AppStateData,
  changeSessionInfo: (companyName?: string, userId?: number, contactId?: number, userFirstname?: string, userLastname?: string, userEmail?: string) => void
  loginComplete: (token: string) => Promise<void>
  authExpired: () => void
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
  getSessionData {
    contactId
    email
    firstname
    lastname
    role
    userId
  }
}`

const blankAppContext = { data: { 
    company: {
      id: 0,
      name: ''
    },
    user: {
      id: 0,
      contactId: 0,
      firstname: '',
      lastname: '',
      email: '',
      role: ''
    },
    auth: {
      token: '',
      error: undefined
    }
  },
  changeSessionInfo: () => {},
  loginComplete: () => { return Promise.resolve()},
  authExpired: () => {}
} as AppContext
export const AppContext = createContext<AppContext>(blankAppContext)

const AppContextProvider = ({ children }: Props) => {
    const [appState, setAppState] = useState(blankAppContext.data)
    const [loadSessionInfo] = useLazyQuery(GET_SESSION)

    const changeSessionInfo = (companyName?: string, userId?: number, contactId?: number, userFirstname?: string, userLastname?: string, userEmail?: string, userRole?: string) => setAppState({ ...appState, ...{ 
      company: {
        id: appState.company.id,
        name: companyName || appState.company.name
      },
      user: {
        id: userId || appState.user.id,
        contactId: contactId || appState.user.contactId,
        firstname: userFirstname || appState.user.firstname,
        lastname: userLastname || appState.user.lastname,
        email: userEmail || appState.user.email,
        role: userRole || appState.user.role
      },
    auth: appState.auth } })

    const loginComplete = async (token: string) => {
      localStorage.setItem(TOKEN_KEY, token)
      try {
        const result = await loadSessionInfo()
        let newAppState: any = {}
        if(result.data && result.data.allSettings.nodes && result.data.allSettings.nodes.length > 0 && result.data.allSettings.nodes[0].companyByOwnerId) {
          const companyData = result.data.allSettings.nodes[0].companyByOwnerId
          newAppState.company = { name: companyData.name, id: companyData.id }
        }
        const sessionData = result.data.getSessionData
        newAppState.user = { id: sessionData.userId, contactId: sessionData.contactId, 
          firstname: sessionData.firstname, 
          lastname: sessionData.lastname, 
          email: sessionData.email,
          role: sessionData.role 
        }
        newAppState.auth = { error: undefined, token}

        setAppState({...appState, ...newAppState})
      } catch(error: any) {
        setAppState({...appState, ...{
          auth: { error, token: ''}
        }})
      }
    }
   const authExpired = () => {
      localStorage.removeItem(TOKEN_KEY)
      setAppState({...appState, ...{ authState: { error: new Error(`Votre jeton d'accès a expiré, veuillez vous reconnecter.`), token: '' }}})
    }

    return <AppContext.Provider value={{ data: appState, changeSessionInfo, loginComplete, authExpired}}>
        {children}
    </AppContext.Provider>
}

export default AppContextProvider