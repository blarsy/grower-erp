import { Box, Container, createTheme, GlobalStyles, ThemeProvider } from '@mui/material'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';

const theme = createTheme()
const client = new ApolloClient({
  uri: 'http://localhost:5000/graphql',
  cache: new InMemoryCache(),
});

export default function MyApp({ Component, pageProps }: AppProps) {
  return <ApolloProvider client={client}>
      <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh'}}>
        <GlobalStyles styles={{ body: { margin: 0 } }} />
        <Head>
          <title>Grower ERP</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>
    
        <Container sx={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
          <Component {...pageProps} />
        </Container>

        <Box sx={{ backgroundColor: '#90caf9', padding: '1rem 0'}}>
          <Container>
            Footy
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  </ApolloProvider>
}
