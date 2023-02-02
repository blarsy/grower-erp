import { Box, Container, createTheme, GlobalStyles, ThemeProvider } from '@mui/material'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client'
import AppContextProvider from 'lib/AppContextProvider'
import Footer from 'lib/components/Footer'

const theme = createTheme()
const client = new ApolloClient({
  uri: 'http://localhost:5000/graphql',
  cache: new InMemoryCache(),
})

export default function MyApp({ Component, pageProps }: AppProps) {
  return <ApolloProvider client={client}>
      <ThemeProvider theme={theme}>
        <AppContextProvider>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh'}}>
            <GlobalStyles styles={{ body: { margin: 0, overflow: 'visible' } }} />
            <Head>
              <title>Grower ERP</title>
              <link rel="icon" href="/favicon.ico" />
            </Head>
        
            <Container maxWidth="xl" sx={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
              <Component {...pageProps} />
            </Container>

            <Footer/>
          </Box>
        </AppContextProvider>
    </ThemeProvider>
  </ApolloProvider>
}
