import { useRouter } from "next/router"
import { gql, useMutation, useQuery } from "@apollo/client"
import { Alert, CircularProgress } from "@mui/material"
import * as yup from 'yup'
import SellIcon from '@mui/icons-material/Sell'
import Datagrid, { Column } from "../datagrid/Datagrid"


const GET = gql`query PriceListAdminViewAllPriceListsQuery {
  allPricelists {
    edges {
      node {
        id
        name
        vatIncluded
      }
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
    const { loading, error, data } = useQuery(GET)
    const [ update, {error: updateError }] = useMutation(UPDATE)
    const [ create, {error: createError }] = useMutation(CREATE)
    if(loading) return <CircularProgress />
    if(error) return <Alert severity='error'>{error.message}</Alert>
 
    const columns: Column[] = [
        { key: 'id', headerText: 'ID', widthPercent: 5, type: "number"},
        { key: 'name', headerText: 'Nom', type: "string",  editable: {
          validation: yup.string().required('Ce champ est requis') 
        }},
        { key: 'vatIncluded', headerText: 'Tvac ?', type: "boolean", widthPercent: 10, editable: {
                validation: yup.boolean()
            }
        }]

    const rows = data.allPricelists.edges.map((edge: any) => edge.node)
    return <Datagrid title="Tarifs"
      columns={columns} 
      lines={rows}
      lineOps={[{
        name: 'Editer prix des articles',
        makeIcon: () => <SellIcon />,
        fn: line => { router.push(`/admin/pricelists/${line.id}`) }
      }]}
      onCreate={async values => {
        const result = await create({ variables: {name: values.name, vatIncluded: values.vatIncluded } })
        return { data: result.data?.createPricelist?.pricelist, error: createError }
      }}
      onUpdate={async (values, line) => {
        const result = await update({ variables: {name: values.name, vatIncluded: values.vatIncluded, id: line.id}})
        return {error: updateError?.message, data: result.data.updatePricelistById.pricelist}
      }}
      getDeleteMutation = {(paramIndex: string) => `deletePricelistById(input: {id: $id${paramIndex}}){deletedPricelistId}`} />
}
   
export default PriceListAdminView