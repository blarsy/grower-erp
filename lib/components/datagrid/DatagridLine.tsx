import { Box, CircularProgress, IconButton, Stack, TextField, Typography, Checkbox, Autocomplete, FormControlLabel } from "@mui/material"
import { Form, Formik, FormikErrors, FormikHelpers, FormikTouched, FormikValues } from "formik"
import DeleteIcon from '@mui/icons-material/Close'
import CheckIcon from '@mui/icons-material/Check'
import ModifiedIcon from '@mui/icons-material/PriorityHigh'
import { ChangeEvent, HTMLInputTypeAttribute, useState } from "react"
import * as yup from 'yup'
import { CellContent, cellInnerPaddingLeftRight, CELL_SPACING, Column, LEFT_BUTTONS_FLEX, LineData, NEW_LINE_KEY } from "./Datagrid"
import RelationSelect from "./RelationSelect"

interface Props {
    line: LineData,
    columns: Column[],
    onUpdate?: (values: FormikValues, line: LineData) => Promise<void>
    onCreate?: (values: FormikValues) => Promise<void>
    onDismissNewLine: () => void
    linesMarkedForDeletion: string[]
    onLinesMarkedForDeletionChanged: (linesMarkedForDeletion: string[]) => void
}

interface FormValues {
    [key: string]: CellContent
}

const DatagridLine = ({ line, columns, onUpdate, onCreate, onDismissNewLine, linesMarkedForDeletion, onLinesMarkedForDeletionChanged }: Props) => {
    const createFormValues = (cols: Column[], line: LineData): {[id: string]: any} => {
        const result = {} as FormValues
        cols.forEach(col => {
            if(col.editable){
                result[col.key] = line[col.key]
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
        working: boolean,
        onDismissNewLine: () => void): JSX.Element => {

        let flex = '1'
        if(!isLastCol) flex = `0 0 ${Math.round(col.widthPercent! * 100) / 100}%`

        if(!col.editable || col.key === keyOfIdCol){
            if(col.key === keyOfIdCol) {
                if(working) {
                    return <Box key={col.key} sx={{ flex }}>
                        <CircularProgress size="1rem" />
                    </Box>
                } else if(line[col.key] === NEW_LINE_KEY) {
                    return <Box key={col.key} sx={{ flex }
                        }>
                        <IconButton sx={{padding: 0}} onClick={onDismissNewLine}><DeleteIcon /></IconButton>
                    </Box>
                }
                return <Box key={col.key}
                        sx={{ flex }}>
                        <Typography variant="body1">
                            {line[col.key] !== NEW_LINE_KEY && line[col.key]}
                        </Typography>
                </Box>
            } else if(col.type === "boolean") {
                return <Checkbox key={col.key} sx={{ flex }} disabled value={line[col.key]} />
            } else if(col.valueForNew && line[keyOfIdCol] === NEW_LINE_KEY) {
                return <Typography
                    key={col.key}
                    sx={{ flex, fontStyle: "italic" }}
                    variant="body1">
                    {col.valueForNew}
                </Typography>
            } else {
                return <Typography
                    key={col.key}
                    sx={{ flex }}
                    variant="body1">
                    {line[col.key]}
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
                        flex }}
                    type={type}
                    value={values[col.key]}
                    onChange={handleChange}
                    error={touched[col.key] && !!errors[col.key]}
                    helperText={touched[col.key] && errors[col.key] as string}/>
            )
            if(col.relation) {
                return <RelationSelect size="small" 
                    name={col.key}
                    sx={{ flex }}
                    selectSx={{
                        '& .MuiOutlinedInput-root.MuiInputBase-sizeSmall' : {
                            padding: `0 ${cellInnerPaddingLeftRight}`
                        },
                        '& .MuiOutlinedInput-root.MuiInputBase-sizeSmall .MuiAutocomplete-input' : {
                            padding: `0`
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
                        flex,
                        justifyContent: 'center'
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
                if(dirty) tools.push(<ModifiedIcon key={`status-${line[columns[0].key]}`}/>)
                else tools.push(<CheckIcon key={`status-${line[columns[0].key]}`}/>)
            }

            return <Stack direction="row">
                <Box display="flex" flex={LEFT_BUTTONS_FLEX}>{tools}</Box>
                <Stack spacing={CELL_SPACING}
                    onBlur={e => { 
                        if(!e.currentTarget.contains(e.relatedTarget)){
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
                        working, 
                        onDismissNewLine))}
                </Stack>
            </Stack>

        }}
    </Formik>
}

export default DatagridLine