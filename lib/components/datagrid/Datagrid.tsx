import { Typography, Stack, Box, Button } from "@mui/material"
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import { FormikValues } from "formik"
import { createRef, MutableRefObject, ReactNode, useEffect, useRef, useState } from "react"
import { useHotkeysContext, useHotkeys } from "react-hotkeys-hook"
import DatagridLine from "./DatagridLine"
import ConfirmDialog from "../ConfirmDialog"
import { useApolloClient, gql, DocumentNode } from "@apollo/client"
import { parseUiError } from "lib/uiCommon"
import Feedback from "../Feedback"

export interface Column {
    key: string,
    headerText: string,
    widthPercent?: number,
    editable?: {
        validation: any
    },
    type?: "number" | "string" | "relation" | "boolean" | "datetime" | "custom"
    relation?: {
        query: DocumentNode
        getLabel?: (rec: any) => string
    },
    customDisplay?: (val: any) => string,
    valueForNew?: any
}

export type CellContent = string | number | null | boolean | Date

export interface LineData {
    [prop: string]: CellContent
}

export interface LineOperation {
    fn: (line: LineData) => void
    name: string
    makeIcon: () => ReactNode
}

export interface CustomOperation {
    name: string
    makeIcon: () => ReactNode
    fn: () => void
}

interface Props {
    title: string,
    columns: Column[],
    lines: LineData[],
    lineOps?: LineOperation[]
    onUpdate?: (values: FormikValues, line: LineData) => Promise<{error?: string, data: any}>,
    onCreate?: (values: FormikValues) => Promise<{ data: any, error?: Error}>,
    getDeleteMutation? : (paramIndex: string) => string,
    customOps?: CustomOperation[]
}

export const cellInnerPaddingLeftRight = '0.5rem'
export const NEW_LINE_KEY = -1
export const CELL_SPACING = '0.5rem'
export const getLeftButtonsFlex = (canDelete: boolean, readonly: boolean) => {
    let width = 0
    if(canDelete) width += 2
    if(!readonly) width += 2
    return `0 0 ${width}rem`
} 

