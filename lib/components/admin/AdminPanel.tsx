import { useRouter } from "next/router"
import { Stack, Tab, Tabs } from "@mui/material"
import React, { ReactNode } from "react"
import UnitAdminView from "./UnitAdminView"
import ContainerAdminView from "./ContainerAdminView"
import ProductAdminView from './ProductAdminView'
import StockShapeAdminView from "./StockShapeAdminView"
import PriceListAdminView from "./PriceListAdminView"
import ArticleAdminView from "./ArticleAdminView"
import CustomerAdminView from "./CustomerAdminView"

const adminViews = [{
    viewPath: 'unit',
    displayName: 'Unités',
    component: <UnitAdminView />
}, {
    viewPath: 'container',
    displayName: 'Contenants',
    component: <ContainerAdminView />
}, {
    viewPath: 'product',
    displayName: 'Produits',
    component: <ProductAdminView />
}, {
    viewPath: 'stock',
    displayName: 'Stocks',
    component: <StockShapeAdminView />
}, {
    viewPath: 'pricelist',
    displayName: 'Tarifs',
    component: <PriceListAdminView />
}, {
    viewPath: 'article',
    displayName: 'Articles',
    component: <ArticleAdminView />
}, {
    viewPath: 'customer',
    displayName: 'Clients',
    component: <CustomerAdminView />
}] as { viewPath: string, displayName: string, component: ReactNode }[]

const AdminPanel = () => {
    const router = useRouter()
    const { view } = router.query
    const switchView = (e: React.SyntheticEvent, newValue: any) => {
        router.push({
            pathname: '/admin/[view]',
            query: { view: adminViews[newValue].viewPath },
          })
    }
    let selectedView = adminViews.find(viewInfo => viewInfo.viewPath === view)
    if(!selectedView ) selectedView = adminViews[0]

   return <Stack>
        <Tabs value={adminViews.findIndex(view => view === selectedView)} onChange={switchView}>
            { adminViews.map(view => <Tab key={view.viewPath} label={view.displayName} />) }
        </Tabs>
        {selectedView.component}
    </Stack>
}

export default AdminPanel