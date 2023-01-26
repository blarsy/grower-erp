import { gql, useQuery } from "@apollo/client"
import Loader from "lib/components/Loader"
import CompanyForm from "lib/components/admin/CompanyForm"

const GET = gql`query AllCompanies {
    allCompanies {
      nodes {
        addressLine1
        addressLine2
        id
        name
        vatNumber
      }
    }
  }`
const UPDATE = gql`
  mutation UpdateCompany($vatNumber: String!, $name: String!, $addressLine1: String!, $addressLine2: String!, $id: Int!) {
  updateCompanyById(
    input: {companyPatch: {addressLine1: $addressLine1, addressLine2: $addressLine2, name: $name, vatNumber: $vatNumber}, id: $id}
  ){
    company {
      name addressLine1 addressLine2 vatNumber id
    }
  }
}`

const CREATE = gql`
  mutation CreateCompany($vatNumber: String!, $name: String!, $addressLine1: String!, $addressLine2: String!) {
    createCompany(input: {company: {addressLine1: $addressLine1, addressLine2: $addressLine2, name: $name, vatNumber: $vatNumber}}) {
        company {
            name addressLine1 addressLine2 vatNumber
        }
    }
  }`

const ProfileAdminView = () => {
    const { loading, error, data } = useQuery(GET)
    return <Loader loading={loading} error={error}>
        <CompanyForm data={data && data.allCompanies.nodes ? data.allCompanies.nodes[0] : {}} updateQuery={UPDATE} createQuery={CREATE}/>
    </Loader>
}

export default ProfileAdminView