const Datagrid = ({ title, columns, lines, onUpdate, onCreate, getDeleteMutation, lineOps, customOps}: Props) => {
    const client = useApolloClient()
    const { enableScope, disableScope, enabledScopes } = useHotkeysContext()
    const [displayedLines, setDisplayedLines] = useState(lines)
    const [linesMarkedForDeletion, setLinesMarkedForDeletion] = useState([] as string[])
    const [deleteOpStatus, setDeleteOpStatus] = useState({ opened: false, question: '' })
    const [feedback, setFeedback] = useState({} as {severity?: "success" | "error", message?: string, detail?: string})

    useHotkeys('ctrl+n', () => addLine(), { scopes: 'gridEdit' })
    useEffect(() => {
        if(onCreate) {
            enableScope('gridEdit')
            return function cleanup() {
                disableScope('gridEdit')
            }
        }
    }, [onCreate])
    
    const adjustColumnsWidths = (columns: Column[]): Column[] => {

        //Calculate width of columns, by splitting what remains when all columns with a percentWidth set have been taken into account
        let remainingWidthPercent = 100
        let numberOfColsWithoutSetWidth = columns.length
        columns.forEach(col => {
            if(col.widthPercent){
                remainingWidthPercent -= col.widthPercent
                numberOfColsWithoutSetWidth --
            }
        })
        
        if(remainingWidthPercent < 1) {
            throw new Error('Not enough remaining width when all columns with a percentWidth set have been taken into account')
        }
        return columns.map(col => {
            const result = { ...col }
            if(!col.widthPercent) result.widthPercent = remainingWidthPercent / numberOfColsWithoutSetWidth
            return result
        })
    }

    const addLine = () => {
        //If an empty line is already there, just do nothing
        if(displayedLines[0] && displayedLines[0][columns[0].key] === NEW_LINE_KEY) return
        const newLine = {} as LineData
        columns.forEach((col, idx) => {
            if(idx === 0) newLine[col.key]= NEW_LINE_KEY
            else if(col.relation) newLine[col.key] = null
            else newLine[col.key]= empty(col.type!)
        })
        setDisplayedLines([newLine, ...displayedLines])
    }

    const confirmDeleteLines = () => {
        if(linesMarkedForDeletion.length > 0){
            let question = `Etes-vous sûr(e) de vouloir effacer ces ${linesMarkedForDeletion.length} lignes ?`
            if(linesMarkedForDeletion.length === 1){
                question = `Etes-vous sûr(e) de vouloir effacer cette ligne ?`
            }
            setDeleteOpStatus({ opened: true, question })
        }
    }

    const deleteSelected = async () => {
        const deleteParams = linesMarkedForDeletion.map((_, idx) => `$id${idx}: Int!`)
        const deleteMutations = linesMarkedForDeletion.map((_, idx) => {
          return `m${idx}:${getDeleteMutation!(idx.toString())}`
        })
        const variables = {} as {[id: string]: string}
        linesMarkedForDeletion.forEach((lineId, idx) => variables[`id${idx}`] = lineId)
        const deleteMutation = `mutation genericDelete(${deleteParams.join(',')}){
            ${deleteMutations.join('\n')}
          }`
        try {
            const result = await client.mutate({
                mutation: gql(deleteMutation),
                variables
              })
      
              if(result.errors) {
                  setLinesMarkedForDeletion(linesMarkedForDeletion.filter(lineId => !result.errors!.find(error => typeof error.path  === 'string' && error.path === `m${lineId}`)))
                  setDisplayedLines(displayedLines.filter(line => !linesMarkedForDeletion.includes(line.id as string) || 
                      result.errors!.find(error => typeof error.path  === 'string' && error.path === `m${line.id}`)))
                  setFeedback({ severity: 'error', message: `Il y a eu une ou plusieurs erreurs pendant l'effacement : ${result.errors.join('\n')}` })
              } else {
                  setLinesMarkedForDeletion([])
                  setDisplayedLines(displayedLines.filter(line => !linesMarkedForDeletion.includes(line.id as string)))
                  setFeedback({ severity: 'success', message: 'Les données ont été effacées.'})
              }
        } catch (e: any) {
            setFeedback({severity: 'error', ...parseUiError(e)})
        } finally {
            setDeleteOpStatus({ opened:false, question: '' })
        }
    }

    const empty = (type: string) => {
        if(type === 'string') return ''
        else if(type === 'boolean') return false
        else if(type === 'relation') return null
        return 0
    }

    const createRecord = async (values: FormikValues) => {
        if(onCreate) {
            try {
                const result= await onCreate(values)
                if(result.error) {
                    setFeedback({severity:'error', ...parseUiError(result.error)})
                } else {
                    setDisplayedLines([result.data, ...displayedLines.filter(line => line.id !== NEW_LINE_KEY)])
                }
            } catch (e: any) {
                setFeedback({severity: 'error', ...parseUiError(e)})
            }
        }
    }

    const updateRecord = async (values: FormikValues, line: LineData) => {
        if(onUpdate) {
            try {
                const {error, data} = await onUpdate(values, line)
                if(error) {
                    setFeedback({severity:'error', message: error})
                } else {
                    const idx = displayedLines.findIndex(line => line[columns[0].key] === data[columns[0].key])
                    setDisplayedLines([...displayedLines.slice(0, idx), data as LineData, ...displayedLines.slice(idx+1)])
                }
            } catch (e: any) {
                setFeedback({severity: 'error', ...parseUiError(e)})
            }
        }
    }

    const dismissNewRecord = () => {
        setDisplayedLines([...displayedLines.filter(line => line.id !== NEW_LINE_KEY)])
    }

    const adjustedCols = adjustColumnsWidths(columns)
    const readonly = !columns.some(col => col.editable)

    return <Stack margin='1rem'>
        <Stack spacing={2} direction="row" alignItems="flex-end" margin="0 0 1rem 0">
            <Typography variant="h4">{title}</Typography>
            {onCreate && <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={addLine}>Nouveau</Button>}
            {getDeleteMutation && <Button variant="outlined" size="small" startIcon={<DeleteIcon />} onClick={confirmDeleteLines}>Effacer sélection</Button>}
            {customOps && customOps.map((op, idx) => (<Button key={idx} variant="outlined" size="small" startIcon={op.makeIcon()} onClick={op.fn}>{op.name}</Button>))}
        </Stack>
        { feedback.severity && <Feedback onClose={() => { setFeedback({})}} message={feedback.message!}
            detail={feedback.detail} severity={feedback.severity} /> }
        <Stack direction="row">
            <Box flex={getLeftButtonsFlex(!!getDeleteMutation, readonly)}><span/></Box>
            <Stack flex="1 0" spacing={CELL_SPACING} direction="row">{
                adjustedCols.map(col => (<Typography 
                    key={col.key}
                    flex={`0 0 ${Math.round(col.widthPercent! * 100) / 100}%`}
                    overflow='hidden'
                    variant="overline">
                    {col.headerText}
                </Typography>))
            }</Stack>
            {lineOps && <Box flex={`0 0 ${Math.max(lineOps.length * 2, 4)}rem`}>
            </Box>}
        </Stack>
        {displayedLines.length === 0 && <Typography textAlign="center" variant="h5">Pas encore de données ici</Typography>}
        {displayedLines.length > 0 && displayedLines.map(line => <DatagridLine key={line[columns[0].key] as string} 
            line={line}
            columns={adjustedCols}
            readonly={readonly}
            canDelete={!!getDeleteMutation}
            lineOps={lineOps}
            onUpdate={updateRecord}
            onCreate={createRecord}
            onDismissNewLine={dismissNewRecord}
            linesMarkedForDeletion={linesMarkedForDeletion}
            onLinesMarkedForDeletionChanged={setLinesMarkedForDeletion} />)
        }
        <ConfirmDialog onClose={async answer => {
                if(answer) {
                    setDeleteOpStatus({ opened: false, question: '' })
                    await deleteSelected()
                } else {
                    setDeleteOpStatus({ opened: false, question: '' })
                }
            }}
            opened={deleteOpStatus.opened}
            question={deleteOpStatus.question}
            title="Effacer les données"/>
    </Stack>
}

export default Datagrid