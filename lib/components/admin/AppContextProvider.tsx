import { gql, useLazyQuery } from "@apollo/client"
import { TOKEN_KEY } from "lib/constants"
import { useRouter } from "next/router"
import { createContext, useState } from "react"

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

export interface AppContext {
  data: AppStateData
  changeSessionInfo: (companyName?: string, userId?: number, contactId?: number, userFirstname?: string, userLastname?: string, userEmail?: string) => void
  loginComplete: (token: string) => Promise<void>
  authExpired: () => void
  logout: () => void
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
  authExpired: () => {},
  logout: () => {}
} as AppContext
export const AppContext = createContext<AppContext>(blankAppContext)

const AppContextProvider = ({ children }: Props) => {
    const [appState, setAppState] = useState(blankAppContext.data)
    const [loadSessionInfo] = useLazyQuery(GET_SESSION)
    const router = useRouter()

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
      return new Promise<void>(resolve => {
        loadSessionInfo({ notifyOnNetworkStatusChange: true, onCompleted: data => {
          let newAppState: any = {}
          if(data && data.allSettings.nodes && data.allSettings.nodes.length > 0 && data.allSettings.nodes[0].companyByOwnerId) {
            const companyData = data.allSettings.nodes[0].companyByOwnerId
            newAppState.company = { name: companyData.name, id: companyData.id }
          }
          const sessionData = data.getSessionData
          newAppState.user = { id: sessionData.userId, contactId: sessionData.contactId, 
            firstname: sessionData.firstname, 
            lastname: sessionData.lastname, 
            email: sessionData.email,
            role: sessionData.role 
          }
          newAppState.auth = { error: undefined, token}
  
          setAppState({...appState, ...newAppState})
          resolve()
        }, onError: error => {
          setAppState({...appState, ...{
            auth: { error, token: ''}
          }})
          resolve()
        }})
      })
    }
    const logout = () => {
      localStorage.removeItem(TOKEN_KEY)
      setAppState(blankAppContext.data)
    }

    const authExpired = () => {
      if(localStorage.getItem(TOKEN_KEY)) {
        localStorage.removeItem(TOKEN_KEY)
        router.reload()
      }
    }

    return <AppContext.Provider value={{ data: appState, changeSessionInfo, loginComplete, authExpired, logout}}>
        {children}
    </AppContext.Provider>
}

export default AppContextProvider