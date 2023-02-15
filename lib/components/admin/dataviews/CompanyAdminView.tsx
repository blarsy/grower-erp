import { gql } from "@apollo/client"
import { filterContacts } from "lib/components/queriesLib"
import { isValidVatNumber } from "lib/uiCommon"
import * as yup from 'yup'
import DatagridAdminView from "./DatagridAdminView"


const GET = gql`query CompanyAdminViewAllCompaniesQuery {
  allCompanies {
    nodes {
      addressLine1
      addressLine2
      city
      companyNumber
      id
      mainContactId
      name
      zipCode
    }
  }
}`

const UPDATE = gql`mutation UpdateCompany($addressLine1: String, $addressLine2: String, $city: String, 
    $companyNumber: String, $mainContactId: Int, $name: String!, $zipCode: String, $id: Int!) {
    updateCompanyById(
      input: {companyPatch: {addressLine1: $addressLine1, addressLine2: $addressLine2, city: $city, 
        companyNumber: $companyNumber, mainContactId: $mainContactId, name: $name, 
        zipCode: $zipCode}, id: $id}
    ) {
      company {
        addressLine1
        addressLine2
        city
        companyNumber
        id
        mainContactId
        name
        zipCode
      }
    }
  }`

const CREATE = gql`mutation CreateCompany($zipCode: String, $name: String!, $mainContactId: Int, 
$companyNumber: String, $city: String, $addressLine2: String, $addressLine1: String) {
    createCompany(
      input: {company: {name: $name, addressLine1: $addressLine1, addressLine2: $addressLine2, city: $city, companyNumber: $companyNumber, mainContactId: $mainContactId, zipCode: $zipCode}}
    ) {
      company {
        addressLine1
        addressLine2
        city
        companyNumber
        id
        mainContactId
        name
        zipCode
      }
    }
  }`

const CompanyAdminView = () => {
    return <DatagridAdminView title="Entreprises" dataName="Company" getQuery={GET} createQuery={CREATE}
    updateQuery={UPDATE} getFromQueried={(data) => data[`allCompanies`].nodes} columns={[
      { key: 'id', headerText: 'ID', widthPercent: 5, type: "number"},
      { key: 'name', headerText: 'Nom', widthPercent: 20, type: "string",  editable: {
        validation: yup.string().required('Ce champ est requis') 
      }},
      { key: 'addressLine1', headerText: 'Adresse ligne 1', widthPercent: 12.5, type: "string", editable: {
          validation: yup.string()
        }
      },
      { key: 'addressLine2', headerText: 'Adresse ligne 2', widthPercent: 12.5, type: "string", editable: {
          validation: yup.string()
        }
      },
      { key: 'zipCode', headerText: 'Code postal', widthPercent: 7, type: "string", editable: {
          validation: yup.string()
        }
      },
      { key: 'city', headerText: 'Localité', widthPercent: 10, type: "string", editable: {
          validation: yup.string()
        }
      },
      { key: 'companyNumber', headerText: 'Num. entreprise', widthPercent: 10, type: "string", editable: {
          validation: yup.string().test({
            test: val => {
                if(!val) return true
                return isValidVatNumber(val)
            }, message: 'Format de numéro de TVA invalide' })
        }
      },
      { key: 'mainContactId', headerText: 'Contact principal', type: 'number', editable: {
        validation: yup.number().nullable()
      }, relation: {
        query: filterContacts, getLabel: (rec) => {
            if(rec.companyByCompanyId && rec.companyByCompanyId.name) return `${rec.firstName} ${rec.lastName} (${rec.companyByCompanyId.name})`
            else return `${rec.firstName} ${rec.lastName}`
        }
      }}
    ]} />
}

export default CompanyAdminView