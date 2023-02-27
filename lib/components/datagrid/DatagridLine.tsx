import { Box, CircularProgress, IconButton, Stack, TextField, Typography, Checkbox, FormControlLabel, Tooltip } from "@mui/material"
import { Form, Formik, FormikErrors, FormikTouched, FormikValues } from "formik"
import DeleteIcon from '@mui/icons-material/Close'
import CheckIcon from '@mui/icons-material/Check'
import SaveIcon from '@mui/icons-material/SaveAlt'
import { ChangeEvent, HTMLInputTypeAttribute, useState } from "react"
import * as yup from 'yup'
import { CellContent, cellInnerPaddingLeftRight, CELL_SPACING, Column, getLeftButtonsFlex, LineData, LineOperation, NEW_LINE_KEY } from "./Datagrid"
import RelationSelect from "./RelationSelect"
import dayjs from "dayjs"
import { config } from "lib/uiCommon"

const SAVENOW_TIP = <div><p>Sauver maintenant</p><p>Notez que le simple fait de sortir le curseur de la ligne en cours d'édition la sauve automatiquement</p></div>

interface Props {
    line: LineData,
    columns: Column[],
    onUpdate?: (values: FormikValues, line: LineData) => Promise<void>
    onCreate?: (values: FormikValues) => Promise<void>
    readonly: boolean
    canDelete: boolean
    onDismissNewLine: () => void
    linesMarkedForDeletion: string[]
    onLinesMarkedForDeletionChanged: (linesMarkedForDeletion: string[]) => void
    lineOps?: LineOperation[]
}

interface FormValues {
    [key: string]: CellContent
}

const SaveButton = ({ submitForm }: { submitForm:  () => Promise<void>}) => <Tooltip title={SAVENOW_TIP}>
    <IconButton sx={{ padding: 0 }} onClick={submitForm}><SaveIcon /></IconButton>
</Tooltip>

