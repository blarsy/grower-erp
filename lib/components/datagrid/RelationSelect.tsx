import { FetchPolicy, useQuery } from "@apollo/client"
import { Autocomplete, Stack, SxProps, TextField, Theme, Typography } from "@mui/material"
import { DocumentNode } from "graphql"
import { parseUiError } from "lib/uiCommon"
import { useEffect, useState } from "react"

interface Props {
    query: DocumentNode,
    size: "small" | "medium" | undefined
    onChange: (e: {id: string, name: string} | null) => void
    sx: SxProps<Theme> | undefined
    selectSx: SxProps<Theme> | undefined
    value: string
    name: string
    error: boolean
    helperText: React.ReactNode
    getLabel?: (item: any) => string
    overrideFetchPolicy?: FetchPolicy
    autoFocus: Boolean
}

function RelationSelect({query, onChange, value, overrideFetchPolicy, sx, name, size, error, helperText, selectSx, getLabel, autoFocus }: Props) {
    const {loading, error: errorFetch, data, refetch} = useQuery(query, { variables: { search: '' }, fetchPolicy: 'network-only', nextFetchPolicy: overrideFetchPolicy || 'cache-first' })
    const [open, setOpen] = useState(false)
    const [filter, setFilter] = useState('')

    useEffect(() => {
        const timeoutId = setTimeout(() => refetch({ search: filter}), 500)
        return () => clearTimeout(timeoutId)
    }, [loading, filter])

    let message
    if(errorFetch) {
        const errorFeedback = parseUiError(errorFetch)
        message = errorFeedback.message
    }

    const options = data ? data[Object.getOwnPropertyNames(data)[0]].nodes : []

    return <Stack sx={sx}>
        <Autocomplete
            id={name}
            size={size}
            options={options}
            renderInput={params => <TextField {...params} 
                value={filter}
                autoFocus={!!autoFocus} 
                onChange={e => setFilter(e.target.value)}
                error={error}
                helperText={helperText}/>}
            sx={selectSx}
            open={open}
            onOpen={() => {
                setOpen(true);
            }}
            onClose={() => {
                setOpen(false);
            }}
            filterOptions={x => x}
            value={options.find((option: any) => option.id === value) || null}
            onChange={(_, val) => onChange(val ? val : null)}
            getOptionLabel={getLabel ? getLabel : (selected) => selected.name}
            autoSelect={true}
        />
        {message && <Typography variant="caption" color="error.main">{message}</Typography>}
    </Stack>
}

export default RelationSelect