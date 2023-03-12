import { gql, useLazyQuery } from "@apollo/client"
import { CART_TOKEN, SHOP_TOKEN_KEY } from "lib/constants"
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
}

export interface Cart {
  articles: CartItem[]
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
  cart: Cart
}

export interface AppContext {
  data: AppStateData
  loginComplete: (token: string) => Promise<void>
  loginFailed: (e: Error) => void
  setCartArticles: (items: CartItem[]) => void
  clearCart: () => void
  confirm: (question: string, title: string) => Promise<boolean>
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
      articles: []
    }
  },
  loginComplete: () => { return Promise.resolve()},
  loginFailed: () => {},
  setCartArticles: (items: CartItem[]) => {},
  clearCart: () => {},
  confirm: async (question: string, title: string) => false
} as AppContext
export const AppContext = createContext<AppContext>(blankAppContext)

const AppContextProvider = ({ children }: Props) => {
    const [appState, setAppState] = useState(blankAppContext.data)
    const [loadSessionInfo] = useLazyQuery(GET_SESSION)
    const [confirmDialogData, setConfirmDialogData] = useState({ question: '', title: '', callback: (response: boolean) => {} })

    useEffect(() => {
      if(localStorage.getItem(CART_TOKEN)) {
        setAppState({ ...appState, ...{ cart: JSON.parse(localStorage.getItem(CART_TOKEN)!)} })
      }
    }, [])

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

    const clearCart = () => {
        localStorage.removeItem(CART_TOKEN)
        setAppState({ ...appState, ...{ cart: { articles: [] } } })
    }

    const setCartArticles = (items: CartItem[]) => {
      let currentCartArticles = appState.cart.articles
      items.forEach(item => {
        const itemInCart = currentCartArticles.find(art => art.articleId === item.articleId)
        if(itemInCart) {
          if(item.quantityOrdered === 0) {
            currentCartArticles = currentCartArticles.filter(art => art.articleId !== item.articleId)
          } else {
            itemInCart.quantityOrdered = item.quantityOrdered
          }
        } else {
          if(item.quantityOrdered !== 0){
            currentCartArticles.push(item)
          }
        }
      })

      const newCart = { ...appState.cart, ...{ articles: currentCartArticles } }
      localStorage.setItem(CART_TOKEN, JSON.stringify(newCart))
      setAppState({ ...appState, ...{ cart: newCart} })
    }

    const confirm = async (question: string, title: string, ) => {
      return new Promise<boolean>((resolve) => setConfirmDialogData({ question, title, callback: resolve }))
    }

    return <AppContext.Provider value={{ data: appState, loginComplete, loginFailed, setCartArticles, clearCart, confirm}}>
        {children}
        <ConfirmDialog opened={!!confirmDialogData.question} question={confirmDialogData.question}
            title={confirmDialogData.title} onClose={async response => {
              confirmDialogData.callback(response)
              setConfirmDialogData({ question: '', title: '', callback: () => {}})
            }} />
    </AppContext.Provider>
}

export default AppContextProvider