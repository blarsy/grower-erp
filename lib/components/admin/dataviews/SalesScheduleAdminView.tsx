import { Alert, Button, IconButton, Stack } from "@mui/material"
import NewIcon from '@mui/icons-material/Create'
import { useRouter } from "next/router"
import BackIcon from '@mui/icons-material/ArrowBack'
import SalesScheduleDataGrid from "./salesschedules/SalesScheduleDataGrid"
import SalesScheduleForm from "./salesschedules/SalesScheduleForm"
import dayjs from "dayjs"
import { gql, useLazyQuery, useMutation, useQuery } from "@apollo/client"
import Loader from "lib/components/Loader"
import { useEffect, useState } from "react"

const CREATE = gql`mutation newSalesSchedule($beginSalesDate: Datetime, $deliveryPrice: Float, $disabled: Boolean, $freeDeliveryTurnover: Float, $fulfillmentDate: Datetime, $fulfillmentMethods: [Int], $name: String, $orderClosureDate: Datetime, $customersCategories: [Int]) {
    createSalesScheduleWithDeps(
      input: {beginSalesDate: $beginSalesDate, deliveryPrice: $deliveryPrice, disabled: $disabled, freeDeliveryTurnover: $freeDeliveryTurnover, fulfillmentDate: $fulfillmentDate, fulfillmentMethods: $fulfillmentMethods, name: $name, orderClosureDate: $orderClosureDate, customersCategories: $customersCategories}
    ) {
      salesSchedule {
        beginSalesDate
        deliveryPrice
        disabled
        freeDeliveryTurnover
        fulfillmentDate
        id
        name
        nodeId
        orderClosureDate
      }
    }
  }`

const UPDATE = gql`mutation updateSalesSchedule($id: Int, $beginSalesDate: Datetime, $deliveryPrice: Float, $disabled: Boolean, $freeDeliveryTurnover: Float, $fulfillmentDate: Datetime, $fulfillmentMethods: [Int], $name: String, $orderClosureDate: Datetime, $customersCategories: [Int]) {
    updateSalesScheduleWithDeps(
      input: {ssid: $id, pbeginSalesDate: $beginSalesDate, pdeliveryPrice: $deliveryPrice, pdisabled: $disabled, pfreeDeliveryTurnover: $freeDeliveryTurnover, pfulfillmentDate: $fulfillmentDate, pfulfillmentMethods: $fulfillmentMethods, pname: $name, porderClosureDate: $orderClosureDate, customersCategories: $customersCategories}
    ) {
      salesSchedule {
        beginSalesDate
        deliveryPrice
        disabled
        freeDeliveryTurnover
        fulfillmentDate
        id
        name
        nodeId
        orderClosureDate
      }
    }
  }`
const GET = gql`query salesSchedule($id: Int!) {
  salesScheduleById(id: $id) {
    id
    beginSalesDate
    deliveryPrice
    disabled
    freeDeliveryTurnover
    fulfillmentDate
    name
    orderClosureDate
    salesSchedulesCustomersCategoriesBySalesScheduleId {
      nodes {
        customersCategoryByCustomersCategoryId {
          name
          id
        }
      }
    }
    salesSchedulesFulfillmentMethodsBySalesScheduleId {
      nodes {
        fulfillmentMethodByFulfillmentMethodId {
          name
          id
          needsCustomerAddress
        }
      }
    }
  }
}`

const SalesScheduleAdminView = () => {
    const router = useRouter()
    const [ create ] = useMutation(CREATE)
    const [ update ] = useMutation(UPDATE)
    const [salesScheduleById,{ loading }] = useLazyQuery(GET)
    const [salesScheduleDataInfo, setSalesScheduleDataInfo] = useState({data: null as any, error: undefined as Error | undefined})

    useEffect(() => {
        const load = async () => {
            if(router.query.view && router.query.view.length > 1 && !isNaN(Number(router.query.view[1]))) {
                setSalesScheduleDataInfo({ data: null, error: undefined})
                try {
                    const res = await salesScheduleById({variables: {id: Number(router.query.view[1])}})
                    setSalesScheduleDataInfo({data: res.data, error: undefined})
                } catch(e: any){
                    setSalesScheduleDataInfo({data: null, error: e})
                }
            }
        }
        load()

    }, [router.query.view])

    if(router.query.view && router.query.view.length > 1){
        if(router.query.view[1] === 'create') {
            const now = new Date()
            const todayMidday = dayjs(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0))
            return <Stack>
                <Stack direction="row" padding="0 1rem">
                    <IconButton onClick={() => router.push('/admin/salesschedule')}><BackIcon /></IconButton>
                </Stack>
                <SalesScheduleForm initial={{ name: '', 
                    fulfillmentDate: todayMidday.add(7, 'days').toDate(), beginSalesDate: null, 
                    orderClosureDate: todayMidday.add(5, 'days').toDate(), disabled: false, deliveryPrice: 0,
                    freeDeliveryTurnover: 0, 
                    fulfillmentMethods: [], customersCategories: []
                }} submit={values => {
                    return create({ variables: { ...values, ...{ 
                        fulfillmentMethods: values.fulfillmentMethods.map(fm => fm.id),
                        customersCategories: values.customersCategories.map(cc => cc.id)
                    } }})
                }}/>
            </Stack>
        } else {
            if(!isNaN(Number(router.query.view[1]))){
                return <Stack>
                    <Stack direction="row" padding="0 1rem">
                        <IconButton onClick={() => router.push('/admin/salesschedule')}><BackIcon /></IconButton>
                    </Stack>
                    <Loader loading={loading} error={salesScheduleDataInfo.error}>
                        { salesScheduleDataInfo.data && <SalesScheduleForm initial={{ ...salesScheduleDataInfo.data.salesScheduleById, ...{
                            fulfillmentMethods: salesScheduleDataInfo.data.salesScheduleById.salesSchedulesFulfillmentMethodsBySalesScheduleId.nodes.map((node: any) => node.fulfillmentMethodByFulfillmentMethodId), 
                            customersCategories: salesScheduleDataInfo.data.salesScheduleById.salesSchedulesCustomersCategoriesBySalesScheduleId.nodes.map((node: any) => node.customersCategoryByCustomersCategoryId)
                        } }} submit={values => {
                            return update({ variables: { ...values, ...{ 
                                fulfillmentMethods: values.fulfillmentMethods.map(fm => fm.id),
                                customersCategories: values.customersCategories.map(cc => cc.id)
                            } }})
                        }}/>}
                    </Loader>
                </Stack>
            } else {
                <Alert severity="error">Aucune vente n'existe avec cet identifiant.</Alert>
            }
        }
    }
    return <Stack>
        <Stack direction="row" padding="0 1rem">
            <Button startIcon={<NewIcon/>} onClick={() => router.push('/admin/salesschedule/create')}>Créer</Button>
        </Stack>
        <SalesScheduleDataGrid />
    </Stack>
    
}

export default SalesScheduleAdminView