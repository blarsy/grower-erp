import { gql, useLazyQuery, useQuery } from "@apollo/client"
import { createContext, useEffect, useState } from "react"

export interface AppState {
    data: {
      isLargeViewport: boolean
      companyName: string
    },
    changeCompanyName: (newName: string) => void
}
interface Props {
    children: JSX.Element
}

const GET = gql`query AllCompanies {
    allCompanies {
      nodes {
        name
      }
    }
  }`

const blankAppState = { isLargeViewport: true, companyName: '' }
export const AppContext = createContext<AppState | null>(null)

const AppContextProvider = ({ children }: Props) => {
    const [appState, setAppState] = useState(blankAppState)
    const [loadCompany, { data: companiesData }] = useLazyQuery(GET)

    const refetch = async () => {
        const result = await loadCompany()
        if(result.data.allCompanies.nodes[0]) {
            changeCompanyName(result.data.allCompanies.nodes[0].name)
        }
    }

    const changeCompanyName = (newName: string) => setAppState({ isLargeViewport: appState.isLargeViewport, companyName: newName})

    useEffect(() => {
        refetch()
    }, [])

    return <AppContext.Provider value={{ data: appState, changeCompanyName}}>
        {children}
    </AppContext.Provider>
}

export default AppContextProvider