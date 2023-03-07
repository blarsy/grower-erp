import { gql, useQuery } from "@apollo/client"
import { Typography } from "@mui/material"
import Loader from "lib/components/Loader"
import { useContext } from "react"
import { AppContext } from "./shop/AppContextProvider"

interface Props {
  slug: string
}

const CustomerOrder = ({ slug }: Props) => {
  const appContext = useContext(AppContext)
  return <Typography variant="h3">{appContext.data.customer.firstname}</Typography>
}

export default CustomerOrder