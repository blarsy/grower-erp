import { TreeItem, TreeView } from "@mui/lab"
import { Stack, Paper } from "@mui/material"
import { useRouter } from "next/router"
import { ReactNode, useContext, useEffect, useState } from "react"
import ArticleAdminView from "./dataviews/ArticleAdminView"
import CompanyAdminView from "./dataviews/CompanyAdminView"
import ContactAdminView from "./dataviews/ContactAdminView"
import ContainerAdminView from "./dataviews/ContainerAdminView"
import CustomerAdminView from "./dataviews/CustomerAdminView"
import FulfillmentMethodAdminView from "./dataviews/FulfillmentMethodAdminView"
import PriceListAdminView from "./dataviews/PriceListAdminView"
import ProductAdminView from "./dataviews/ProductAdminView"
import OwnerAdminView from "./dataviews/OwnerAdminView"
import SalesScheduleAdminView from "./dataviews/SalesScheduleAdminView"
import StockShapeAdminView from "./dataviews/StockShapeAdminView"
import UnitAdminView from "./dataviews/UnitAdminView"
import ProfileAdminView from "./dataviews/ProfileAdminView"
import AdministratorsAdminView from "./dataviews/AdministratorsAdminView"
import { AppContext } from "./AppContextProvider"
import CustomersCategoriesAdminView from "./dataviews/CustomersCategoriesAdminView"

interface NodeData {
    id: string
    label: string
    path?: string
    component?: ReactNode
    requiredRole?: string
    children?: NodeData[]
  }

const nodesMap: NodeData[] = [
    { id: '1', label: 'Paramètres', children: [
        { id: '1-1', label: 'Mon entreprise', path: '/admin/profile', component: <OwnerAdminView/> },
        { id: '1-2', label: 'Utilisateur', path: '/admin/user', component: <ProfileAdminView/> },
        { id: '1-3', label: 'Administrateurs', path: '/admin/administrator', component: <AdministratorsAdminView/>, requiredRole: 'administrator' },
    ] },
    { id: '2', label: 'Ressources entreprise' , children: [
        { id: '2-1', label: 'Méthodes d\'acheminement', path: '/admin/fulfilmentmethod', component: <FulfillmentMethodAdminView /> },
        { id: '2-2', label: 'Listes de prix', path: '/admin/pricelist', component: <PriceListAdminView/> },
        { id: '2-3', label: 'Catégories clients', path: '/admin/customerscategories', component: <CustomersCategoriesAdminView/> },        
        { id: '2-4', label: 'Unités', path: '/admin/unit', component: <UnitAdminView/> },
        { id: '2-5', label: 'Contenants', path: '/admin/container', component: <ContainerAdminView/> },
        { id: '2-6', label: 'Entreprises', path: '/admin/company', component: <CompanyAdminView/> },
        { id: '2-7', label: 'Personnes', path: '/admin/contact', component: <ContactAdminView/> },
        { id: '2-8', label: 'Clients', path: '/admin/customer', component: <CustomerAdminView/> },
        { id: '2-9', label: 'Produits', path: '/admin/product', component: <ProductAdminView/> },
        { id: '2-10', label: 'Stocks', path: '/admin/stock', component: <StockShapeAdminView/> },
        { id: '2-11', label: 'Articles', path: '/admin/article', component: <ArticleAdminView/> },
    ]},
    { id: '3', label: "Ventes", children: [
        { id: '3-1', label: 'Planification', path: '/admin/salesschedule', component: <SalesScheduleAdminView/>},
    ] }
]

const getSelectedNode = (nodeData: NodeData, route: string): {node: NodeData, toExpand: string[]} | undefined => {
    if(nodeData.path && route.startsWith(nodeData.path)) {
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

interface TreeData {
    nodes: NodeData[]
    state: {
        expanded: string[],
        selected?: NodeData
    }
}

const AdminContent = () => {
    const router = useRouter()
    const appContext = useContext(AppContext)
    const [tree, setTree] = useState({nodes: nodesMap, state: {expanded: [] as string[], selected: null as NodeData | null}} as TreeData)


    useEffect(() => {
        for(const nodeData of nodesMap){
            const result = getSelectedNode(nodeData, window.location.pathname)
            if(result){
                setTree({state: { selected: result.node, expanded: result.toExpand }, nodes: tree.nodes})
                break
            }
        }
    }, [router.asPath])

    const toggleNodeExpanded = (nodeId: string, treeData: TreeData): TreeData => {
        if(treeData.state.expanded.includes(nodeId)){
            treeData.state.expanded = treeData.state.expanded.filter(expandedNodeId => expandedNodeId !== nodeId)
        } else {
            treeData.state.expanded.push(nodeId)
        }
        return {...treeData}
    }
    const setSelected = (node: NodeData, treeData: TreeData): TreeData => {
        treeData.state.selected = node
        return {...treeData}
    }

    const createTreeItem = (nodeData : NodeData): JSX.Element | undefined => {
        if(nodeData.requiredRole && (!appContext.data.user.role || appContext.data.user.role !== nodeData.requiredRole)) {
            return undefined
        }
        return <TreeItem key={nodeData.id} nodeId={nodeData.id} label={nodeData.label} onClick={() => {
                if(nodeData.path) {
                    router.push(nodeData.path)
                } else {
                    setTree(toggleNodeExpanded(nodeData.id, tree))
                }
            }}>
            {nodeData.children && nodeData.children.map(child => createTreeItem(child))}
        </TreeItem>
    }
    
    return <Stack direction="row" flex="1">
        <Paper>
            {tree.nodes && <TreeView selected={tree.state.selected?.id ? [tree.state.selected?.id] : []}
                expanded={tree.state.expanded || null} 
                sx={{ width:'12rem', marginRight: '16px' }}>
                {tree.nodes.map(nodeData => createTreeItem(nodeData))}
            </TreeView>}
        </Paper>
        <Stack flex="1">
            {tree.state.selected && tree.state.selected.component}
        </Stack>
    </Stack>
}

export default AdminContent