
import { gql } from "@apollo/client"
import * as yup from 'yup'
import SellIcon from "@mui/icons-material/Sell"
import { useRouter } from "next/router"
import DatagridAdminView from "../DatagridAdminView"

const GET = gql`query PriceListsAdminViewAllPriceListsQuery {
  allPricelists {
    nodes {
      id
      name
    }
  }
}`

const UPDATE = gql`
  mutation UpdatePriceList($name: String, $id: Int!) {
    updatePricelistById(
      input: {pricelistPatch: { name: $name }, id: $id}
    ) {
        pricelist {
          id
          name
        } 
    }
}`

const CREATE = gql`
  mutation CreatePriceList($name: String!) {
    createPricelist(input: {pricelist: { name: $name }}) {
      pricelist { id, name }
    }
  }`

const PriceListDataGrid = () => {
    const router = useRouter()
    return <DatagridAdminView title="Listes de prix" dataName="Pricelist" getQuery={GET} createQuery={CREATE}
        updateQuery={UPDATE} 
        lineOps={[{
            name: 'Editer prix des articles',
            makeIcon: () => <SellIcon />,
            fn: line => { router.push(`/admin/pricelist/${line.id}`) }
        }]}
        columns={[
            { key: 'id', headerText: 'ID', widthPercent: 5, type: "number"},
            { key: 'name', headerText: 'Nom', type: "string",  editable: {
                validation: yup.string().required('Ce champ est requis') 
            }}
        ]} />
}
   
export default PriceListDataGrid