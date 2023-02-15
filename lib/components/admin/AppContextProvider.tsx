import { useLazyQuery } from "@apollo/client"
import { parseUiError } from "lib/uiCommon"
import { createContext, useEffect, useState } from "react"
import Loader from "../Loader"
import { owner } from "../queriesLib"

interface AppStateData {
  companyName: string
  loading: boolean
  error?: Error
  authState: {
    loading: boolean,
    token: string,
    error: Error | undefined
  }
}

export const TOKEN_KEY = 'token'

export interface AppContext {
  data: AppStateData,
  changeCompanyName: (newName: string) => void
  beginLogin: () => void
  loginComplete: (token: string) => void
  loginFailed: (error: Error) =>  void
  dismissLoginError: () => void
  authExpired: () => void
}
interface Props {
  children: JSX.Element
}

const blankAppContext = { data: { 
  companyName: '', loading: true, error: undefined, 
  authState: { 
    loading: false, error: undefined, token: '' 
  } },
  changeCompanyName: (newName) => {}} as AppContext
export const AppContext = createContext<AppContext>(blankAppContext)

const AppContextProvider = ({ children }: Props) => {
    const [appState, setAppState] = useState(blankAppContext.data)
    const [loadCompany] = useLazyQuery(owner)

    const changeCompanyName = (newName: string) => setAppState({ ...appState, ...{ companyName: newName } })

    const beginLogin = () => setAppState({...appState, ...{ authState: { loading: true, error: undefined, token: ''}}})
    const loginComplete = (token: string) => {
      localStorage.setItem(TOKEN_KEY, token)
      setAppState({...appState, ...{ authState: { loading: false, error: undefined, token}}})
    }
    const loginFailed = (error: Error) => {
      setAppState({...appState, ...{ authState: { loading: false, error: new Error(`Un problème est survenu en tentant de vous connecter avec ce compte: accès refusé`), token: ''}}})
  }
    const dismissLoginError = () => setAppState({...appState, ...{ authState: { loading: false, error: undefined, token: ''}}})
    const authExpired = () => {
      localStorage.removeItem(TOKEN_KEY)
      setAppState({...appState, ...{ authState: { loading: false, error: new Error(`Votre jeton d'accès a expiré, veuillez vous reconnecter.`), token: '' }}})
    }

    const refetch = async () => {
        setAppState({...appState, ...{loading: true, error: undefined}})
        try {
          const result = await loadCompany()
          if(result.data && result.data.allSettings.nodes && result.data.allSettings.nodes.length > 0 && result.data.allSettings.nodes[0].companyByOwnerId) {
            setAppState({...appState, ...{loading: false, error: undefined, companyName: result.data.allSettings.nodes[0].companyByOwnerId.name }})
          } else {
            setAppState({...appState, ...{loading: false, error: undefined}})
          }
          
        } catch (error: any) {
          setAppState({...appState, ...{loading: false, error}})
        }
    }

    useEffect(() => {
        refetch()
    }, [])

    return <Loader loading={appState.loading} error={appState.error}>
      <AppContext.Provider value={{ data: appState, changeCompanyName, beginLogin, loginComplete, loginFailed, dismissLoginError, authExpired}}>
          {children}
      </AppContext.Provider>
    </Loader>
}

export default AppContextProvider