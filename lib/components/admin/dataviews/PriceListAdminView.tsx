import { useRouter } from "next/router"
import PricelistsDataGrid from "./pricelists/PricelistsDataGrid"
import PricelistDetail from "./pricelists/PricelistDetail"

const PriceListAdminView = () => {
  const router = useRouter()
  if(router.query.view && router.query.view.length > 1){
    return <PricelistDetail pricelistId={Number(router.query.view[1])} />
  } else {
    return <PricelistsDataGrid/>
  }
}
   
export default PriceListAdminView