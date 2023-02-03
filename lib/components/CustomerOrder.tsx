import { gql, useQuery } from "@apollo/client"
import { Typography } from "@mui/material"
import Loader from "lib/components/Loader"

interface Props {
  slug: string
}

const CustomerOrder = ({ slug }: Props) => {
  const { loading, error, data } = useQuery(gql`query MyQuery($slug: String!) {
        customerBySlug(slug: $slug) {
          nodes {
            addressLine1
            addressLine2
            eshopAccess
            id
            name
            priceListId
            slug
            vatNumber
          }
        }
      }`, { variables: { slug } })
  return <Loader loading={loading} error={error}>
    <Typography variant="h3">{data && data.customerBySlug.nodes[0].name}</Typography>
  </Loader>
}

export default CustomerOrder