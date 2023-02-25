import { gql } from "@apollo/client"
import DatagridAdminView from "./DatagridAdminView"

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

const AdministratorsAdminView = () => {
    return <DatagridAdminView getQuery={GET_ADMINS} getFromQueried={data => {
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
    ]} />
}

export default AdministratorsAdminView