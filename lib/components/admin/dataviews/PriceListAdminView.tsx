import { useRouter } from "next/router"
import PricelistsDataGrid from "./pricelists/PricelistsDataGrid"
import PricelistDetail from "./pricelists/PricelistDetail"
import Loader from "lib/components/Loader"
import { gql, useQuery } from "@apollo/client"

const GET = gql`query PriceListAdminViewAllPriceListsQuery {
  allPricelists {
    nodes {
      id
      name
      vatIncluded
    }
  }
}`

const UPDATE = gql`
  mutation UpdatePriceList($name: String, $vatIncluded: Boolean, $id: Int!) {
    updatePricelistById(
      input: {pricelistPatch: {name: $name, vatIncluded: $vatIncluded}, id: $id}
    ) {
        pricelist {
        id
        name
        vatIncluded
        } 
    }
}`

const CREATE = gql`
  mutation CreatePriceList($name: String!, $vatIncluded: Boolean!) {
    createPricelist(input: {pricelist: {name: $name, vatIncluded: $vatIncluded}}) {
      pricelist { id, name, vatIncluded }
    }
  }`

const PriceListAdminView = () => {
  const router = useRouter()
  if(router.query.view && router.query.view.length > 1){
    const { loading, error, data } = useQuery(gql`query PricelistById($id: Int!) {
      pricelistById(id: $id) {
        id
        name
        vatIncluded
      }
    }`, { variables: { id: Number(router.query.view[1]) }})

    return <Loader loading={loading} error={error}>
        { data && <PricelistDetail pricelist={data.pricelistById}/>}
      </Loader>
  } else {
    return <PricelistsDataGrid/>
  }
}
   
export default PriceListAdminView