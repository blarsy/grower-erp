import { Box, IconButton, Paper } from "@mui/material"
import Link from 'next/link'
import { Stack } from "@mui/system"
import PersonIcon from '@mui/icons-material/Person'
import Connected from "./Connected"
import { TreeItem, TreeView } from "@mui/lab"
import { useRouter } from "next/router"
import { ReactNode, useEffect, useState } from "react"
import UnitAdminView from "./UnitAdminView"
import ContainerAdminView from "./ContainerAdminView"
import ProductAdminView from './ProductAdminView'
import StockShapeAdminView from "./StockShapeAdminView"
import PriceListAdminView from "./PriceListAdminView"
import ArticleAdminView from "./ArticleAdminView"
import CustomerAdminView from "./CustomerAdminView"
import ProfileAdminView from "lib/components/admin/ProfileAdminView"
import FulfillmentMethodAdminView from "./FulfillmentMethodAdminView"
import SalesScheduleAdminView from "./SalesScheduleAdminView"

interface NodeData {
    id: string
    label: string
    path?: string
    component?: ReactNode
    children?: NodeData[]
}

const nodesMap: NodeData[] = [
    { id: '1', label: 'Paramètres', children: [
        { id: '1-1', label: 'Entreprise', path: '/admin/profile', component: <ProfileAdminView/> },
        { id: '1-2', label: 'Méthode de livraison', path: '/admin/fulfilmentmethod', component: <FulfillmentMethodAdminView /> }
    ] },
    { id: '2', label: 'Données' , children: [
        { id: '2-1', label: 'Clients', path: '/admin/customer', component: <CustomerAdminView/> },
        { id: '2-2', label: 'Articles', path: '/admin/article', component: <ArticleAdminView/> },
        { id: '2-3', label: 'Produits', path: '/admin/product', component: <ProductAdminView/> },
        { id: '2-4', label: 'Stocks', path: '/admin/stock', component: <StockShapeAdminView/> },
        { id: '2-5', label: 'Tarifs', path: '/admin/pricelist', component: <PriceListAdminView/>},
        { id: '2-6', label: 'Unités', path: '/admin/unit', component: <UnitAdminView/> },
        { id: '2-7', label: 'Contenants', path: '/admin/container', component: <ContainerAdminView/> },
    ]},
    { id: '3', label: "Ventes", children: [
        { id: '3-1', label: 'Planification', path: '/admin/salesschedule', component: <SalesScheduleAdminView/>}
    ] }
]

const getSelectedNode = (nodeData: NodeData, route: string): {node: NodeData, toExpand: string[]} | undefined => {
    if(nodeData.path === route) {
        return {node: nodeData, toExpand: []}
    }
    if(!nodeData.children) return undefined
   
    for(const childNodeData of nodeData.children){
        const result = getSelectedNode(childNodeData, route)
        if(result){
            result.toExpand.push(nodeData.id)
            return result
        }
    }
    return undefined
}

const AdminPage = () => {
    const router = useRouter()
    const [treeviewState, setTreeviewState] = useState({expanded: [] as string[], selected: null as NodeData | null})

    useEffect(() => {
        for(const nodeData of nodesMap){
            const result = getSelectedNode(nodeData, window.location.pathname)
            if(result){
                setTreeviewState({ selected: result.node, expanded: result.toExpand })
                break
            }
        }
    }, [])

    const createTreeItem = (nodeData : NodeData): JSX.Element => {
        return <TreeItem key={nodeData.id} nodeId={nodeData.id} label={nodeData.label} onClick={() => {
            if(nodeData.path){
                setTreeviewState({selected: nodeData, expanded: treeviewState.expanded})
                router.push(nodeData.path)
            } else {
                if(treeviewState.expanded.includes(nodeData.id)){
                    setTreeviewState({ selected: treeviewState.selected, expanded: treeviewState.expanded.filter(id => id !== nodeData.id)})
                } else {
                    setTreeviewState({ selected: treeviewState.selected, expanded: [...treeviewState.expanded, nodeData.id]})
                }
            }
        }}>
            {nodeData.children && nodeData.children.map(child => createTreeItem(child))}
        </TreeItem>
    }

    return <Connected>
        <Stack flex="1">
            <Stack spacing={2} justifyContent="space-between" alignItems="center" direction="row" height="4rem">
                <Box component="img" sx={{ height: '70%', width: 'auto'}} src="/logo.png"></Box>
                <Link href="/admin/profile"><IconButton><PersonIcon fontSize="large"/></IconButton></Link>
            </Stack>
            <Stack direction="row" flex="1">
                <Paper>
                    <TreeView selected={treeviewState.selected?.id} expanded={treeviewState.expanded} sx={{ width:'12rem', marginRight: '16px' }}>
                        {nodesMap.map(nodeData => createTreeItem(nodeData))}
                    </TreeView>
                </Paper>
                <Stack flex="1">
                    {treeviewState.selected && treeviewState.selected.component}
                </Stack>
            </Stack>
        </Stack>
    </Connected>
}

export default AdminPage