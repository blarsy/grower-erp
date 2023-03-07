import { Box, createTheme, GlobalStyles, ThemeProvider } from '@mui/material'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { PRODUCT_NAME } from 'lib/constants'

const theme = createTheme()

export default function MyApp({ Component, pageProps }: AppProps) {
  return <LocalizationProvider dateAdapter={AdapterDayjs}>
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh'}}>
        <GlobalStyles styles={{ body: { margin: 0, overflow: 'visible' } }} />
        <Head>
          <title>{`${PRODUCT_NAME} ERP`}</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <Component {...pageProps} />
      </Box>
    </ThemeProvider>
  </LocalizationProvider>
}
