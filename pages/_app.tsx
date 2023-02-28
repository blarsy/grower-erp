import { Box, createTheme, GlobalStyles, ThemeProvider } from '@mui/material'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink, from } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'

import { LocalizationProvider } from '@mui/x-date-pickers'
import { config } from 'lib/uiCommon'
import apolloErrorLink from 'lib/components/admin/apolloErrorLink'
import { PRODUCT_NAME, TOKEN_KEY } from 'lib/constants'

const theme = createTheme()
const httpLink = createHttpLink({
  uri: config.graphQlUrl,
})

const authLink = setContext((_, { headers }) => {
  // get the authentication token from local storage if it exists
  const token = localStorage.getItem(TOKEN_KEY);
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
const client = new ApolloClient({
  link: from([
    apolloErrorLink,
    authLink,
    httpLink
  ]),
  cache: new InMemoryCache()
})

export default function MyApp({ Component, pageProps }: AppProps) {
  return <ApolloProvider client={client}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <ThemeProvider theme={theme}>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh'}}>
            <GlobalStyles styles={{ body: { margin: 0, overflow: 'visible' } }} />
            <Head>
              <title>{PRODUCT_NAME} ERP</title>
              <link rel="icon" href="/favicon.ico" />
            </Head>
            <Component {...pageProps} />
          </Box>
        </ThemeProvider>
      </LocalizationProvider>
  </ApolloProvider>
}
