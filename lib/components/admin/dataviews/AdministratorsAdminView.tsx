import { gql, useMutation } from "@apollo/client"
import RemoveIcon from '@mui/icons-material/PersonRemove'
import PersonIcon from '@mui/icons-material/PersonAdd'
import { IconButton, Stack } from "@mui/material"
import BackIcon from '@mui/icons-material/ArrowBack'
import { useRouter } from "next/router"
import NewUserForm from "./users/NewUserForm"
import DatagridAdminView from "./DatagridAdminView"
import ConfirmDialog from "lib/components/ConfirmDialog"
import { useState } from "react"
import { LineData } from "lib/components/datagrid/Datagrid"
import Feedback from "lib/components/Feedback"
import { parseUiError } from "lib/uiCommon"

const GET_ADMINS = gql`query Users {
  allUsers {
    nodes {
      contactId
      id
      role
      contactByContactId {
        email
        firstname
        lastname
      }
    }
  }
}`

const GET_INVITATIONS = gql`query Invites {
  allUsersInvitations(orderBy: [CREATE_DATE_DESC]) {
    nodes {
      acceptedDate
      code
      createDate
      email
      expirationDate
      grantor
      id
      invitationMailLastSent
      role
      timesInvitationMailSent
    }
  }
}`

const DEMOTE_USER = gql`mutation Demote($userId: Int!) {
  demoteUser(input: {userId: $userId}) {
    clientMutationId
  }
}`

const AdministratorsAdminView = () => {
    const router = useRouter()
    const [demoteUser] = useMutation(DEMOTE_USER)
    const [demotionStatus, setDemotionStatus] = useState({ toBeConfirmed: false, error: undefined as Error | undefined, line: undefined as LineData | undefined })
    if(router.query.view && router.query.view.length > 1 && router.query.view[1] === 'create') {
      return <Stack>
        <Stack direction="row" padding="0 1rem">
            <IconButton onClick={() => router.push('/admin/administrator')}><BackIcon /></IconButton>
        </Stack>
        <NewUserForm />
      </Stack>
    }
    return <Stack>
        { demotionStatus.error && <Feedback onClose={() => { setDemotionStatus({...demotionStatus, ...{error: undefined}})}}
            severity="error" {...parseUiError(demotionStatus.error)} /> }
        <DatagridAdminView getQuery={GET_ADMINS} getFromQueried={data => {
            return data && data.allUsers.nodes.map((userData: any) => ({ 
            name: userData.contactByContactId.firstname ? userData.contactByContactId.firstname + ' ' + userData.contactByContactId.lastname :  userData.contactByContactId.lastname,
            email: userData.contactByContactId.email,
            role: userData.role,
            contactId: userData.contactId,
            id: userData.id
          })
        )}} dataName="user" title="Utilisateurs du système" columns={[
            { headerText: 'Id', key: 'id', type: 'number', widthPercent: 5 },
            { headerText: 'Nom', key: 'name', type: 'string', widthPercent: 30 },
            { headerText: 'Email', key: 'email', type: 'string', widthPercent: 30 },
            { headerText: 'Role', key: 'role', type: 'string' }
        ]} lineOps={[
          { name: 'Retirer', fn(line) {
            setDemotionStatus({ toBeConfirmed: true, error: undefined, line })
          }, makeIcon: (() => <RemoveIcon />) }
        ]}  customOps={[{
          name: 'Nouveau', makeIcon: () => <PersonIcon/>, fn: () => router.push('/admin/administrator/create')
        }]}/>
        <DatagridAdminView getQuery={GET_INVITATIONS} dataName="UsersInvitation" title="Invitations"
          columns={[
            { key: 'id', headerText: 'Id', widthPercent: 5, type: 'number'},
            { key: 'email', headerText: 'Email', widthPercent: 20, type: 'string' },
            { key: 'createDate', headerText: 'Création', widthPercent: 15, type: 'datetime' },
            { key: 'expirationDate', headerText: 'Expiration', widthPercent: 15, type: 'datetime' },
            { key: 'acceptedDate', headerText: 'Acceptation', widthPercent: 15, type: 'datetime' },
            { key: 'code', headerText: 'Lien', widthPercent: 15, type: 'string', customDisplay: val => `${window.location.origin}/admin/invite/${val}`},
            { key: 'role', headerText: 'Role', type: 'string' }
          ]} />
        <ConfirmDialog question="Enlever à cet utilisateur son rôle dans le système ?" title="Enlever le rôle"
          opened={demotionStatus.toBeConfirmed}
          onClose={async response => {
            if(response) {
              setDemotionStatus({ toBeConfirmed: true, error: undefined, line: demotionStatus.line })
              try {
                await demoteUser({ variables: { userId: demotionStatus.line!.id }})
                setDemotionStatus({ toBeConfirmed: false, error: undefined, line: undefined })
              } catch (e: any) {
                setDemotionStatus({ toBeConfirmed: false, error: e as Error, line: undefined})
              }
            } else {
              setDemotionStatus({ toBeConfirmed: false, error: undefined, line: undefined})
            }
          }} />
      </Stack>
}

export default AdministratorsAdminView