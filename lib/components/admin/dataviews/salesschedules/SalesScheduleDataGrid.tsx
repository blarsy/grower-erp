import { gql } from "@apollo/client"
import { useRouter } from "next/router"
import SettingsIcon from '@mui/icons-material/Settings'
import DatagridAdminView from "../DatagridAdminView"

const GET = gql`query SalesSchedules {
    allSalesSchedules {
      nodes {
        beginSalesDate
        deliveryPrice
        disabled
        freeDeliveryTurnover
        fulfillmentDate
        id
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
            }
          }
        }
      }
    }
  }`

const SalesScheduleDataGrid = () => {
    const router = useRouter()
    return <DatagridAdminView title="Ventes programmées" dataName="SalesSchedule" getQuery={GET}
        lineOps={[{
          name: 'Détails',
          makeIcon: () => <SettingsIcon />,
          fn: line => { router.push(`/admin/salesschedule/${line.id}`) }
        }]}
        columns={[
            { key: 'id', headerText: 'ID', widthPercent: 5, type: "number"},
            { headerText: 'Début de l\'acheminement', type: 'datetime', widthPercent: 15, key: 'fulfillmentDate' },
            { headerText: 'Actif/suspendu', type: 'boolean', widthPercent: 10, key: 'disabled' },
            { headerText: 'A partir de', type: 'datetime', widthPercent: 15, key: 'beginSalesDate' },
            { headerText: 'jusque', type: 'datetime', widthPercent: 15, key: 'orderClosureDate' },
            { headerText: 'Nom', type: 'string', widthPercent: 10, key: 'name' },
            { headerText: 'Catégories clients', type: 'custom', key: 'salesSchedulesCustomersCategoriesBySalesScheduleId', widthPercent: 15, 
              customDisplay: (val) => {
                return val.nodes.map((node: any) => node.customersCategoryByCustomersCategoryId.name).join(', ')
              } },
            { headerText: 'Méthodes d\'acheminement', type: 'custom', key: 'salesSchedulesFulfillmentMethodsBySalesScheduleId', 
            customDisplay: (val) => {
              return val.nodes.map((node: any) => node.fulfillmentMethodByFulfillmentMethodId.name).join(', ')
            } }
        ]}/>
}

export default SalesScheduleDataGrid