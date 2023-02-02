import { useQuery, useMutation, DocumentNode } from "@apollo/client"
import { CircularProgress, Alert } from "@mui/material"
import { FormikValues } from "formik"
import Datagrid, { Column, LineData } from "../datagrid/Datagrid"

interface Props {
    title: string
    dataName: string
    columns: Column[]
    getQuery: DocumentNode
    updateQuery?: DocumentNode
    createQuery?: DocumentNode
    getQueryPrefix?: string
}

const updateVariablesFromValues = (values: FormikValues, columns: Column[], line: LineData): {variables: {[id: string]: any}} => {
    const variables: {[id: string]: any} = {}
    columns.forEach(col => variables[col.key] = values[col.key])
    variables.id = line.id
    return { variables}
}
const createVariablesFromValues = (values: FormikValues, columns: Column[]): {variables: {[id: string]: any}} => {
    const variables: {[id: string]: any} = {}
    columns.forEach(col => {
        if(col.key !== 'id') {
            variables[col.key] = values[col.key]
        }
    })
    return { variables}
}
const lowCaseFirstChar = (data: string):string => data[0].toLowerCase() + data.substring(1)
const createDataChangesHelper = (columns: Column[], dataName: string, updateQuery?: DocumentNode, createQuery?: DocumentNode): 
    {editable: boolean, datagridProps: { 
        onCreate: ((values: FormikValues) => Promise<{
            data: any
            error?: Error
        }>),
        onUpdate: ((values: FormikValues, line: LineData) => Promise<{
            data: any
            error?: string
        }>)
    }} | {editable: boolean, datagridProps: {}} => {
    const editable = columns.find(col => !!col.editable) && updateQuery && createQuery ? true : false
    if(editable) {
        if(!updateQuery || !createQuery) throw new Error(`Some columns are editable, but either or both of the 'updateQuery' or the 'createQuery' props are not provided.`)
        const [ update, {error: updateError }] = useMutation(updateQuery)
        const [ create, {error: createError }] = useMutation(createQuery)
        return {
            editable,
            datagridProps: {
                onCreate: async values => {
                    const result = await create(createVariablesFromValues(values, columns))
                    return { data: result.data?.[`create${dataName}`]?.[lowCaseFirstChar(dataName)], error: createError }
                },
                onUpdate: async (values, line) => {
                    const result = await update(updateVariablesFromValues(values, columns, line))
                    return { error: updateError?.message || '', data: result.data?.[`update${dataName}ById`][lowCaseFirstChar(dataName)] }
                }
            }
        }
    }
    return {
        editable,
        datagridProps: {}
    }
}

const DatagridAdminvView = ({title, dataName, columns, getQuery, updateQuery, createQuery, getQueryPrefix='all'}: Props) => {
    const { loading, error, data } = useQuery(getQuery)
    const dataChanges = createDataChangesHelper(columns, dataName, updateQuery, createQuery)

    if(loading) return <CircularProgress />
    if(error) return <Alert severity='error'>{error.message}</Alert>
    
    const rows = data[`${getQueryPrefix}${dataName}s`].nodes

    return <Datagrid title={title}
        columns={columns} 
        lines={rows}
        getDeleteMutation = {(paramIndex: string) => `delete${dataName}ById(input: {id: $id${paramIndex}}){deleted${dataName}Id}`}
        {...dataChanges.datagridProps} />
}

export default DatagridAdminvView
