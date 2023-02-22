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
    firstname: string,
    lastname: string,
    email: string
  },
  auth: {
    token: string,
    error?: Error
  }
}

export const TOKEN_KEY = 'token'

export interface AppContext {
  data: AppStateData,
  changeSessionInfo: (companyName?: string, userFirstname?: string, userLastname?: string, userEmail?: string) => void
  loginComplete: (token: string) => Promise<void>
  authExpired: () => void
}
interface Props {
  children: JSX.Element
}

const GET_SESSION = gql`query LogeedIn {
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
  getCurrentUser {
    id
    firstname
    lastname
    phone
    email
    addressLine1
    addressLine2
    zipCode
    city
  }
}`

const blankAppContext = { data: { 
    company: {
      id: 0,
      name: ''
    },
    user: {
      id: 0,
      firstname: '',
      lastname: '',
      email: ''
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

    const changeSessionInfo = (companyName?: string, userFirstname?: string, userLastname?: string, userEmail?: string) => setAppState({ ...appState, ...{ 
      company: {
        id: appState.company.id,
        name: companyName || appState.company.name
      },
      user: {
        id: appState.user.id,
        firstname: userFirstname || appState.user.firstname,
        lastname: userLastname || appState.user.lastname,
        email: userEmail || appState.user.email
      },
    auth: appState.auth } })

    const loginComplete = async (token: string) => {
      localStorage.setItem(TOKEN_KEY, token)
      try {
        const result = await loadSessionInfo()
        if(result.data && result.data.allSettings.nodes && result.data.allSettings.nodes.length > 0 && result.data.allSettings.nodes[0].companyByOwnerId) {
          const companyData = result.data.allSettings.nodes[0].companyByOwnerId
          const userData = result.data.getCurrentUser
          setAppState({...appState, ...{ 
            company: { name: companyData.name, id: companyData.id },
            user: { id: userData.id, firstname: userData.firstname, 
              lastname: userData.lastname, 
              email:userData.emaail },
            auth: { error: undefined, token}
          }})
        } else {
          setAppState({...appState, ...{ 
            auth: { error: undefined, token}
          }})
        }
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