const DatagridLine = ({ line, columns, canDelete, readonly, onUpdate, onCreate, onDismissNewLine, linesMarkedForDeletion, onLinesMarkedForDeletionChanged, lineOps }: Props) => {
    const createFormValues = (cols: Column[], line: LineData): {[id: string]: any} => {
        const result = {} as FormValues
        cols.forEach(col => {
            if(col.editable){
                if(col.type === 'string' && line[col.key] === null) {
                    result[col.key] = ''
                } else {
                    result[col.key] = line[col.key]
                }
            }
        })

        return result
    }

    const makeCellContent = (col: Column, 
        keyOfIdCol: string,
        isLastCol: boolean,
        line: LineData, 
        values: FormikValues, 
        handleChange: (e: ChangeEvent<any>) => void,
        setFieldValue: (field: string, value: any, shouldValidate?: boolean | undefined) => void,
        touched: FormikTouched<FormikValues>,
        errors: FormikErrors<FormikValues>,
        working: boolean): JSX.Element => {

        let flex = '1'
        if(!isLastCol) flex = `0 0 ${Math.round(col.widthPercent! * 100) / 100}%`
        const colSx = { flex, overflow: 'hidden'}

        if(!col.editable || col.key === keyOfIdCol){
            if(col.key === keyOfIdCol) {
                if(working) {
                    return <Box key={col.key} sx={colSx}>
                        <CircularProgress size="1rem" />
                    </Box>
                }
                return <Box key={col.key}
                        sx={colSx}>
                        <Typography variant="body1">
                            {(line[col.key] as number) !== NEW_LINE_KEY && line[col.key]?.toString()}
                        </Typography>
                </Box>
            } else if(col.type === "boolean") {
                return <Checkbox key={col.key} sx={colSx} disabled value={line[col.key]} />
            } else if(col.type === "datetime") {
                return <Typography key={col.key} variant="body2" sx={colSx}>{ line[col.key] ? dayjs(line[col.key] as Date).format(config.dateTimeFormat):'' }</Typography>
            } else if(col.valueForNew && line[keyOfIdCol] === NEW_LINE_KEY) {
                return <Typography
                    key={col.key}
                    sx={{ fontStyle: "italic", ...colSx }}
                    variant="body2">
                    {col.valueForNew}
                </Typography>
            } else if (col.type === "custom"){
                if(!col.customDisplay) throw new Error(`Column ${col.key} is of type 'custom', but no 'customDisplay' property value was provided.`)
                return <Typography key={col.key} sx={colSx} variant="body2">{col.customDisplay(line[col.key])}</Typography>
            } else {
                return <Typography
                    key={col.key}
                    sx={colSx}
                    variant="body2">
                    {(line[col.key] as string)}
                </Typography>
            }
        } else {
            if(!onUpdate) throw new Error(`Column '${col.key}' is marked as editable, but not 'onUpdate' function have been provided`)
            const makeTextField = (type?: HTMLInputTypeAttribute) =>(
                <TextField 
                    id={col.key}
                    name={col.key}
                    size="small"
                    key={col.key}
                    disabled={working}
                    sx={{
                        '& .MuiInputBase-input' : {
                            padding: `0 ${cellInnerPaddingLeftRight}`
                        },
                        ...colSx }}
                    type={type}
                    value={values[col.key]}
                    onChange={handleChange}
                    error={touched[col.key] && !!errors[col.key]}
                    helperText={touched[col.key] && errors[col.key] as string}/>
            )
            if(col.relation) {
                return <RelationSelect size="small" 
                    name={col.key}
                    sx={colSx}
                    selectSx={{
                        '& .MuiAutocomplete-hasPopupIcon.MuiAutocomplete-hasClearIcon': {
                            '.MuiAutocomplete-inputRoot.MuiOutlinedInput-root': {
                                paddingRight: '40px'
                            } 
                        },
                        '& .MuiOutlinedInput-root.MuiInputBase-sizeSmall' : {
                            padding: `0 ${cellInnerPaddingLeftRight}`
                        },
                        '& .MuiOutlinedInput-root.MuiInputBase-sizeSmall .MuiAutocomplete-input' : {
                            padding: `0`
                        },
                        '& .MuiOutlinedInput-root .MuiAutocomplete-endAdornment': {
                            right: '0',
                            '.MuiAutocomplete-clearIndicator': {
                                padding: 0
                            }
                        }
                    }}
                    query={col.relation.query} 
                    getLabel={col.relation.getLabel}
                    key={col.key} 
                    value={values[col.key]}
                    onChange={value => {
                        setFieldValue(col.key, value ? value.id : null, true)
                    }}
                    error={Boolean(touched[col.key] && errors[col.key])}
                    helperText={touched[col.key] && errors[col.key] as string}
                    />
            } else if(col.type === 'string') {
                return makeTextField()
            } else if(col.type === 'boolean') {
                return <FormControlLabel
                    control={<Checkbox checked={values[col.key]} size="small" sx={{ padding: 0 }}/>}
                    id={col.key}
                    label=""
                    name={col.key}
                    key={col.key}
                    disabled={working}
                    sx={{
                        padding: 0,
                        justifyContent: 'center',
                        ...colSx
                    }}
                    onChange={handleChange} />
                
            } else {
                return makeTextField("number")
            }
        }
    }

    const [working, setWorking] = useState(false)

    const validationSchema:{[prop: string]: any} = {}
    columns.filter(col => col.editable && col.editable.validation).forEach(col => validationSchema[col.key] = col.editable?.validation)

    const initialValues = createFormValues(columns, line)

    return <Formik initialValues={initialValues} 
            validationSchema={validationSchema && yup.object(validationSchema)}
            onSubmit={async (values: FormikValues, helpers): Promise<any> => {
                if(JSON.stringify(initialValues) != JSON.stringify(values)) {
                    setWorking(true)
                    try {
                        if(line[columns[0].key] === NEW_LINE_KEY){
                            await onCreate!(values)
                        } else {
                            await onUpdate!(values, line)
                        }
                        helpers.resetForm({ values })
                    } finally {
                        setWorking(false)
                    }
                }
            } }>
        {({ values, handleChange, touched, errors, submitForm, setFieldValue, dirty }) => {
            const submitChanges = () => {
                if(dirty) {
                    submitForm()
                }
            }
            const chkId = `sel-${line[columns[0].key]}`

            let tools = [] as JSX.Element[]
            if(line[columns[0].key] !== NEW_LINE_KEY) {
                if(canDelete) {
                    tools.push(<Checkbox sx={{ padding: 0}} id={chkId} name={chkId} key={chkId} 
                        onChange={() => {
                            const lineId = line[columns[0].key] as string
                            let updatedArray = [] as string[]
                            if(linesMarkedForDeletion.includes(lineId)) {
                                updatedArray.push(...linesMarkedForDeletion.filter(id => id !== lineId))
                            } else {
                                updatedArray.push(lineId)
                                updatedArray.push(...linesMarkedForDeletion)
                            }
                            onLinesMarkedForDeletionChanged(updatedArray)
                        }} checked={linesMarkedForDeletion.includes(line[columns[0].key] as string)}/>)
                }
                if(!readonly) {
                    if(dirty) tools.push(<SaveButton submitForm={submitForm} key={`status-${line[columns[0].key]}`}/>)
                    else tools.push(<Tooltip key={`status-${line[columns[0].key]}`} title="Données synchronisée avec le serveur"><CheckIcon/></Tooltip>)
                }
            } else {
                tools.push(<Tooltip title={SAVENOW_TIP}><IconButton sx={{padding: 0}} onClick={submitForm}><SaveIcon /></IconButton></Tooltip>)
                tools.push(<Tooltip title="Annuler la création"><IconButton sx={{padding: 0}} onClick={onDismissNewLine}><DeleteIcon /></IconButton></Tooltip>)
            }

            return <Stack direction="row">
                <Box display="flex" flex={getLeftButtonsFlex(canDelete, readonly)}>{tools}</Box>
                <Stack spacing={CELL_SPACING}
                    onBlur={(e: React.FocusEvent<HTMLFormElement, any>) => { 
                        if(e.currentTarget && !e.currentTarget.contains(e.relatedTarget)){
                            //leaving the line
                            submitChanges()
                        }
                    }}
                    component={Form}
                    direction="row"
                    alignItems="center"
                    flex="1 0">
                    {columns.map(col => makeCellContent(col, 
                        columns[0].key, 
                        col === columns[columns.length - 1], 
                        line,
                        values,
                        handleChange,
                        setFieldValue,
                        touched, 
                        errors, 
                        working))}
                </Stack>
                { lineOps && <Box display="flex" flex={`0 0 ${Math.max(lineOps.length * 2, 4)}rem`}>{
                    lineOps.map((op, idx) => {
                        return <Tooltip key={idx} title={op.name}><IconButton sx={{ padding: 0 }} onClick={() => op.fn(line)}>{op.makeIcon()}</IconButton></Tooltip>
                    })
                }</Box>}
            </Stack>

        }}
    </Formik>
}

export default DatagridLine