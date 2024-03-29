import { useQuery, useMutation, DocumentNode } from "@apollo/client"
import { FormikValues } from "formik"
import Datagrid, { Column, CustomOperation, LineData, LineOperation } from "lib/components/datagrid/Datagrid"
import Loader from "lib/components/Loader"

interface Props {
    title: string
    dataName: string
    columns: Column[]
    getQuery: DocumentNode
    filter?: Object
    updateQuery?: DocumentNode
    createQuery?: DocumentNode
    getFromQueried?: (data: any) => any
    lineOps?: LineOperation[]
    fixedMutationVariables?: Object | (() => Object)
    customOps? : CustomOperation[]
}

const updateVariablesFromValues = (values: FormikValues, columns: Column[], fixedVariables: Object | (() => Object), line: LineData): {variables: {[id: string]: any}} => {
    const variables: {[id: string]: any} = typeof fixedVariables === 'function' ? fixedVariables() : fixedVariables
    columns.forEach(col => variables[col.key] = values[col.key])
    variables.id = line.id
    return { variables}
}
const createVariablesFromValues = (values: FormikValues, columns: Column[], fixedVariables: Object | (() => Object)): {variables: {[id: string]: any}} => {
    const variables: {[id: string]: any} = typeof fixedVariables === 'function' ? fixedVariables() : {...fixedVariables}
    columns.forEach(col => {
        if(col.key !== 'id' && !variables[col.key]) {
            variables[col.key] = values[col.key]
        }
    })
    return { variables}
}
const lowCaseFirstChar = (data: string):string => data[0].toLowerCase() + data.substring(1)
const createDataChangesHelper = (columns: Column[], dataName: string, fixedVariables: object = {}, updateQuery?: DocumentNode, createQuery?: DocumentNode): 
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
                    const result = await create(createVariablesFromValues(values, columns, fixedVariables))
                    return { data: result.data?.[`create${dataName}`]?.[lowCaseFirstChar(dataName)], error: createError }
                },
                onUpdate: async (values, line) => {
                    const result = await update(updateVariablesFromValues(values, columns, fixedVariables, line))
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

const DatagridAdminView = ({title, dataName, columns, getQuery, filter, updateQuery, createQuery, getFromQueried=data => data && data[`all${dataName}s`].nodes, lineOps, fixedMutationVariables, customOps}: Props) => {
    const { loading, error, data } = useQuery(getQuery, { variables: filter })
    const dataChanges = createDataChangesHelper(columns, dataName, fixedMutationVariables, updateQuery, createQuery)

    const rows = getFromQueried(data)
    const editable = columns.some(col => col.editable)

    return <Loader loading={loading} error={error}>
        <Datagrid title={title}
            columns={columns} 
            lines={rows}
            lineOps={lineOps}
            getDeleteMutation = {editable ? (paramIndex: string) => `delete${dataName}ById(input: {id: $id${paramIndex}}){deleted${dataName}Id}` : undefined}
            {...dataChanges.datagridProps} 
            customOps={customOps}/>
    </Loader>
}

export default DatagridAdminView
