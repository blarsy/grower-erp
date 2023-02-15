import { useApolloClient } from "@apollo/client"
import { Autocomplete, Stack, SxProps, TextField, Theme, Typography } from "@mui/material"
import { DocumentNode } from "graphql"
import { parseUiError } from "lib/uiCommon"
import { useContext, useEffect, useState } from "react"
import { AppContext } from "../admin/AppContextProvider"

interface Props {
    query: DocumentNode,
    size: "small" | "medium" | undefined
    onChange: (e: {id: string, name: string} | null) => void
    sx: SxProps<Theme> | undefined
    selectSx: SxProps<Theme> | undefined
    value: string
    name: string
    error: boolean,
    helperText: React.ReactNode
    getLabel?: (item: any) => string
}

function RelationSelect(props: Props) {
    const appContext = useContext(AppContext)
    const {query, onChange, value } = props
    const client = useApolloClient()
    const [options, setOptions] = useState([] as {id: string, name: string}[])
    const [open, setOpen] = useState(false)
    const [filter, setFilter] = useState('')
    const [error, setError] = useState('')
    const loading = open && options.length === 0

    const loadOptions = async () => {
        try {
            setError('')
            const res = await client.query({ query, variables: { search: filter } })
            if(res.error) {
                setError(parseUiError(res.error).message)
            } else {
                setOptions(res.data[Object.getOwnPropertyNames(res.data)[0]].nodes)
            }
        } catch(e: any) {
            setError(parseUiError(e).message)
        }
    }

    useEffect(() => {
        const timeoutId = setTimeout(loadOptions, 500)
        return () => clearTimeout(timeoutId)
    }, [loading, filter])

    return <Stack sx={props.sx}>
        <Autocomplete
            id={props.name}
            size={props.size}
            options={options}
            renderInput={params => <TextField {...params} 
                value={filter} 
                onChange={e => setFilter(e.target.value)}
                error={props.error}
                helperText={props.helperText}/>}
            sx={props.selectSx}
            open={open}
            onOpen={() => {
                setOpen(true);
            }}
            onClose={() => {
                setOpen(false);
            }}
            filterOptions={x => x}
            value={options.find(option => option.id === value) || null}
            onChange={(_, val) => onChange(val ? val : null)}
            getOptionLabel={props.getLabel ? props.getLabel : (selected) => selected.name}
        />
        <Typography variant="caption" color="error.main">{error}</Typography>
    </Stack>
}

export default RelationSelect