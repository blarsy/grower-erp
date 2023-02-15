import { gql, useQuery } from "@apollo/client"
import Loader from "lib/components/Loader"
import CompanyForm from "lib/components/admin/CompanyForm"
import { useApolloClient } from "@apollo/client"
import { owner } from "lib/components/queriesLib"

const UPDATE = gql`
  mutation UpdateCompany($companyNumber: String, $name: String!, $addressLine1: String, $addressLine2: String, $id: Int!, $zipCode: String, $city: String) {
  updateCompanyById(
    input: {companyPatch: {addressLine1: $addressLine1, addressLine2: $addressLine2, name: $name, companyNumber: $companyNumber, zipCode: $zipCode, city: $city}, id: $id}
  ){
    company {
      name addressLine1 addressLine2 companyNumber zipCode city
    }
  }
}`

const CREATECOMPANY = gql`
  mutation CreateCompany($companyNumber: String, $name: String!, $addressLine1: String, $addressLine2: String, $zipCode: String, $city: String) {
    createCompany(input: {company: {addressLine1: $addressLine1, addressLine2: $addressLine2, name: $name, companyNumber: $companyNumber, zipCode: $zipCode, city: $city}}) {
      company {
          name addressLine1 addressLine2 companyNumber zipCode city id
      }
  }
}`

const CREATESETTING = gql`mutation NewSetting($ownerId: Int!) {
  createSetting(input: {setting: {ownerId: $ownerId}})
  {
    clientMutationId
  }
}`

const ProfileAdminView = () => {
    const client = useApolloClient()
    const { loading, error, data } = useQuery(owner)
    return <Loader loading={loading} error={error}>
        <CompanyForm data={(data && data.allSettings.nodes && data.allSettings.nodes.length > 0 && data.allSettings.nodes[0].companyByOwnerId) ? data.allSettings.nodes[0].companyByOwnerId : null} updateQuery={UPDATE} createQuery={async (values) => {
            const res = await client.mutate({mutation: CREATECOMPANY , variables: values})
            if(res.data.createCompany.company.id) {
              const result = res.data.createCompany.company.id
              await client.mutate({ mutation: CREATESETTING, variables: {ownerId: result} })
              return result
            } else {
              throw new Error('Company creation did not return any id.')
            }
        }}/>
    </Loader>
}

export default ProfileAdminView