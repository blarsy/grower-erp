import { useRouter } from "next/router"
import PricelistsDataGrid from "./pricelists/PricelistsDataGrid"
import PricelistDetail from "./pricelists/PricelistDetail"
import { gql } from "@apollo/client"

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
    return <PricelistDetail pricelistId={Number(router.query.view[1])} />
  } else {
    return <PricelistsDataGrid/>
  }
}
   
export default PriceListAdminView