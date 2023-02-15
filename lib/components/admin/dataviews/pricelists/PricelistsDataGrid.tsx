
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

const PriceListDataGrid = () => {
    const router = useRouter()
    return <DatagridAdminView title="Tarifs" dataName="Pricelist" getQuery={GET} createQuery={CREATE}
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
            }},
            { key: 'vatIncluded', headerText: 'Tvac ?', type: "boolean", widthPercent: 10, editable: {
                    validation: yup.boolean()
                }
            }
        ]} />
}
   
export default PriceListDataGrid